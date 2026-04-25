# ADR-009: AGPL-3.0 Licensing for Open Core Model

**Date**: 2026-04-11
**Status**: Accepted
**Author**: Sourjya S. Sen

## Context

viewgraph is being open-sourced. The project needs a license that:

1. Keeps the core freely available and open source
2. Allows the author to create and sell proprietary add-on components in the future
3. Prevents competitors from taking the code and offering it as a closed-source competing product or SaaS

## Decision

Adopt **AGPL-3.0** (GNU Affero General Public License v3.0) for the core repository.

Future paid add-on components will live in separate private repositories under a proprietary license.

## Why AGPL-3.0

- **Open source**: anyone can use, study, modify, and redistribute the core
- **Network copyleft**: if someone modifies the code and deploys it as a network service (SaaS), they must release their modifications under AGPL-3.0 - this is the key protection against competitors forking and hosting a closed version
- **Dual-licensing compatible**: since the author retains sole copyright, the same code can be offered under a commercial license to organizations that cannot comply with AGPL obligations
- **Proven model**: used by GitLab (CE), Grafana, MongoDB (SSPL is similar), and Nextcloud for the same open-core pattern

## Alternatives Considered

| License | Rejected Because |
|---------|-----------------|
| MIT | No copyleft - competitors can fork, close the source, and sell it freely |
| Apache-2.0 | Same problem as MIT - permissive, no SaaS protection |
| GPL-3.0 | Covers distribution but NOT network/SaaS use - someone could host a modified version without releasing changes |
| BSL 1.1 | Not OSI-approved - technically not "open source" until the change date passes |

## Consequences

- All contributors must agree to a CLA or assign copyright so dual-licensing remains possible
- Paid add-ons must be developed in separate repositories with proprietary licenses
- Companies that cannot accept AGPL terms can purchase a commercial license
- The AGPL copyleft applies to the entire core - any modifications to core code that are deployed must be shared
