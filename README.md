# uslugi.gov.mk MCP Demo

A demo MCP (Model Context Protocol) server that authenticates with the
Macedonian public services portal and exposes portal actions as tools that
a Gemini Flash agent can call.

---

## Architecture

```
User (terminal)
     |
     | natural language
     v
agent/gemini_agent.py  (Gemini Flash conversation loop)
  - Holds conversation history
  - Converts MCP tool schemas to Gemini FunctionDeclarations
  - Executes Gemini tool call decisions via the MCP client
     |
     | MCP JSON-RPC over stdio
     v
server/main.py  (FastMCP server)
  Tools: login, logout, check_session,
         info_passport_renewal,
         authenticated_get, authenticated_post
     |              |
     v              v
server/auth/    server/client/http_client.py
  browser_auth    Loads cookies, injects on every
  http_auth       request, detects 401/403/redirect
  session.py      and raises SessionExpiredError
  (Fernet-encrypted cookie storage)
```

---

## Folder Structure

```
demo-mcp/
├── agent/
│   └── gemini_agent.py      # Gemini Flash + MCP client conversation loop
├── server/
│   ├── main.py              # FastMCP server — registers all tools
│   ├── config.py            # All env-var loading in one place
│   ├── auth/
│   │   ├── browser_auth.py  # Playwright browser login (primary strategy)
│   │   ├── http_auth.py     # HTTP POST login (fallback skeleton)
│   │   └── session.py       # Fernet-encrypted cookie persistence
│   ├── client/
│   │   └── http_client.py   # Authenticated requests + session expiry detection
│   └── tools/
│       ├── passport.py      # info_passport_renewal() tool
│       └── session_tools.py # login / logout / check_session tools
├── storage/
│   └── session.enc          # Encrypted cookies (gitignored, auto-created)
├── .env                     # Secrets (gitignored — copy from .env.example)
├── .env.example             # Template for .env
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Create a virtual environment and install dependencies

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install Playwright's Chromium browser

```bash
playwright install chromium
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and check the values. Most defaults are fine for the demo.
`COOKIE_ENCRYPTION_KEY` can be left blank — it will be auto-generated and
printed to the console on first run.  Copy the printed key back into `.env`
so it persists across restarts.

### 4. Run the agent

```bash
python agent/gemini_agent.py
```

The agent will:
1. Spawn `server/main.py` as a subprocess (the MCP server).
2. Connect to it over stdio.
3. Start a terminal chat loop powered by Gemini Flash.

---

## Example Session

```
You: log me in

  [Tool call] login({"strategy": "browser"})
  # A Chromium window opens. You log in manually. Window closes.
  [Tool result] {"success": true, "message": "Browser authentication successful..."}
Assistant: You are now logged in.

You: What documents do I need to renew my passport?

  [Tool call] info_passport_renewal({})
  [Tool result] {"serviceId": 5200, "name": "...", "requirements": [...]}

Assistant: To renew your Macedonian passport you will need ...
```

---

## Security Model

| Concern | How it is handled |
|---|---|
| Credentials never reach the LLM | Browser strategy: user types in browser window only. HTTP strategy: getpass() reads from terminal, never forwarded to Gemini. |
| Cookies never returned to LLM | Tool responses contain only structured result dicts, never raw cookie values. |
| Cookies never stored in plaintext | Fernet symmetric encryption before writing to disk. |
| Session expiry handled gracefully | AuthenticatedClient detects 401/403/login-redirect and raises SessionExpiredError, which tools convert to a clear error message. |
| Encryption key not hardcoded | Loaded from COOKIE_ENCRYPTION_KEY env var; auto-generated on first run. |

---

## Extending the Project

### Add a new tool

1. Create `server/tools/my_tool.py` with a plain function.
2. For authenticated endpoints, call `authenticated_client.post(...)` from `server/client/http_client.py`.
3. Import the function in `server/main.py` and register it with `@mcp.tool()`.

### Switch to a different portal

1. Update `PORTAL_BASE_URL`, `LOGIN_URL`, `POST_LOGIN_PATH` in `server/config.py` (or `.env`).
2. If HTTP login is possible, adjust the endpoint and field names in `server/auth/http_auth.py`.

### Add persistent login for CI / automation

For headless scenarios where a real browser is impractical:
1. Implement a headless Playwright flow in `browser_auth.py` for portals without CAPTCHA.
2. Or inject cookies exported from a real browser session manually via `session_manager.save({...})`.
