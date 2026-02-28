"""Run the Blueprint app."""

import os
import sys

# Project root on path so "app" resolves
_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _root)

# Load .env from project root before any app code (so ANTHROPIC_API_KEY etc. are set)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_root, ".env"), override=True)
except ImportError:
    pass

from app.main import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
