# F17: URL Trust Indicator - Tasks

## Phase 1: Trust classification
- [ ] 1. Add `classifyTrust(pageUrl, trustedPatterns)` and `isLocalUrl(url)` to `extension/lib/constants.js`
- [ ] 2. Write tests: localhost trusted, file:// trusted, WSL trusted, configured pattern trusted, remote untrusted, port-only pattern NOT trusted
- [ ] 3. Add `trustedPatterns` to `/info` response in `server/src/http-receiver.js`
- [ ] 4. Write server test for trustedPatterns in /info response

## Phase 2: Visual indicator
- [ ] 5. Add `shieldIcon(color)` to `sidebar/icons.js`
- [ ] 6. Add shield to sidebar header in `annotation-sidebar.js` with tooltip showing trust level and reason
- [ ] 7. Wire shield to update from `classifyTrust` result using cached config
- [ ] 8. Write icon rendering test for shieldIcon

## Phase 3: Send gate
- [ ] 9. Disable Send button when trust level is 'untrusted'
- [ ] 10. Show inline gate UI on disabled Send click: warning message + two action buttons
- [ ] 11. Implement "Add to trusted" button: `PUT /config` with merged trustedPatterns, re-classify, enable send
- [ ] 12. Implement "Send anyway" button: add `trustOverride: true` to capture metadata, proceed with send
- [ ] 13. Apply same gate to F15 suggestion "Send N to Agent" button
- [ ] 14. Write tests: send blocked for untrusted, send allowed for trusted/configured, override adds metadata flag

## Phase 4: Edge cases and polish
- [ ] 15. Handle SPA navigation: listen for `popstate` and re-classify on URL change
- [ ] 16. Handle no server connected: shield hidden, send already disabled
- [ ] 17. Verify Copy MD and Download Report are NOT gated
- [ ] 18. Update docs: security page, extension page, changelog
