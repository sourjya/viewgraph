# CI Test Matrix - Design

## GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint

  test-server:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }} }
      - run: npm ci
      - run: npm run test:server

  test-extension:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }} }
      - run: npm ci
      - run: npm run test:ext

  build:
    needs: [lint, test-server, test-extension]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build:ext -- --browser ${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        with:
          name: extension-${{ matrix.browser }}
          path: extension/.output/${{ matrix.browser }}-mv3/
          retention-days: 30
```

## Caching Strategy

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-
```

## Pipeline Diagram

```
push/PR
  |
  +---> lint (Node 22)
  |
  +---> test-server (Node 18, 20, 22) [3 parallel]
  |
  +---> test-extension (Node 18, 22) [2 parallel]
  |
  v (all pass)
  |
  +---> build-chrome (Node 22) --> artifact
  |
  +---> build-firefox (Node 22) --> artifact
```

Total: 6 parallel test jobs + 2 sequential build jobs.
Expected time: ~3 minutes (tests ~90s, builds ~30s, with caching).

## Branch Protection Rules

- Require status checks: `lint`, `test-server (18)`, `test-server (22)`, `test-extension (18)`, `test-extension (22)`
- Builds are not required (advisory) - they run after tests pass
