"""Flask application factory."""

import os

from flask import Flask

from app.config import BASE_DIR
from app.routes import pages_bp, api_bp


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, "templates"),
        static_folder=os.path.join(BASE_DIR, "static"),
    )
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload
    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)
    return app
