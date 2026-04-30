# Dependency Risk Audit — 2026-04-30

**Scope:** All 4 package.json files (root, server, extension, packages/playwright)
**Total prod dependencies (resolved):** 421 | **Total (incl. dev):** 932
**npm audit:** 0 vulnerabilities (clean)

---

## Executive Summary

The dependency graph is lean and intentional. Zero CVEs, all server deps are synced to root (the fast-json-patch bug is fixed), and the Playwright package has zero runtime deps. The main risks are: (1) nearly all deps use `^` ranges instead of exact pins, (2) four single-maintainer packages in the critical path, (3) the MCP SDK pulls in Express and 156 transitive deps making it the dominant amplifier, and (4) three packages haven't been published in 2+ years.

---

## Findings

### 1. Version Pinning — Almost All Deps Use `^` Ranges

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Packages** | All except `fast-json-patch` (pinned at `3.1.1`) |
| **Manifests** | root, server, extension |
| **Issue** | Every dependency except fast-json-patch uses `^` caret ranges. While package-lock.json is committed and provides deterministic installs, `npm install` on a fresh clone or CI without `--frozen-lockfile` can resolve to newer minor/patch versions. |
| **Failure mode** | A breaking change in a minor release (common in pre-1.0 packages like zod v4) silently enters the build. |
| **Remediation** | Pin all production dependencies to exact versions in all manifests. Keep `^` for devDependencies only. Use `npm ci` (not `npm install`) in CI. |
| **Effort** | Low |

### 2. Single-Maintainer Packages (Bus Factor = 1)

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Packages** | `chokidar` (paulmillr), `pngjs` (lukeapage), `zod` (colinhacks), `wxt` (aklinker1) |
| **Issue** | Four dependencies each have a single npm maintainer. chokidar and zod are critical-path (file watching and schema validation). wxt is the entire extension build toolchain. |
| **Failure mode** | Maintainer becomes unavailable → no security patches, no compatibility updates. |
| **Remediation** | No immediate action needed — all four are actively maintained. Monitor: if any goes 6+ months without a release, identify alternatives. For zod specifically, the ecosystem is large enough that a fork would emerge quickly. For wxt, document the extension build process so a manual Vite/Rollup config could replace it if needed. |
| **Effort** | Low (monitoring only) |

### 3. MCP SDK — Dominant Transitive Amplifier

| Field | Value |
|---|---|
| **Severity** | Low |
| **Package** | `@modelcontextprotocol/sdk@^1.29.0` |
| **Issue** | Pulls in 156 transitive dependencies including Express 5, cors, body-parser, ajv, and the full HTTP server stack. This single dependency accounts for ~37% of total prod dependencies (156/421). |
| **Failure mode** | Any vulnerability in Express or its subtree becomes ViewGraph's vulnerability. The attack surface is larger than necessary for a stdio-based MCP server. |
| **Remediation** | This is upstream — ViewGraph can't control it. The SDK is maintained by Anthropic (6 maintainers, MIT license, actively developed). Monitor for SDK versions that offer a lighter transport option. No action needed now. |
| **Effort** | N/A |

### 4. Stale Dependencies — No Updates in 2+ Years

| Field | Value |
|---|---|
| **Severity** | Low |
| **Packages** | `fast-json-patch` (last publish: Mar 2022, 4+ years), `pngjs` (last publish: Feb 2023, 3+ years), `jszip` (last publish: Aug 2022, 3+ years) |
| **Issue** | These packages haven't had a release in years. fast-json-patch and jszip appear to be "done" (stable, feature-complete). pngjs is a PNG codec with no recent activity. |
| **Failure mode** | If a CVE is found, there may be no maintainer to patch it. |
| **Remediation** | All three are stable, low-surface-area libraries with zero transitive deps (fast-json-patch, pngjs) or minimal deps (jszip). Accept the risk for now. If a CVE appears, fast-json-patch can be replaced with `rfc6902` (MIT, actively maintained). pngjs can be replaced with `sharp` (though heavier). jszip has no good lightweight alternative. |
| **Effort** | Low (monitoring only) |

### 5. License Inconsistency — Extension and Server Say MIT, Project Is AGPL

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Manifests** | `extension/package.json` (MIT), `server/package.json` (MIT) |
| **Issue** | The root package.json and COPYING file declare AGPL-3.0. The extension and server package.json files declare MIT. ADR-009 chose AGPL specifically to prevent closed-source forks. The MIT declarations in sub-packages contradict this. |
| **Failure mode** | Someone could argue the server or extension code is MIT-licensed based on the package.json `license` field, undermining the AGPL protection. |
| **Remediation** | Change `license` in both `server/package.json` and `extension/package.json` to `"AGPL-3.0"` to match the root and COPYING file. If the MIT license on the extension is intentional (e.g., to allow proprietary browser extension forks), document that decision in an ADR. |
| **Effort** | Low |

### 6. axe-core MPL-2.0 License in Extension

| Field | Value |
|---|---|
| **Severity** | Low |
| **Package** | `axe-core@^4.11.2` in extension |
| **Issue** | MPL-2.0 is a weak copyleft license. It requires that modifications to MPL-licensed files be shared under MPL, but it doesn't infect the rest of the project. Compatible with AGPL-3.0 when used as a dependency (not modified). |
| **Failure mode** | If ViewGraph modifies axe-core source files directly, those modifications must be released under MPL-2.0. |
| **Remediation** | No action needed — axe-core is used as-is (imported, not modified). The `public/axe.min.js` is the unmodified published build. Document this in a license compliance note if preparing for legal review. |
| **Effort** | None |

### 7. jszip Dual License (MIT OR GPL-3.0)

| Field | Value |
|---|---|
| **Severity** | Low |
| **Package** | `jszip@^3.10.1` in extension |
| **Issue** | jszip is dual-licensed MIT OR GPL-3.0-or-later. The project can choose MIT, which is compatible with AGPL-3.0. |
| **Failure mode** | None if MIT is chosen. |
| **Remediation** | No action needed. If doing a formal license audit, document that jszip is used under its MIT license option. |
| **Effort** | None |

### 8. Server/Root Dependency Sync — Currently Clean

| Field | Value |
|---|---|
| **Severity** | Info |
| **Issue** | All 7 server production dependencies are present in root package.json with matching version ranges. The historical fast-json-patch sync bug is fixed. |
| **Remediation** | No action needed. Consider adding a CI check that verifies server deps are a subset of root deps (a simple `node -e` script in the test suite). |
| **Effort** | Low |

### 9. uuid Override — Verify Still Needed

| Field | Value |
|---|---|
| **Severity** | Low |
| **Package** | `uuid` overridden to `14.0.0` in root package.json |
| **Issue** | The override forces uuid to v14 for a transitive dep of `wxt → web-ext-run → node-notifier → uuid`. This is a dev-only path (wxt is a devDependency of the extension). The override is in the root manifest which ships to npm. |
| **Failure mode** | The override may become unnecessary when wxt updates its dependency tree, or may conflict with future uuid versions. |
| **Remediation** | Verify periodically. When wxt updates past 0.20.x, check if the override can be removed. |
| **Effort** | Low |

### 10. esbuild postinstall Downloads Binaries

| Field | Value |
|---|---|
| **Severity** | Low |
| **Package** | `esbuild` (transitive via wxt, dev-only) |
| **Issue** | esbuild's postinstall script downloads platform-specific binaries. This is standard and expected for esbuild, but it means `npm install` makes network calls and executes code. |
| **Failure mode** | Supply chain attack if esbuild's binary distribution is compromised. Blocked installs in air-gapped environments. |
| **Remediation** | No action needed — this is how esbuild works and it's dev-only. The package is maintained by the creator of Figma with high security standards. |
| **Effort** | None |

---

## Dependency Inventory — Production

| Package | Version | Manifest | License | Transitive | Last Publish | Maintainers | Necessity |
|---|---|---|---|---|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.29.0 | root, server | MIT | 156 | Mar 2026 | 6 | Essential |
| `chokidar` | ^5.0.0 | root, server | MIT | 1 | Nov 2025 | 1 ⚠️ | Essential |
| `fast-json-patch` | 3.1.1 | root, server | MIT | 0 | Mar 2022 ⚠️ | 4 | Essential |
| `pixelmatch` | ^7.1.0 | root, server | ISC | 1 | Apr 2026 | 29 | Essential |
| `pngjs` | ^7.0.0 | root, server | MIT | 0 | Feb 2023 ⚠️ | 1 ⚠️ | Essential |
| `ws` | ^8.20.0 | root, server | MIT | 2 | Mar 2026 | 4 | Essential |
| `zod` | ^4.3.6 | root, server | MIT | 0 | Apr 2026 | 1 ⚠️ | Essential |
| `axe-core` | ^4.11.2 | extension | MPL-2.0 | 0 | Apr 2026 | 4 | Essential |
| `jszip` | ^3.10.1 | extension | MIT/GPL-3.0 | 0 | Aug 2022 ⚠️ | 3 | Essential |

All production dependencies are actively used in code. No unused dependencies found.

---

## Quick Wins

1. **Pin production deps to exact versions** — Remove `^` from all production dependency versions in root, server, and extension package.json. Keep `^` for devDependencies. This is the highest-value change.
2. **Fix license fields** — Set `server/package.json` and `extension/package.json` license to `"AGPL-3.0"` (or document the MIT choice in an ADR if intentional).
3. **Add server↔root sync check** — A 5-line script in CI that fails if server deps aren't mirrored in root. Prevents the fast-json-patch class of bug from recurring.
4. **Use `npm ci` in CI** — Ensures lockfile is respected exactly. Add to any CI/CD scripts.

---

## Overall Assessment

**Healthy.** The project has a lean dependency graph with zero vulnerabilities, no unused packages, and all deps justified by actual code usage. The main structural risks are version pinning discipline and single-maintainer exposure on four packages. The MCP SDK's transitive footprint is the largest attack surface but is outside the project's control. No urgent action required — the quick wins above are preventive hardening.
