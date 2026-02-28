"""
Shared Claude (Anthropic) API client for Blueprint.
All Claude usage goes through this module. Set ANTHROPIC_API_KEY in .env.
"""

import os
from typing import Optional

try:
    import anthropic
except ImportError:
    anthropic = None

# Default model for all Blueprint features
CLAUDE_MODEL = "claude-sonnet-4-20250514"


def get_client():
    """Return Anthropic client if API key is set; otherwise None (features use fallbacks)."""
    if anthropic is None:
        return None
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return None
    return anthropic.Anthropic(api_key=api_key)


def complete(prompt: str, max_tokens: int = 512) -> Optional[str]:
    """
    Send a single user prompt to Claude and return the assistant text.
    Returns None on failure or missing key; callers should use fallbacks.
    """
    client = get_client()
    if not client:
        return None
    try:
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        if msg.content and len(msg.content) > 0:
            return (msg.content[0].text or "").strip()
        return None
    except Exception:
        return None


def is_available() -> bool:
    """Return True if Claude API is configured and usable."""
    return get_client() is not None
