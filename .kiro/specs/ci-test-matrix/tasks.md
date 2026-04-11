# CI Test Matrix - Tasks

### Task 1: Create GitHub Actions workflow
- [ ] Create `.github/workflows/ci.yml` with lint, test-server, test-extension, build jobs
- [ ] Matrix: server tests on Node 18/20/22, extension tests on Node 18/22
- [ ] Build Chrome and Firefox extensions after tests pass
- [ ] Upload build artifacts with 30-day retention

### Task 2: Add npm caching
- [ ] Cache `~/.npm` keyed by `package-lock.json` hash
- [ ] Verify cache hit on second run

### Task 3: Configure branch protection
- [ ] Require lint + test jobs to pass before merge to main
- [ ] Document in CONTRIBUTING.md or README

### Task 4: Add coverage reporting
- [ ] Add `--coverage` flag to vitest runs
- [ ] Upload coverage reports as artifacts
- [ ] Add coverage badge to README (optional)

### Task 5: Verify pipeline
- [ ] Push to a test branch, verify all 6 test jobs run in parallel
- [ ] Verify builds produce artifacts
- [ ] Verify total pipeline time < 5 minutes
