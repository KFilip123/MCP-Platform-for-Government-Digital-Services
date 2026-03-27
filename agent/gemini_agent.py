"""
agent/gemini_agent.py
────────────────────────────────────────────────────────────────────────────────
Gemini Flash agent that drives the MCP server via tool calls.

Architecture:
  ┌─────────────────────────────────────────────────────────────────┐
  │                        User (terminal)                          │
  └──────────────────────────────┬──────────────────────────────────┘
                                 │ natural language
                                 ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                     gemini_agent.py                             │
  │                                                                 │
  │  1. Connects to the MCP server (spawns server/main.py as a      │
  │     subprocess and speaks JSON-RPC over stdio).                 │
  │  2. Fetches the list of available tools from the MCP server.    │
  │  3. Converts MCP tool schemas → Gemini FunctionDeclarations.    │
  │  4. Runs a conversation loop:                                   │
  │       User says something →                                     │
  │       Gemini decides which tool to call (if any) →              │
  │       Agent calls the tool via the MCP client →                 │
  │       Tool result is fed back to Gemini →                       │
  │       Gemini produces a final answer →                          │
  │       Answer is printed to the user.                            │
  └──────────────────────────────┬──────────────────────────────────┘
                                 │ MCP JSON-RPC (stdio)
                                 ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                      server/main.py                             │
  │  (MCP server with login, check_session, info_passport_renewal,  │
  │   authenticated_get, authenticated_post …)                      │
  └─────────────────────────────────────────────────────────────────┘

Security note:
  Gemini sees TOOL SCHEMAS and TOOL RESULTS, but never raw cookies or
  credentials.  The login tool opens a browser; the user types their
  password directly into the browser, which is invisible to this process.

Running:
  python agent/gemini_agent.py
"""

import asyncio
import json
import sys
from pathlib import Path

# ── google-genai (new SDK, not google-generativeai) ───────────────────────────
from google import genai
from google.genai import types as genai_types

# ── MCP client libraries ──────────────────────────────────────────────────────
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# ── Project config ─────────────────────────────────────────────────────────────
# Add the project root to sys.path so we can import server.config even when
# running this script directly.
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

from server.config import GEMINI_API_KEY, GEMINI_MODEL

# ── Gemini client ─────────────────────────────────────────────────────────────
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# ── System prompt ──────────────────────────────────────────────────────────────
# This tells Gemini its role and the boundaries it must respect.
SYSTEM_PROMPT = """
You are a helpful assistant for citizens using the Macedonian public services
portal (uslugi.gov.mk).

You have access to MCP tools that can:
  - Log in to the portal on behalf of the user (opens a browser).
  - Check whether the user is currently logged in.
  - Fetch information about administrative services (e.g. passport renewal).
  - Make authenticated requests to the portal on behalf of the user.

SECURITY RULES YOU MUST FOLLOW:
  1. Never ask the user for their password or any credentials.
     The 'login' tool handles authentication — the user types credentials
     directly in their browser.
  2. Never repeat cookie values or session tokens in your responses.
  3. If a tool returns an error about an expired session, tell the user to
     call the login tool and offer to do it for them.
  4. Keep responses concise and in plain language.
  5. When presenting service information, format it clearly (use bullet lists).
""".strip()


# ═══════════════════════════════════════════════════════════════════════════════
# MCP ↔ Gemini schema conversion helpers
# ═══════════════════════════════════════════════════════════════════════════════

def mcp_tool_to_gemini_function(mcp_tool) -> genai_types.FunctionDeclaration:
    """
    Convert a single MCP tool definition into a Gemini FunctionDeclaration.

    MCP tools have an "inputSchema" (JSON Schema object).
    Gemini wants a FunctionDeclaration with a parameters schema.
    This function bridges the two formats.
    """
    # MCP gives us a JSON Schema dict for the input.
    input_schema = mcp_tool.inputSchema or {}

    # Extract properties and required fields from the JSON Schema.
    properties_raw = input_schema.get("properties", {})
    required = input_schema.get("required", [])

    # Build Gemini Schema objects for each parameter.
    gemini_properties = {}
    for param_name, param_schema in properties_raw.items():
        # Map JSON Schema types to Gemini types.
        json_type = param_schema.get("type", "string").upper()
        gemini_type = getattr(genai_types.Type, json_type, genai_types.Type.STRING)

        gemini_properties[param_name] = genai_types.Schema(
            type=gemini_type,
            description=param_schema.get("description", ""),
        )

    # Build the parameters schema.
    parameters = genai_types.Schema(
        type=genai_types.Type.OBJECT,
        properties=gemini_properties,
        required=required,
    )

    return genai_types.FunctionDeclaration(
        name=mcp_tool.name,
        description=mcp_tool.description or "",
        parameters=parameters,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Main agent loop
# ═══════════════════════════════════════════════════════════════════════════════

async def run_agent():
    """
    Start the MCP server subprocess and run the interactive agent loop.

    The flow per user message:
      1. Send message + tool definitions to Gemini.
      2. If Gemini returns a function call → execute via MCP → feed result back.
      3. Repeat step 2 until Gemini returns a plain text response.
      4. Print the final response.
    """

    # ── Launch the MCP server as a subprocess ─────────────────────────────────
    # StdioServerParameters tells the MCP client to spawn a process and
    # communicate with it over stdin/stdout.
    server_params = StdioServerParameters(
        command=sys.executable,            # Use the same Python interpreter
        args=["-m", "server.main"],        # Run server/main.py as a module
        cwd=str(PROJECT_ROOT),             # Working directory = project root
    )

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as mcp_session:

            # ── Initialize the MCP connection ─────────────────────────────────
            await mcp_session.initialize()
            print("[Agent] MCP server connected.")

            # ── Fetch available tools from the MCP server ─────────────────────
            tools_response = await mcp_session.list_tools()
            mcp_tools = tools_response.tools
            print(f"[Agent] Available tools: {[t.name for t in mcp_tools]}")

            # ── Convert MCP tool schemas to Gemini FunctionDeclarations ────────
            gemini_tools = [
                genai_types.Tool(
                    function_declarations=[
                        mcp_tool_to_gemini_function(t) for t in mcp_tools
                    ]
                )
            ]

            # ── Conversation history ──────────────────────────────────────────
            # We maintain the full history so Gemini has context across turns.
            # Format: list of genai_types.Content objects.
            history: list[genai_types.Content] = []

            print("\n" + "═" * 60)
            print("  uslugi.gov.mk Assistant  (powered by Gemini Flash)")
            print("  Type 'quit' to exit.")
            print("═" * 60 + "\n")

            # ── Interactive loop ───────────────────────────────────────────────
            while True:
                # Read user input.
                try:
                    user_input = input("You: ").strip()
                except (KeyboardInterrupt, EOFError):
                    print("\n[Agent] Goodbye.")
                    break

                if user_input.lower() in ("quit", "exit", "q"):
                    print("[Agent] Goodbye.")
                    break

                if not user_input:
                    continue

                # Append user message to history.
                history.append(
                    genai_types.Content(
                        role="user",
                        parts=[genai_types.Part(text=user_input)],
                    )
                )

                # ── Agentic loop: call Gemini, handle tool calls ────────────
                # Gemini may return multiple rounds of tool calls before giving
                # a final text answer.  We loop until we get plain text.
                while True:
                    response = gemini_client.models.generate_content(
                        model=GEMINI_MODEL,
                        contents=history,
                        config=genai_types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            tools=gemini_tools,
                            # AUTO lets Gemini decide when to call tools.
                            tool_config=genai_types.ToolConfig(
                                function_calling_config=genai_types.FunctionCallingConfig(
                                    mode="AUTO"
                                )
                            ),
                        ),
                    )

                    candidate = response.candidates[0]
                    content = candidate.content  # genai_types.Content

                    # Add Gemini's response (possibly with tool calls) to history.
                    history.append(content)

                    # ── Check if Gemini wants to call a tool ──────────────────
                    function_calls = [
                        part.function_call
                        for part in content.parts
                        if part.function_call is not None
                    ]

                    if not function_calls:
                        # No tool calls → Gemini gave a final text answer.
                        # Extract and print it.
                        final_text = " ".join(
                            part.text
                            for part in content.parts
                            if part.text
                        )
                        print(f"\nAssistant: {final_text}\n")
                        break  # Exit the inner agentic loop.

                    # ── Execute each tool call via the MCP server ─────────────
                    tool_results = []

                    for fc in function_calls:
                        tool_name = fc.name
                        # fc.args is a dict (Gemini populates it from JSON).
                        tool_args = dict(fc.args) if fc.args else {}

                        print(f"  [Tool call] {tool_name}({tool_args})")

                        # Call the tool on the MCP server.
                        try:
                            mcp_result = await mcp_session.call_tool(
                                tool_name, arguments=tool_args
                            )
                            # MCP returns a list of content items.
                            # We join text items into a single result string.
                            result_text = "\n".join(
                                item.text
                                for item in mcp_result.content
                                if hasattr(item, "text")
                            )
                        except Exception as exc:
                            result_text = f"Tool error: {exc}"

                        print(f"  [Tool result] {result_text}")

                        # Build a FunctionResponse part for Gemini.
                        tool_results.append(
                            genai_types.Part(
                                function_response=genai_types.FunctionResponse(
                                    name=tool_name,
                                    response={"result": result_text},
                                )
                            )
                        )

                    # Feed all tool results back to Gemini in one Content block.
                    history.append(
                        genai_types.Content(
                            role="tool",
                            parts=tool_results,
                        )
                    )
                    # Continue the inner loop: Gemini will process the results
                    # and either call more tools or produce a final answer.


def main():
    """Entry point for running the agent from the command line."""
    asyncio.run(run_agent())


if __name__ == "__main__":
    main()
