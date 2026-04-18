# Video and Screenshot Production Plan

## Video Plan

### Tier 1: Essential Videos (make these first)

| # | Video | Duration | Purpose | Script location |
|---|---|---|---|---|
| V0 | **Channel Intro: "Evolving with AI"** | 45-60s | YouTube channel intro, placeholder | Text animation storyboard in chat history |
| V1 | **Zero to Connected** | 30-45s | Show `viewgraph-init` in two projects, green dots | Demo script in chat history |
| V2 | **See Bug, Fix Bug** (hero demo) | 90-120s | Annotate 3 bugs, fix with Kiro IDE + CLI | Full script in chat history |
| V3 | **Instant A11y Audit** | 60s | `@vg-audit` finds and fixes 4 issues | docs/demo/README.md Demo 2 |

### Tier 2: Feature Demos (make after Tier 1)

| # | Video | Duration | Purpose | Script location |
|---|---|---|---|---|
| V4 | **Generate Playwright Tests** | 2 min | Capture page, `@vg-tests`, show generated file | docs/demo/README.md Demo 3 |
| V5 | **QA Handoff** | 90s | Annotate, Copy MD, show markdown report | docs/demo/README.md Demo 4 |
| V6 | **Regression Detection** | 2-3 min | Baseline, code change, compare_baseline finds it | docs/demo/README.md Walkthrough 2 |
| V7 | **Multi-Step Journey** | 2-3 min | Record flow, analyze_journey, Mermaid diagram | docs/demo/README.md Walkthrough 3 |

### Tier 3: Deep Dives (make when time allows)

| # | Video | Duration | Purpose |
|---|---|---|---|
| V8 | **Design Consistency Check** | 2 min | check_consistency across 3 pages |
| V9 | **Deep A11y Remediation** | 3 min | @vg-a11y on settings page, 5 fixes |
| V10 | **Full End-to-End Showcase** | 15-20 min | All features in sequence (conference/investor demo) |

### Where Videos Embed

| Video | Embed locations |
|---|---|
| V0 (channel intro) | YouTube only |
| V1 (setup) | GitBook: Quick Start, Installation |
| V2 (hero demo) | GitBook: Overview, GitHub README |
| V3 (a11y audit) | GitBook: Features/Extension, Why ViewGraph |
| V4 (test gen) | GitBook: Features/Playwright |
| V5 (QA handoff) | GitBook: Features/Extension |
| V6 (regression) | GitBook: Comparison/Overview |
| V7 (journey) | GitBook: Features/Extension |

---

## Screenshot Plan

### Already Have (16 files)

| File | Used on | Status |
|---|---|---|
| viewgraph-logo.png | Overview | OK |
| viewgraph-combined.png | Quick Start | OK |
| sidebar-annotations.png | Overview | OK |
| hover-highlight.png | Quick Start | OK |
| annotation-panel.png | Quick Start | OK |
| send-to-agent.png | Quick Start | OK |
| send-to-agent-success.png | Quick Start | OK |
| init-output.png | Quick Start | OK |
| green-dot.png | Installation | OK |
| two-projects.png | Multi-Project | OK |
| inspect-tab.png | Extension | OK |
| export-markdown.png | Extension | OK |
| markdown-view.png | Extension | OK |
| mcp-tools-kiro.png | MCP Tools | OK |
| viewgraph-icon.png | Available | Not embedded |
| viewgraph-iconx128.png | Available | Not embedded |

### Need to Capture (14 new screenshots)

#### High Priority (for pages with NO images)

| File name | Page | What to capture | How |
|---|---|---|---|
| `demo-login-broken.png` | **Why ViewGraph** | The broken demo login page (56px heading, sharp corners, visible password) | Open `docs/demo/index.html`, screenshot the full page |
| `demo-login-fixed.png` | **Why ViewGraph** | The same page after agent fixes it | Fix the bugs, reload, screenshot |
| `before-after-split.png` | **Comparison/Overview** | Side-by-side: broken left, fixed right | Combine the two above in an image editor |
| `kiro-audit-output.png` | **Kiro Power** | Kiro CLI or IDE showing `@vg-audit` results table | Run `@vg-audit` on demo login page, screenshot |
| `kiro-review-fixing.png` | **Kiro Power** | Kiro IDE mid-fix showing diff gutter changes | Run `@vg-review`, screenshot during file edit |
| `generated-test.png` | **Playwright** | Editor showing generated `dashboard.spec.ts` | Screenshot the file Kiro generated from `@vg-tests` |
| `accuracy-terminal.png` | **Accuracy** | Terminal showing experiment run with accuracy numbers | Run `node run.js --set a --sites 3`, screenshot summary |
| `prompt-shortcuts-list.png` | **Prompt Shortcuts** | Kiro CLI showing `@vg` tab completion or prompt list | Type `@vg` in Kiro CLI, screenshot the autocomplete |

#### Medium Priority (enhance existing pages)

| File name | Page | What to capture | How |
|---|---|---|---|
| `session-recording.png` | **Extension** | Sidebar showing Record Flow controls + step entries | Start a session, capture 2 steps, screenshot sidebar |
| `resolve-checkmarks.png` | **Extension** | Sidebar with green checkmarks on resolved annotations | Fix annotations via agent, screenshot resolved state |
| `agent-request-card.png` | **Extension** | Agent request card in sidebar with bell icon | Trigger `request_capture` from agent, screenshot card |
| `baseline-diff.png` | **Comparison/Overview** | Terminal or Kiro showing compare_baseline output | Set baseline, make change, run compare_baseline |
| `consistency-check.png` | **Comparison/Overview** | Kiro showing check_consistency results | Capture 2 pages, run check_consistency |
| `multi-project-terminals.png` | **Multi-Project** | Two terminals showing init output on different ports | Run init in both demo folders, screenshot side by side |

### Screenshot Placement Map

After capturing, here's where each goes:

| Page | Current images | Add |
|---|---|---|
| **Overview** | logo, sidebar-annotations | *(good as-is, video V2 will be the hero)* |
| **Why ViewGraph** | NONE | `demo-login-broken.png` at top, `demo-login-fixed.png` after "How ViewGraph Solves This" |
| **Quick Start** | 6 images | *(good as-is, video V1 embed later)* |
| **Installation** | green-dot | *(good as-is)* |
| **Multi-Project** | two-projects | `multi-project-terminals.png` in the example section |
| **Extension** | inspect-tab, export-markdown, markdown-view | `session-recording.png`, `resolve-checkmarks.png`, `agent-request-card.png` |
| **MCP Tools** | mcp-tools-kiro | *(good as-is)* |
| **Playwright** | NONE | `generated-test.png` after the "Generate tests" section |
| **Kiro Power** | NONE | `kiro-audit-output.png`, `kiro-review-fixing.png` |
| **Comparison/Overview** | NONE | `before-after-split.png`, `baseline-diff.png` |
| **Accuracy** | NONE | `accuracy-terminal.png` |
| **Prompt Shortcuts** | NONE | `prompt-shortcuts-list.png` (optional) |
| **Roadmap** | NONE | *(text-only is fine)* |
| **FAQ** | NONE | *(text-only is fine)* |
| **License** | NONE | *(no images needed)* |
| **Privacy** | NONE | *(no images needed)* |

---

## Production Order

### Phase 1: Screenshots (1-2 hours)
Capture all 8 high-priority screenshots. These make the biggest visual impact on pages that currently have no images.

### Phase 2: Tier 1 Videos (2-3 hours)
1. V0 - Channel intro (text animation, can be rough)
2. V1 - Zero to Connected (30 seconds, simple)
3. V2 - Hero demo (the money shot, take multiple takes)
4. V3 - A11y audit (60 seconds, straightforward)

### Phase 3: Embed (30 minutes)
Drop screenshots into `gitbook/.gitbook/assets/`, add YouTube embeds to GitBook pages.

### Phase 4: Tier 2 Videos (when time allows)
V4-V7 in order of impact.

---

## Recording Setup Checklist

Before recording any video:
- [ ] Run `bash ~/coding/prep-demo.sh` to reset demo folders
- [ ] Run `viewgraph-init` in both demo folders
- [ ] Reload extension in Chrome
- [ ] Verify green dots on both projects
- [ ] Set terminal font size to 14-16pt (readable on YouTube)
- [ ] Set browser zoom to 100%
- [ ] Close unnecessary tabs and notifications
- [ ] Resolution: 1920x1080
