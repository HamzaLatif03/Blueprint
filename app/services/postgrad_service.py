"""
University opportunities: match user interests to PhD/Masters programmes using Claude.
Uses shared Claude client; falls back to mock programmes if API key is missing.
"""

import json
import re
from typing import Optional

from .claude_client import get_client, CLAUDE_MODEL


def match_programmes(interests: str, background: str = "", degree_type: str = "") -> list[dict]:
    """
    Match user profile to relevant PhD and Masters programmes.
    degree_type: "phd", "masters", or "" for both.
    Returns list of { name, institution, degree_type, match_pct, focus, location }.
    """
    interests = (interests or "").strip()
    if not interests:
        return []

    want = degree_type.strip().lower() if degree_type else "both"
    if want not in ("phd", "masters", "both"):
        want = "both"

    client = get_client()
    if client:
        try:
            prompt = f"""The user is looking for postgraduate programmes. They said:
Interests: "{interests}"
Background: "{background or 'Not specified'}"
They want: {want}

Suggest 4-6 specific PhD and/or Masters programmes that match. For each give: programme name, institution, degree type (PhD or Masters), match percentage (0-100), focus area, location.

Reply with a JSON array only. Example:
[{{"name": "PhD in Sustainable Energy", "institution": "University of Bristol", "degree_type": "PhD", "match_pct": 92, "focus": "Renewables, policy", "location": "Bristol, UK"}}]"""
            msg = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            text = msg.content[0].text if msg.content else ""
            match = re.search(r"\[[\s\S]*\]", text)
            if match:
                data = json.loads(match.group())
                out = []
                for i, row in enumerate(data[:6]):
                    out.append({
                        "id": f"prog-{i+1}",
                        "name": row.get("name") or "Programme",
                        "institution": row.get("institution") or "University",
                        "degree_type": row.get("degree_type") or "Masters",
                        "match_pct": min(99, max(1, int(row.get("match_pct", 70)))),
                        "focus": row.get("focus") or "Various",
                        "location": row.get("location") or "Various",
                    })
                return out
        except Exception:
            pass

    # Fallback when Claude is not available
    return [
        {"id": "prog-1", "name": "MSc in Data Science", "institution": "University of Bristol", "degree_type": "Masters", "match_pct": 88, "focus": "Data, ML", "location": "Bristol, UK"},
        {"id": "prog-2", "name": "PhD in Computer Science", "institution": "University of Bristol", "degree_type": "PhD", "match_pct": 85, "focus": "AI, systems", "location": "Bristol, UK"},
        {"id": "prog-3", "name": "MSc in Sustainability", "institution": "Example University", "degree_type": "Masters", "match_pct": 82, "focus": "Environment, policy", "location": "UK"},
    ]
