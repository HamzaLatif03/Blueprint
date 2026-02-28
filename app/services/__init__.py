"""Business logic for uni students and job hunters."""

from .application_service import list_applications, add_application, update_application, delete_application
from .interview_service import generate_question, get_feedback
from .postgrad_service import match_programmes
from .claude_client import is_available as claude_available

__all__ = [
    "list_applications",
    "add_application",
    "update_application",
    "delete_application",
    "generate_question",
    "get_feedback",
    "match_programmes",
    "claude_available",
]
