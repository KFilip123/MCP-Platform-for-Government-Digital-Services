"""
server/auth/session.py
────────────────────────────────────────────────────────────────────────────────
Secure cookie persistence layer.

Responsibilities:
  1. Encrypt cookies with Fernet (AES-128-CBC + HMAC) before writing to disk.
  2. Decrypt and return them on demand.
  3. Auto-generate an encryption key on first run (printed to console so the
     developer can persist it in .env for next time).
  4. Provide a validity check so the HTTP client can detect expired sessions.

Why Fernet?
  Fernet is a high-level, authenticated encryption scheme from the
  `cryptography` package.  It is simple to use, hard to misuse, and produces
  an opaque token that cannot be tampered with or read without the key.

Cookie format stored on disk:
  {
    "cookies": { "<name>": "<value>", ... },
    "saved_at": "<ISO-8601 timestamp>"
  }
  The whole JSON blob is Fernet-encrypted and base64-encoded in the .enc file.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from server.config import COOKIE_ENCRYPTION_KEY, SESSION_FILE


class SessionManager:
    """
    Manages saving and loading of encrypted session cookies.

    Usage:
        sm = SessionManager()
        sm.save({"some_cookie": "abc123"})
        cookies = sm.load()   # returns dict or None
        sm.clear()
    """

    def __init__(self):
        # Resolve the Fernet encryption key.
        # Priority: COOKIE_ENCRYPTION_KEY env var → auto-generate.
        self._fernet = self._init_fernet()

    # ── Key management ────────────────────────────────────────────────────────

    def _init_fernet(self) -> Fernet:
        """
        Return a Fernet instance backed by the configured (or generated) key.
        If no key is configured, a new one is generated and printed to stdout
        so the developer can paste it into .env.
        """
        key_str = COOKIE_ENCRYPTION_KEY.strip()

        if not key_str:
            # First run: generate a fresh key.
            new_key = Fernet.generate_key()
            key_str = new_key.decode()
            print(
                "\n[SessionManager] No COOKIE_ENCRYPTION_KEY found in .env.\n"
                f"  Generated key: {key_str}\n"
                "  → Add this line to your .env file:\n"
                f"  COOKIE_ENCRYPTION_KEY={key_str}\n"
            )

        return Fernet(key_str.encode())

    # ── Public API ────────────────────────────────────────────────────────────

    def save(self, cookies: dict) -> None:
        """
        Encrypt and persist a cookie dict to SESSION_FILE.

        Args:
            cookies: Plain dict of { cookie_name: cookie_value }.
        """
        payload = {
            "cookies": cookies,
            # Record the timestamp so we can reason about freshness later.
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }
        # Serialize to JSON bytes, then encrypt.
        plaintext = json.dumps(payload).encode()
        ciphertext = self._fernet.encrypt(plaintext)

        # Ensure the storage directory exists.
        SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)

        # Write the encrypted token (bytes) to disk.
        SESSION_FILE.write_bytes(ciphertext)
        print(f"[SessionManager] Session saved to {SESSION_FILE}")

    def load(self) -> dict | None:
        """
        Load and decrypt the saved cookie dict.

        Returns:
            A dict of cookies if a valid, decryptable session file exists.
            None if the file is missing, corrupted, or the key is wrong.
        """
        if not SESSION_FILE.exists():
            return None

        try:
            ciphertext = SESSION_FILE.read_bytes()
            plaintext = self._fernet.decrypt(ciphertext)
            payload = json.loads(plaintext)
            return payload.get("cookies", {})
        except InvalidToken:
            # Key mismatch or tampered file.
            print("[SessionManager] WARNING: Could not decrypt session file "
                  "(wrong key or corrupted data). Treating session as missing.")
            return None
        except Exception as exc:
            print(f"[SessionManager] ERROR loading session: {exc}")
            return None

    def clear(self) -> None:
        """Delete the stored session file (logout)."""
        if SESSION_FILE.exists():
            SESSION_FILE.unlink()
            print("[SessionManager] Session file deleted (logged out).")
        else:
            print("[SessionManager] No session file to delete.")

    def is_present(self) -> bool:
        """Return True if a session file exists on disk (not validity-checked)."""
        return SESSION_FILE.exists()

    def saved_at(self) -> str | None:
        """
        Return the ISO-8601 timestamp when the session was saved, or None.
        Useful for displaying session age in the MCP tool response.
        """
        if not SESSION_FILE.exists():
            return None
        try:
            ciphertext = SESSION_FILE.read_bytes()
            plaintext = self._fernet.decrypt(ciphertext)
            payload = json.loads(plaintext)
            return payload.get("saved_at")
        except Exception:
            return None


# ── Module-level singleton ────────────────────────────────────────────────────
# Other modules import this single instance rather than constructing their own.
# This ensures all parts of the app share the same Fernet key in memory.
session_manager = SessionManager()
