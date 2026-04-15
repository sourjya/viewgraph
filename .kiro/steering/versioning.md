---
inclusion: auto
description: Version numbering, git tagging, and release process
---

# Versioning and Release Process

## Version Scheme

Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0, 2.0.0): Breaking changes to MCP tool interfaces, capture format, or extension API. Users must update their setup.
- **MINOR** (0.1.0, 0.2.0): New features, new MCP tools, new enrichment collectors. Backward compatible.
- **PATCH** (0.1.1, 0.1.2): Bug fixes, documentation updates, performance improvements. No new features.

## Pre-1.0 Rules (Beta)

While in beta (0.x.y):
- Minor version bumps for feature additions (new tools, new extension capabilities)
- Patch bumps for bug fixes
- Breaking changes are allowed without major bump (beta expectation)
- Each minor version gets a git tag

## When to Tag

| Trigger | Version bump | Example |
|---|---|---|
| Bug fix that affects users | PATCH | `0.1.0` -> `0.1.1` |
| Security fix | PATCH (immediate) | `0.1.1` -> `0.1.2` |
| New MCP tool or feature | MINOR | `0.1.2` -> `0.2.0` |
| Extension store update | MINOR or PATCH | Depends on changes |
| npm package update | Match the git tag | `0.2.0` everywhere |
| Breaking format change | MINOR (pre-1.0) | `0.2.0` -> `0.3.0` |
| Stable release | MAJOR | `0.x.y` -> `1.0.0` |

## When NOT to Tag

- Documentation-only changes (no tag, no version bump)
- Internal refactors with no user-visible change
- Test additions
- CI/build changes
- Experiment scripts

## Files to Update on Version Bump

All four must match:

```
package.json                    -> "version": "0.2.0"
server/package.json             -> "version": "0.2.0"
packages/playwright/package.json -> "version": "0.2.0"
extension/wxt.config.js         -> version field in manifest
```

## Release Checklist

1. All tests pass: `npm test`
2. Lint clean: `npm run lint`
3. Update version in all 4 files
4. Update `docs/changelogs/CHANGELOG.md` - move Unreleased items under the new version header with date
5. Commit: `chore: release v0.2.0`
6. Tag: `git tag -a v0.2.0 -m "v0.2.0 - brief description"`
7. Push: `git push origin main --tags`
8. Publish npm (if code changed):
   - `cd packages/playwright && npm publish --access public`
   - `npm publish --access public` (root package)
9. Rebuild extensions (if extension code changed):
   - `npm run build`
   - `npm run pack:all`
   - Upload new ZIPs to Chrome Web Store and Firefox Add-ons
10. Update GitBook roadmap page if features shipped

## Tag Format

```
v0.1.0    (not 0.1.0 - always prefix with v)
v0.2.0
v1.0.0
```

## Git Tag Commands

```bash
# Create annotated tag (always use annotated, not lightweight)
git tag -a v0.1.0 -m "v0.1.0 - Beta: 36 MCP tools, extension, Playwright fixture"

# Push tag
git push origin v0.1.0

# List tags
git tag -l "v*"

# Delete a tag (if you made a mistake)
git tag -d v0.1.0
git push origin --delete v0.1.0
```
