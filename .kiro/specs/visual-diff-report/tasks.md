# Capture Diffing Visual Report - Tasks

### Task 1: Report generator module
- [ ] Create `server/src/analysis/report-generator.js`
- [ ] Accept diff data (from capture-diff.js) and capture metadata
- [ ] Generate self-contained HTML string with inline CSS/JS
- [ ] Element tree with color-coded diff markers
- [ ] Detail panel on element click
- [ ] Tests: generates valid HTML, includes all diff elements, file size under 500KB

### Task 2: MCP tool
- [ ] Create `server/src/tools/generate-diff-report.js`
- [ ] Params: file_a, file_b (capture filenames)
- [ ] Calls capture-diff, passes to report-generator, writes to .viewgraph/reports/
- [ ] Returns file path
- [ ] Tests: generates report file, handles missing captures

### Task 3: Interactive features (embedded JS)
- [ ] Filter by change type (added/removed/changed/all)
- [ ] Filter by element role
- [ ] Search by selector or text content
- [ ] Collapsible element tree sections

### Task 4: CLI command
- [ ] Create `scripts/viewgraph-diff.js`
- [ ] Accepts two capture filenames as arguments
- [ ] Generates report and opens in default browser
- [ ] Falls back to printing file path if browser open fails

### Task 5: Kiro prompt
- [ ] Create `@vg-diff-report` prompt
- [ ] Finds two most recent captures, generates report, returns path
