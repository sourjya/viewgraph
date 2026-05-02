"""
Bundle loader for the ViewGraph JS capture script.

Loads the pre-built JavaScript bundle that gets injected into browser
pages via page.add_script_tag(). The bundle exposes window.__vg with
traverseDOM, scoreAll, serialize, and captureSnapshot functions.

Two loading paths:
1. Repo context: reads from packages/playwright/bundle-prebuilt.js
2. PyPI install: reads _bundle.js shipped as package data

The bundle is cached after first load (one file read per process).
"""

from __future__ import annotations

from pathlib import Path

_cached_bundle: str | None = None

# Repo-relative path to the TS package's pre-built bundle
_REPO_BUNDLE = Path(__file__).parent.parent.parent.parent / "playwright" / "bundle-prebuilt.js"

# Package-data fallback (shipped in wheel)
_LOCAL_BUNDLE = Path(__file__).parent / "_bundle.js"


def load_bundle() -> str:
    """
    Load the ViewGraph JS bundle string.

    Tries repo path first (development), then local package data (PyPI install).
    Raises FileNotFoundError if neither exists.

    Returns:
        The JavaScript IIFE string ready for page.add_script_tag().
    """
    global _cached_bundle
    if _cached_bundle is not None:
        return _cached_bundle

    # Try repo context first
    if _REPO_BUNDLE.exists():
        content = _REPO_BUNDLE.read_text(encoding="utf-8")
        # Extract the IIFE string from the ESM export
        _cached_bundle = _extract_bundle_string(content)
        return _cached_bundle

    # Fall back to local package data
    if _LOCAL_BUNDLE.exists():
        _cached_bundle = _LOCAL_BUNDLE.read_text(encoding="utf-8")
        return _cached_bundle

    raise FileNotFoundError(
        "ViewGraph JS bundle not found. "
        "If running from the repo, ensure packages/playwright/bundle-prebuilt.js exists "
        "(run 'node packages/playwright/scripts/build-bundle.js'). "
        "If installed from PyPI, the package may be corrupted - try reinstalling."
    )


def _extract_bundle_string(content: str) -> str:
    """
    Extract the IIFE string from bundle-prebuilt.js ESM export.

    The file contains: export const PREBUILT_BUNDLE = `(function() { ... })();`;
    We need just the IIFE string without the ESM wrapper.
    """
    # Find the template literal content between backticks
    start = content.find("`")
    end = content.rfind("`")
    if start == -1 or end == -1 or start == end:
        # Not a template literal - return as-is (might be raw IIFE)
        return content.strip()
    return content[start + 1 : end]
