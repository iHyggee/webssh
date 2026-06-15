# WebSSH Console

[English](README.md) | [中文](README.zh.md)

**WebSSH Console** 把你的浏览器变成一个 SSH 终端。不需要桌面客户端 — 打开网址、登录、填入 SSH 信息，就能获得一个完整的终端连接到任何 SSH 服务器。

适用场景：
- 在受限电脑上管理服务器（禁止安装 PuTTY / Terminal）
- 通过反向代理访问内网中的 NAS / 开发板
- QNAP / Synology NAS Docker 部署，随时管理
- 给团队成员临时 SSH 权限，无需共享密码或安装软件

## 界面展示

| 登录页 | 主表单 | 终端连接 |
|-------|-----------|----------|
| ![登录](https://github.com/iHyggee/webssh/blob/master/screenshots/login.png) | ![表单](https://github.com/iHyggee/webssh/blob/master/screenshots/main-form.png) | ![终端](https://github.com/iHyggee/webssh/blob/master/screenshots/terminal.png) |

## 功能特性

- **Cookie 登录** — 无浏览器原生 HTTP Basic Auth 弹窗，美观的 HTML 登录页
- **连接历史** — 每次成功连接后记录主机名和用户名，下次可直接下拉选择
- **表单验证** — 必填字段为空时自动聚焦，中文错误提示
- **tmux 自动接入** — 勾选后连接自动进入 tmux 会话，断网/关浏览器后重连，一切还在
- **私钥支持** — RSA / DSA / ECDSA / Ed25519 密钥，可选密钥口令
- **白色简洁界面** — 桌面端紧凑布局，一屏不滚动，无多余装饰
- **响应式** — 桌面和手机浏览器均可用

## 快速开始 (Docker Compose)

1. 编辑 `docker-compose.yml`，修改 `WEBSSH_PASSWORD` 和 `COOKIE_SECRET`
2. 构建并启动：

```bash
docker compose up -d --build
```

3. 浏览器打开 `http://你的服务器IP:8888`，登录后填入目标 SSH 信息，点击连接

## 环境变量

| 变量 | 必填 | 说明 |
|----------|----------|-------------|
| `WEBSSH_USER` | 是 | 登录用户名 |
| `WEBSSH_PASSWORD` | 是 | 登录密码（明文） |
| `COOKIE_SECRET` | 是 | Cookie 签名密钥，设为一个长随机字符串 |
| `COOKIE_VERSION` | 建议 | 一个数字版本号，嵌入在登录 Cookie 中。修改此值（如 `1` → `2`）可立即使所有已有会话失效 — 改密码后或安全事件时使用 |
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

生成 SHA-256 哈希：
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

## 常见问题

**Q: "tmux 自动接入"复选框是什么？**
勾选后，连接建立时服务器会自动执行 `tmux new -A -s webssh`。如果中途断网或关了浏览器，重新连接就能回到同一个终端会话 — 之前跑的命令、编辑的文件都还在。

**Q: 连接成功了但终端是黑的，什么都不显示？**
通常是 SSH 认证失败。检查服务器日志。如果用私钥，确认口令正确、密钥格式支持（RSA、DSA、ECDSA、Ed25519）。

**Q: 怎么让所有人重新登录？**
修改 `COOKIE_VERSION` 的值（比如从 `1` 改成 `2`）然后重启容器，所有已有的 Cookie 立即失效。

**Q: 能不能跳过登录页？**
不能。登录页是强制保护的。它替代了浏览器原生 HTTP Basic Auth 弹窗（那种弹窗无法自定义样式），提供带频率限制的 HTML 登录表单。

## 会话失效

改完密码担心别人还能用旧的 Cookie 登录？`COOKIE_VERSION` 就是解决这个问题的。

**原理：** 每个登录 Cookie 都嵌入了当前的 `COOKIE_VERSION` 值。当你改这个数字（比如从 `1` 改成 `2`），服务器会立刻拒绝所有携带旧版本号的 Cookie — 所有已有会话瞬间失效，不用等过期。用户只需重新登录，就会拿到带版本号 `2` 的新 Cookie。

**什么时候用：**
- 修改了 `WEBSSH_PASSWORD` 之后
- 从 `.htpasswd` 中删除了某个用户之后
- 怀疑 Cookie 被盗用时
- 定期轮换，作为安全维护习惯

**怎么用：** 在 `docker-compose.yml` 里把 `COOKIE_VERSION` 改成任意新值，重启容器即可。

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
