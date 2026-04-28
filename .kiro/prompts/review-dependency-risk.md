Act as a principal-level software engineer and supply chain security specialist performing a comprehensive dependency risk audit.

Your mission is not to list packages. It is to determine whether the project's dependency graph is lean, secure, legally compliant, and structurally sound - and whether the team could survive a critical dependency disappearing, being compromised, or changing license overnight. A dependency that works today but cannot be replaced, audited, or justified is a liability.

---

## Review Objectives

Identify:

1. **Dependency necessity and bloat.** Packages that are unused, imported but never called, or trivially replaceable with standard library code. Dev dependencies leaked into production bundles or runtime manifests. Packages added speculatively during prototyping and never removed. For every dependency, answer: what breaks if this is removed?

2. **Dependency amplification and transitive risk.** The amplification factor of each direct dependency - how many transitive packages it pulls in. Phantom dependencies: packages used in code but not declared in the manifest, resolved only through transitive installation. Transitive dependencies that are unmaintained, deprecated, or have known vulnerabilities even when the direct dependency is healthy. Flag where a single direct dependency is responsible for more than 30% of the total transitive tree.

3. **License compliance and IP risk.** Dependencies with copyleft licenses (GPL, LGPL, AGPL, MPL with strong copyleft interpretation) that may impose obligations on the consuming project. AGPL dependencies in server-side code that could trigger source disclosure requirements. Dependencies with no declared license (`UNLICENSED`, missing `license` field, no LICENSE file in the package). License conflicts between direct dependencies and their transitive trees. Dual-licensed packages where the default license is restrictive. Flag any dependency whose license changed between the currently pinned version and the latest available version.

4. **Maintainer health and sustainability.** Dependencies maintained by a single individual (bus factor of 1). Packages with no commits in the last 12 months, no response to issues or PRs, or archived repositories. OpenSSF Scorecard indicators: missing branch protection, no signed releases, no CI, no SECURITY.md. Dependencies that have changed ownership or maintainership recently without clear continuity. Flag any dependency in a critical path (auth, crypto, data access, HTTP) that scores below 5 on OpenSSF Scorecard or equivalent health metrics.

5. **Bundle size and frontend performance.** Dependencies that are not tree-shakeable, forcing the entire package into the bundle when only one function is used. Import granularity issues: importing from the package root when subpath imports are available (e.g., `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`). Duplicate packages in the dependency tree - the same package resolved at multiple versions simultaneously. Dependencies that ship unminified code, source maps, or test files in their published package. Flag where a dependency contributes more than 50KB gzipped to the frontend bundle for a feature that could be implemented in under 100 lines.

6. **Supply chain integrity beyond CVEs.** Typosquatting risk: package names that are one character off from popular libraries, or internal package names that could be claimed on public registries (dependency confusion). Install-time code execution: `preinstall`, `postinstall`, or `prepare` scripts in dependencies that execute arbitrary code during `npm install` or equivalent. Lockfile integrity: verify lockfiles are committed, consistent with manifests, and not manually edited. Integrity hashes present and matching. Packages that have had ownership transfers, unpublish/republish events, or version yanking in their recent history. Flag any dependency that downloads binaries or executes network calls during installation.

7. **Vendor lock-in and abstraction quality.** Direct coupling to vendor SDKs (AWS SDK, Stripe, SendGrid, etc.) without an adapter or interface layer. Dependencies where switching providers would require touching more than 3 files. Infrastructure dependencies imported directly in business logic rather than through a factory or configuration-driven abstraction. Flag where the project's `reusable-architecture.md` mandates adapter patterns but the implementation bypasses them with direct SDK imports.

8. **Dependency overlap and redundancy.** Multiple packages providing the same functionality: two HTTP clients, two date libraries, two validation libraries, two logging frameworks. Wrapper packages that add negligible value over the underlying dependency. Utility packages where the used functions are available in the language's standard library or in an already-installed dependency. Flag where consolidating overlapping dependencies would reduce the total dependency count by 10% or more.

---

## Gap-Finding Behavior

Do not report a finding as isolated without first checking whether it is systemic.

- If one dependency is unused, audit the full manifest for all unused or underutilized packages.
- If one package has a problematic license, audit the entire dependency tree for license compliance.
- If one dependency has a high amplification factor, compute amplification for all direct dependencies and rank them.
- If one vendor SDK is imported without an adapter, audit all external service integrations for the same coupling pattern.
- If one package overlaps with another, identify all functional overlaps across the full dependency graph.
- If one install script executes arbitrary code, audit all dependencies for install-time execution hooks.
- If one transitive dependency is unmaintained, trace all paths through the dependency tree that depend on it.
- If one frontend import is non-granular, audit all imports from large utility libraries for the same pattern.

Treat the dependency graph as a risk landscape. Group related findings into themes.

---

## Operating Constraints

- Base every finding on direct evidence from manifest files (`package.json`, `pyproject.toml`, `uv.lock`, `package-lock.json`), import statements, and the dependency tree.
- Do not flag dependencies as unnecessary without verifying they are not used in code, tests, build scripts, or tooling configuration.
- Do not recommend removing a dependency without identifying what would replace its functionality.
- Prioritize findings by blast radius: how many modules depend on this package, and what is the cost of it disappearing or being compromised?
- Distinguish between dependencies that are critical path (auth, crypto, data access, HTTP framework) and those that are convenience (formatting, dev tooling, optional utilities).
- Do not recommend replacing a well-maintained, widely-used dependency with a hand-rolled implementation unless the usage is trivially simple and the dependency's transitive cost is disproportionate.
- Prefer incremental remediation over wholesale dependency replacement.
- When recommending a replacement package, verify it is actively maintained, has a compatible license, and does not introduce the same risks being remediated.

---

## Evidence Requirements

For each finding:

- Cite exact package names, versions, manifest files, and import locations.
- State whether the issue is local (one package), repeated (a pattern across several), or systemic (a structural gap in dependency management).
- Quantify the risk: number of transitive dependencies pulled in, bundle size contribution, number of files that import the package, or number of days since last maintenance activity.
- Describe the concrete failure mode: what happens if this dependency is compromised, abandoned, relicensed, or removed from the registry?
- State the recommended remediation and whether it requires code changes, manifest changes, or architectural changes.

---

## Required Output

### A. Executive Summary

Provide:

- The most critical supply chain risks by category
- The strongest opportunities to reduce dependency surface area
- The areas with the highest vendor lock-in or abstraction debt
- The most significant license compliance gaps
- The highest-confidence quick wins with low regression risk
- A summary of overall dependency health: lean and intentional, or bloated and under-audited

### B. Findings Table

For each finding:

| Field | Content |
|---|---|
| Title | Short descriptive label |
| Severity | Low / Medium / High / Critical |
| Category | From the 8 domains above |
| Scope | Local / Repeated / Systemic |
| Evidence | Package names, manifest files, import locations, transitive counts |
| Failure mode | What breaks, leaks, or becomes vulnerable |
| Fix | Recommended remediation |
| Effort | Low / Medium / High |
| Regression risk | Low / Medium / High |

### C. Dependency Inventory

For each direct dependency, provide:

| Field | Content |
|---|---|
| Package | Name and pinned version |
| Purpose | What it provides to the project |
| Manifest | Which manifest file declares it (`package.json`, `pyproject.toml`, etc.) |
| Runtime / Dev | Whether it is a runtime or development dependency |
| Transitive count | Number of transitive dependencies it introduces |
| License | SPDX identifier or `UNLICENSED` / `MISSING` |
| Last publish | Date of most recent release |
| Maintainer count | Number of active maintainers (if determinable) |
| Bundle impact | Estimated gzipped size contribution (frontend only) |
| Necessity | Essential / Justified / Questionable / Unused |
| Lock-in risk | None / Low / Medium / High |

### D. Refactor Roadmap

Organize recommendations into:

- **Phase 1: Safe quick wins.** Remove unused dependencies, fix dev-in-prod leaks, pin floating versions, add missing lockfile entries. These require no code changes beyond manifest cleanup.
- **Phase 2: Moderate refactors.** Replace trivial dependencies with standard library equivalents, consolidate overlapping packages, fix non-granular imports, resolve license compliance gaps. These require targeted code changes.
- **Phase 3: Structural improvements.** Introduce adapter layers for vendor SDKs, reduce high-amplification dependencies, replace unmaintained critical-path packages, establish ongoing dependency governance. These require architectural changes.

For each phase, explain:

- Why these items belong in that phase
- Dependencies between items
- Suggested implementation order
- What should be tested after completion

### E. Do Not Miss Checklist

Confirm you explicitly reviewed each of the following, even if no issue was found:

- [ ] Every direct dependency justified by actual usage in code or build
- [ ] No dev dependencies in production manifests or bundles
- [ ] Transitive dependency count and amplification factor for each direct dependency
- [ ] Phantom dependencies used in code but not declared in manifests
- [ ] License compliance for all direct and transitive dependencies
- [ ] AGPL or strong copyleft dependencies in server-side code
- [ ] Maintainer health and last activity for critical-path dependencies
- [ ] OpenSSF Scorecard or equivalent health indicators for auth, crypto, and data access packages
- [ ] Bundle size contribution of each frontend dependency
- [ ] Tree-shaking effectiveness and import granularity
- [ ] Duplicate package versions in the resolved dependency tree
- [ ] Install-time scripts (`preinstall`, `postinstall`) in all dependencies
- [ ] Lockfile committed, consistent with manifest, and integrity hashes present
- [ ] Typosquatting and dependency confusion risk for internal package names
- [ ] Vendor SDK coupling without adapter abstraction
- [ ] Functional overlap between installed packages
- [ ] Dependencies that changed license between pinned and latest version
- [ ] Dependencies with recent ownership transfers or maintainer changes
