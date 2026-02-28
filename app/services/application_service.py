"""
Job application tracker (Job Hunting mode).
In-memory store; use DB in production.
"""

from typing import Optional

_applications: list[dict] = []


def list_applications() -> list[dict]:
    return list(_applications)


def add_application(company: str, role: str, status: str = "Applied") -> dict:
    app = {
        "id": f"app-{len(_applications) + 1}",
        "company": (company or "").strip(),
        "role": (role or "").strip(),
        "status": status.strip() or "Applied",
        "date": None,  # optional: add date from client
    }
    _applications.append(app)
    return app


def update_application(app_id: str, **kwargs) -> Optional[dict]:
    for a in _applications:
        if a["id"] == app_id:
            if "company" in kwargs:
                a["company"] = str(kwargs["company"]).strip()
            if "role" in kwargs:
                a["role"] = str(kwargs["role"]).strip()
            if "status" in kwargs:
                a["status"] = str(kwargs["status"]).strip()
            if "date" in kwargs:
                a["date"] = kwargs["date"]
            return a
    return None


def delete_application(app_id: str) -> bool:
    global _applications
    for i, a in enumerate(_applications):
        if a["id"] == app_id:
            _applications = _applications[:i] + _applications[i + 1 :]
            return True
    return False
