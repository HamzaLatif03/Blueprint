"""Page routes: serve the main UI."""

from flask import Blueprint, render_template

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def index():
    """Serve the Blueprint main page."""
    return render_template("index.html")
