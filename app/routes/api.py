"""API routes for Blueprint: uni opportunities, mock interviews, job tracking."""

from flask import Blueprint, request, jsonify

from app.services import (
    list_applications,
    add_application,
    update_application,
    delete_application,
    generate_question,
    get_feedback,
    match_programmes,
    claude_available,
)

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/status", methods=["GET"])
def status():
    """Return whether Claude is configured (for UI hint)."""
    return jsonify({"claude_available": claude_available()})


# ---- University opportunities (PhD/Masters match) ----
@api_bp.route("/programmes/match", methods=["POST"])
def programmes_match():
    """Match user interests to PhD/Masters programmes."""
    data = request.get_json() or {}
    interests = (data.get("interests") or data.get("description") or "").strip()
    background = (data.get("background") or "").strip()
    degree_type = (data.get("degree_type") or "").strip()
    programmes = match_programmes(interests, background=background, degree_type=degree_type)
    return jsonify({"programmes": programmes})


# ---- Mock interviews ----
@api_bp.route("/interview/question", methods=["POST"])
def interview_question():
    """Generate an interview question."""
    data = request.get_json() or {}
    role = (data.get("role") or "").strip()
    industry = (data.get("industry") or "").strip()
    context = (data.get("context") or "").strip()
    result = generate_question(role=role, industry=industry, context=context)
    return jsonify(result)


@api_bp.route("/interview/feedback", methods=["POST"])
def interview_feedback():
    """Get feedback on an interview answer."""
    data = request.get_json() or {}
    question = (data.get("question") or "").strip()
    answer = (data.get("answer") or "").strip()
    role = (data.get("role") or "").strip()
    result = get_feedback(question, answer, role=role)
    return jsonify(result)


# ---- Job tracking ----
@api_bp.route("/applications", methods=["GET"])
def applications_list():
    """List tracked job applications."""
    return jsonify({"applications": list_applications()})


@api_bp.route("/applications", methods=["POST"])
def applications_add():
    """Add a job application."""
    data = request.get_json() or {}
    company = (data.get("company") or "").strip()
    role = (data.get("role") or "").strip()
    status = (data.get("status") or "Applied").strip()
    app = add_application(company, role, status)
    return jsonify(app)


@api_bp.route("/applications/<app_id>", methods=["PATCH"])
def applications_update(app_id: str):
    """Update application status/details."""
    data = request.get_json() or {}
    updated = update_application(app_id, **data)
    if not updated:
        return jsonify({"error": "not found"}), 404
    return jsonify(updated)


@api_bp.route("/applications/<app_id>", methods=["DELETE"])
def applications_delete(app_id: str):
    """Remove an application."""
    if not delete_application(app_id):
        return jsonify({"error": "not found"}), 404
    return jsonify({"status": "deleted"})
