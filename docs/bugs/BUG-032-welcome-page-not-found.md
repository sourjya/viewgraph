# BUG-032: Welcome page ERR_FILE_NOT_FOUND on fresh install

| Field | Value |
|-------|-------|
| **ID** | BUG-032 |
| **Severity** | Medium |
| **Status** | Fixed |
| **Reported** | 2026-05-20 |
| **Reporter** | Internal (fresh Chrome Web Store install) |
| **Fixed** | 2026-05-20 |
| **Branch** | `fix/bug-032-welcome-page-not-found` |

## Description

On first install from Chrome Web Store, the welcome page shows "Your file couldn't be accessed - ERR_FILE_NOT_FOUND" instead of the onboarding page. The extension sidebar panel displays the Chrome error page.

**Expected behavior:** Welcome page opens in a new tab showing onboarding content.

**Actual behavior:** New tab opens with `chrome-extension://.../welcome/index.html` which doesn't exist in the built extension, showing ERR_FILE_NOT_FOUND.

## Reproduction Steps

1. Install ViewGraph from Chrome Web Store (fresh install, not update)
2. Observe: new tab opens with file-not-found error

## Root Cause

WXT flattens entrypoint paths during build: `entrypoints/welcome/index.html` → `welcome.html` at the extension root. The background script referenced the source path `welcome/index.html` instead of the build output path `welcome.html`.

## Fix Description

Changed `chrome.runtime.getURL('welcome/index.html')` to `chrome.runtime.getURL('welcome.html')` in `background.js`.

## Files Changed

- `extension/entrypoints/background.js` - fixed welcome page URL path

## Regression Tests

- Manual: fresh install opens welcome page correctly
