# Multi-Export Annotations - Tasks

**Spec:** `.kiro/specs/multi-export/`
**Branch:** `feat/multi-export`

## Phase 1: Copy as Markdown (quick win)

- [ ] 1.1 Create `lib/export-markdown.js` - `formatMarkdown(annotations, metadata)` pure function
- [ ] 1.2 Write tests for formatMarkdown - empty, single, multiple, resolved, no comment
- [ ] 1.3 Add "Copy Markdown" button to sidebar footer
- [ ] 1.4 Wire button to formatMarkdown + clipboard copy with "Copied!" confirmation
- [ ] 1.5 Disable button when no annotations

## Phase 2: Screenshot cropping

- [ ] 2.1 Create `lib/screenshot-crop.js` - `cropRegions(viewportDataUrl, annotations)` using canvas
- [ ] 2.2 Write tests for cropRegions - single region, multiple regions, edge cases
- [ ] 2.3 Add background.js handler for `capture-viewport` that calls `captureVisibleTab()`
- [ ] 2.4 Wire content script to request viewport capture and crop per annotation
- [ ] 2.5 Add `includeScreenshots` toggle to settings panel

## Phase 3: Download Report (ZIP)

- [ ] 3.1 Add JSZip dependency to extension
- [ ] 3.2 Create `lib/export-zip.js` - assembles markdown + screenshots into ZIP blob
- [ ] 3.3 Write tests for ZIP assembly
- [ ] 3.4 Add "Download Report" button to sidebar footer
- [ ] 3.5 Wire button: capture viewport -> crop -> assemble ZIP -> chrome.downloads
- [ ] 3.6 Disable button when no annotations

## Phase 4: Sidebar layout

- [ ] 4.1 Refactor sidebar footer to three-button layout (Send / Copy / Download)
- [ ] 4.2 Verify all three buttons respect disabled-when-empty
- [ ] 4.3 Build, full test suite, commit
