# WebSSH Console

Web-based SSH client. Connect to remote servers through your browser. Supports password and private key authentication.

## Features

- **Cookie-based login** — no browser-native HTTP Basic Auth popups
- **Connection history** — hostname and username remembered after each successful connection, with dropdown picker
- **Form validation** — empty required fields auto-focus with Chinese error messages
- **tmux auto-attach** — checkbox to automatically enter tmux session on connect (session recovery)
- **Private key support** — RSA / DSA / ECDSA / Ed25519 keys, with optional passphrase
- **White clean UI** — compact desktop layout, no unnecessary decorations
- **Responsive** — works on desktop and mobile

## Quick Start (Docker Compose)

1. Edit `docker-compose.yml`, change `WEBSSH_PASSWORD` and `COOKIE_SECRET`
2. Build and start:

```bash
docker compose up -d --build
```

3. Open `http://your-ip:8888`, login with the configured credentials

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WEBSSH_USER` | Yes | Login username |
| `WEBSSH_PASSWORD` | Yes | Login password (plaintext) |
| `COOKIE_SECRET` | Yes | Cookie signing key, set to a long random string |
| `COOKIE_VERSION` | Recommended | Change to invalidate all sessions |
| `BEHIND_PROXY` | With nginx | Set to `true` to enable real-IP via X-Forwarded-For |
| `TRUSTED_PROXY` | With nginx | Comma-separated trusted proxy IPs (prevents IP spoofing) |
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

## Session Invalidation

Changed password but worried old cookies still work? Bump `COOKIE_VERSION` from `1` to `2` and restart. All existing logins are invalidated instantly.

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
