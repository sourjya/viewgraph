# Multi-Project Setup

ViewGraph can run multiple projects simultaneously, each with its own server, captures directory, and URL routing.

## How URL Routing Works

When you capture a page, the extension matches the page URL against each running server to find the right project:

| Mode | URL example | How it matches | Setup needed |
|---|---|---|---|
| **File** | `file:///home/user/myapp/index.html` | Compares file path against server's project root | None - automatic |
| **Localhost** | `http://localhost:3000/dashboard` | Matches URL patterns in `.viewgraph/config.json` | `--url localhost:3000` |
| **Remote** | `https://staging.myapp.com/login` | Matches URL patterns in `.viewgraph/config.json` | `--url staging.myapp.com` |

The extension normalizes URLs automatically:
- `127.0.0.1`, `0.0.0.0`, and `[::1]` are treated as `localhost`
- Custom hostnames like `myapp.local:3000` match by port number
- WSL file paths (`file://wsl.localhost/Ubuntu/...`) are handled on Windows

## Setting Up URL Patterns

### During init

```bash
npx viewgraph-init --url localhost:3000
```

Multiple patterns:

```bash
npx viewgraph-init --url localhost:3000 --url staging.myapp.com
```

### Adding patterns later

Re-run init with the new `--url` flag. It appends without duplicating:

```bash
npx viewgraph-init --url staging.myapp.com
# config.json now has: ["localhost:3000", "staging.myapp.com"]
```

### Editing directly

Open `.viewgraph/config.json`:

```json
{
  "urlPatterns": [
    "localhost:3000",
    "staging.myapp.com"
  ]
}
```

Changes take effect within 15 seconds (the extension's registry refresh interval).

## Example: Two Projects

```bash
# Terminal 1
cd ~/projects/frontend
npx viewgraph-init --url localhost:3000
#   Started (PID 12345, port 9876)

# Terminal 2
cd ~/projects/admin
npx viewgraph-init --url localhost:3001
#   Started (PID 12346, port 9877)
```

Now in Chrome:
- `http://localhost:3000/login` - captures go to `frontend/.viewgraph/captures/`
- `http://localhost:3001/users` - captures go to `admin/.viewgraph/captures/`
- `file:///home/user/projects/frontend/index.html` - matches by file path automatically

![Two projects showing different project roots](/.gitbook/assets/two-projects.png)

## Verifying

Check which servers are running:

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

The sidebar's green dot tooltip shows which server the current page is connected to.

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Wrong project in sidebar | URL pattern missing | Add `--url` pattern or edit `.viewgraph/config.json` |
| No server detected | Server not running | Run `npx viewgraph-init` in the project folder |
| 127.0.0.1 vs localhost | Handled automatically | Extension normalizes both to `localhost` |
| Custom hostname not matching | Port fallback handles this | `--url localhost:3000` matches any hostname on port 3000 |
| Config changes not visible | 15-second cache | Close and reopen the sidebar to force refresh |
