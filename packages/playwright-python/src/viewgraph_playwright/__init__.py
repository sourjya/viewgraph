"""
viewgraph-playwright: Structured DOM capture for Playwright Python tests.

Provides a pytest fixture that captures ViewGraph DOM snapshots during
Playwright E2E tests. Captures are saved to .viewgraph/captures/ and
consumed by the ViewGraph MCP server - giving AI coding agents full
UI context when tests fail.

Usage:
    async def test_login(page, viewgraph):
        await page.goto("http://localhost:3000/login")
        capture = await viewgraph.capture("login-page")
        await viewgraph.annotate("#email", "Missing aria-label")

Architecture: Python orchestrates bundle injection and file I/O.
DOM traversal and serialization run as JavaScript in the browser
via page.evaluate(), reusing the same bundle as @viewgraph/playwright.
"""

from viewgraph_playwright.core import ViewGraphPage
from viewgraph_playwright.conftest import viewgraph

__all__ = ["ViewGraphPage", "viewgraph"]
__version__ = "0.1.0"
