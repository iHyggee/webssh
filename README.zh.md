# WebSSH Console

[English](README.md) | [中文](README.zh.md)

基于浏览器的 SSH 客户端。通过浏览器连接远程服务器，支持密码和私钥认证。

## 功能特性

- **Cookie 登录** — 无浏览器原生 HTTP Basic Auth 弹窗
- **连接历史** — 每次成功连接后记录主机名和用户名，提供下拉选择
- **表单验证** — 空字段自动聚焦，中文错误提示
- **tmux 自动接入** — 复选框勾选后连接自动进入 tmux 会话（断线恢复）
- **私钥支持** — RSA / DSA / ECDSA / Ed25519 密钥，可选口令
- **白色简洁界面** — 桌面端紧凑布局，无多余装饰
- **响应式** — 桌面和移动端均可用

## 快速开始 (Docker Compose)

1. 编辑 `docker-compose.yml`，修改 `WEBSSH_PASSWORD` 和 `COOKIE_SECRET`
2. 构建并启动：

```bash
docker compose up -d --build
```

3. 浏览器打开 `http://你的IP:8888`，用配置的账号密码登录

## 环境变量

| 变量 | 必填 | 说明 |
|----------|----------|-------------|
| `WEBSSH_USER` | 是 | 登录用户名 |
| `WEBSSH_PASSWORD` | 是 | 登录密码（明文） |
| `COOKIE_SECRET` | 是 | Cookie 签名密钥，设为一个长随机字符串 |
| `COOKIE_VERSION` | 建议 | 修改此值可使所有会话立即失效 |
| `BEHIND_PROXY` | 有 nginx 时 | 设为 `true` 启用 X-Forwarded-For 获取真实 IP |
| `TRUSTED_PROXY` | 有 nginx 时 | 逗号分隔的可信代理 IP 列表（防 IP 伪造） |
| `ALLOW_URL_COMMAND` | 可选 | 设为 `true` 允许 URL 中带 `?command=xxx` |

## 多用户 (.htpasswd)

```
# 格式: 用户名:密码  或  用户名:sha256:十六进制哈希
alice:password123
bob:sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
```

`#` 开头为注释。环境变量的凭据优先于文件中的条目。

生成 SHA-256：
```bash
echo -n "你的密码" | sha256sum
```

## nginx 反向代理

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

在 docker-compose.yml 中设置 `BEHIND_PROXY=true` 和 `TRUSTED_PROXY=127.0.0.1`。

## 命令行选项

| 选项 | 默认值 | 说明 |
|--------|---------|-------------|
| `--address` | `''` | 监听地址 |
| `--port` | `8888` | HTTP 端口 |
| `--policy` | `warning` | 主机密钥策略: `reject` / `autoadd` / `warning` |
| `--origin` | `same` | Origin 策略 |
| `--authfile` | `''` | 凭证文件路径 |
| `--debug` | `false` | 调试模式（生产环境切勿使用） |
| `--xsrf` | `true` | CSRF 防护（生产环境切勿关闭） |
| `--maxconn` | `20` | 每个 IP 最大并发连接数 |
| `--timeout` | `3` | SSH 连接超时（秒） |

## 会话失效

修改密码后担心旧的 Cookie 仍有效？将 `COOKIE_VERSION` 从 `1` 改为 `2` 并重启，所有已有登录立即失效。

## 安全性

- Cookie 登录（替代浏览器 Basic Auth 弹窗）
- 频率限制：5 次失败后该 IP 封禁 5 分钟
- XSS 防护：错误消息以纯文本渲染，不作为 HTML
- 开放重定向防护：`next` 参数限制为同站相对路径
- 仅 Origin 头 CORS 检查 — 阻止 POST body `_origin` 伪造
- IP 伪造防护：X-Forwarded-For 需要 `TRUSTED_PROXY` 白名单
- WebSocket 心跳：30 秒 ping 间隔，死连接自动回收
- 无硬编码密钥 — `COOKIE_SECRET` 必须通过环境变量设置
- OSC 转义序列过滤 — 终端输出中剥离 shell 配置噪音

## 技术栈

Python / Tornado / Paramiko / xterm.js 5.5

## 致谢

- [huashengdun](https://github.com/huashengdun/webssh) — webssh 原作 (2017)
- [cmliu](https://github.com/cmliu/webssh) — Cookie 登录、Docker 部署及界面改进

## 许可证

MIT
