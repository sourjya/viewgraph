#!/bin/bash
# Release script - runs the full release pipeline in order.
# Usage: bash scripts/release.sh "0.7.0" "short description"
#
# Steps:
# 1. Verify tests pass
# 2. Bump version in all 4 package.json files
# 3. Build extension ZIPs
# 4. Commit version bump + ZIPs
# 5. Tag
# 6. Push
# 7. Create GitHub release with ZIPs attached
#
# Aborts on any failure. Idempotent - safe to re-run if a step fails.

set -euo pipefail

VERSION="${1:?Usage: bash scripts/release.sh VERSION DESCRIPTION}"
DESCRIPTION="${2:?Usage: bash scripts/release.sh VERSION DESCRIPTION}"
TAG="v${VERSION}"

echo ""
echo "  ┌──────────────────────────────────────────┐"
echo "  │  ViewGraph Release ${TAG}                  "
echo "  └──────────────────────────────────────────┘"
echo ""

# ── Pre-flight checks ──
echo "[1/8] Running tests..."
cd extension && npx vitest run --silent 2>&1 | tail -1
cd ../server && npx vitest run tests/unit --silent 2>&1 | tail -1
echo "  Running MCP smoke test..."
npx vitest run tests/integration/mcp-smoke.test.js --silent 2>&1 | tail -1
cd ..

# Verify no hardcoded version strings that disagree with package.json
echo "  Checking for stale version strings..."
STALE=$(grep -rn "\"0\.[0-9]\+\.[0-9]\+\"" server/src/constants.js extension/lib/constants.js 2>/dev/null | grep -v "node_modules" | grep -v "package.json" | grep -v "${VERSION}" | grep -v "//" || true)
if [ -n "$STALE" ]; then
  echo "  ERROR: Found hardcoded version strings that don't match ${VERSION}:"
  echo "$STALE"
  echo "  Fix these before releasing."
  exit 1
fi

# Verify server actually starts and responds to real tool calls
echo "  Verifying server starts and handles tool calls..."
VERIFY_DIR=$(mktemp -d)
mkdir -p "$VERIFY_DIR/captures"
INIT_MSG='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"release-check","version":"1.0"}}}'
TOOLS_MSG='{"jsonrpc":"2.0","id":2,"method":"notifications/initialized"}'
LIST_MSG='{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}'
CALL_MSG='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"list_captures","arguments":{}}}'

SERVER_OUT=$(echo -e "${INIT_MSG}\n${TOOLS_MSG}\n${LIST_MSG}\n${CALL_MSG}" | timeout 15 node server/index.js 2>/dev/null)
rm -rf "$VERIFY_DIR"

# Check initialize response exists
if ! echo "$SERVER_OUT" | grep -q '"serverInfo"'; then
  echo "  ERROR: Server failed to respond to initialize"
  echo "  Output: $(echo "$SERVER_OUT" | head -3)"
  exit 1
fi

# Check tools/list returned tools
TOOL_COUNT=$(echo "$SERVER_OUT" | grep -o '"name"' | wc -l)
if [ "$TOOL_COUNT" -lt 40 ]; then
  echo "  ERROR: Server registered only $TOOL_COUNT tools (expected 41+)"
  exit 1
fi

# Check list_captures tool call succeeded (not an error response)
if echo "$SERVER_OUT" | grep -q '"error".*"list_captures"'; then
  echo "  ERROR: list_captures tool call failed"
  exit 1
fi

echo "  ✓ Server verified: $TOOL_COUNT tools registered, tool calls working"

# Verify extension builds without errors
echo "  Building extension to verify no import/syntax errors..."
cd extension && npx wxt build 2>&1 | tail -1
BUILD_SIZE=$(ls -la .output/chrome-mv3/content-scripts/content.js 2>/dev/null | awk '{print $5}')
if [ -z "$BUILD_SIZE" ] || [ "$BUILD_SIZE" -lt 100000 ]; then
  echo "  ERROR: Extension build failed or content script too small ($BUILD_SIZE bytes)"
  exit 1
fi
cd ..
echo "  ✓ Extension build verified (content script: $((BUILD_SIZE / 1024))KB)"

# Bundle size budget check
echo "  Checking bundle size budgets..."
node scripts/check-bundle-size.js
if [ $? -ne 0 ]; then
  echo "  ERROR: Bundle size budget exceeded. Fix before releasing."
  exit 1
fi

# Verify all server dependencies resolve (catches missing deps like fast-json-patch)
echo "  Checking server dependency resolution..."
DEP_CHECK=$(node -e "
  const pkg = require('./server/package.json');
  const missing = [];
  for (const dep of Object.keys(pkg.dependencies || {})) {
    try { require.resolve(dep); } catch { missing.push(dep); }
  }
  if (missing.length) { console.error('Missing: ' + missing.join(', ')); process.exit(1); }
  console.log(Object.keys(pkg.dependencies).length + ' deps OK');
" 2>&1)
if [ $? -ne 0 ]; then
  echo "  ERROR: Server dependencies not installed: $DEP_CHECK"
  echo "  Run: npm install"
  exit 1
fi
echo "  ✓ $DEP_CHECK"

# Verify root package.json has all server deps (catches the fast-json-patch bug)
echo "  Checking root package.json includes all server deps..."
MISSING_ROOT=$(node -e "
  const root = require('./package.json');
  const server = require('./server/package.json');
  const missing = [];
  for (const dep of Object.keys(server.dependencies || {})) {
    if (!root.dependencies?.[dep]) missing.push(dep);
  }
  if (missing.length) { console.error('Missing from root: ' + missing.join(', ')); process.exit(1); }
  console.log('All server deps in root package.json');
" 2>&1)
if [ $? -ne 0 ]; then
  echo "  ERROR: $MISSING_ROOT"
  echo "  Add missing deps to root package.json before publishing."
  exit 1
fi
echo "  ✓ $MISSING_ROOT"

echo "  ✓ All pre-flight checks pass"

# ── Version bump ──
echo "[2/8] Bumping version to ${VERSION}..."
for f in package.json extension/package.json server/package.json packages/playwright/package.json; do
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${VERSION}\"/" "$f"
  echo "  ✓ ${f}"
done

# ── Build extension ZIPs ──
echo "[3/8] Building extension ZIPs..."
bash scripts/build-extension.sh 2>&1 | tail -3
echo "  ✓ ZIPs built"

# ── Commit ──
echo "[4/8] Committing..."
git add package.json extension/package.json server/package.json packages/playwright/package.json downloads/
git commit -m "chore: release ${TAG}

${DESCRIPTION}"
echo "  ✓ Committed"

# ── Tag ──
echo "[5/8] Tagging ${TAG}..."
git tag -a "${TAG}" -m "${TAG} - ${DESCRIPTION}"
echo "  ✓ Tagged"

# ── Push ──
echo "[6/8] Pushing to origin..."
git push origin main --tags
echo "  ✓ Pushed"

# ── GitHub Release ──
echo "[7/8] Creating GitHub release..."
gh release create "${TAG}" downloads/*.zip \
  --title "${TAG} - ${DESCRIPTION}" \
  --notes "See [CHANGELOG](https://github.com/sourjya/viewgraph/blob/main/docs/changelogs/CHANGELOG.md) for details."
echo "  ✓ Release created with ZIPs"

echo ""
echo "  Done. Run 'npm publish' manually to publish to npm."
echo ""
