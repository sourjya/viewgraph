"""
ViewGraphPage - Core capture API for Playwright Python.

Wraps a Playwright Page object and provides methods to capture structured
DOM snapshots, add programmatic annotations, and take HTML snapshots.
All DOM operations run as JavaScript in the browser via page.evaluate(),
reusing the same traverser/serializer as the TypeScript fixture.

Usage:
    vg = ViewGraphPage(page)
    capture = await vg.capture("after-login")
    await vg.annotate("#email", "Missing aria-label", severity="major")
    full = await vg.capture_with_annotations("review")
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from viewgraph_playwright.bundle import load_bundle

# Default captures directory relative to cwd
DEFAULT_CAPTURES_DIR = Path.cwd() / ".viewgraph" / "captures"


class ViewGraphPage:
    """
    ViewGraph capture interface bound to a Playwright page.

    Injects the VG bundle on first use and re-injects after navigations.
    Captures are written to captures_dir as JSON files compatible with
    the ViewGraph MCP server (all 41 tools work without modification).

    Args:
        page: Playwright async Page object.
        captures_dir: Output directory for capture files. Defaults to .viewgraph/captures/.
    """

    def __init__(self, page: Any, captures_dir: Path | None = None) -> None:
        self._page = page
        self._captures_dir = captures_dir or DEFAULT_CAPTURES_DIR
        self._injected = False
        self._annotations: list[dict] = []

        # Re-inject after navigations (page context resets)
        page.on("load", lambda _: self._mark_not_injected())

    def _mark_not_injected(self) -> None:
        """Reset injection flag after page navigation."""
        self._injected = False

    async def _ensure_injected(self) -> None:
        """
        Inject the VG bundle into the page if not already present.

        Checks for window.__vg existence first to avoid double-injection.
        Uses page.add_script_tag for reliable execution in all contexts.
        """
        if self._injected:
            has_vg = await self._page.evaluate("typeof window.__vg !== 'undefined'")
            if has_vg:
                return

        bundle = load_bundle()
        await self._page.add_script_tag(content=bundle)
        self._injected = True

    async def capture(self, label: str | None = None) -> dict:
        """
        Capture the current page state as a ViewGraph JSON object.

        Runs DOM traversal, salience scoring, and serialization in the
        browser, then writes the result to captures_dir.

        Args:
            label: Human-readable label for the capture (e.g., "after-login").

        Returns:
            The capture dict (also written to disk).
        """
        await self._ensure_injected()

        capture = await self._page.evaluate("""() => {
            const viewport = { width: window.innerWidth, height: window.innerHeight };
            const { elements, relations } = window.__vg.traverseDOM();
            const scored = window.__vg.scoreAll(elements, viewport);
            return window.__vg.serialize(scored, relations);
        }""")

        # Tag with source
        capture["metadata"]["captureMode"] = "playwright-python"
        if label:
            capture["metadata"]["label"] = label

        # Write to disk
        self._captures_dir.mkdir(parents=True, exist_ok=True)
        filename = _generate_filename(capture["metadata"], label)
        filepath = self._captures_dir / filename
        filepath.write_text(json.dumps(capture), encoding="utf-8")

        return capture

    async def annotate(
        self,
        selector: str,
        comment: str,
        severity: str = "major",
        category: str = "",
    ) -> dict:
        """
        Add a programmatic annotation to an element.

        The annotation is stored in memory and attached to the next
        capture_with_annotations() call.

        Args:
            selector: CSS selector of the element to annotate.
            comment: Description of the issue.
            severity: One of "critical", "major", "minor". Defaults to "major".
            category: One of "visual", "functional", "a11y", "content", "perf".

        Returns:
            The annotation dict.

        Raises:
            ValueError: If the selector doesn't match any element.
        """
        await self._ensure_injected()

        annotation = await self._page.evaluate(
            """({ sel, cmt, sev, cat }) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                return {
                    id: 'pw-' + Date.now(),
                    uuid: crypto.randomUUID(),
                    type: 'element',
                    selector: sel,
                    comment: cmt,
                    severity: sev,
                    category: cat,
                    region: {
                        x: Math.round(rect.left + window.scrollX),
                        y: Math.round(rect.top + window.scrollY),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    },
                    timestamp: new Date().toISOString(),
                };
            }""",
            {"sel": selector, "cmt": comment, "sev": severity, "cat": category},
        )

        if annotation is None:
            raise ValueError(f"Element not found: {selector}")

        self._annotations.append(annotation)
        return annotation

    async def snapshot(self) -> str:
        """
        Capture an HTML snapshot of the current page.

        Returns:
            The full HTML string of the page.
        """
        await self._ensure_injected()
        return await self._page.evaluate("() => window.__vg.captureSnapshot()")

    async def capture_with_annotations(self, label: str | None = None) -> dict:
        """
        Capture with all pending annotations attached.

        Combines capture() + any annotations added via annotate().
        Clears the annotation buffer after writing.

        Args:
            label: Human-readable label for the capture.

        Returns:
            The capture dict with annotations included.
        """
        capture = await self.capture(label)

        if self._annotations:
            capture["annotations"] = self._annotations
            capture["metadata"]["captureMode"] = "playwright-python-review"
            # Re-write with annotations
            filename = _generate_filename(capture["metadata"], label)
            filepath = self._captures_dir / filename
            filepath.write_text(json.dumps(capture), encoding="utf-8")
            self._annotations = []

        return capture

    async def auto_capture_failure(self, test_name: str, failure_reason: str) -> dict | None:
        """
        Capture page state on test failure. Called by the pytest hook.

        Args:
            test_name: Fully qualified test name (file::function).
            failure_reason: Short failure description.

        Returns:
            The capture dict, or None if capture fails.
        """
        try:
            capture = await self.capture(f"FAIL-{test_name.split('::')[-1]}")
            capture["metadata"]["testName"] = test_name
            capture["metadata"]["failureReason"] = failure_reason[:500]
            # Re-write with test metadata
            filename = _generate_filename(capture["metadata"], f"FAIL-{test_name.split('::')[-1]}")
            filepath = self._captures_dir / filename
            filepath.write_text(json.dumps(capture), encoding="utf-8")
            return capture
        except Exception:
            return None


def _generate_filename(metadata: dict, label: str | None = None) -> str:
    """
    Generate a capture filename from metadata.

    Format: viewgraph-{hostname}-{timestamp}-{label}.json
    Matches the TypeScript fixture naming convention.

    Args:
        metadata: Capture metadata dict with url and timestamp fields.
        label: Optional label suffix.

    Returns:
        Filename string.
    """
    try:
        hostname = urlparse(metadata.get("url", "")).hostname or "unknown"
    except Exception:
        hostname = "unknown"

    ts = metadata.get("timestamp", datetime.now(timezone.utc).isoformat())
    ts_clean = ts.replace(":", "").replace(".", "").replace("T", "-")[:17]
    suffix = ""
    if label:
        suffix = "-" + re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")

    return f"viewgraph-{hostname}-{ts_clean}{suffix}.json"
