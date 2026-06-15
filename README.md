# WebSSH Console

[English](README.md) | [中文](README.zh.md)

**WebSSH Console** turns your browser into an SSH terminal. No desktop client needed — just open a URL, log in, and you have a full terminal to any SSH server.

Ideal for:
- Managing servers from a locked-down machine (no Putty / Terminal allowed)
- Accessing your homelab behind NAT via a reverse proxy
- QNAP / Synology NAS administration through Docker
- Giving teammates temporary SSH access without sharing credentials or installing software

## What It Looks Like

| Login | Main Form | Terminal |
|-------|-----------|----------|
| ![Login](https://github.com/iHyggee/webssh/blob/master/screenshots/login.png) | ![Form](https://github.com/iHyggee/webssh/blob/master/screenshots/main-form.png) | ![Terminal](https://github.com/iHyggee/webssh/blob/master/screenshots/terminal.png) |

## Features

- **Cookie-based login** — no browser-native HTTP Basic Auth popups
- **Connection history** — hostname and username remembered after each successful connection, with dropdown picker
- **Form validation** — empty required fields auto-focus with Chinese error messages
- **tmux auto-attach** — checkbox to automatically enter tmux session on connect (session recovery after network drop)
- **Private key support** — RSA / DSA / ECDSA / Ed25519 keys, with optional passphrase
- **White clean UI** — compact desktop layout, no unnecessary decorations
- **Responsive** — works on desktop and mobile

## Quick Start (Docker Compose)

1. Edit `docker-compose.yml`, change `WEBSSH_PASSWORD` and `COOKIE_SECRET`:

```yaml
services:
  webssh:
    build: .
    container_name: webssh
    network_mode: host

    # ====== REQUIRED ======
    environment:
      # Login credentials
      - WEBSSH_USER=admin
      - WEBSSH_PASSWORD=***

      # Cookie signing key - change this to a random string
      - COOKIE_SECRET=change-me-to-a-random-string

    # ====== RECOMMENDED ======
      # Bump to invalidate all sessions
      - COOKIE_VERSION=1

      # Enable real-IP via X-Forwarded-For (only when behind nginx)
      - BEHIND_PROXY=true
      - TRUSTED_PROXY=127.0.0.1

      # Optional: allow URL ?command=xxx (default: off)
      # - ALLOW_URL_COMMAND=true

    restart: unless-stopped
```

2. Build and start:

```bash
docker compose up -d --build
```

3. Open `http://your-server-ip:8888`, log in, fill in the SSH target, and hit Connect

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WEBSSH_USER` | Yes | Login username |
| `WEBSSH_PASSWORD` | Yes | Login password (plaintext) |
| `COOKIE_SECRET` | Yes | Cookie signing key, set to a long random string |
| `COOKIE_VERSION` | Recommended | A number baked into login cookies. Change it (e.g. `1` -> `2`) to instantly invalidate all existing sessions — useful after a password change or security incident |
| `BEHIND_PROXY` | Behind nginx | Set to `true` to enable real-IP via X-Forwarded-For |
| `TRUSTED_PROXY` | Behind nginx | Comma-separated trusted proxy IPs (prevents IP spoofing) |
| `ALLOW_URL_COMMAND` | Optional | Set to `true` to allow `?command=xxx` in URL |

## Multi-User (.htpasswd)

```
# Format: username:password  or  username:sha256:hexhash
alice:password123
bob:sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
```

Lines starting with `#` are comments. Env var credentials take priority over file entries.

Generate SHA-256:
```bash
echo -n "your_password" | sha256sum
```

## nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name webssh.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

Set `BEHIND_PROXY=true` and `TRUSTED_PROXY=127.0.0.1` in docker-compose.yml.

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--address` | `''` | Listen address |
| `--port` | `8888` | HTTP port |
| `--policy` | `warning` | Host key policy: `reject` / `autoadd` / `warning` |
| `--origin` | `same` | Origin policy |
| `--authfile` | `''` | Credentials file path |
| `--debug` | `false` | Debug mode (do NOT use in production) |
| `--xsrf` | `true` | CSRF protection (do NOT disable in production) |
| `--maxconn` | `20` | Max concurrent connections per IP |
| `--timeout` | `3` | SSH connection timeout (seconds) |

## FAQ

**Q: What is the "tmux auto-attach" checkbox?**
When checked, the server runs `exec tmux new -A -s webssh \; set -g mouse on` right after connecting. If your SSH session drops (network blip, closing the browser), just reconnect and you're back in the same terminal session — everything you were doing is still there. Mouse wheel scrolling works inside tmux (scrolling through terminal history), not cycling through shell command history.

**Q: I connected but the terminal is just a black screen.**
This usually means SSH authentication failed. Check the server logs. If using a private key, make sure the passphrase is correct and the key format is supported (RSA, DSA, ECDSA, Ed25519).

**Q: How do I invalidate all login sessions?**
Bump `COOKIE_VERSION` from `1` to `2` (or `2` to `3`) and restart the container. All existing cookies become invalid instantly.

**Q: Can I skip the login page?**
No. The login page is mandatory. It replaces browser-native HTTP Basic Auth dialogs (which can't be customized) with a proper HTML login form with rate limiting.

## Session Invalidation

Ever changed your password but worried someone could still use an old cookie? That's exactly what `COOKIE_VERSION` solves.

**How it works:** Every login cookie embeds the current `COOKIE_VERSION` value. When you change this number (say from `1` to `2`), the server immediately rejects any cookie with the old version — all existing sessions are killed, no waiting for expiry. Users just log in again and get new cookies with version `2`.

**When to use:**
- After changing `WEBSSH_PASSWORD`
- After removing a user from `.htpasswd`
- If you suspect a cookie has been stolen
- Periodically as a security hygiene measure

**How:** In `docker-compose.yml`, bump `COOKIE_VERSION` to any new value and restart the container. Done.

## Security

- Cookie-based login (replaces browser Basic Auth popups)
- Rate limiting: 5 failures = 5-minute ban per IP
- XSS prevention: error messages render as text, never as HTML
- Open redirect protection: `next` parameter restricted to same-site relative paths
- Origin header-only CORS check — POST body `_origin` spoofing blocked
- IP spoofing prevention: `TRUSTED_PROXY` whitelist required for X-Forwarded-For
- WebSocket heartbeat: 30s ping interval, dead connections auto-reclaimed
- No hardcoded secrets — `COOKIE_SECRET` must be set via environment variable
- OSC escape sequence filtering — shell config noise stripped from terminal output

## Tech Stack

Python / Tornado / Paramiko / xterm.js 5.5

## Acknowledgments

- [huashengdun](https://github.com/huashengdun/webssh) — original webssh project (2017)
- [cmliu](https://github.com/cmliu/webssh) — cookie login, Docker deployment, and UI improvements

## License

MIT
