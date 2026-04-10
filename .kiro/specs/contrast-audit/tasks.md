# Contrast Ratio Audit - Tasks

## Phase 1: Contrast Module (TDD)

- [ ] 1.1 Write tests for parseColor (hex, rgb, rgba, edge cases)
- [ ] 1.2 Implement parseColor
- [ ] 1.3 Write tests for relativeLuminance (black, white, known values)
- [ ] 1.4 Implement relativeLuminance
- [ ] 1.5 Write tests for contrastRatio (known pairs)
- [ ] 1.6 Implement contrastRatio
- [ ] 1.7 Write tests for checkContrast (AA/AAA thresholds, large text)
- [ ] 1.8 Implement checkContrast

## Phase 2: Integration with a11y-rules (TDD)

- [ ] 2.1 Write tests for contrastRule (pass, AA fail, AAA-only fail, missing styles)
- [ ] 2.2 Implement contrastRule in a11y-rules.js
- [ ] 2.3 Verify audit_accessibility tool returns contrast issues

## Phase 3: Finalize

- [ ] 3.1 Run full test suite, verify no regressions
- [ ] 3.2 Commit, merge to main
