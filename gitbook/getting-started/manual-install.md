# Install from GitHub

The Chrome Web Store and Firefox Add-ons versions may be behind the latest release. This page explains why, and walks you through installing the latest extension directly from GitHub.

{% hint style="success" %}
**Latest ZIPs:** [github.com/sourjya/viewgraph/tree/main/downloads](https://github.com/sourjya/viewgraph/tree/main/downloads)
{% endhint %}

## Why is the store version behind?

Both the Chrome Web Store and Firefox Add-ons require a manual review process before publishing updates. This is a good thing - it protects users from malicious extensions. However, it means updates can take anywhere from a few hours to several weeks to appear in the store, depending on reviewer availability and queue length.

This is outside our control and affects all browser extensions, not just ViewGraph. During active development, the GitHub release will often be ahead of the store version. Both are safe to use - the store version is simply an older, already-reviewed build.

## Are the GitHub ZIPs safe?

Yes. The ZIP files on GitHub are built from the same open-source code you can see in the repository:

- The extension source code is in [`extension/`](https://github.com/sourjya/viewgraph/tree/main/extension) - fully readable, no obfuscation
- ZIPs are produced by the [`scripts/build-extension.sh`](https://github.com/sourjya/viewgraph/blob/main/scripts/build-extension.sh) build script, which runs the standard build toolchain and packages the output
- Each release is [tagged in git](https://github.com/sourjya/viewgraph/tags) (e.g., `v0.3.7`) so you can verify exactly which code produced the ZIP
- The extension [manifest](https://github.com/sourjya/viewgraph/blob/main/extension/manifest.json) lists every permission it requests - nothing hidden
- You can always [build from source](installation.md#build-from-source) yourself if you prefer full control

The extension runs entirely on your machine. No data is sent to any external server. See [Security](../reference/security.md) for the full security model.

## How to check your extension version

1. Click the ViewGraph icon in your browser toolbar
2. The version number appears in the sidebar footer (e.g., `v0.3.7`)
3. Compare with the latest version on [GitHub Releases](https://github.com/sourjya/viewgraph/releases)

If your extension version is behind, follow the steps below for your browser.

## Version mismatch warning

When the MCP server (installed via npm) is newer than your browser extension, ViewGraph shows a banner in the sidebar:

> Extension v0.1.0 is behind server v0.3.7. [Update extension](#)

This means `npx` pulled the latest server, but your browser extension hasn't received the store update yet. Install the latest ZIP from GitHub to resolve it.

---

## Chrome / Edge / Brave

Chrome-based installs are **persistent** - the extension survives browser restarts.

### Step by step

1. Go to the [downloads folder](https://github.com/sourjya/viewgraph/tree/main/downloads) on GitHub
2. Download `viewgraph-chrome-x.x.x.zip` (the latest version)
3. Unzip to a permanent folder on your machine (e.g., `~/viewgraph-extension/`)
4. Open `chrome://extensions/` in your browser
5. Enable **Developer mode** (toggle in the top-right corner)
6. Click **Load unpacked** and select the unzipped folder
7. Pin the ViewGraph icon to your toolbar for easy access

### Updating

When a new version is released:
1. Download the new ZIP from [downloads](https://github.com/sourjya/viewgraph/tree/main/downloads)
2. Unzip over the same folder (overwrite existing files)
3. Go to `chrome://extensions/` and click the **refresh** icon (↻) on the ViewGraph card

{% hint style="info" %}
**Disable the store version first.** If you have both the store version and the sideloaded version installed, disable the store version on `chrome://extensions/` to avoid conflicts. You can re-enable it later if you prefer to switch back.
{% endhint %}

---

## Firefox

Firefox sideloaded extensions are **temporary** - they are removed when the browser closes.

### Step by step

1. Go to the [downloads folder](https://github.com/sourjya/viewgraph/tree/main/downloads) on GitHub
2. Download `viewgraph-firefox-x.x.x.zip` (the latest version)
3. Open `about:debugging#/runtime/this-firefox` in Firefox
4. Click **Load Temporary Add-on**
5. Select the `.zip` file directly (no need to unzip)

### Updating

Download the new ZIP and repeat step 3-5. The old version is replaced automatically.

{% hint style="warning" %}
**Firefox removes temporary add-ons on restart.** You'll need to re-load the ZIP each time you restart Firefox. This is a Firefox limitation, not a ViewGraph issue.

For a persistent Firefox install, use the [Firefox Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/) (may be behind) or [build from source](installation.md#build-from-source) with [`web-ext`](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).
{% endhint %}

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Load unpacked" not visible | Enable **Developer mode** toggle on `chrome://extensions/` |
| Extension icon doesn't appear after loading | Click the puzzle piece icon in Chrome toolbar → pin ViewGraph |
| Firefox says "Add-on could not be installed" | Make sure you selected the `.zip` file, not a file inside it |
| Two ViewGraph icons in toolbar | Disable the store version on `chrome://extensions/` |
| Extension works but sidebar shows red dot | The extension and MCP server are separate. Check [Installation](installation.md#verify) for server setup. |
