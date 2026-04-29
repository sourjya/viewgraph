# Comprehensive Threat Model Report

**Generated**: 2026-04-17 11:43:33
**Current Phase**: 9 - Output Generation and Documentation
**Overall Completion**: 100.0%

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

ViewGraph is an open-source developer tool (AGPL-3.0) consisting of a browser extension (Chrome/Firefox) and an MCP server. The extension captures structured DOM snapshots from web pages and the server exposes them to AI coding assistants via the Model Context Protocol. The tool runs entirely on localhost - no cloud services, no external APIs, no telemetry. Users are developers, testers, and QA reviewers working on web applications. The extension reads DOM structure, computed styles, accessibility attributes, network state, and console errors. It never modifies the page. The MCP server binds to 127.0.0.1 only and stores captures as JSON files on disk. Authentication was removed for beta (ADR-010). The tool is distributed via Chrome Web Store, Firefox Add-ons, and npm (@viewgraph/core). Current version 0.4.2 with 37 MCP tools, 16 enrichment collectors, and 1538 tests.

### Key Statistics

- **Total Threats**: 8
- **Total Mitigations**: 8
- **Total Assumptions**: 5
- **System Components**: 7
- **Assets**: 10
- **Threat Actors**: 14

## Business Context

**Description**: ViewGraph is an open-source developer tool (AGPL-3.0) consisting of a browser extension (Chrome/Firefox) and an MCP server. The extension captures structured DOM snapshots from web pages and the server exposes them to AI coding assistants via the Model Context Protocol. The tool runs entirely on localhost - no cloud services, no external APIs, no telemetry. Users are developers, testers, and QA reviewers working on web applications. The extension reads DOM structure, computed styles, accessibility attributes, network state, and console errors. It never modifies the page. The MCP server binds to 127.0.0.1 only and stores captures as JSON files on disk. Authentication was removed for beta (ADR-010). The tool is distributed via Chrome Web Store, Firefox Add-ons, and npm (@viewgraph/core). Current version 0.4.2 with 37 MCP tools, 16 enrichment collectors, and 1538 tests.

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
| C001 | Content Script | Compute | N/A | Browser content script injected into web pages on user click. Traverses DOM, collects enrichment data (network, console, landmarks, stacking, focus), renders annotation sidebar in Shadow DOM. Communicates with background service worker and localhost MCP server. |
| C002 | Background Service Worker | Compute | N/A | Manifest V3 service worker. Handles extension lifecycle, message routing between content script and popup, capture orchestration, and chrome.runtime messaging. No persistent state - uses chrome.storage. |
| C003 | MCP Server | Compute | N/A | MCP server exposing 36 tools for querying, analyzing, and comparing DOM captures. Communicates with AI agents via stdio JSON-RPC (MCP protocol). Reads capture files from disk, indexes metadata in memory. |
| C004 | HTTP Receiver | Network | N/A | HTTP server embedded in the MCP server process. Receives captures from the extension via POST /captures, serves /health and /info endpoints, handles capture request lifecycle. Binds to localhost only. |
| C005 | WebSocket Server | Network | N/A | WebSocket server for real-time bidirectional communication between extension and MCP server. Broadcasts annotation resolution events and auto-audit results. Runs on same port as HTTP receiver. |
| C006 | AI Agent (External) | Compute | N/A | External AI coding agent (Kiro, Claude Code, Cursor, etc.) that connects to the MCP server via stdio. Reads captures, queries DOM structure, resolves annotations, and modifies source code. Not controlled by ViewGraph. |
| C007 | Target Web Page | Compute | N/A | The web page being inspected by the developer. Untrusted - could be any website including malicious ones. The extension reads its DOM but never modifies it. Page JavaScript can make requests to localhost. |

### Connections

| ID | Source | Destination | Protocol | Port | Encrypted | Description |
|---|---|---|---|---|---|---|
| CN001 | C007 | C001 | Other | N/A | No | Content script traverses the target page DOM to capture structure, styles, and attributes via browser DOM API |
| CN002 | C001 | C002 | Other | N/A | No | chrome.runtime.sendMessage for capture orchestration, settings sync |
| CN003 | C001 | C004 | HTTP | 9876 | No | Extension POSTs capture JSON to localhost HTTP receiver. No auth in beta. Payload limit 5MB. |
| CN004 | C001 | C005 | WebSocket | 9876 | No | WebSocket connection for real-time annotation resolution events and auto-audit results |
| CN005 | C006 | C003 | Other | N/A | No | AI agent communicates with MCP server via stdio JSON-RPC (MCP protocol). Agent reads captures, queries tools, resolves annotations. |
| CN006 | C007 | C004 | HTTP | 9876 | No | Any page JavaScript can make fetch/XHR requests to localhost:9876. This is the primary attack vector - malicious websites can POST fake captures or read server info. |

### Data Stores

| ID | Name | Type | Classification | Encrypted at Rest | Description |
|---|---|---|---|---|---|
| D001 | Capture Files (.viewgraph/captures/) | File System | Internal | No | JSON capture files stored in .viewgraph/captures/. Contains DOM structure, selectors, styles, annotations, enrichment data. No passwords or tokens. |
| D002 | Chrome Storage (extension state) | NoSQL | Internal | No | chrome.storage.local for extension preferences, cached server config, pending requests. Browser-managed, not synced externally. |
| D003 | Config File (.viewgraph/config.json) | File System | Internal | No | Project config at .viewgraph/config.json. Contains URL patterns, autoAudit flag, smartSuggestions flag. Auto-generated on first capture. |

## Threat Actors

### Insider

- **Type**: ThreatActorType.INSIDER
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial, Revenge
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: No
- **Priority**: 5/10
- **Description**: An employee or contractor with legitimate access to the system

### External Attacker

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: No
- **Priority**: 3/10
- **Description**: An external individual or group attempting to gain unauthorized access

### Nation-state Actor

- **Type**: ThreatActorType.NATION_STATE
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Espionage, Political
- **Resources**: ResourceLevel.EXTENSIVE
- **Relevant**: No
- **Priority**: 1/10
- **Description**: A government-sponsored group with advanced capabilities

### Hacktivist

- **Type**: ThreatActorType.HACKTIVIST
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Ideology, Political
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: No
- **Priority**: 6/10
- **Description**: An individual or group motivated by ideological or political beliefs

### Organized Crime

- **Type**: ThreatActorType.ORGANIZED_CRIME
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Financial
- **Resources**: ResourceLevel.EXTENSIVE
- **Relevant**: No
- **Priority**: 2/10
- **Description**: A criminal organization with significant resources

### Competitor

- **Type**: ThreatActorType.COMPETITOR
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial, Espionage
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: No
- **Priority**: 7/10
- **Description**: A business competitor seeking competitive advantage

### Script Kiddie

- **Type**: ThreatActorType.SCRIPT_KIDDIE
- **Capability Level**: CapabilityLevel.LOW
- **Motivations**: Curiosity, Reputation
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: No
- **Priority**: 9/10
- **Description**: An inexperienced attacker using pre-made tools

### Disgruntled Employee

- **Type**: ThreatActorType.DISGRUNTLED_EMPLOYEE
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Revenge
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: No
- **Priority**: 4/10
- **Description**: A current or former employee with a grievance

### Privileged User

- **Type**: ThreatActorType.PRIVILEGED_USER
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Financial, Accidental
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: No
- **Priority**: 8/10
- **Description**: A user with elevated privileges who may abuse them or make mistakes

### Third Party

- **Type**: ThreatActorType.THIRD_PARTY
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial, Accidental
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: No
- **Priority**: 10/10
- **Description**: A vendor, partner, or service provider with access to the system

### Malicious Website

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Financial, Disruption
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: Yes
- **Priority**: 1/10
- **Description**: A website the developer visits that contains malicious JavaScript. Can make fetch requests to localhost:9876, inject content into DOM that gets captured, or attempt prompt injection via DOM text that the AI agent later reads.

### Rogue Browser Extension

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.MEDIUM
- **Motivations**: Espionage, Financial
- **Resources**: ResourceLevel.LIMITED
- **Relevant**: Yes
- **Priority**: 3/10
- **Description**: Another browser extension installed by the developer that has broad permissions. Can read DOM, intercept network requests, access chrome.storage, and interact with localhost servers.

### Supply Chain Attacker (npm)

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Financial, Espionage
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 2/10
- **Description**: Attacker who compromises the @viewgraph/core npm package or one of its dependencies. Code runs with full Node.js permissions on the developer's machine when the MCP server starts via npx.

### Local Malware

- **Type**: ThreatActorType.EXTERNAL
- **Capability Level**: CapabilityLevel.HIGH
- **Motivations**: Financial, Espionage
- **Resources**: ResourceLevel.MODERATE
- **Relevant**: Yes
- **Priority**: 4/10
- **Description**: Malware already running on the developer's machine. Can read capture files from disk, interact with localhost HTTP server, and modify files in .viewgraph/ directory.

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

#### Web Page (Untrusted)

- **Trust Level**: TrustLevel.UNTRUSTED
- **Description**: Web pages visited by the developer. Fully untrusted - any page can contain malicious JavaScript. Includes the target page DOM and any scripts running on it.

#### Browser Extension

- **Trust Level**: TrustLevel.MEDIUM
- **Description**: Browser extension code (content script, background worker). Runs with extension permissions. Trusted code but operates in an untrusted environment (reads untrusted DOM). Shadow DOM provides UI isolation.

#### Localhost Network

- **Trust Level**: TrustLevel.LOW
- **Description**: Localhost HTTP/WS communication between extension and server. No authentication in beta. Any process on the machine can access these endpoints.

#### MCP Server Process

- **Trust Level**: TrustLevel.HIGH
- **Description**: MCP server process running on the developer's machine. Has filesystem access to .viewgraph/ directory. Communicates with AI agent via stdio. Trusted code with validated inputs.

#### Local Filesystem

- **Trust Level**: TrustLevel.HIGH
- **Description**: Local filesystem where capture files, config, and project source code reside. Protected by OS file permissions. Any local process with user permissions can read/write.

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

#### Browser Extension Boundary

- **Type**: BoundaryType.PROCESS
- **Controls**: Content Security Policy, Extension permissions (activeTab), Shadow DOM isolation
- **Description**: Browser enforced boundary between web page and extension. Extension reads DOM but page cannot access extension internals.

#### Localhost HTTP Boundary

- **Type**: BoundaryType.NETWORK
- **Controls**: Localhost-only binding (127.0.0.1), Payload size limits (5MB), JSON format validation, Path traversal prevention
- **Description**: HTTP/WS communication on localhost. No authentication in beta. Protected by localhost binding and input validation.

#### Filesystem Write Boundary

- **Type**: BoundaryType.PROCESS
- **Controls**: Directory scoping (allowedDirs), Filename sanitization, OS file permissions
- **Description**: Server writes capture files to scoped directories only. Path validation prevents traversal.

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
| A008 | DOM Capture Data | AssetType.DATA | AssetClassification.INTERNAL | 3 | 3 | N/A |
| A009 | Annotation Data | AssetType.DATA | AssetClassification.INTERNAL | 2 | 2 | N/A |
| A010 | Project Source Code | AssetType.DATA | AssetClassification.CONFIDENTIAL | 5 | 5 | N/A |

### Asset Flows

| ID | Asset | Source | Destination | Protocol | Encrypted | Risk Level |
|---|---|---|---|---|---|---|
| F001 | User Credentials | C001 | C002 | HTTPS | Yes | 4 |
| F002 | Session Token | C002 | C001 | HTTPS | Yes | 3 |
| F003 | Personal Identifiable Information | C003 | C004 | TLS | Yes | 3 |
| F004 | Audit Logs | C003 | C005 | TLS | Yes | 2 |

## Threats

### Identified Threats

#### T1: Malicious website JavaScript

**Statement**: A Malicious website JavaScript with JavaScript running on any page the developer visits can POST fake capture data to localhost:9876 via fetch, spoofing the extension, which leads to agent reads poisoned capture data and makes incorrect code changes

- **Prerequisites**: with JavaScript running on any page the developer visits
- **Action**: POST fake capture data to localhost:9876 via fetch, spoofing the extension
- **Impact**: agent reads poisoned capture data and makes incorrect code changes
- **Impacted Assets**: A008
- **Tags**: STRIDE-S, localhost

#### T2: Malicious website

**Statement**: A Malicious website with control over page DOM content (HTML comments, data attributes, visible text) can embed malicious instructions in DOM that get captured and sent to the AI agent, which leads to agent executes attacker instructions, modifies source code maliciously

- **Prerequisites**: with control over page DOM content (HTML comments, data attributes, visible text)
- **Action**: embed malicious instructions in DOM that get captured and sent to the AI agent
- **Impact**: agent executes attacker instructions, modifies source code maliciously
- **Impacted Assets**: A008, A010
- **Tags**: STRIDE-T, prompt-injection

#### T3: Malicious website JavaScript

**Statement**: A Malicious website JavaScript with JavaScript on any page can call GET /info and /captures to read project root, URL patterns, and capture filenames, which leads to attacker learns project structure, dev server URLs, and capture history

- **Prerequisites**: with JavaScript on any page
- **Action**: call GET /info and /captures to read project root, URL patterns, and capture filenames
- **Impact**: attacker learns project structure, dev server URLs, and capture history
- **Impacted Assets**: A008
- **Tags**: STRIDE-I, localhost

#### T4: Malicious website JavaScript

**Statement**: A Malicious website JavaScript with JavaScript on any page can flood POST /captures with large payloads to fill disk or exhaust server resources, which leads to disk space exhaustion, server unresponsive, developer workflow disrupted

- **Prerequisites**: with JavaScript on any page
- **Action**: flood POST /captures with large payloads to fill disk or exhaust server resources
- **Impact**: disk space exhaustion, server unresponsive, developer workflow disrupted
- **Impacted Assets**: A008
- **Tags**: STRIDE-D, localhost

#### T5: Malicious website or local process

**Statement**: A Malicious website or local process with ability to POST crafted capture metadata to localhost can craft metadata.url with path traversal sequences to write files outside captures dir, which leads to arbitrary file write on developer machine

- **Prerequisites**: with ability to POST crafted capture metadata to localhost
- **Action**: craft metadata.url with path traversal sequences to write files outside captures dir
- **Impact**: arbitrary file write on developer machine
- **Tags**: STRIDE-T, filesystem

#### T6: Supply chain attacker

**Statement**: A Supply chain attacker with ability to publish a compromised version of @viewgraph/core to npm can inject malicious code into npm package that runs with full Node.js permissions via npx, which leads to full machine compromise, source code theft, credential exfiltration

- **Prerequisites**: with ability to publish a compromised version of @viewgraph/core to npm
- **Action**: inject malicious code into npm package that runs with full Node.js permissions via npx
- **Impact**: full machine compromise, source code theft, credential exfiltration
- **Impacted Assets**: A010
- **Tags**: STRIDE-E, supply-chain

#### T7: Any localhost process

**Statement**: A Any localhost process with access to localhost HTTP endpoints can submit captures or resolve annotations without any audit trail of who did it, which leads to cannot distinguish legitimate captures from injected ones

- **Prerequisites**: with access to localhost HTTP endpoints
- **Action**: submit captures or resolve annotations without any audit trail of who did it
- **Impact**: cannot distinguish legitimate captures from injected ones
- **Impacted Assets**: A008, A009
- **Tags**: STRIDE-R

#### T8: Developer (accidental)

**Statement**: A Developer (accidental) when developer captures a page showing sensitive data (PII, tokens in URL, etc.) can capture visible text containing PII, API keys in URLs, or sensitive business data, which leads to sensitive data persisted in capture files, potentially shared via git or exports

- **Prerequisites**: when developer captures a page showing sensitive data (PII, tokens in URL, etc.)
- **Action**: capture visible text containing PII, API keys in URLs, or sensitive business data
- **Impact**: sensitive data persisted in capture files, potentially shared via git or exports
- **Impacted Assets**: A008
- **Tags**: STRIDE-I, data-leak

## Mitigations

### Identified Mitigations

#### M1: Replace localhost HTTP with Chrome native messaging for extension-server communication

**Addresses Threats**: T1, T3, T4, T7

### Resolved Mitigations

#### M2: Validate capture JSON structure before writing to disk

**Addresses Threats**: T1

#### M3: Sanitize filenames and validate paths against allowed directories

**Addresses Threats**: T5

#### M4: Document that all capture data must be treated as untrusted input by AI agents

**Addresses Threats**: T2

#### M5: Enforce payload size limits on all POST endpoints

**Addresses Threats**: T4

#### M6: Require 2FA for npm publishing and commit package-lock.json

**Addresses Threats**: T6

#### M7: Add .viewgraph/ to .gitignore to prevent accidental commit of capture data

**Addresses Threats**: T8

#### M8: Extension sidebar runs in isolated Shadow DOM to prevent page CSS/JS interference

**Addresses Threats**: T2

## Assumptions

### A001: Network

**Description**: The MCP server binds exclusively to 127.0.0.1 and is not accessible from the network

- **Impact**: Eliminates remote network attack vectors - all threats must originate from the local machine
- **Rationale**: Server uses http.createServer bound to 127.0.0.1. No configuration option to bind to 0.0.0.0.

### A002: Authentication

**Description**: No authentication on HTTP endpoints during beta period (ADR-010)

- **Impact**: Any process on localhost can POST captures, read data, and interact with the server
- **Rationale**: Auth tokens were removed to reduce setup friction. Localhost-only binding provides baseline protection. Native messaging planned for post-beta.

### A003: Environment

**Description**: The tool operates in a trusted developer environment on the developer's own machine

- **Impact**: Nation-state actors and physical access threats are out of scope
- **Rationale**: ViewGraph is a development tool, not a production service. The developer controls the machine.

### A004: Extension

**Description**: The browser extension never modifies the visited page DOM, submits forms, or makes network requests on behalf of the site

- **Impact**: Eliminates CSRF, form submission, and page manipulation threat vectors from the extension
- **Rationale**: Extension only reads DOM structure, computed styles, and element attributes. Sidebar runs in isolated Shadow DOM.

### A005: Data

**Description**: Captures contain DOM structure, CSS selectors, computed styles, and element attributes but NOT passwords, cookies, session tokens, localStorage, or request/response bodies

- **Impact**: Reduces data sensitivity classification - captures are Internal, not Confidential
- **Rationale**: The traverser explicitly excludes input values, cookies, and storage. Network collector only records request URLs and status, not bodies.

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
| 7.5 | Code Validation Analysis | 100% ✅ |
| 8 | Residual Risk Analysis | 100% ✅ |
| 9 | Output Generation and Documentation | 100% ✅ |

---

*This threat model report was generated automatically by the Threat Modeling MCP Server.*
