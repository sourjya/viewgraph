# Multi-Project Setup Guide

ViewGraph can run multiple projects simultaneously, each with its own server, captures directory, and URL routing. This guide covers all three ways pages get matched to projects.

## How URL Routing Works

When you capture a page, the extension needs to know which project's server to send it to. It matches the page URL against each running server using three strategies, tried in order:

| Mode | URL looks like | How it matches | Setup needed |
|---|---|---|---|
| **File** | `file:///home/user/myapp/index.html` | Compares file path against each server's project root | None - automatic |
| **Localhost** | `http://localhost:3000/dashboard` | Matches against URL patterns in `.viewgraph/config.json` | Add `--url localhost:3000` to init |
| **Remote** | `https://staging.myapp.com/login` | Matches against URL patterns in `.viewgraph/config.json` | Add `--url staging.myapp.com` to init |

## Setting Up URL Patterns

### Option 1: During init (recommended)

```bash
cd ~/myproject
npx viewgraph-init --url localhost:3000
```

Multiple patterns:

```bash
npx viewgraph-init --url localhost:3000 --url staging.myapp.com --url myapp.com
```

### Option 2: Re-run init to add more patterns

Already initialized? Just run init again with the new `--url` flag. It appends to existing patterns without duplicating:

```bash
# First time
npx viewgraph-init --url localhost:3000

# Later, add staging
npx viewgraph-init --url staging.myapp.com

# config.json now has: ["localhost:3000", "staging.myapp.com"]
```

The init script preserves your existing configuration. It won't recreate files that already exist or remove patterns you've already set.

### Option 3: Edit config.json directly

Open `.viewgraph/config.json` in your project root:

```json
{
  "urlPatterns": [
    "localhost:3000",
    "staging.myapp.com",
    "myapp.com"
  ]
}
```

Edit the array, save. The server reads this file on each `/info` request, so changes take effect within 15 seconds (the extension's registry refresh interval). To force an immediate refresh, click the ViewGraph icon to reopen the sidebar.

### Pattern matching rules

Patterns use simple substring matching against the full page URL:

| Pattern | Matches | Doesn't match |
|---|---|---|
| `localhost:3000` | `http://localhost:3000/login` | `http://localhost:3001/login` |
| `staging.myapp.com` | `https://staging.myapp.com/dashboard` | `https://myapp.com/dashboard` |
| `myapp.com` | `https://myapp.com/login`, `https://staging.myapp.com/login` | `http://localhost:3000` |

More specific patterns are checked first. If `staging.myapp.com` and `myapp.com` are on different projects, the staging URL matches the staging project because it's checked against each server's patterns.

## Multi-Project Example

Two projects, each with a dev server:

```bash
# Terminal 1: Frontend project
cd ~/projects/frontend
npx viewgraph-init --url localhost:3000

# Terminal 2: Admin dashboard
cd ~/projects/admin
npx viewgraph-init --url localhost:3001
```

Output:

```
# Frontend
  Started (PID 12345, port 9876)

# Admin
  Started (PID 12346, port 9877)
```

Now in Chrome:
- `http://localhost:3000/login` -> captures go to `~/projects/frontend/.viewgraph/captures/`
- `http://localhost:3001/users` -> captures go to `~/projects/admin/.viewgraph/captures/`
- `file:///home/user/projects/frontend/index.html` -> matches by file path, no URL pattern needed

## Verifying the Setup

Check which servers are running and what they're configured for:

```bash
# From any project
npx viewgraph-status
```

Or check the server directly:

```bash
curl http://127.0.0.1:9876/info | jq
```

```json
{
  "capturesDir": "/home/user/projects/frontend/.viewgraph/captures",
  "projectRoot": "/home/user/projects/frontend",
  "urlPatterns": ["localhost:3000"],
  "agent": "Kiro"
}
```

In the extension sidebar, the green dot tooltip shows which server the current page is connected to.

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Wrong project shown in sidebar | URL pattern missing or matching wrong server | Check `.viewgraph/config.json` in both projects. Add the correct `--url` pattern. |
| "No project connected" | No server running, or URL doesn't match any pattern | Run `npx viewgraph-init --url <your-url>` in the project folder |
| Both projects on same port | Init killed the first server | This is fixed - init auto-finds a free port (9876-9879). If you see the same port, kill all servers and re-init both. |
| File URLs work but localhost doesn't | No URL pattern configured | File URLs match by path automatically. Localhost needs `--url localhost:PORT`. |
| Config changes not taking effect | Extension caches server registry for 15 seconds | Wait 15 seconds, or close and reopen the sidebar |
