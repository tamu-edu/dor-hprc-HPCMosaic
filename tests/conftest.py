import pytest
from flask import Flask

from views.api import api
from views.api import layout


@pytest.fixture
def layouts_dir(tmp_path, monkeypatch):
    """Use a fresh temporary layout directory for each test."""
    monkeypatch.setattr(layout, "get_layouts_dir", lambda _user: str(tmp_path))
    return tmp_path


@pytest.fixture
def app(layouts_dir):
    """Create the smallest Flask app needed to exercise the API routes."""
    app = Flask(__name__)
    app.config.update(TESTING=True)
    app.register_blueprint(api, url_prefix="/api")
    return app


@pytest.fixture
def client(app):
    """Return Flask's in-process HTTP client."""
    return app.test_client()
