"""
Mock interview: generate questions and feedback using Claude.
Uses shared Claude client; falls back to static content if API key is missing.
"""

import re
from typing import Optional

from .claude_client import get_client, CLAUDE_MODEL


def generate_question(role: str = "", industry: str = "", context: str = "") -> dict:
    """
    Generate one interview question for the given role/industry.
    Returns { question, question_type }.
    """
    prompt = f"""Generate exactly one interview question suitable for a candidate applying for:
Role: {role or "general"}
Industry: {industry or "general"}
Context: {context or "None"}

Reply with only the question text, one or two sentences. No numbering or prefix."""
    client = get_client()
    if client:
        try:
            msg = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
            )
            text = (msg.content[0].text if msg.content else "").strip()
            return {"question": text or "Tell me about a time you overcame a challenge.", "question_type": "behavioral"}
        except Exception:
            pass
    return {
        "question": "Tell me about a time you overcame a significant challenge at work.",
        "question_type": "behavioral",
    }


def get_feedback(question: str, answer: str, role: str = "") -> dict:
    """
    Get feedback on the user's answer to an interview question.
    Returns { score, feedback_text, strengths, improvements }.
    """
    client = get_client()
    if client:
        try:
            prompt = f"""You are an experienced interviewer. The candidate was asked:
"{question}"

Their answer: "{answer}"

Role/context: {role or "General"}

Give brief feedback in this format:
SCORE: [1-10]
STRENGTHS: [1-2 bullet points]
IMPROVEMENTS: [1-2 bullet points]
FEEDBACK: [2-3 sentences overall]"""
            msg = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            text = (msg.content[0].text if msg.content else "").strip()
            score = 7
            strengths = []
            improvements = []
            feedback_text = text
            if "SCORE:" in text:
                m = re.search(r"SCORE:\s*(\d+)", text, re.I)
                if m:
                    score = min(10, max(1, int(m.group(1))))
            if "STRENGTHS:" in text and "IMPROVEMENTS:" in text:
                strengths_part = text.split("STRENGTHS:")[1].split("IMPROVEMENTS:")[0].strip()
                improvements_part = text.split("IMPROVEMENTS:")[1].split("FEEDBACK:")[0].strip() if "FEEDBACK:" in text else text.split("IMPROVEMENTS:")[1].strip()
                strengths = [s.strip().lstrip("-•").strip() for s in strengths_part.split("\n") if s.strip()]
                improvements = [s.strip().lstrip("-•").strip() for s in improvements_part.split("\n") if s.strip()]
            if "FEEDBACK:" in text:
                feedback_text = text.split("FEEDBACK:")[1].strip()
            return {
                "score": score,
                "feedback_text": feedback_text[:500],
                "strengths": strengths[:3],
                "improvements": improvements[:3],
            }
        except Exception:
            pass
    return {
        "score": 7,
        "feedback_text": "Practice more concrete examples and structure (situation, task, action, result).",
        "strengths": ["Clear communication"],
        "improvements": ["Add a specific example with metrics"],
    }
