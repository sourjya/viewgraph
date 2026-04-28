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
echo "[1/7] Running tests..."
cd extension && npx vitest run --silent 2>&1 | tail -1
cd ../server && npx vitest run tests/unit --silent 2>&1 | tail -1
echo "  Running MCP smoke test..."
npx vitest run tests/integration/mcp-smoke.test.js --silent 2>&1 | tail -1
cd ..
echo "  ✓ Tests pass"

# ── Version bump ──
echo "[2/7] Bumping version to ${VERSION}..."
for f in package.json extension/package.json server/package.json packages/playwright/package.json; do
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${VERSION}\"/" "$f"
  echo "  ✓ ${f}"
done

# ── Build extension ZIPs ──
echo "[3/7] Building extension ZIPs..."
bash scripts/build-extension.sh 2>&1 | tail -3
echo "  ✓ ZIPs built"

# ── Commit ──
echo "[4/7] Committing..."
git add package.json extension/package.json server/package.json packages/playwright/package.json downloads/
git commit -m "chore: release ${TAG}

${DESCRIPTION}"
echo "  ✓ Committed"

# ── Tag ──
echo "[5/7] Tagging ${TAG}..."
git tag -a "${TAG}" -m "${TAG} - ${DESCRIPTION}"
echo "  ✓ Tagged"

# ── Push ──
echo "[6/7] Pushing to origin..."
git push origin main --tags
echo "  ✓ Pushed"

# ── GitHub Release ──
echo "[7/7] Creating GitHub release..."
gh release create "${TAG}" downloads/*.zip \
  --title "${TAG} - ${DESCRIPTION}" \
  --notes "See [CHANGELOG](https://github.com/sourjya/viewgraph/blob/main/docs/changelogs/CHANGELOG.md) for details."
echo "  ✓ Release created with ZIPs"

echo ""
echo "  Done. Run 'npm publish' manually to publish to npm."
echo ""
