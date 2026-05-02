"""
Tests for viewgraph-playwright Python package.

Uses mock Playwright page objects since real browser tests require
a running browser. Integration tests with real Playwright should be
run separately via: pytest tests/ -m integration

These unit tests verify:
- ViewGraphPage.capture() calls page.evaluate with correct JS
- ViewGraphPage.annotate() stores annotations and validates selectors
- ViewGraphPage.snapshot() returns HTML string
- capture_with_annotations() merges annotations into capture
- auto_capture_failure() adds test metadata
- _generate_filename() produces correct format
- Bundle loader finds and caches the JS bundle
- Conftest fixture yields ViewGraphPage instance
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from viewgraph_playwright.core import ViewGraphPage, _generate_filename
from viewgraph_playwright.bundle import load_bundle, _extract_bundle_string


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

def _make_mock_page():
    """Create a mock Playwright page with async evaluate and add_script_tag."""
    page = AsyncMock()
    page.on = MagicMock()

    # Default evaluate returns a valid capture structure
    page.evaluate = AsyncMock(return_value={
        "metadata": {
            "url": "http://localhost:3000/login",
            "timestamp": "2026-05-02T10:00:00.000Z",
            "captureMode": "full",
        },
        "nodes": [{"id": "n1", "tag": "div"}],
    })
    page.add_script_tag = AsyncMock()
    return page


@pytest.fixture
def mock_page():
    return _make_mock_page()


@pytest.fixture
def tmp_captures(tmp_path):
    return tmp_path / ".viewgraph" / "captures"


# ──────────────────────────────────────────────
# _generate_filename
# ──────────────────────────────────────────────

class TestGenerateFilename:
    """Tests for the filename generation utility."""

    def test_basic_filename(self):
        meta = {"url": "http://localhost:3000/login", "timestamp": "2026-05-02T10:00:00.000Z"}
        name = _generate_filename(meta)
        assert name.startswith("viewgraph-localhost-")
        assert name.endswith(".json")

    def test_filename_with_label(self):
        meta = {"url": "http://example.com", "timestamp": "2026-05-02T10:00:00.000Z"}
        name = _generate_filename(meta, "after-login")
        assert "after-login" in name

    def test_filename_sanitizes_label(self):
        meta = {"url": "http://example.com", "timestamp": "2026-05-02T10:00:00.000Z"}
        name = _generate_filename(meta, "My Test! @#$")
        assert "my-test" in name
        assert "@" not in name

    def test_filename_missing_url(self):
        meta = {"timestamp": "2026-05-02T10:00:00.000Z"}
        name = _generate_filename(meta)
        assert "unknown" in name


# ──────────────────────────────────────────────
# ViewGraphPage.capture
# ──────────────────────────────────────────────

class TestCapture:
    """Tests for the capture() method."""

    @pytest.mark.asyncio
    async def test_capture_writes_json_file(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        capture = await vg.capture("test-page")

        assert capture["metadata"]["captureMode"] == "playwright-python"
        assert capture["metadata"]["label"] == "test-page"

        # File was written
        files = list(tmp_captures.glob("*.json"))
        assert len(files) == 1
        written = json.loads(files[0].read_text())
        assert written["metadata"]["captureMode"] == "playwright-python"

    @pytest.mark.asyncio
    async def test_capture_without_label(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        capture = await vg.capture()

        assert "label" not in capture["metadata"]
        files = list(tmp_captures.glob("*.json"))
        assert len(files) == 1

    @pytest.mark.asyncio
    async def test_capture_injects_bundle(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        await vg.capture()

        mock_page.add_script_tag.assert_called_once()
        call_kwargs = mock_page.add_script_tag.call_args
        assert "content" in call_kwargs.kwargs or len(call_kwargs.args) > 0

    @pytest.mark.asyncio
    async def test_capture_creates_directory(self, mock_page, tmp_path):
        deep_dir = tmp_path / "a" / "b" / "c"
        vg = ViewGraphPage(mock_page, captures_dir=deep_dir)
        await vg.capture()

        assert deep_dir.exists()


# ──────────────────────────────────────────────
# ViewGraphPage.annotate
# ──────────────────────────────────────────────

class TestAnnotate:
    """Tests for the annotate() method."""

    @pytest.mark.asyncio
    async def test_annotate_stores_annotation(self, mock_page, tmp_captures):
        mock_page.evaluate = AsyncMock(side_effect=[
            True,  # __vg check
            {  # annotation result
                "id": "pw-123",
                "uuid": "abc-def",
                "type": "element",
                "selector": "#email",
                "comment": "Missing label",
                "severity": "major",
                "category": "",
                "region": {"x": 10, "y": 20, "width": 200, "height": 30},
                "timestamp": "2026-05-02T10:00:00Z",
            },
        ])
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        vg._injected = True

        ann = await vg.annotate("#email", "Missing label")
        assert ann["selector"] == "#email"
        assert ann["comment"] == "Missing label"
        assert len(vg._annotations) == 1

    @pytest.mark.asyncio
    async def test_annotate_element_not_found(self, mock_page, tmp_captures):
        mock_page.evaluate = AsyncMock(side_effect=[
            True,  # __vg check
            None,  # element not found
        ])
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        vg._injected = True

        with pytest.raises(ValueError, match="Element not found"):
            await vg.annotate("#nonexistent", "test")

    @pytest.mark.asyncio
    async def test_annotate_custom_severity(self, mock_page, tmp_captures):
        mock_page.evaluate = AsyncMock(side_effect=[
            True,
            {"id": "pw-1", "uuid": "u1", "type": "element", "selector": "h1",
             "comment": "Too big", "severity": "minor", "category": "visual",
             "region": {"x": 0, "y": 0, "width": 100, "height": 50},
             "timestamp": "2026-05-02T10:00:00Z"},
        ])
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        vg._injected = True

        ann = await vg.annotate("h1", "Too big", severity="minor", category="visual")
        assert ann["severity"] == "minor"
        assert ann["category"] == "visual"


# ──────────────────────────────────────────────
# ViewGraphPage.snapshot
# ──────────────────────────────────────────────

class TestSnapshot:
    """Tests for the snapshot() method."""

    @pytest.mark.asyncio
    async def test_snapshot_returns_html(self, mock_page, tmp_captures):
        mock_page.evaluate = AsyncMock(side_effect=[
            True,  # __vg check
            "<html><body>Hello</body></html>",
        ])
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        vg._injected = True

        html = await vg.snapshot()
        assert "<html>" in html


# ──────────────────────────────────────────────
# ViewGraphPage.capture_with_annotations
# ──────────────────────────────────────────────

class TestCaptureWithAnnotations:
    """Tests for capture_with_annotations()."""

    @pytest.mark.asyncio
    async def test_merges_annotations(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        vg._annotations = [
            {"id": "pw-1", "uuid": "u1", "selector": "#btn", "comment": "Fix me"},
        ]

        capture = await vg.capture_with_annotations("review")
        assert "annotations" in capture
        assert len(capture["annotations"]) == 1
        assert capture["metadata"]["captureMode"] == "playwright-python-review"
        # Annotations cleared after capture
        assert len(vg._annotations) == 0

    @pytest.mark.asyncio
    async def test_no_annotations_skips_merge(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        capture = await vg.capture_with_annotations()
        assert "annotations" not in capture


# ──────────────────────────────────────────────
# auto_capture_failure
# ──────────────────────────────────────────────

class TestAutoCapture:
    """Tests for auto_capture_failure()."""

    @pytest.mark.asyncio
    async def test_captures_with_test_metadata(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        capture = await vg.auto_capture_failure(
            "tests/test_login.py::test_submit", "AssertionError: expected 200"
        )

        assert capture is not None
        assert capture["metadata"]["testName"] == "tests/test_login.py::test_submit"
        assert "AssertionError" in capture["metadata"]["failureReason"]

    @pytest.mark.asyncio
    async def test_returns_none_on_error(self, mock_page, tmp_captures):
        mock_page.evaluate = AsyncMock(side_effect=Exception("browser closed"))
        mock_page.add_script_tag = AsyncMock()
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)

        result = await vg.auto_capture_failure("test::fail", "error")
        assert result is None


# ──────────────────────────────────────────────
# Bundle loader
# ──────────────────────────────────────────────

class TestBundleLoader:
    """Tests for the JS bundle loading."""

    def test_extract_bundle_string_from_esm(self):
        content = 'export const PREBUILT_BUNDLE = `(function() { console.log("hi"); })();`;'
        result = _extract_bundle_string(content)
        assert result.startswith("(function()")
        assert "console.log" in result

    def test_extract_bundle_string_raw_iife(self):
        content = '(function() { console.log("hi"); })();'
        result = _extract_bundle_string(content)
        assert "console.log" in result

    def test_load_bundle_caches(self):
        """Bundle is cached after first load."""
        import viewgraph_playwright.bundle as bmod
        bmod._cached_bundle = "cached_test_value"
        try:
            assert load_bundle() == "cached_test_value"
        finally:
            bmod._cached_bundle = None

    def test_load_bundle_from_repo(self):
        """In repo context, loads from packages/playwright/bundle-prebuilt.js."""
        import viewgraph_playwright.bundle as bmod
        bmod._cached_bundle = None
        try:
            bundle = load_bundle()
            assert len(bundle) > 100  # Non-trivial JS content
            assert "function" in bundle.lower()
        except FileNotFoundError:
            pytest.skip("bundle-prebuilt.js not available")
        finally:
            bmod._cached_bundle = None


# ──────────────────────────────────────────────
# Navigation re-injection
# ──────────────────────────────────────────────

class TestNavigation:
    """Tests for bundle re-injection after navigation."""

    def test_registers_load_listener(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        mock_page.on.assert_called_once()
        args = mock_page.on.call_args
        assert args[0][0] == "load"

    def test_mark_not_injected_resets_flag(self, mock_page, tmp_captures):
        vg = ViewGraphPage(mock_page, captures_dir=tmp_captures)
        vg._injected = True
        vg._mark_not_injected()
        assert vg._injected is False
