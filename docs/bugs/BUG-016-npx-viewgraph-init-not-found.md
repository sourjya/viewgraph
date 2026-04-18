# BUG-016: viewgraph-init Doesn't Work

- **ID**: BUG-016
- **Severity**: High
- **Status**: FIXED
- **Reported**: 2026-04-18
- **Fixed**: 2026-04-18

## Description

`viewgraph-init` fails with `E404 - Not found` because there's no npm package called `viewgraph-init`. The bin entry is part of `@viewgraph/core` but npx can't resolve it by bin name alone.

## Reproduction

```bash
viewgraph-init
# npm error 404 Not Found - 'viewgraph-init@*' is not in this registry
```

## Working alternatives

```bash
# Global install (recommended for explicit setup)
npm install -g @viewgraph/core
viewgraph-init

# npx with package flag (works but verbose)
npx -p @viewgraph/core viewgraph-init
```

## Root Cause

npm's `npx` resolves by package name, not bin name. The package is `@viewgraph/core` but the bin is `viewgraph-init`. npx looks for a package called `viewgraph-init` which doesn't exist.

## Fix Options

1. Update all docs to use `npm install -g @viewgraph/core && viewgraph-init`
2. Publish a tiny `viewgraph-init` package that depends on `@viewgraph/core` and re-exports the bin
3. Add a `viewgraph` package alias that maps to `@viewgraph/core`

## Affected Docs

~20 references to `viewgraph-init` across gitbook, runbooks, and tutorials.
