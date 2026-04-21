# The UI Context Layer for AI Coding Agents

<figure><img src=".gitbook/assets/viewgraph-logo.png" alt="ViewGraph" width="420"></figure>

> *Built with Kiro, for Kiro - and every MCP-compatible agent.*

See a bug. Click it. Describe it. Your agent fixes it.

![ViewGraph sidebar with annotations](.gitbook/assets/sidebar-annotations.png)

[![Chrome - Install](https://img.shields.io/badge/Chrome-Install_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/viewgraph-capture/dmgbneoidgmkdcfnlegmfijkedijjnjj) &nbsp; [![Firefox - Install](https://img.shields.io/badge/Firefox-Install_Extension-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/viewgraph-capture/)

[![npm](https://img.shields.io/badge/npm-@viewgraph/core-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/@viewgraph/core) &nbsp; [![GitHub](https://img.shields.io/badge/GitHub-Source_Code-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sourjya/viewgraph)

---

## The Problem

{% hint style="danger" %}
**AI coding agents can read your source code. They cannot see your rendered UI.**
{% endhint %}

- The agent **guesses** CSS fixes instead of seeing the actual layout
- Bug reports land as **vague screenshots** instead of structured evidence
- Accessibility audits find violations but **no path to the source file**
- Visual regressions **slip through** because tests check behavior, not structure
- QA handoffs require **back-and-forth** to clarify what's actually broken

These problems cost teams hours per bug. ViewGraph solves [23 of them](why-viewgraph.md).

---

## How It Works

You click the broken element. You describe what's wrong. You send it to your agent.

The agent receives the element's exact CSS selector, computed styles, accessibility state, bounding box, network errors, console warnings - and your comment. It finds the source file and fixes the code.

No screenshots with arrows. No copy-pasting from DevTools. No "the button is somewhere on the settings page."

![ViewGraph architecture: Your App → Browser → Extension captures DOM → Server → Agent fixes code](.gitbook/assets/viewgraph-architecture.svg)

Works with any web app regardless of backend. Python, Ruby, Java, Go, PHP - if it renders HTML, ViewGraph captures it.

---

## Get Started in 2 Minutes

**Step 1.** Install the browser extension (Chrome or Firefox links above)

**Step 2.** Add to your AI agent's MCP config:

```json
{
  "mcpServers": {
    "viewgraph": { "command": "npx", "args": ["-y", "@viewgraph/core"] }
  }
}
```

**That's it.** The server runs automatically and learns your project from the first capture.

{% hint style="info" %}
**Need version pinning?** `npm install -g @viewgraph/core && viewgraph-init`. See [Installation](getting-started/installation.md) for all options.
{% endhint %}

For the full walkthrough with screenshots, see the [Quick Start Guide](getting-started/quick-start.md).

---

## Who It's For

| | |
|---|---|
| **Developers with AI agents** | See bug → click → describe → agent fixes. Works with Kiro, Claude Code, Cursor, Windsurf, Cline, Aider. |
| **Testers and QA** | Same workflow, no agent needed. Export as Markdown (Jira/GitHub) or ZIP report with screenshots. |
| **Non-technical stakeholders** | Click what looks wrong, describe it in plain language. ViewGraph captures the technical details. |
| **Test automation teams** | Capture DOM during Playwright tests. Generate test files from browser captures. [`@viewgraph/playwright`](https://www.npmjs.com/package/@viewgraph/playwright) |

See [Who Benefits?](who-benefits.md) for the full breakdown.

---

## What Makes It Different

| | ViewGraph | Screenshots + chat | Browser DevTools |
|---|---|---|---|
| Agent gets structured DOM context | ✅ | ❌ | ❌ |
| Works with any MCP agent | ✅ | ❌ | ❌ |
| Non-technical users can report bugs | ✅ | ✅ | ❌ |
| Accessibility audit built in | ✅ | ❌ | Partial |
| Captures network + console errors | ✅ | ❌ | ✅ (manual) |
| Export to Jira/GitHub markdown | ✅ | ❌ | ❌ |
| 92.1% capture accuracy (measured) | ✅ | N/A | N/A |

[Full comparison](comparison/overview.md) | [Capture accuracy details](comparison/accuracy.md) | [37 MCP tools](features/mcp-tools.md)

---

## Open Source

AGPL-3.0 licensed. Full source on [GitHub](https://github.com/sourjya/viewgraph).

| Component | Description |
|---|---|
| [server/](https://github.com/sourjya/viewgraph/tree/main/server) | MCP server - 37 tools, WebSocket collab, baselines |
| [extension/](https://github.com/sourjya/viewgraph/tree/main/extension) | Chrome/Firefox extension - capture, annotate, 17 enrichment collectors |
| [packages/playwright/](https://github.com/sourjya/viewgraph/tree/main/packages/playwright) | Playwright fixture for E2E test captures |
| [power/](https://github.com/sourjya/viewgraph/tree/main/power) | Kiro Power assets - hooks, prompts, steering docs |

{% hint style="success" %}
**GitHub Releases = latest version, always.** Chrome and Firefox stores can lag behind by days or weeks. [GitHub Releases](https://github.com/sourjya/viewgraph/releases/latest) always has the newest extension ZIPs, npm package, and changelog.
{% endhint %}

{% hint style="info" %}
**GitHub:** [github.com/sourjya/viewgraph](https://github.com/sourjya/viewgraph) - star the repo, report issues, contribute

**npm packages:**
- [@viewgraph/core](https://www.npmjs.com/package/@viewgraph/core) - MCP server + CLI tools
- [@viewgraph/playwright](https://www.npmjs.com/package/@viewgraph/playwright) - Playwright test fixture

**Docs:** [chaoslabz.gitbook.io/viewgraph](https://chaoslabz.gitbook.io/viewgraph)
{% endhint %}
