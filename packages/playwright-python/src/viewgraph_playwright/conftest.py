"""
Pytest plugin for viewgraph-playwright.

Provides the `viewgraph` fixture and auto-capture-on-failure hook.
Registered as a pytest plugin via pyproject.toml entry point:
  [project.entry-points.pytest11]
  viewgraph = "viewgraph_playwright.conftest"

Usage:
    async def test_login(page, viewgraph):
        await page.goto("http://localhost:3000/login")
        capture = await viewgraph.capture("login-page")

Auto-capture on failure:
    Enabled by default. Disable per-test with:
    @pytest.mark.viewgraph(capture_on_fail=False)
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from viewgraph_playwright.core import ViewGraphPage

# Store viewgraph instances per test for the failure hook
_active_instances: dict[str, ViewGraphPage] = {}


@pytest.fixture
async def viewgraph(page: Any) -> ViewGraphPage:
    """
    Pytest fixture providing a ViewGraphPage bound to the current page.

    Yields a ViewGraphPage instance. On test failure, automatically
    captures the page state (unless disabled via marker).

    Requires pytest-playwright's `page` fixture.
    """
    vg = ViewGraphPage(page)
    node_id = id(page)
    _active_instances[str(node_id)] = vg
    yield vg
    _active_instances.pop(str(node_id), None)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: Any, call: Any) -> Any:
    """
    Hook that auto-captures page state on test failure.

    Fires after the test call phase. If the test failed and has a
    viewgraph fixture, captures the current page state with failure
    metadata. Disabled by @pytest.mark.viewgraph(capture_on_fail=False).
    """
    outcome = yield
    report = outcome.get_result()

    # Only act on call-phase failures (not setup/teardown)
    if report.when != "call" or not report.failed:
        return

    # Check if auto-capture is disabled via marker
    marker = item.get_closest_marker("viewgraph")
    if marker and not marker.kwargs.get("capture_on_fail", True):
        return

    # Find the viewgraph instance for this test
    if not _active_instances:
        return

    # Get the most recent instance (single-page tests)
    vg = next(iter(_active_instances.values()), None)
    if vg is None:
        return

    test_name = item.nodeid
    reason = str(report.longrepr)[:200] if report.longrepr else "unknown"

    # Run the async capture in the event loop
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(vg.auto_capture_failure(test_name, reason))
        else:
            loop.run_until_complete(vg.auto_capture_failure(test_name, reason))
    except Exception:
        pass  # Don't fail the test report due to capture errors


def pytest_configure(config: Any) -> None:
    """Register the viewgraph marker."""
    config.addinivalue_line(
        "markers",
        "viewgraph(capture_on_fail=True): ViewGraph capture options",
    )
