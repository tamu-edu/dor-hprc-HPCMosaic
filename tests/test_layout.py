import json

import pytest

from views.api import layout


SAMPLE_LAYOUT = {
    "widgets": [
        {"id": "jobs", "x": 0, "y": 0},
        {"id": "storage", "x": 1, "y": 0},
    ]
}


def test_save_layout_writes_json_file(client, layouts_dir):
    response = client.post(
        "/api/save_layout",
        json={"layout_name": "research", "layout_data": SAMPLE_LAYOUT},
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "message": "Layout 'research' saved successfully"
    }
    assert json.loads((layouts_dir / "research.json").read_text()) == SAMPLE_LAYOUT


@pytest.mark.parametrize(
    "payload",
    [
        {"layout_data": SAMPLE_LAYOUT},
        {"layout_name": "research"},
        {"layout_name": "research", "layout_data": {}},
    ],
)
def test_save_layout_rejects_missing_values(client, payload):
    response = client.post("/api/save_layout", json=payload)

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Missing layout_name or layout_data"
    }


def test_save_layout_returns_500_when_write_fails(client, monkeypatch):
    def fail_dump(*_args, **_kwargs):
        raise OSError("write failed")

    monkeypatch.setattr(layout.json, "dump", fail_dump)

    response = client.post(
        "/api/save_layout",
        json={"layout_name": "research", "layout_data": SAMPLE_LAYOUT},
    )

    assert response.status_code == 500
    assert "error" in response.get_json()


def test_get_layouts_lists_only_user_layout_json_files(client, layouts_dir):
    (layouts_dir / "research.json").write_text("{}")
    (layouts_dir / "teaching.json").write_text("{}")
    (layouts_dir / "_preferences.json").write_text("{}")
    (layouts_dir / "notes.txt").write_text("not a layout")

    response = client.get("/api/get_layouts")

    assert response.status_code == 200
    assert set(response.get_json()["layouts"]) == {"research", "teaching"}


def test_get_layouts_returns_500_when_directory_read_fails(client, monkeypatch):
    def fail_listdir(_path):
        raise OSError("directory read failed")

    monkeypatch.setattr(layout.os, "listdir", fail_listdir)

    response = client.get("/api/get_layouts")

    assert response.status_code == 500
    assert "error" in response.get_json()


def test_load_layout_returns_saved_data(client, layouts_dir):
    (layouts_dir / "research.json").write_text(json.dumps(SAMPLE_LAYOUT))

    response = client.get("/api/load_layout?layout_name=research")

    assert response.status_code == 200
    assert response.get_json() == {
        "layout_name": "research",
        "layout_data": SAMPLE_LAYOUT,
    }


def test_load_layout_rejects_missing_name(client):
    response = client.get("/api/load_layout")

    assert response.status_code == 400
    assert response.get_json() == {"error": "Missing layout_name"}


def test_load_layout_returns_404_for_unknown_layout(client):
    response = client.get("/api/load_layout?layout_name=unknown")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Layout 'unknown' does not exist"}


def test_load_layout_returns_500_for_malformed_json(client, layouts_dir):
    (layouts_dir / "broken.json").write_text("{not valid json")

    response = client.get("/api/load_layout?layout_name=broken")

    assert response.status_code == 500
    assert "error" in response.get_json()


def test_delete_layout_removes_file(client, layouts_dir):
    layout_file = layouts_dir / "research.json"
    layout_file.write_text(json.dumps(SAMPLE_LAYOUT))

    response = client.delete(
        "/api/delete_layout", json={"layout_name": "research"}
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "message": "Layout 'research' deleted successfully"
    }
    assert not layout_file.exists()


def test_delete_layout_rejects_missing_name(client):
    response = client.delete("/api/delete_layout", json={})

    assert response.status_code == 400
    assert response.get_json() == {"error": "Missing layout_name"}


def test_delete_layout_returns_404_for_unknown_layout(client):
    response = client.delete(
        "/api/delete_layout", json={"layout_name": "unknown"}
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Layout 'unknown' does not exist"}


def test_delete_layout_returns_500_when_remove_fails(
    client, layouts_dir, monkeypatch
):
    (layouts_dir / "research.json").write_text("{}")

    def fail_remove(_path):
        raise OSError("remove failed")

    monkeypatch.setattr(layout.os, "remove", fail_remove)

    response = client.delete(
        "/api/delete_layout", json={"layout_name": "research"}
    )

    assert response.status_code == 500
    assert "error" in response.get_json()


def test_rename_layout_moves_file_and_preserves_data(client, layouts_dir):
    old_file = layouts_dir / "old-name.json"
    new_file = layouts_dir / "new-name.json"
    old_file.write_text(json.dumps(SAMPLE_LAYOUT))

    response = client.post(
        "/api/rename_layout",
        json={"old_name": "old-name", "new_name": "new-name"},
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "message": "Layout 'old-name' renamed to 'new-name' successfully"
    }
    assert not old_file.exists()
    assert json.loads(new_file.read_text()) == SAMPLE_LAYOUT


@pytest.mark.parametrize(
    "payload",
    [
        {"new_name": "new-name"},
        {"old_name": "old-name"},
        {"old_name": "", "new_name": "new-name"},
    ],
)
def test_rename_layout_rejects_missing_values(client, payload):
    response = client.post("/api/rename_layout", json=payload)

    assert response.status_code == 400
    assert response.get_json() == {"error": "Missing old_name or new_name"}


def test_rename_layout_returns_404_for_unknown_source(client):
    response = client.post(
        "/api/rename_layout",
        json={"old_name": "unknown", "new_name": "new-name"},
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Layout 'unknown' does not exist"}


def test_rename_layout_rejects_existing_destination(client, layouts_dir):
    (layouts_dir / "old-name.json").write_text("{}")
    (layouts_dir / "new-name.json").write_text("{}")

    response = client.post(
        "/api/rename_layout",
        json={"old_name": "old-name", "new_name": "new-name"},
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "A layout named 'new-name' already exists"
    }


def test_rename_layout_returns_500_when_rename_fails(
    client, layouts_dir, monkeypatch
):
    (layouts_dir / "old-name.json").write_text("{}")

    def fail_rename(_old_path, _new_path):
        raise OSError("rename failed")

    monkeypatch.setattr(layout.os, "rename", fail_rename)

    response = client.post(
        "/api/rename_layout",
        json={"old_name": "old-name", "new_name": "new-name"},
    )

    assert response.status_code == 500
    assert "error" in response.get_json()
