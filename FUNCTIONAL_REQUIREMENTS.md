# Functional Requirements & Technical Specification
## uslugi.gov.mk MCP Demo Agent

---

## 1. Purpose

This document describes the complete functional behaviour, technical architecture,
and technology choices of the demo software system that connects an AI language
model (Google Gemini Flash) to the Macedonian public services portal
(uslugi.gov.mk) via the Model Context Protocol (MCP).

The document is intended for developers who need to understand the system deeply
enough to write formal functional requirements, extend the codebase, or reproduce
the architecture for a different portal.

---

## 2. High-Level System Overview

The system consists of two cooperating processes:

```
┌──────────────────────────────────────────────────────────────────────┐
│  PROCESS 1: agent/gemini_agent.py                                    │
│                                                                      │
│  - The user-facing conversational interface.                         │
│  - Runs a terminal chat loop.                                        │
│  - Uses the Gemini Flash LLM to understand user intent.              │
│  - Translates LLM tool-call decisions into real MCP calls.           │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Standard input / output pipe
                                   │ (JSON-RPC 2.0 messages)
┌──────────────────────────────────▼───────────────────────────────────┐
│  PROCESS 2: server/main.py                                           │
│                                                                      │
│  - The MCP server. Spawned automatically by Process 1.               │
│  - Exposes a set of "tools" (Python functions) over the MCP          │
│    protocol.                                                         │
│  - Handles authentication, session management, and HTTP requests     │
│    to uslugi.gov.mk.                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

The user never interacts with the MCP server directly. All interaction goes
through the agent (Process 1), which decides which tools to call based on
the user's natural language input.

---

## 3. Technologies Used

### 3.1 Python 3.11+
The entire system is written in Python. Python 3.11+ is required for the
`dict | None` union type hint syntax used throughout the codebase.

### 3.2 MCP — Model Context Protocol
**What it is:**
MCP is an open protocol (developed by Anthropic) that standardises how AI
models connect to external tools, data sources, and services. It defines a
structured way for an LLM agent to discover and call functions exposed by a
server process.

**How it works in this project:**
- `server/main.py` is an MCP server. It exposes Python functions as "tools"
  using the `@mcp.tool()` decorator from the `FastMCP` class.
- `agent/gemini_agent.py` is an MCP client. It connects to the server via
  a stdio pipe (it spawns the server as a child process).
- Communication between client and server uses JSON-RPC 2.0 messages over
  stdin/stdout.

**Transport:**
The transport used is `stdio` (standard input/output). The agent launches
the server as a subprocess and reads/writes JSON messages over the pipe.
This is the simplest and most portable MCP transport — no network socket
or port is needed.

**Package used:** `mcp[cli]` (the official Anthropic MCP Python SDK,
which includes `FastMCP` as a high-level decorator-based API).

**Key operations the MCP client performs:**
1. `initialize()` — handshake with the server.
2. `list_tools()` — retrieve all available tool names, descriptions, and
   input schemas (JSON Schema format).
3. `call_tool(name, arguments)` — invoke a specific tool and receive its
   return value.

### 3.3 FastMCP
**What it is:**
`FastMCP` is the high-level Python class inside the `mcp` package that
lets you define MCP tools with plain Python functions. It eliminates
boilerplate by automatically:
- Converting Python function signatures into JSON Schema.
- Converting function docstrings into tool descriptions shown to the LLM.
- Handling JSON-RPC serialisation/deserialisation.
- Running the server event loop.

**How it is used:**
```python
mcp = FastMCP("uslugi-gov-mk-demo")

@mcp.tool()
def my_tool(param: str) -> dict:
    """This docstring becomes the tool description for the LLM."""
    ...

mcp.run()  # Starts the stdio JSON-RPC loop.
```

### 3.4 Google Gemini Flash (google-genai SDK)
**What it is:**
Google Gemini is a family of large language models. "Flash" refers to the
`gemini-2.5-flash` variant — a fast, cost-efficient model that supports
function calling (tool use).

**Package used:** `google-genai` — the newer Google AI Python SDK
(distinct from the older `google-generativeai` package).

**How the LLM is used:**
The agent sends every user message plus the list of available MCP tools to
Gemini. Gemini decides whether to:
  a) Answer the user directly (text response), or
  b) Call one or more tools (function_call response).

This decision is made by Gemini autonomously based on the `AUTO` function
calling mode, which means Gemini can call tools whenever it judges it
necessary, without the user explicitly requesting it.

**Key API call:**
```python
client.models.generate_content(
    model="gemini-2.5-flash",
    contents=history,                  # full conversation history
    config=GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=gemini_tools,            # FunctionDeclaration list
        tool_config=ToolConfig(
            function_calling_config=FunctionCallingConfig(mode="AUTO")
        ),
    ),
)
```

**Conversation history:**
The agent maintains a running list of `Content` objects (one per turn)
that is passed to Gemini on every call. This allows Gemini to maintain
context across multiple turns in the conversation.

**System prompt:**
A fixed system prompt is passed to Gemini on every call that defines its
role (assistant for Macedonian public services), the available tools, and
security rules (never ask for passwords, never repeat cookies, etc.).

### 3.5 MCP ↔ Gemini Schema Conversion
**The problem:**
MCP tools are described using JSON Schema (e.g., `{"type": "string",
"description": "..."}`). Gemini expects tool descriptions using its own
`FunctionDeclaration` / `Schema` types from `google.genai.types`.

**The solution:**
The function `mcp_tool_to_gemini_function()` in `gemini_agent.py` converts
each MCP tool schema into a Gemini `FunctionDeclaration`. It:
1. Reads the `inputSchema` property of each MCP tool.
2. Maps JSON Schema type strings (`"string"`, `"integer"`, etc.) to
   `genai_types.Type` enum values.
3. Builds a `genai_types.Schema` object for the tool's parameters.
4. Wraps everything in a `genai_types.FunctionDeclaration`.

This conversion happens once at startup, before the conversation loop begins.

### 3.6 Playwright
**What it is:**
Playwright is a browser automation library by Microsoft. It can launch and
control real web browsers (Chromium, Firefox, WebKit) from Python code.

**Why it is needed:**
uslugi.gov.mk uses a federated SSO (Single Sign-On) login flow via eid.mk
(the national digital identity provider of North Macedonia). This flow:
- Involves multiple domain redirects (uslugi.gov.mk → eid.mk → back).
- May use JavaScript-rendered pages, WS-Federation tokens, anti-CSRF
  tokens, and time-limited URL parameters.
- Cannot be reliably replicated with a simple HTTP POST.

Playwright solves this by launching a real Chromium browser window that
behaves exactly like a human user's browser. The SSO flow runs natively
inside that browser.

**How it is used:**
1. A `BrowserAuthenticator` object is created.
2. Its `authenticate()` async method:
   a. Launches Chromium in headed (visible) mode.
   b. Navigates to `https://uslugi.gov.mk` (the portal homepage).
   c. Instructs the user to click the login button and complete eID login.
   d. Uses `page.wait_for_function()` to wait until the browser's URL
      returns to a `uslugi.gov.mk` page with a non-root path (indicating
      that the SSO redirect back to the portal has completed).
   e. Extracts all cookies from the browser context for the `uslugi.gov.mk`
      domain.
   f. Returns the cookies as a plain Python dict.
3. The browser window closes.
4. Cookies are passed to the `SessionManager` for encrypted storage.

**Headed vs. headless:**
The browser runs in `headless=False` mode (visible window). This is
intentional: the user must interact with the browser to enter their eID
credentials. Headless mode would hide the window and make this impossible.

**Asyncio threading workaround:**
Playwright's Python API is async. The MCP server also uses asyncio. When
a Playwright call is made from inside the MCP server's event loop, calling
`asyncio.run()` would raise `RuntimeError: asyncio.run() cannot be called
from a running event loop`.

The solution is to run Playwright in a separate thread via
`concurrent.futures.ThreadPoolExecutor`. That thread has no existing event
loop, so `asyncio.run()` works normally there. The MCP server thread blocks
on `future.result()` until the browser authentication completes.

### 3.7 Fernet Symmetric Encryption (cryptography package)
**What it is:**
Fernet is a symmetric encryption scheme from Python's `cryptography`
library. It uses AES-128-CBC for encryption and HMAC-SHA256 for
authentication (to detect tampering).

**Why it is used:**
After login, the session cookies must be persisted to disk so they survive
across runs of the agent. Storing them in plaintext would be a security
risk. Fernet encrypts the entire cookie payload before writing it to
`storage/session.enc`.

**How it works:**
1. A 32-byte random key is required. It is loaded from the
   `COOKIE_ENCRYPTION_KEY` environment variable.
2. On first run, if no key is present, a new key is auto-generated with
   `Fernet.generate_key()` and printed to the console for the developer
   to save in `.env`.
3. To save cookies:
   - Cookies dict + timestamp are serialised to JSON bytes.
   - `fernet.encrypt(json_bytes)` produces an encrypted, base64-encoded
     token.
   - The token is written to `storage/session.enc`.
4. To load cookies:
   - The token is read from disk.
   - `fernet.decrypt(token)` decrypts it (raises `InvalidToken` if the key
     is wrong or the file was tampered with).
   - The JSON is parsed and the cookies dict is returned.
5. To delete the session, the file is simply deleted from disk.

**Key property:** Fernet tokens include a timestamp and HMAC. Any
modification of the stored file — even a single byte — causes decryption
to fail with `InvalidToken`, which the code handles gracefully by treating
the session as missing.

### 3.8 requests (HTTP client)
**What it is:**
`requests` is the standard Python HTTP library for making synchronous HTTP
calls.

**How it is used:**
- In `server/tools/passport.py`: a plain `requests.post()` call fetches
  public service data from the portal API (no authentication required).
- In `server/client/http_client.py`: `requests.Session` is used for
  authenticated calls. The session has cookies injected before each
  request.

**requests.Session:**
A `requests.Session` object persists cookies, headers, and other settings
across multiple requests. In this project, a new Session is constructed for
every MCP tool call, pre-loaded with the current saved cookies. This means
if a re-login happened between two tool calls, the second call will
automatically use the fresh cookies.

### 3.9 python-dotenv
**What it is:**
A utility that loads key-value pairs from a `.env` file into the process's
environment variables (`os.environ`).

**How it is used:**
`server/config.py` calls `load_dotenv(PROJECT_ROOT / ".env")` at module
import time. All configuration values are then read via `os.getenv()`. The
`.env` file is gitignored to prevent secrets from being committed.

---

## 4. Authentication Flow (Detailed)

### 4.1 Step-by-step: Browser Strategy

```
User types "log me in"
        │
        ▼
Gemini decides to call the 'login' tool
        │
        ▼
MCP client sends: CallToolRequest { name: "login", args: {} }
        │
        ▼
server/main.py → login() → session_tools._login_browser()
        │
        ▼
BrowserAuthenticator.run() is called
        │
        ▼ (new thread via ThreadPoolExecutor)
asyncio.run(BrowserAuthenticator.authenticate())
        │
        ▼
Playwright launches Chromium (headed, visible)
        │
        ▼
Browser navigates to https://uslugi.gov.mk
        │
        ▼ (user action: click "Најави се")
Browser redirects to:
  https://eid.mk/EId/signin?ReturnUrl=...&wctx=...&wct=<timestamp>
        │
        ▼ (user action: enter eID credentials on eid.mk)
eid.mk validates credentials and issues a WS-Federation token
        │
        ▼
Browser is redirected back to:
  https://uslugi.gov.mk/home.nspx
        │
        ▼
page.wait_for_function() detects:
  window.location.hostname.includes('uslugi.gov.mk')
  && window.location.pathname !== '/'
  → condition is TRUE
        │
        ▼
context.cookies("https://uslugi.gov.mk") extracts all portal cookies
        │
        ▼
Browser closes
        │
        ▼
Cookies dict returned to _login_browser()
        │
        ▼
session_manager.save(cookies)
  → JSON-serialise + Fernet-encrypt + write to storage/session.enc
        │
        ▼
Return { success: true, cookies_saved: N } to MCP client
        │
        ▼
Gemini receives tool result and tells the user: "You are now logged in."
```

### 4.2 WS-Federation / SSO Explanation
The eid.mk login uses **WS-Federation**, a federated identity protocol
used in Microsoft environments (Windows Identity Foundation). Key elements:

- `wa=wsignin1.0` — this is a sign-in request.
- `wtrealm=https://uslugi.gov.mk/` — the "relying party" (the service
  requesting the identity token).
- `wctx=...` — an opaque context string that the relying party uses to
  correlate the request with the response.
- `wct=<timestamp>` — the issue time of the request. This timestamp
  expires, which is why the login URL cannot be hardcoded.
- `wreply=https://uslugi.gov.mk/` — where to redirect after login.

After successful authentication on eid.mk, the browser is redirected to
`wreply` with a `wresult` POST parameter containing the security token.
uslugi.gov.mk validates this token and sets session cookies.

---

## 5. Session Management (Detailed)

### 5.1 SessionManager responsibilities
The `SessionManager` class (`server/auth/session.py`) is the single
component responsible for all cookie persistence. It is instantiated once
as a module-level singleton (`session_manager`).

| Method | Behaviour |
|---|---|
| `save(cookies)` | Serialise cookies dict to JSON, Fernet-encrypt, write to `storage/session.enc`. |
| `load()` | Read file, Fernet-decrypt, JSON-parse, return cookies dict. Returns `None` if file missing or decryption fails. |
| `clear()` | Delete `storage/session.enc` from disk. |
| `is_present()` | Return `True` if the session file exists (no decryption check). |
| `saved_at()` | Decrypt the file and return the ISO-8601 timestamp stored inside it. |

### 5.2 Encrypted storage format
The file `storage/session.enc` contains a single Fernet token (bytes).
When decrypted, the token contains a UTF-8 encoded JSON document:

```json
{
  "cookies": {
    "ASP.NET_SessionId": "abc123...",
    "FedAuth": "def456...",
    "...": "..."
  },
  "saved_at": "2026-03-27T14:35:00+00:00"
}
```

### 5.3 Session expiry detection
The `AuthenticatedClient` (`server/client/http_client.py`) detects expired
sessions after every HTTP request by checking:
1. HTTP status code `401 Unauthorized` — explicit rejection.
2. HTTP status code `403 Forbidden` — access denied (sometimes used for
   expired sessions).
3. The final URL of the response (after redirects) contains the string from
   `LOGIN_URL` — a silent redirect to the login page, which portals use
   instead of returning 401.

When any of these conditions is met, `SessionExpiredError` is raised. The
MCP tool wrapper catches this and returns a structured error dict to the
LLM, which then tells the user to log in again.

---

## 6. HTTP Client Layer (Detailed)

The `AuthenticatedClient` class (`server/client/http_client.py`) is a
thin wrapper around `requests.Session`. Its design principles:

**Separation of concerns:**
Tool code never handles cookies. A tool simply calls
`authenticated_client.post(url, json=payload)` and gets a response. All
cookie injection happens invisibly inside `_build_session()`.

**Fresh session on every call:**
A new `requests.Session` is created on every `get()` or `post()` call.
This ensures that if cookies are refreshed by a re-login between two tool
calls, the next call automatically picks up the new cookies.

**Browser-like headers:**
The session sends a realistic `User-Agent` string and `Accept-Language:
mk-MK` header on every request, to minimise the risk of bot-detection
rejection by the portal.

---

## 7. MCP Tools Exposed

The following tools are registered on the MCP server:

### 7.1 `login(strategy: str = "browser") → dict`
**Purpose:** Authenticate the user on uslugi.gov.mk and persist the session.

**Parameters:**
- `strategy`: `"browser"` (default) or `"http"`.
  - `"browser"`: Opens a visible Chromium window via Playwright. The user
    logs in manually. Handles SSO, eID, CAPTCHA, 2FA.
  - `"http"`: Direct HTTP POST login. Only works for portals with simple
    form-based auth. Not functional for uslugi.gov.mk due to SSO.

**Returns:** `{ success, message, strategy_used, cookies_saved }`

**Security:** Credentials never pass through this function or the LLM.
For browser strategy: user types in the browser (invisible to Python).
For HTTP strategy: `getpass()` reads from the terminal without echoing.

### 7.2 `logout() → dict`
**Purpose:** Delete the stored session file, effectively logging out.

**Returns:** `{ success, message }`

### 7.3 `check_session() → dict`
**Purpose:** Report whether a local session file exists.

**Note:** This is a local file check only — it does not make a network
request to verify that the server still accepts the cookies.

**Returns:** `{ active, saved_at, message }`

### 7.4 `info_passport_renewal() → dict`
**Purpose:** Fetch structured information about the passport renewal
administrative service (service ID 5200) from the portal API.

**Authentication required:** No. This endpoint is publicly accessible.

**API called:**
```
POST https://uslugi.gov.mk/Services/GetServiceDetails
Content-Type: application/json;charset=UTF-8
from-angular: true

{ "id": "5200", "serviceUniqueId": null }
```

**Data processing:**
- HTML tags are stripped from the description field using a regex.
- Documents, delivery types, and conditions are extracted from nested
  `StateGroupDetails` and `ApsConditions` arrays.
- Deadlines are formatted as "Stage A → Stage B: N days".

**Returns:** `{ serviceId, name, description, requirements, conditions,
deadlines, delivery_in, delivery_out, contact, applyUrl }`

### 7.5 `authenticated_get(url: str) → dict`
**Purpose:** Perform an authenticated HTTP GET to any uslugi.gov.mk endpoint.

**Authentication required:** Yes. Cookies are injected automatically.

**Returns:** `{ status_code, body, error }`

### 7.6 `authenticated_post(url: str, payload: dict) → dict`
**Purpose:** Perform an authenticated HTTP POST to any uslugi.gov.mk
endpoint, sending `payload` as a JSON body.

**Authentication required:** Yes. Cookies are injected automatically.

**Returns:** `{ status_code, body, error }`

---

## 8. The Gemini Agent Loop (Detailed)

The agent's core is an agentic loop — a pattern where the LLM is called
repeatedly until it produces a final text answer.

```
User message received
        │
        ▼
Append to conversation history as role="user"
        │
        ▼
┌─── AGENTIC LOOP ──────────────────────────────────────────────────┐
│                                                                    │
│  Call Gemini with:                                                 │
│    - Full conversation history                                     │
│    - System prompt                                                 │
│    - All MCP tool FunctionDeclarations                             │
│    - mode=AUTO (Gemini decides when to call tools)                 │
│           │                                                        │
│           ▼                                                        │
│  Does the response contain a function_call part?                   │
│           │                                                        │
│    YES    │    NO                                                  │
│     ──────┤    └──► Extract text → print to user → EXIT LOOP      │
│           │                                                        │
│           ▼                                                        │
│  For each function_call in the response:                           │
│    1. Extract tool_name and tool_args                              │
│    2. Print "[Tool call] tool_name(args)"                          │
│    3. Call mcp_session.call_tool(tool_name, tool_args)             │
│    4. Receive result text from MCP server                          │
│    5. Print "[Tool result] ..."                                    │
│    6. Build a FunctionResponse part                                │
│           │                                                        │
│  Append all FunctionResponse parts to history as role="tool"       │
│           │                                                        │
│           └──► Loop back to top (call Gemini again)                │
└────────────────────────────────────────────────────────────────────┘
```

**Why loop?**
Gemini may require multiple tool calls to answer a question. For example:
1. User: "Show me passport renewal info." → Gemini calls `check_session`.
2. check_session says not logged in → Gemini calls `login`.
3. login succeeds → Gemini calls `info_passport_renewal`.
4. info_passport_renewal returns data → Gemini summarises for the user.

Each of these steps is a separate iteration of the inner agentic loop.

---

## 9. Security Design

| Threat | Mitigation |
|---|---|
| LLM receives user credentials | Credentials never appear in any tool parameter. Browser strategy: entered directly in browser. HTTP strategy: collected via `getpass()` from terminal. |
| LLM returns raw cookie values | Tool responses return only structured result dicts. Cookie values never appear in any dict returned to the LLM. |
| Cookies stored in plaintext on disk | Fernet AES-128-CBC + HMAC-SHA256 encryption before every disk write. |
| Cookie file tampered with | Fernet HMAC authentication detects any modification; `InvalidToken` is caught and treated as missing session. |
| Encryption key exposed | Key is loaded from `COOKIE_ENCRYPTION_KEY` env var only. Never hardcoded. `.env` is gitignored. |
| Session reuse after expiry | Every authenticated HTTP response is inspected for 401/403/login-redirect. `SessionExpiredError` is surfaced to the LLM as a human-readable message. |
| Credentials stored in memory longer than needed | In HTTP strategy, username and password variables are explicitly set to `""` immediately after the authentication attempt. |

---

## 10. Configuration

All configuration is centralised in `server/config.py` and loaded from
`.env` via `python-dotenv`. The following variables are supported:

| Variable | Default | Description |
|---|---|---|
| `PORTAL_BASE_URL` | `https://uslugi.gov.mk` | Base URL of the target portal. |
| `AUTH_STRATEGY` | `browser` | Default login strategy (`browser` or `http`). |
| `SESSION_FILE` | `storage/session.enc` | Path to the encrypted cookie file. |
| `COOKIE_ENCRYPTION_KEY` | *(auto-generated)* | Fernet key for cookie encryption. |
| `GEMINI_API_KEY` | *(provided)* | Google AI Studio API key. |

---

## 11. Fallback: HTTP-Based Login

`server/auth/http_auth.py` provides a skeleton for portals that use a
simple HTML form POST for login. The flow is:

1. GET the login page to scrape the CSRF anti-forgery token (hidden input
   field `__RequestVerificationToken`).
2. POST username + password + CSRF token to the login endpoint.
3. Check whether the response indicates success (by `SUCCESS_INDICATOR`
   substring or by checking that the final URL is not the login page).
4. Extract cookies from the `requests.Session`.

**Why this does not work for uslugi.gov.mk:**
The portal uses WS-Federation SSO via eid.mk, which:
- Does not expose a simple form POST endpoint.
- Generates a time-limited `wctx` token that expires in seconds.
- Requires JavaScript execution to complete.

The HTTP strategy is retained in the codebase as a pattern for extending
the system to support other, simpler portals.

---

## 12. Process Startup Sequence

When the user runs `python agent/gemini_agent.py`:

1. `agent/gemini_agent.py` imports and runs `asyncio.run(run_agent())`.
2. `run_agent()` creates `StdioServerParameters` pointing to
   `python -m server.main`.
3. `stdio_client()` spawns `server/main.py` as a child process.
4. `server/main.py` starts. It imports all tool modules (triggering
   `SessionManager.__init__()` which loads or generates the Fernet key).
5. `mcp.run()` starts the JSON-RPC event loop inside the child process.
6. `ClientSession.initialize()` in the agent performs the MCP handshake.
7. `list_tools()` fetches all 6 registered tool schemas.
8. Tool schemas are converted to Gemini `FunctionDeclaration` objects.
9. The terminal prompt is displayed to the user.
10. The conversation loop begins.

---

## 13. File Map

| File | Responsibility |
|---|---|
| `agent/gemini_agent.py` | Gemini Flash conversation loop, MCP client, schema conversion. |
| `server/main.py` | FastMCP server, tool registration with `@mcp.tool()`. |
| `server/config.py` | Centralised env-var loading, constants. |
| `server/auth/session.py` | Fernet-encrypted cookie persistence (`SessionManager`). |
| `server/auth/browser_auth.py` | Playwright-based browser authentication. |
| `server/auth/http_auth.py` | HTTP POST-based authentication (fallback skeleton). |
| `server/client/http_client.py` | Authenticated HTTP client (`AuthenticatedClient`, `SessionExpiredError`). |
| `server/tools/passport.py` | `info_passport_renewal()` tool implementation. |
| `server/tools/session_tools.py` | `login()`, `logout()`, `check_session()` implementations. |
| `storage/session.enc` | Encrypted session file (runtime artifact, gitignored). |
| `.env` | Secrets and configuration (gitignored). |
| `requirements.txt` | Python package dependencies. |
