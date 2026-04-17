# F17: URL Trust Indicator - Design

## Architecture

### Trust Classification Function

New export in `extension/lib/constants.js`:

```js
/**
 * Classify a URL's trust level.
 * @param {string} pageUrl - The current page URL
 * @param {string[]} trustedPatterns - From config.json trustedPatterns
 * @returns {{ level: 'trusted'|'configured'|'untrusted', reason: string }}
 */
export function classifyTrust(pageUrl, trustedPatterns = []) {
  const normalized = normalizeUrl(pageUrl);

  // Localhost and file:// are always trusted
  if (isLocalUrl(normalized)) return { level: 'trusted', reason: 'localhost' };

  // Check against configured trusted patterns
  for (const pattern of trustedPatterns) {
    if (normalized.includes(pattern)) return { level: 'configured', reason: pattern };
  }

  return { level: 'untrusted', reason: 'remote URL' };
}

function isLocalUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'file:'
      || u.hostname === 'localhost'
      || u.hostname === '127.0.0.1'
      || u.hostname === '0.0.0.0'
      || u.hostname === '[::1]'
      || u.hostname === 'wsl.localhost';
  } catch { return false; }
}
```

### Sidebar Header Integration

In `annotation-sidebar.js`, after the status dot:

```
[green dot] [shield icon] ViewGraph    [?] [bell] [collapse] [X]
```

The shield icon uses `icons.js` factory functions:
- `shieldIcon(color)` - new icon in `sidebar/icons.js`
- Color: `#4ade80` (trusted), `#60a5fa` (configured), `#f59e0b` (untrusted)

### Send Gate Flow

```
User clicks "Send to Agent"
    |
    v
classifyTrust(window.location.href, cachedTrustedPatterns)
    |
    +--> trusted/configured --> proceed with send
    |
    +--> untrusted --> show inline gate:
            |
            +-- [Add "hostname" to trusted] --> PUT /config { trustedPatterns: [...existing, hostname] }
            |                                   --> re-classify, enable send, proceed
            |
            +-- [Send anyway] --> add trustOverride:true to capture metadata --> proceed
```

### Inline Gate UI

Replaces the Send button area temporarily:

```
  ┌─────────────────────────────────────────────┐
  │ ⚠ Untrusted URL                             │
  │ Captures from remote sites may contain       │
  │ malicious content that could affect your     │
  │ AI agent's behavior.                         │
  │                                              │
  │ [Add "staging.myapp.com" to trusted]         │
  │ [Send anyway (not recommended)]              │
  └─────────────────────────────────────────────┘
```

Styled with amber border, dark background, consistent with existing themed dialogs.

### Config Schema Update

```json
{
  "urlPatterns": ["localhost:3000"],
  "trustedPatterns": ["staging.myapp.com", "preview.myapp.com"],
  "autoAudit": false,
  "smartSuggestions": true
}
```

`trustedPatterns` is a new field. `urlPatterns` remains unchanged (routing only).

### Server Changes

`PUT /config` already supports merging. No server changes needed - the extension writes `trustedPatterns` via the existing endpoint.

`GET /info` should return `trustedPatterns` alongside `urlPatterns` so the extension can cache them:

```js
// In http-receiver.js /info handler
const trustedPatterns = cfg.trustedPatterns || [];
return json(res, 200, { ..., urlPatterns, trustedPatterns, ... });
```

### Data Flow

```
Extension opens sidebar
    |
    v
discoverServer(pageUrl) --> GET /info --> cache urlPatterns + trustedPatterns
    |
    v
classifyTrust(pageUrl, trustedPatterns) --> render shield + gate send button
```

### Capture Metadata Addition

When "Send anyway" is used:

```json
{
  "metadata": {
    "url": "https://staging.myapp.com/login",
    "trustOverride": true,
    "trustLevel": "untrusted"
  }
}
```

The agent can see this flag and apply extra caution when processing the capture.

## Performance

- `classifyTrust` is synchronous, O(n) on trustedPatterns (typically < 10 entries)
- No additional network calls - uses cached config from `discoverServer`
- Shield icon rendered once on sidebar open, updated on SPA navigation via `popstate` listener
