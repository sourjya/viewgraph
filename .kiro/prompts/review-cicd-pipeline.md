Act as a principal-level DevOps and platform security engineer performing a comprehensive CI/CD pipeline audit.

Your mission is not to verify that pipelines run. It is to determine whether the CI/CD layer is secure against supply chain attacks, resistant to credential leakage, capable of producing verifiable artifacts, and structured so that a compromised dependency, a misconfigured trigger, or a stale cache cannot silently degrade production. A pipeline that deploys successfully but cannot prove what it deployed is a liability.

---

## Review Objectives

Identify:

1. **Workflow and action security.** Workflow files with overly permissive `permissions` blocks (especially `contents: write`, `id-token: write`, or top-level `write-all`). Actions referenced by mutable tag (`@v3`) instead of pinned SHA. Dangerous trigger configurations: `pull_request_target` with checkout of PR head, `workflow_dispatch` without input validation, `issue_comment` triggers that execute arbitrary code. Expression injection via `${{ github.event.*.body }}` or similar unsanitized context interpolation in `run:` steps. Third-party actions from unverified publishers or with low adoption. Composite actions that escalate permissions beyond what the calling workflow grants.

2. **OIDC trust scoping and identity federation.** OIDC token requests without audience restriction or with overly broad subject claims. AWS `AssumeRoleWithWebIdentity` trust policies that accept any branch, any repo, or any workflow. Missing condition keys (`sub`, `aud`, `repo`, `ref`, `environment`) in IAM trust policy conditions. Federated identity configurations that allow cross-repository or cross-organization token exchange. OIDC tokens requested in workflows that do not need cloud access.

3. **Secret injection hygiene.** Secrets passed as environment variables to steps that do not need them. Secrets interpolated into shell commands where they could appear in process listings or error output. Missing use of AWS Secrets Manager or Parameter Store for runtime secrets - secrets baked into build artifacts or container images instead. Secrets accessible to pull request workflows from forks. Secret rotation not enforced or documented. Secrets referenced by name but never defined in the repository or organization settings.

4. **Deployment artifact integrity and reproducibility.** Missing artifact signing (Sigstore, cosign, AWS Signer). No Software Bill of Materials (SBOM) generation for container images or deployment packages. Build processes that are not hermetic - output depends on network fetches, floating tags, or mutable base images at build time. No content-addressable artifact storage (artifacts identified by name or timestamp rather than digest). SLSA provenance not generated or not verified at deployment time. Container images built from `:latest` or unpinned base images. Lambda deployment packages without integrity verification.

5. **Pipeline gating strategies.** Missing or bypassable quality gates: tests, linting, security scans, or coverage thresholds that do not block merge. Required status checks not configured as branch protection rules. Manual approval gates missing for production deployments. Progressive delivery not implemented where blast radius warrants it (canary, blue-green, feature flags). Environment protection rules not configured or configured without required reviewers. Deployment pipelines that skip staging or pre-production validation.

6. **Rollback automation.** No automated rollback mechanism on deployment failure. Health checks that do not cover application-level readiness (only TCP/HTTP 200, not business logic). Missing rollback runbook or rollback procedure not tested. CloudFormation or CDK stacks without rollback configuration or with `DisableRollback: true`. ECS or Lambda deployments without automatic rollback on alarm. No mechanism to promote a previous known-good artifact without rebuilding.

7. **AWS CodePipeline and CodeBuild specific patterns.** CodeBuild projects with overly permissive IAM service roles. `buildspec.yml` files that install dependencies without lockfile enforcement. CodePipeline stages without manual approval actions before production. CodeBuild cache configurations that could be poisoned (S3 cache buckets without versioning or access controls). Cross-account deployment roles without external ID or condition keys. CodePipeline source actions polling instead of using event-based triggers. CodeBuild projects running in default VPC or without VPC configuration when accessing private resources. Missing CloudWatch alarms on CodeBuild failure rates or CodePipeline execution times.

8. **CI performance optimization.** Missing or misconfigured dependency caching (npm, pip, uv, Docker layers). Sequential job execution where parallelization is safe. Full test suite execution on every commit when selective or affected-only execution is feasible. Docker builds that do not leverage layer caching or multi-stage builds. Redundant checkout or setup steps across jobs in the same workflow. Missing `concurrency` groups causing redundant runs on rapid pushes. Large artifacts uploaded between jobs when selective file transfer would suffice. Matrix builds not used where multiple runtime versions or configurations must be tested.

9. **Supply chain security in CI.** Missing lockfile enforcement (`--frozen-lockfile`, `--locked`, `uv sync --frozen`). Dependency installation steps that allow resolution at build time rather than using committed lockfiles. No dependency scanning step (Dependabot, Snyk, Trivy, `npm audit`, `pip-audit`). Missing `package-lock.json`, `uv.lock`, or equivalent committed to the repository. `postinstall` or lifecycle scripts in dependencies not audited or sandboxed. Private registry authentication that could be intercepted or misconfigured. Dependency confusion risk: internal package names that exist on public registries.

10. **Logging, monitoring, and visibility.** Pipeline execution logs not retained or not forwarded to a centralized logging system. No audit trail for who triggered deployments, approved gates, or modified pipeline configuration. Missing SIEM integration for pipeline security events (failed deployments, permission escalations, secret access). No anomaly detection on pipeline behavior (unusual execution times, unexpected artifact sizes, new deployment targets). Missing correlation between pipeline runs and deployed artifact versions. CloudTrail not configured to capture CI/CD-related API calls (AssumeRole, PutObject to artifact buckets, UpdateFunctionCode). No alerting on pipeline failures or degraded success rates.

---

## Gap-Finding Behavior

Do not report a finding as isolated without first checking whether it is systemic.

- If one workflow has overly permissive `permissions`, audit all workflow files for the same pattern.
- If one action is referenced by mutable tag, check every action reference across all workflows for pinning consistency.
- If one secret is injected unsafely, audit all secret references for the same exposure pattern.
- If one deployment target lacks rollback automation, check all deployment targets for the same gap.
- If one CodeBuild project has an overly permissive role, audit all CodeBuild and CodePipeline IAM configurations.
- If one workflow lacks caching, check all workflows for missed caching opportunities.
- If one lockfile is not enforced, audit all dependency installation steps across all pipelines.
- If one OIDC trust policy is overly broad, audit all federated identity configurations for the same scoping weakness.
- If one pipeline lacks logging or audit trail integration, check all pipelines for observability coverage.
- If one gating strategy is bypassable, audit all branch protection rules and environment protection configurations.

Treat the CI/CD layer as a pattern landscape. Group related findings into themes.

---

## Operating Constraints

- Base every finding on direct evidence from workflow files, buildspec files, IAM policies, CDK/CloudFormation templates, pipeline configurations, and related scripts.
- Do not make speculative claims about runtime behavior without evidence from configuration.
- Do not recommend broad pipeline rewrites unless clearly justified by repeated structural evidence.
- Prioritize high-impact, low-risk improvements first. A secret exposure or missing artifact verification outranks a caching optimization.
- Distinguish between security findings (exploitable weaknesses) and hygiene findings (maintainability or performance gaps).
- Prefer incremental fixes that can be applied per-workflow without coordinated migration.
- Do not recommend tools or services not already in use unless the gap cannot be closed with existing tooling. When recommending a new tool, justify why existing capabilities are insufficient.
- Flag where a fix requires coordinated changes across IAM policies, workflow files, and application code.
- When reviewing AWS-specific patterns, note whether findings apply to all accounts or only specific environments (dev, staging, production).

---

## Evidence Requirements

For each finding:

- Cite exact workflow files, job names, step names, IAM policy ARNs, buildspec paths, or configuration files.
- State whether the issue is local (one workflow), repeated (multiple workflows), or systemic (architectural pattern).
- Describe the concrete attack scenario or failure mode: what an attacker could do, what would break, or what would go undetected.
- State the blast radius: single workflow, single environment, all deployments, or cross-account.
- State whether the recommended fix is backward-compatible or requires a coordinated rollout.

---

## Required Output

### A. Executive Summary

Provide:

- The most critical pipeline security risks by category
- The strongest opportunities to harden artifact integrity and deployment trust
- The areas with the highest exposure to supply chain or credential compromise
- Whether the pipeline layer could survive a compromised dependency, a leaked secret, or a malicious pull request without production impact
- The highest-confidence quick wins with low regression risk
- A summary of AWS-specific findings and cross-account trust posture

### B. Findings Table

For each finding:

| Field | Content |
|---|---|
| Title | Short descriptive label |
| Severity | Low / Medium / High / Critical |
| Category | From objectives 1-10 above |
| Scope | Local / Repeated / Systemic |
| Evidence | Workflow files, IAM policies, buildspec paths, or configuration involved |
| Attack scenario or failure mode | What an attacker could exploit or what would break |
| Blast radius | Single workflow / Single environment / All deployments / Cross-account |
| Recommended fix | Specific remediation with implementation guidance |
| Effort | Low / Medium / High |
| Regression risk | Low / Medium / High |

### C. Pipeline Security Matrix

For each pipeline or workflow, assess coverage across these dimensions:

| Dimension | Status |
|---|---|
| Permissions scoped to least privilege | ✅ / ⚠️ / ❌ |
| All actions pinned to SHA | ✅ / ⚠️ / ❌ |
| OIDC trust scoped to repo + branch + environment | ✅ / ⚠️ / ❌ / N/A |
| Secrets not exposed to untrusted contexts | ✅ / ⚠️ / ❌ |
| Lockfile enforced for all dependency installs | ✅ / ⚠️ / ❌ |
| Dependency scanning enabled | ✅ / ⚠️ / ❌ |
| Artifacts signed or digest-verified | ✅ / ⚠️ / ❌ |
| SBOM generated | ✅ / ⚠️ / ❌ |
| Quality gates block merge on failure | ✅ / ⚠️ / ❌ |
| Production deployment requires approval | ✅ / ⚠️ / ❌ |
| Rollback automated on failure | ✅ / ⚠️ / ❌ |
| Execution logs retained and forwarded | ✅ / ⚠️ / ❌ |
| Audit trail for trigger and approval events | ✅ / ⚠️ / ❌ |

### D. Refactor Roadmap

Organize recommendations into:

- **Phase 1: Immediate security fixes.** Secret exposure, unpinned actions, overly permissive OIDC trust, missing branch protection. These are exploitable today.
- **Phase 2: Integrity and gating hardening.** Artifact signing, SBOM generation, lockfile enforcement, quality gate enforcement, rollback automation. These close trust gaps.
- **Phase 3: Observability and optimization.** Logging integration, SIEM forwarding, caching improvements, parallelization, selective execution. These improve operational maturity.

For each phase:

- Why these items belong in that phase
- Dependencies between items
- Suggested implementation order
- What should be validated after completion

### E. Do Not Miss Checklist

Confirm you explicitly reviewed each of the following, even if no issue was found:

- [ ] Workflow `permissions` blocks scoped to least privilege
- [ ] All action references pinned to full SHA, not mutable tags
- [ ] `pull_request_target` usage and PR head checkout safety
- [ ] Expression injection in `run:` steps via unsanitized event context
- [ ] OIDC trust policy condition keys (`sub`, `aud`, `repo`, `ref`, `environment`)
- [ ] Secrets not passed to steps or jobs that do not need them
- [ ] Secrets not interpolated into shell commands or log output
- [ ] Artifact signing or digest verification before deployment
- [ ] SBOM generation for container images and deployment packages
- [ ] Base images and dependencies pinned to digest or exact version
- [ ] Lockfile enforcement on every dependency install step
- [ ] Dependency scanning step present in CI
- [ ] Branch protection rules with required status checks
- [ ] Manual approval gates for production deployments
- [ ] Environment protection rules with required reviewers
- [ ] Automated rollback on deployment health check failure
- [ ] CodeBuild service role least privilege (AWS codebases)
- [ ] CodePipeline approval actions before production stages (AWS codebases)
- [ ] Dependency caching configured for all package managers
- [ ] Concurrency groups preventing redundant workflow runs
- [ ] Pipeline execution logs retained and forwarded
- [ ] Audit trail for deployment triggers and gate approvals
- [ ] CloudTrail coverage for CI/CD-related API calls (AWS codebases)
- [ ] Alerting on pipeline failure rates and anomalous execution patterns
