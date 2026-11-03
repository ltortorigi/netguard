# NetGuard

NetGuard is a small dashboard for checking the TCP reachability of **approved** cloud services and recording check history.

Project owner: Logan Tortorigi

## Project links

- [INDIA proposal](docs/india.md)
- [JULIETT demo runbook](docs/juliett.md)
- [Backlog](https://github.com/ltortorigi/netguard/issues)
- [Milestones](https://github.com/ltortorigi/netguard/milestones)
- [DEV branch](https://github.com/ltortorigi/netguard/tree/dev)

## Run the classroom demo (Node.js 22+)

From the repository folder, run:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and **replace `ADMIN_PASSWORD` with your own unique password of at least 12 characters**. Leave `ALLOWED_TARGETS=127.0.0.1:43080` for the local demonstration. The password and saved records stay out of Git.

Start the dashboard:

```powershell
npm start
```

Open **http://127.0.0.1:3000** and sign in with that password.

In a **second PowerShell window** in the same repository folder, start the disposable service:

```powershell
npm run demo:target
```

In NetGuard, add the approved `127.0.0.1:43080` target and click **Check now** to get a reachable result. Stop the disposable service with **Ctrl+C** in the second window and check again; the status becomes unreachable. Restart it with `npm run demo:target` and check once more to demonstrate recovery. Open **History** and refresh the dashboard to show stored check results.

The app also automatically checks enabled services about every **60 seconds**. TCP connection attempts have a maximum **five-second** deadline. Stop or restart **only the disposable service**, never a real cloud service for the classroom demonstration.

## Storage and security

- Without a database URI, NetGuard stores services, audit events, and check history in `data/netguard.json` for an offline classroom demo. **This mode is not MongoDB.**
- To use MongoDB Atlas, set `MONGODB_URI` and `MONGODB_DB=netguard` in your local `.env`; the app switches to MongoDB. Do not commit the URI or credentials.
- All API routes for service management and checking require an administrator login. Monitoring targets must exactly match `ALLOWED_TARGETS`; adding arbitrary hosts or ports is not supported.
- For remote deployment, configure approved targets that are reachable **from the monitor's own host**, set `HOST=0.0.0.0` behind HTTPS, and secure the deployment appropriately.
- This is **TCP availability** monitoring, not a vulnerability scanner or a test of full application health.

## Development checks

```powershell
npm test
```

The tests cover the actual TCP connection and stopped-port checks, the approved-target restriction, and file-history persistence. A live MongoDB deployment and end-to-end browser check are still required before claiming production verification.

## Current status

The application code and local demo flow are provided. **No live DEV/production deployment URL has been verified**, and a MongoDB-backed demo requires the user to configure their own credentials. Follow [`docs/juliett.md`](docs/juliett.md) for the demonstration script and remaining checks.