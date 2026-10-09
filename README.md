# portfolio

Personal portfolio built with React, Tailwind CSS, and Vite. The Node.js/Express backend connects the assistant to Gemini and sends contact enquiries through SMTP. An optional PHP backend is also included.

## Configuration examples

Private configuration is excluded from Git. These templates contain no credentials:

| Example file                                                     | Copy to                   | Purpose                                       |
| ---------------------------------------------------------------- | ------------------------- | --------------------------------------------- |
| [server/.env.example](server/.env.example)                       | `server/.env`             | Local Node.js backend settings                |
| [server/.env.production.example](server/.env.production.example) | `server/.env`             | Production Node.js settings, including cPanel |
| [server/config.example.php](server/config.example.php)           | `server/config.local.php` | Optional PHP backend settings                 |

Choose the Node.js template for the main application. The PHP configuration is only used when running the alternative PHP backend. Copy templates only for a fresh setup; preserve your existing configuration when updating the application.

The Node.js backend automatically reads **`server/.env`**, regardless of the working directory. It does not automatically read `.env.production.example` or `.env.production`. Hosting environment variables override settings in `server/.env`.

### Local setup

Requires Node.js 20 or newer. From the repository root:

```bash
npm ci
```

For a fresh clone, copy the development template:

```powershell
# Windows PowerShell
Copy-Item server/.env.example server/.env
```

```bash
# macOS / Linux
cp server/.env.example server/.env
```

Generate a unique session secret, then put the generated value into `SESSION_SECRET` in your private file:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Fill in the remaining settings as needed:

| Setting                                              | Meaning                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                     | Your Gemini API key; leave blank to disable AI chat                                   |
| `GEMINI_MODEL`                                       | A model available to your Gemini project                                              |
| `SESSION_SECRET`                                     | Required secret of at least 32 characters; keep stable across restarts                |
| `PORT`, `HOST`                                       | Backend port and bind address; defaults are `8093` and `127.0.0.1`                    |
| `NODE_ENV`                                           | `development` locally; `production` enables secure session cookies and requires HTTPS |
| `TRUST_PROXY`                                        | `1` only behind one trusted proxy which replaces forwarding headers; otherwise `0`    |
| `ALLOWED_ORIGINS`                                    | Comma-separated frontend origins, without trailing slashes                            |
| `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`        | Credentials supplied by your email provider                                           |
| `SMTP_PORT`, `SMTP_ENCRYPTION`                       | `587` / `tls` for STARTTLS, or `465` / `ssl` for implicit TLS                         |
| `SMTP_FROM`                                          | An authorized sender address; the visitor's email is used as Reply-To                 |
| `DAILY_CHAT_LIMIT_PER_IP`, `DAILY_CHAT_LIMIT_GLOBAL` | Positive integer daily chat limits                                                    |
| `DAILY_EMAIL_LIMIT_PER_IP`                           | Positive integer daily email limit per IP                                             |

Without Gemini credentials, the assistant displays an offline notice. Without complete SMTP settings, enquiries cannot be delivered. Enquiry delivery uses the fixed recipient in `src/data/assistant.js`; `SMTP_FROM` does not change the recipient. If adapting this portfolio, update that recipient before enabling SMTP, then rebuild.

Build the frontend and generated assistant knowledge:

```bash
npm run build
```

Start the backend in one terminal and the production preview in another:

```bash
# Terminal 1
npm run api
```

```bash
# Terminal 2
npm start
```

Open <http://127.0.0.1:8091/>. Vite proxies `/api` to the backend on port `8093`. If you change the local backend port, update the proxy in `vite.config.js` too. `npm run dev` provides frontend hot reload instead of the production preview.

### Production / cPanel

Build locally, then upload `dist/`, `server/`, `app.cjs`, `package.json`, and `package-lock.json` into a private application directory outside `public_html`. Exclude local `node_modules` and `server/runtime`; the runtime directory is generated on startup and must be writable by the application.

For a fresh production setup, use `server/.env.production.example` as the template for private `server/.env`, or configure the same variables in the host's environment UI. Replace `example.com` with your domain, generate a unique session secret, and add your Gemini and SMTP credentials. Enable HTTPS. Keep all secrets in the private application directory.

In cPanel **Setup Node.js App**, select Production mode, Node.js 20 or newer, your domain with an empty URL path, application root such as `apps/portfolio`, and startup file **`app.cjs`**. Activate the Node environment using the command cPanel displays and install dependencies with `npm ci --omit=dev`, then restart through cPanel. Passenger manages the listening socket. For standalone hosting, start with `npm run serve` and use the host's assigned port and bind address.

Keep one application worker with the current file-based sessions and limits. Behind a single trusted HTTPS proxy, set `TRUST_PROXY=1`; confirm forwarding-header handling with your host if there are additional proxy layers. A GET to `/api/assistant.php` should return JSON from Express, rather than execute the legacy PHP endpoint.

### Optional PHP backend

Copy `server/config.example.php` to private `server/config.local.php`, fill in your own settings, and install its dependencies using `composer install --working-dir=server`. Build the frontend, then run `npm run api:php` instead of `npm run api`. Use `npm start` in a second terminal as above. The PHP backend requires PHP 8.2 or newer with cURL and mbstring. It does not read the Node.js `.env` file.

### Git handling

`.env`, environment-file variants, `*.local.php`, dependencies, build output, and runtime/session data remain ignored. The `.env.example`, `.env.*.example`, and `config.example.php` templates are publishable. Never replace the templates' blank credentials with live keys or passwords.

<p align="center"><img align="center" src="https://reasadazim.com/github-images/portfolio.webp" width="100%"/></p>
