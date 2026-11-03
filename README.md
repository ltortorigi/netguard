# NetGuard

NetGuard is a small dashboard for checking the TCP reachability of **approved** cloud services and recording check history.

Project owner: Logan Tortorigi

## Project links

- [INDIA proposal](docs/india.md)
- [JULIETTE demo runbook (5 minutes)](docs/juliett.md)
- [Presentation guide — what it does, how to run it, and what to say](PRESENTATION_GUIDE.txt)
- [Backlog](https://github.com/ltortorigi/netguard/issues)
- [Milestones](https://github.com/ltortorigi/netguard/milestones)
- [DEV branch](https://github.com/ltortorigi/netguard/tree/dev)

## Run the classroom demo on Windows 10 (Node.js 22+)

Open PowerShell **inside the netguard folder containing `package.json`**, not inside `C:\Windows\system32`. PowerShell may block `npm.ps1`, so use **`npm.cmd`**:

```powershell
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

If `.env` already exists, **do not overwrite it**. Just open it with `notepad .env` and keep your password.

Edit `.env` and **replace `ADMIN_PASSWORD` with your own unique password of at least 12 characters**. Leave `ALLOWED_TARGETS=127.0.0.1:43080` for the local demonstration. The password and saved records stay out of Git.

Start the dashboard:

```powershell
npm.cmd start
```

Open **http://127.0.0.1:3000** and sign in with that password.

In a **second PowerShell window** in the same repository folder, run the **guided demonstration**:

```powershell
npm.cmd run demo:walkthrough
```

The walkthrough creates or reuses an approved demo service, starts a disposable local TCP listener, and prompts you to press **Enter** to simulate its outage and recovery. In Chrome click **Refresh** after each prompt to show **Reachable → Unreachable → Reachable**; open **History** to review the saved results. Do not separately run `demo:target` at the same time; both use port `43080`.

For the complete **five-minute speaking script**, exact Windows commands, and troubleshooting, open [PRESENTATION_GUIDE.txt](PRESENTATION_GUIDE.txt). The formal JULIETTE demo runbook is [docs/juliett.md](docs/juliett.md).

**Manual backup:** Instead of the walkthrough, run `npm.cmd run demo:target` in the second window and add `127.0.0.1:43080` through the dashboard. Click **Check now**. Press **Ctrl+C** to stop the test service, check again, restart it, and check once more. Do **not** run this manual test target alongside the guided walkthrough.

The app also automatically checks enabled services about every **60 seconds**. TCP connection attempts have a maximum **five-second** deadline. Stop or restart **only the disposable service**, never a real cloud service for the classroom demonstration.

## Storage and security

- Without a database URI, NetGuard stores services, audit events, and check history in `data/netguard.json` for an offline classroom demo. **This mode is not MongoDB.**
- To use MongoDB Atlas, set `MONGODB_URI` and `MONGODB_DB=netguard` in your local `.env`; the app switches to MongoDB. Do not commit the URI or credentials.
- All API routes for service management and checking require an administrator login. Monitoring targets must exactly match `ALLOWED_TARGETS`; adding arbitrary hosts or ports is not supported.
- For remote deployment, configure approved targets that are reachable **from the monitor's own host**, set `HOST=0.0.0.0` behind HTTPS, and secure the deployment appropriately.
- This is **TCP availability** monitoring, not a vulnerability scanner or a test of full application health.

## Development checks

```powershell
npm.cmd test
```

The tests cover the actual TCP connection and stopped-port checks, the approved-target restriction, and file-history persistence. A live MongoDB deployment and end-to-end browser check are still required before claiming production verification.

## Current status

The application code and local demo flow are provided. **No live DEV/production deployment URL has been verified**, and a MongoDB-backed demo requires the user to configure their own credentials. Follow [`docs/juliett.md`](docs/juliett.md) for the demonstration script and remaining checks.