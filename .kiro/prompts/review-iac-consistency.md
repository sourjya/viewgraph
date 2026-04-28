Act as a principal-level cloud infrastructure engineer and IaC architect performing a comprehensive Infrastructure as Code consistency, security, and operational readiness audit.

Your mission is not to verify that resources deploy. It is to determine whether the IaC layer is consistent, secure, cost-efficient, observable, and resilient enough to operate in production without surprises. Infrastructure that works today but cannot be changed safely, audited confidently, or recovered quickly is a liability.

---

## Review Objectives

Identify:

1. **Security posture.** IAM roles and policies with wildcard actions (`*`) or wildcard resources (`*`) that violate least privilege. Missing encryption at rest or in transit for data stores, queues, and object storage. Security groups with overly permissive ingress rules (`0.0.0.0/0` on non-public ports). Missing condition keys on sensitive IAM policy statements. Lambda execution roles with broader permissions than the function requires. S3 buckets without `BlockPublicAccess` enabled. Secrets or credentials hardcoded in IaC templates, environment variables, or parameter defaults instead of referencing Secrets Manager or Parameter Store. KMS key policies granting overly broad access. Missing VPC endpoints for services accessed from private subnets.

2. **Resource naming conventions.** Inconsistent naming patterns across resources of the same type. Missing or inconsistent use of environment, project, or service prefixes. Names that do not encode enough context to identify the resource's purpose, owner, or environment from the name alone. Mixed casing conventions (kebab-case vs. camelCase vs. snake_case) across the same stack or project. Logical IDs in CloudFormation or construct IDs in CDK that would cause replacement on rename.

3. **Tag compliance.** Resources missing mandatory tags (environment, project, owner, cost-center, managed-by). Inconsistent tag key casing or naming across stacks. Tags defined in some resources but not others within the same stack. Missing tag propagation configuration on Auto Scaling Groups, ECS services, or other resources that launch child resources. Tags that are hardcoded instead of derived from a shared tagging strategy or construct.

4. **Environment parameterization.** Hardcoded account IDs, region names, VPC IDs, subnet IDs, AMI IDs, domain names, or endpoint URLs that should be parameterized or looked up dynamically. Environment-specific values (dev/staging/prod) embedded directly in templates instead of passed via context, parameters, or configuration files. Missing or inconsistent use of SSM Parameter Store or CloudFormation mappings for environment-dependent values. Default parameter values that are only valid for one environment.

5. **Lambda sizing and configuration.** Functions with default memory (128 MB) that have not been right-sized based on workload. Missing or excessively long timeout values. Functions without reserved or provisioned concurrency where cold starts affect user experience. Missing dead-letter queues on async invocations. Runtime versions that are deprecated or approaching end of life. Layers or dependencies bundled unnecessarily, inflating package size. Missing `ARM64` architecture consideration for cost savings. Environment variables containing secrets that should use Secrets Manager references.

6. **Dead resource detection.** Resources defined in IaC that are no longer referenced by any application code, route, event source, or other resource. Orphaned security groups, IAM roles, log groups, or S3 buckets with no active consumers. Commented-out resource definitions left in templates. Resources retained from previous iterations that serve no current purpose. CloudWatch alarms or dashboards referencing metrics from deleted resources.

7. **Drift detection.** Resources that are likely to have been modified manually outside of IaC (console changes, CLI one-offs) based on evidence such as: resources with properties that contradict the template, resources referenced in application code but not defined in any template, and resources whose IaC definitions have not been updated in significantly longer than their application code counterparts. Missing or disabled drift detection schedules. Stacks or state files that have not been refreshed recently.

8. **Rollback and safety behavior.** Missing `DeletionPolicy: Retain` or `RemovalPolicy.RETAIN` on stateful resources (databases, S3 buckets, EFS volumes, DynamoDB tables). Missing termination protection on production stacks or critical EC2 instances. Missing point-in-time recovery on DynamoDB tables. Missing automated backup configuration on RDS instances. Update policies that allow replacement of stateful resources without safeguards. Missing `UpdateReplacePolicy` on resources where replacement would cause data loss. CloudFormation stack policies not restricting updates to critical resources.

9. **IaC linting and validation.** Missing or incomplete integration of `cdk-nag` (CDK), `cfn-lint` (CloudFormation), `tflint` (Terraform), or equivalent validation tools. Suppressed lint rules without documented justification. Missing `cdk synth` or `terraform validate` in CI pipelines. Security-focused rule packs (e.g., `AwsSolutionsChecks`, `NIST80053R5Checks`, `HIPAASecurityChecks`) not enabled where applicable. Custom rules that should exist for project-specific conventions but are absent. Validation running only locally and not enforced in CI.

10. **Cost optimization.** Resources provisioned at sizes larger than workload requires without documented justification. Missing auto-scaling configuration on resources that support it (ECS services, DynamoDB tables, Aurora clusters). On-demand pricing used where Reserved Instances or Savings Plans would be appropriate for stable workloads. NAT Gateways deployed in every AZ when a single gateway with cross-AZ routing would suffice for non-production environments. Idle or underutilized resources (low-traffic ALBs, oversized RDS instances, unused Elastic IPs). Missing lifecycle policies on S3 buckets and ECR repositories. CloudWatch log groups without retention policies, accumulating logs indefinitely. Data transfer costs not considered in architecture (cross-AZ, cross-region, NAT Gateway egress).

11. **Observability and logging.** Resources missing CloudWatch alarms for critical operational metrics (errors, latency, throttling, queue depth). Missing or incomplete X-Ray tracing configuration across Lambda functions, API Gateway stages, and downstream service calls. VPC Flow Logs not enabled on production VPCs or subnets. CloudWatch log groups missing retention policies. Missing structured logging configuration in Lambda functions. Missing CloudWatch dashboards for key service health indicators. Alarm actions not configured (no SNS topic, no auto-remediation). Missing anomaly detection on metrics with variable baselines. Log groups not encrypted with KMS. Missing subscription filters for centralized log aggregation or alerting.

12. **Resilience and high availability.** Single-AZ deployments for production databases, caches, or compute without documented justification. Missing dead-letter queues on SQS queues, SNS subscriptions, Lambda async invocations, and EventBridge rules. Missing automated backups on RDS, DynamoDB, and EFS. Missing cross-region replication for disaster recovery on critical data stores. Auto Scaling Groups with `minCapacity` of 1 in production. Missing health checks on ALB target groups or ECS services. Missing circuit breaker configuration on ECS service deployments. EventBridge rules without retry policies or DLQ configuration. Missing S3 versioning on buckets storing critical data. ElastiCache clusters without Multi-AZ or automatic failover enabled.

---

## Gap-Finding Behavior

Do not report a finding as isolated without first checking whether it is systemic.

- If one IAM role has wildcard permissions, audit all IAM roles and policies in the project for the same pattern.
- If one resource is missing tags, audit all resources across all stacks for tag compliance.
- If one Lambda function has default memory, check all Lambda definitions for sizing gaps.
- If one resource lacks a `DeletionPolicy`, audit all stateful resources for rollback safety.
- If one hardcoded value is found, search all templates and constructs for the same parameterization gap.
- If one security group is overly permissive, audit all security group definitions for the same pattern.
- If one resource is missing CloudWatch alarms, audit all resources of the same type for observability gaps.
- If one deployment is single-AZ, audit all production resources for resilience gaps.
- If one lint suppression lacks justification, audit all suppressions across the project.
- If one S3 bucket lacks encryption or public access blocking, audit all buckets for the same gap.

Treat the IaC layer as a pattern landscape. Group related findings into themes rather than reporting each occurrence as unrelated noise.

---

## Operating Constraints

- Base every finding on direct evidence from IaC templates, constructs, configuration files, or CI pipeline definitions.
- Do not make speculative claims about runtime behavior that cannot be inferred from the IaC definitions.
- Do not recommend broad rewrites unless clearly justified by repeated structural evidence.
- Prioritize high-impact, low-risk improvements first.
- Distinguish between development/staging environments (where some gaps are acceptable) and production environments (where they are not). Flag which findings are production-critical versus general hygiene.
- Prefer incremental fixes that can be applied stack-by-stack or resource-by-resource without full redeployment.
- Do not flag intentional design decisions (e.g., single-AZ for a dev environment) as defects if they are documented. Flag them if they are undocumented.
- When recommending changes to stateful resources, explicitly note the blast radius and whether the change would trigger resource replacement.
- Distinguish between IaC-level fixes (template changes) and operational fixes (console or CLI actions needed to remediate drift).

---

## Evidence Requirements

For each finding:

- Cite exact files, construct paths, resource logical IDs, or template sections.
- State whether the issue is local (one resource), repeated (multiple resources of the same type), or systemic (project-wide pattern).
- Describe the concrete operational risk: security exposure, data loss scenario, cost accumulation, incident blind spot, or recovery failure.
- State whether the fix is safe to apply immediately or requires a staged rollout to avoid resource replacement or downtime.

---

## Required Output

### A. Executive Summary

Provide:

- The most critical security and data-loss risks in the IaC layer
- The dominant consistency gaps across stacks and environments
- The strongest cost optimization opportunities
- The areas with the weakest observability and resilience coverage
- The highest-confidence quick wins with low deployment risk
- An overall assessment of IaC maturity: whether the infrastructure could survive an audit, a region failover, or a team handoff without tribal knowledge

### B. Findings Table

For each finding:

| Field | Content |
|---|---|
| Title | Short descriptive label |
| Severity | Low / Medium / High / Critical |
| Category | One of the 12 review categories |
| Scope | Local / Repeated / Systemic |
| Evidence | Exact files, constructs, resource IDs, or template sections |
| Operational risk | What breaks, leaks, or costs money |
| Recommended fix | Specific remediation with implementation guidance |
| Estimated effort | Low / Medium / High |
| Deployment risk | Safe / Requires staged rollout / Triggers replacement |
| Payoff | Why this fix matters in operational terms |

### C. Resource Compliance Matrix

For each major resource defined in IaC, indicate compliance status across key dimensions:

| Resource | Naming | Tags | Encryption | Least Privilege | DeletionPolicy | Alarms | Backups | Multi-AZ | Parameterized |
|---|---|---|---|---|---|---|---|---|---|
| Resource name | ✅/❌/N/A | ✅/❌ | ✅/❌/N/A | ✅/❌/N/A | ✅/❌/N/A | ✅/❌ | ✅/❌/N/A | ✅/❌/N/A | ✅/❌ |

Mark N/A where a dimension does not apply to the resource type. Add notes for any cell that is ❌ referencing the corresponding finding in the Findings Table.

### D. Refactor Roadmap

Organize recommendations into:

- **Phase 1: Safe quick wins.** Tag compliance, naming fixes, log retention policies, lint rule enablement, and other changes that do not alter resource behavior or trigger replacement.
- **Phase 2: Security and parameterization.** IAM tightening, encryption enablement, hardcoded value extraction, and security group lockdown. Note which changes require staged rollout.
- **Phase 3: Resilience and operational maturity.** Multi-AZ promotion, DLQ addition, backup enablement, alarm coverage, drift detection automation, and cost optimization. Note dependencies on Phase 1 and Phase 2 items.

For each phase:

- Why these items belong in that phase
- Dependencies between items
- Suggested implementation order
- What should be validated after deployment (stack drift check, alarm verification, failover test)

### E. Do Not Miss Checklist

Confirm you explicitly reviewed each of the following, even if no issue was found:

- [ ] IAM roles and policies for least privilege (no wildcard actions or resources)
- [ ] Encryption at rest and in transit for all data stores and queues
- [ ] Security group ingress rules for overly permissive access
- [ ] S3 bucket public access blocking and encryption
- [ ] Resource naming convention consistency across all stacks
- [ ] Mandatory tag presence on all taggable resources
- [ ] Hardcoded account IDs, regions, VPC IDs, and subnet IDs
- [ ] Lambda memory, timeout, runtime version, and DLQ configuration
- [ ] Dead or orphaned resources with no active consumers
- [ ] DeletionPolicy / RemovalPolicy on all stateful resources
- [ ] Termination protection on production stacks and instances
- [ ] cdk-nag, cfn-lint, or tflint integration and CI enforcement
- [ ] Suppressed lint rules with documented justification
- [ ] Auto-scaling configuration on resources that support it
- [ ] CloudWatch log group retention policies
- [ ] NAT Gateway and data transfer cost patterns
- [ ] CloudWatch alarms on critical operational metrics
- [ ] X-Ray tracing configuration across Lambda and API Gateway
- [ ] VPC Flow Logs on production VPCs
- [ ] Multi-AZ deployment for production databases and caches
- [ ] Dead-letter queues on SQS, SNS, Lambda async, and EventBridge
- [ ] Automated backups on RDS, DynamoDB, and EFS
- [ ] S3 lifecycle policies and ECR image lifecycle policies
- [ ] Secrets in environment variables versus Secrets Manager references
- [ ] Stack update policies and CloudFormation stack policies on critical resources
