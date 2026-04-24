# Comprehensive Threat Model Report

**Generated**: 2026-04-24 15:00:09
**Current Phase**: 1 - Business Context Analysis
**Overall Completion**: 80.0%

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [System Architecture](#system-architecture)
4. [Threat Actors](#threat-actors)
5. [Trust Boundaries](#trust-boundaries)
6. [Assets and Flows](#assets-and-flows)
7. [Threats](#threats)
8. [Mitigations](#mitigations)
9. [Assumptions](#assumptions)
10. [Phase Progress](#phase-progress)

## Executive Summary

ViewGraph v0.4.5 - browser extension + MCP server for AI-powered UI capture. HMAC-signed localhost communication (F21), 17 enrichment collectors, 37 MCP tools, 5 security reviews passed. All data local, no cloud. Distributed via Chrome/Firefox stores, npm, GitHub.

### Key Statistics

- **Total Threats**: 9
- **Total Mitigations**: 9
- **Total Assumptions**: 4
- **System Components**: 5
- **Assets**: 7
- **Threat Actors**: 13

## Business Context

**Description**: ViewGraph v0.4.5 - browser extension + MCP server for AI-powered UI capture. HMAC-signed localhost communication (F21), 17 enrichment collectors, 37 MCP tools, 5 security reviews passed. All data local, no cloud. Distributed via Chrome/Firefox stores, npm, GitHub.

### Business Features

- **Industry Sector**: Technology
- **Data Sensitivity**: Internal
- **User Base Size**: Small
- **Geographic Scope**: Global
- **Regulatory Requirements**: None
- **System Criticality**: Medium
- **Financial Impact**: Low
- **Authentication Requirement**: None
- **Deployment Environment**: On-Premises
- **Integration Complexity**: Moderate

## System Architecture

### Components

| ID | Name | Type | Service Provider | Description |
|---|---|---|---|---|
| C001 | Browser Extension | Other | N/A | Chrome/Firefox extension - DOM capture, 17 enrichment collectors, annotation sidebar, multi-export. Runs in closed shadow DOM. |
| C002 | MCP Server | Compute | N/A | Node.js MCP server - 37 tools, HTTP receiver on localhost:9876-9879, WebSocket for real-time events, stdio for MCP protocol |
| C003 | Capture Storage | Storage | N/A | Local filesystem .viewgraph/captures/ directory - JSON capture files, HTML snapshots, PNG screenshots |
| C004 | AI Agent | Other | N/A | External AI coding agent (Kiro, Claude Code, Cursor, Windsurf, Cline) - connects via stdio MCP protocol |
| C005 | Target Web Page | Other | N/A | The target web page being captured - untrusted content, may contain malicious scripts or prompt injection attempts |

### Connections

| ID | Source | Destination | Protocol | Port | Encrypted | Description |
|---|---|---|---|---|---|---|
| CN001 | C001 | C002 | HTTP | 9876 | No | Extension sends captures, polls requests, gets server info via localhost HTTP |
| CN002 | C002 | C003 | TCP | N/A | No | Server reads/writes capture JSON files, config, session keys to local filesystem |
| CN003 | C004 | C002 | TCP | N/A | No | AI agent communicates with server via MCP protocol over stdin/stdout |
| CN004 | C005 | C001 | HTTP | N/A | No | Extension content script reads DOM, computed styles, network state from the target page |
| CN005 | C001 | C002 | WebSocket | 9876 | No | Real-time events: audit results, capture requests, resolution sync |

## Threat Actors

### Insider

- **Type**: ThreatActorType.INSIDER
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial, Revenge
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: Yes
- **Priority**: 5/10
- **Description**: An employee or contractor with legitimate access to the system

### External Attacker

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 3/10
- **Description**: An external individual or group attempting to gain unauthorized access

### Nation-state Actor

- **Type**: ThreatActorType.NATION_STATE
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Espionage, Political
- **Resources**: ResourceLevel.EXTENSIVE
- **Relevant**: Yes
- **Priority**: 1/10
- **Description**: A government-sponsored group with advanced capabilities

### Hacktivist

- **Type**: ThreatActorType.HACKTIVIST
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Ideology, Political
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 6/10
- **Description**: An individual or group motivated by ideological or political beliefs

### Organized Crime

- **Type**: ThreatActorType.ORGANIZED_CRIME
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Financial
- **Resources**: ResourceLevel.EXTENSIVE
- **Relevant**: Yes
- **Priority**: 2/10
- **Description**: A criminal organization with significant resources

### Competitor

- **Type**: ThreatActorType.COMPETITOR
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial, Espionage
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 7/10
- **Description**: A business competitor seeking competitive advantage

### Script Kiddie

- **Type**: ThreatActorType.SCRIPT_KIDDIE
- **Capability Level**: CapabilityLevel.LOW
- **Motivations**: Curiosity, Reputation
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: Yes
- **Priority**: 9/10
- **Description**: An inexperienced attacker using pre-made tools

### Disgruntled Employee

- **Type**: ThreatActorType.DISGRUNTLED_EMPLOYEE
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Revenge
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: Yes
- **Priority**: 4/10
- **Description**: A current or former employee with a grievance

### Privileged User

- **Type**: ThreatActorType.PRIVILEGED_USER
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Financial, Accidental
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 8/10
- **Description**: A user with elevated privileges who may abuse them or make mistakes

### Third Party

- **Type**: ThreatActorType.THIRD_PARTY
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial, Accidental
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 10/10
- **Description**: A vendor, partner, or service provider with access to the system

### Malicious Website

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Disruption, Espionage
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: Yes
- **Priority**: 1/10
- **Description**: Any website the developer visits. Can make fetch to localhost, inject DOM content for capture, attempt prompt injection.

### Supply Chain (npm)

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Financial, Espionage
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 2/10
- **Description**: Compromised npm package in dependency tree. Runs with full Node.js permissions via npx.

### Rogue Browser Extension

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Espionage, Disruption
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: Yes
- **Priority**: 3/10
- **Description**: Another browser extension with broad permissions. Can read DOM, access chrome.storage, reach localhost.

## Trust Boundaries

### Trust Zones

#### Internet

- **Trust Level**: TrustLevel.UNTRUSTED
- **Description**: The public internet, considered untrusted

#### DMZ

- **Trust Level**: TrustLevel.LOW
- **Description**: Demilitarized zone for public-facing services

#### Application

- **Trust Level**: TrustLevel.MEDIUM
- **Description**: Zone containing application servers and services

#### Data

- **Trust Level**: TrustLevel.HIGH
- **Description**: Zone containing databases and data storage

#### Admin

- **Trust Level**: TrustLevel.FULL
- **Description**: Administrative zone with highest privileges

### Trust Boundaries

#### Internet Boundary

- **Type**: BoundaryType.NETWORK
- **Controls**: Web Application Firewall, DDoS Protection, TLS Encryption
- **Description**: Boundary between the internet and internal systems

#### DMZ Boundary

- **Type**: BoundaryType.NETWORK
- **Controls**: Network Firewall, Intrusion Detection System, API Gateway
- **Description**: Boundary between public-facing services and internal applications

#### Data Boundary

- **Type**: BoundaryType.NETWORK
- **Controls**: Database Firewall, Encryption, Access Control Lists
- **Description**: Boundary protecting data storage systems

#### Admin Boundary

- **Type**: BoundaryType.NETWORK
- **Controls**: Privileged Access Management, Multi-Factor Authentication, Audit Logging
- **Description**: Boundary for administrative access

## Assets and Flows

### Assets

| ID | Name | Type | Classification | Sensitivity | Criticality | Owner |
|---|---|---|---|---|---|---|
| A001 | User Credentials | AssetType.CREDENTIAL | AssetClassification.CONFIDENTIAL | 5 | 5 | N/A |
| A002 | Personal Identifiable Information | AssetType.DATA | AssetClassification.CONFIDENTIAL | 4 | 4 | N/A |
| A003 | Session Token | AssetType.TOKEN | AssetClassification.CONFIDENTIAL | 5 | 5 | N/A |
| A004 | Configuration Data | AssetType.CONFIG | AssetClassification.INTERNAL | 3 | 4 | N/A |
| A005 | Encryption Keys | AssetType.KEY | AssetClassification.RESTRICTED | 5 | 5 | N/A |
| A006 | Public Content | AssetType.DATA | AssetClassification.PUBLIC | 1 | 2 | N/A |
| A007 | Audit Logs | AssetType.DATA | AssetClassification.INTERNAL | 3 | 4 | N/A |

### Asset Flows

| ID | Asset | Source | Destination | Protocol | Encrypted | Risk Level |
|---|---|---|---|---|---|---|
| F001 | User Credentials | C001 | C002 | HTTPS | Yes | 4 |
| F002 | Session Token | C002 | C001 | HTTPS | Yes | 3 |
| F003 | Personal Identifiable Information | C003 | C004 | TLS | Yes | 3 |
| F004 | Audit Logs | C003 | C005 | TLS | Yes | 2 |

## Threats

### Identified Threats

#### T1: malicious website or local process

**Statement**: A malicious website or local process with access to localhost network can POST fake capture JSON to /captures endpoint, which leads to agent acts on fabricated DOM data, makes wrong code changes

- **Prerequisites**: with access to localhost network
- **Action**: POST fake capture JSON to /captures endpoint
- **Impact**: agent acts on fabricated DOM data, makes wrong code changes
- **Tags**: STRIDE-S, localhost

#### T2: malicious web page

**Statement**: A malicious web page with control of page content can embed instructions in DOM text, HTML comments, or aria attributes that the agent follows, which leads to agent executes attacker instructions, modifies wrong files, exfiltrates data

- **Prerequisites**: with control of page content
- **Action**: embed instructions in DOM text, HTML comments, or aria attributes that the agent follows
- **Impact**: agent executes attacker instructions, modifies wrong files, exfiltrates data
- **Tags**: STRIDE-T, prompt-injection, F19

#### T3: malicious website via fetch to localhost

**Statement**: A malicious website via fetch to localhost with ability to reach localhost can call GET /info to learn project root, captures dir, URL patterns, which leads to attacker learns filesystem paths and project structure

- **Prerequisites**: with ability to reach localhost
- **Action**: call GET /info to learn project root, captures dir, URL patterns
- **Impact**: attacker learns filesystem paths and project structure
- **Tags**: STRIDE-I, localhost

#### T4: malicious local process

**Statement**: A malicious local process with ability to reach localhost can flood POST /captures with large payloads to fill disk, which leads to disk space exhaustion, server becomes unresponsive

- **Prerequisites**: with ability to reach localhost
- **Action**: flood POST /captures with large payloads to fill disk
- **Impact**: disk space exhaustion, server becomes unresponsive
- **Tags**: STRIDE-D, localhost

#### T5: malicious local process

**Statement**: A malicious local process with ability to POST to /captures can craft capture filename with ../ to write outside captures directory, which leads to arbitrary file write on developer machine

- **Prerequisites**: with ability to POST to /captures
- **Action**: craft capture filename with ../ to write outside captures directory
- **Impact**: arbitrary file write on developer machine
- **Tags**: STRIDE-T, path-traversal

#### T6: compromised npm dependency

**Statement**: A compromised npm dependency with compromised npm package in dependency tree can execute arbitrary code via npx with full Node.js permissions, which leads to full system compromise, data exfiltration, backdoor installation

- **Prerequisites**: with compromised npm package in dependency tree
- **Action**: execute arbitrary code via npx with full Node.js permissions
- **Impact**: full system compromise, data exfiltration, backdoor installation
- **Tags**: STRIDE-E, supply-chain

#### T7: developer capturing production or staging pages

**Statement**: A developer capturing production or staging pages when capturing pages with sensitive data can capture page containing PII, credentials, or sensitive business data, which leads to sensitive data persisted in JSON files on disk, potentially committed to git

- **Prerequisites**: when capturing pages with sensitive data
- **Action**: capture page containing PII, credentials, or sensitive business data
- **Impact**: sensitive data persisted in JSON files on disk, potentially committed to git
- **Tags**: STRIDE-I, data-leakage

#### T8: malicious local process

**Statement**: A malicious local process with ability to PUT to /config endpoint can modify urlPatterns to route captures to attacker-controlled directory, which leads to captures written to wrong location, config corruption

- **Prerequisites**: with ability to PUT to /config endpoint
- **Action**: modify urlPatterns to route captures to attacker-controlled directory
- **Impact**: captures written to wrong location, config corruption
- **Tags**: STRIDE-T, config

#### T9: malicious web page

**Statement**: A malicious web page with access to page DOM can attempt to inject fake UI elements mimicking ViewGraph sidebar, which leads to user interacts with fake UI, credentials or annotations stolen

- **Prerequisites**: with access to page DOM
- **Action**: attempt to inject fake UI elements mimicking ViewGraph sidebar
- **Impact**: user interacts with fake UI, credentials or annotations stolen
- **Tags**: STRIDE-S, shadow-dom

## Mitigations

### Identified Mitigations

#### M1: HMAC-signed requests (ADR-015) + native messaging default (ADR-016). File-based secret means only local processes with filesystem access can authenticate. Native messaging eliminates HTTP entirely.

**Addresses Threats**: T1

#### M2: F19 5-layer prompt injection defense: capture sanitization, transport wrapping with delimiters, suspicious pattern detection, prompt hardening, URL trust gate.

**Addresses Threats**: T2

#### M3: Security response headers (nosniff, no-store), error sanitization (no filesystem paths in errors), HMAC auth on /info endpoint (ADR-015), native messaging eliminates /info exposure (ADR-016).

**Addresses Threats**: T3

#### M4: 5MB payload limit on POST /captures, 1MB WebSocket max payload, 10 concurrent WS connections, idle timeout (30 min) prevents resource accumulation.

**Addresses Threats**: T4

#### M5: validateCapturePath() + safeConfigPath() + ENV_ALLOWED_DIRS constant. All file writes validated against allowed directory list. Path components sanitized (no .., no absolute paths).

**Addresses Threats**: T5

#### M6: npm 2FA on publish, package-lock.json committed, dependabot alerts enabled, npm audit in CI, minimal dependency tree (97 packages).

**Addresses Threats**: T6

#### M7: .gitignore includes .viewgraph/, user controls what pages to capture, storage collector redacts sensitive values (tokens, passwords, keys), URL trust indicator warns on untrusted pages.

**Addresses Threats**: T7

#### M8: ALLOWED_CONFIG_KEYS whitelist (shared constant) applied on both HTTP PUT /config and native messaging updateConfig. Auto-learn restricted to localhost/file URLs only. Config merge preserves existing keys.

**Addresses Threats**: T8

#### M9: Closed shadow DOM (mode: closed) prevents host page from accessing or mimicking the sidebar. Extension UI elements marked with data-vg-annotate attribute for internal identification.

**Addresses Threats**: T9

## Assumptions

### A001: Network

**Description**: Server binds to 127.0.0.1 only - not accessible from the network

- **Impact**: Eliminates remote network attack vectors
- **Rationale**: Server explicitly binds to localhost. No configuration option to change this.

### A002: Authentication

**Description**: HTTP endpoints are unauthenticated - any local process can reach them

- **Impact**: Local processes can inject captures, read server info, modify config
- **Rationale**: ADR-010 removed auth for beta. HMAC signing (ADR-015) and native messaging (ADR-016) are planned mitigations.

### A003: Trust

**Description**: Extension runs in a closed shadow DOM - host page cannot access sidebar content

- **Impact**: Prevents page JS from reading annotations or manipulating the extension UI
- **Rationale**: Shadow DOM mode: closed. Verified in SRR-001 through SRR-004.

### A004: Data

**Description**: All capture data stays on the local filesystem - no cloud transmission

- **Impact**: No data exfiltration via the tool itself. Risk is limited to local access.
- **Rationale**: No external API calls, no telemetry, no analytics. Verified by code audit.

## Phase Progress

| Phase | Name | Completion |
|---|---|---|
| 1 | Business Context Analysis | 100% ✅ |
| 2 | Architecture Analysis | 100% ✅ |
| 3 | Threat Actor Analysis | 100% ✅ |
| 4 | Trust Boundary Analysis | 100% ✅ |
| 5 | Asset Flow Analysis | 100% ✅ |
| 6 | Threat Identification | 100% ✅ |
| 7 | Mitigation Planning | 100% ✅ |
| 7.5 | Code Validation Analysis | 0% ⏳ |
| 8 | Residual Risk Analysis | 0% ⏳ |
| 9 | Output Generation and Documentation | 100% ✅ |

---

*This threat model report was generated automatically by the Threat Modeling MCP Server.*
