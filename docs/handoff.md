# NetGuard handoff

## Purpose and users

An independent student project for UNA students who want to see whether campus service entry points respond and whether other users are reporting problems. It is not UNA's official incident management service. Logan Tortorigi owns the project.

## Architecture and dependencies

Browser (`public/index.html`, `campus.js`) → Express (`server/app.js`) → fixed HTTPS checks and reports (`server/campus.js`) → MongoDB or demo JSON (`server/store.js`). The existing TCP admin dashboard is at `/admin`, using `public/app.js` and `server/tcp.js`.

Node.js 22+; GitHub CI covers Node 22 and 24. Production template uses Node 24. Runtime dependencies: Express 5, dotenv 16, MongoDB driver 6; exact installed versions are pinned by `package-lock.json`. Tests use Node's built-in runner. No frontend build step or external browser libraries.

The campus monitor checks three fixed HTTPS entry points every five minutes. It starts one cycle at process startup and prevents overlapping cycles. Each request has a five-second wall-clock deadline, reads only response headers, and never follows redirects. TCP admin checks use the existing configurable interval and allowlist. Only one application instance should run, to avoid duplicate scheduling.

## Local setup on Windows

Open PowerShell in the repository folder:

```powershell
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm.cmd test
npm.cmd start
```

Set a unique administrator password before starting. Visit `http://127.0.0.1:3000/` for UNA status, and `/admin` for administrator tools. Public users do not need the administrator password and must never enter their UNA credentials here. Existing `.env` files must not be overwritten.

Public checks need outbound HTTPS access. The local demonstration can use JSON storage. Production requires MongoDB. For the original controlled TCP demo, open `/admin`, sign in, then run `npm.cmd run demo:walkthrough` in a second terminal and refresh the admin dashboard at each prompt. The demo affects only localhost.

## Environment variable names (no secrets or values)

| Name | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Required private administrator password; also keys anonymous duplicate-report hashes |
| `NODE_ENV` | Production mode enforces MongoDB storage |
| `MONGODB_URI` | Required in production; database connection credential |
| `MONGODB_DB` | Database name |
| `HOST`, `PORT` | Application bind interface and port |
| `TRUST_PROXY` | Enable only when a single trusted reverse proxy is the only path to the server |
| `ALLOWED_TARGETS` | Explicit TCP host/port allowlist for administrator-created services |
| `CHECK_INTERVAL_MS`, `CHECK_TIMEOUT_MS` | TCP schedule and deadline; campus schedule is fixed separately |
| `CAMPUS_MONITOR_ENABLED` | Disable external campus checks during isolated automated testing |
| `DATA_FILE` | Optional local demo JSON path; unused with MongoDB |
| `TEST_MONGODB_URI` | Test-only MongoDB URI; tests create and drop an isolated randomly named database |

Keep `.env`, database exports, private keys and live data outside Git. Never use a real production database name for test fixtures. Automated tests do not probe UNA.

## Database and data lifecycle

Collections: `services` (administrator CRUD), `checks` (TCP or campus HTTP history), `events` (administrator audit), and `reports` (community categories and timestamps).

Campus check IDs are namespaced `campus:una-web`, `campus:canvas`, and `campus:portal`. Community report service IDs match the fixed catalog. Reports contain a keyed deduplication hash, system ID, category, timestamp and, in MongoDB, a date for TTL expiry. Raw IP addresses, names, student IDs, passwords, and free-text reports are not stored in reports. The hosting provider/reverse proxy may separately log request metadata.

MongoDB uniquely indexes the report hash as `_id` and expires reports after seven days. The public API returns aggregate counts, never report identities. Local storage migrates older files by adding the reports array; it caps reports at 5,000 and removes reports older than seven days on new writes. Local checks cap at 10,000 and events at 500. MongoDB check/event retention is still a maintenance task.

Before deployment/migration, export the database privately with MongoDB's backup tools; restore-test a copy. For JSON demos, stop the app and copy the data file. Do not commit either backup. Do not delete old data just because source code has changed.

## Integrations and source of system addresses

- [UNA ITS](https://www.una.edu/its/) and [UNAPortal information](https://www.una.edu/its/unaportal/) identify public campus service entry points.
- [UNA troubleshooting](https://www.una.edu/its/troubleshooting/) identifies Canvas and links its official status provider.
- [Canvas status](https://status.instructure.com/), [Microsoft status](https://status.cloud.microsoft/), and [Downdetector](https://downdetector.com/) open as external references. No vendor API credentials or scraping are involved.

The fixed catalog lives in `server/campus.js`. Review official UNA links before changing it. Never add private internal hosts or login credentials to the public catalog. Failed checks can reflect the monitoring host's DNS/firewall/TLS environment.

## GCP deployment

This repository includes templates; an existing GCP VM/domain and MongoDB credentials are still required. Nothing here creates a paid cloud resource automatically.

1. Prepare the existing Ubuntu/Debian GCP VM with Node 24, npm, curl, a trusted HTTPS reverse proxy (example Caddyfile in `deploy/`), and access to MongoDB. Restrict the Node port to loopback; expose HTTPS through the proxy. Configure DNS and TLS for the actual domain.
2. Use a dedicated `netguard` runtime account. Give your dedicated deployment account ownership of `/opt/netguard` and permission to create `/opt/netguard/releases`. Runtime code is read-only to the application. Ensure both accounts can traverse/read the release files.
3. Create `/etc/netguard.env` privately with restrictive permissions readable by the runtime service. Configure production mode, the database URI, a unique admin password, loopback binding, port, and trust for exactly the local reverse proxy. Omit unnecessary TCP targets in production. Never paste secret values into the repository or report.
4. Install `deploy/netguard.service` as `/etc/systemd/system/netguard.service`; verify the `/usr/bin/node` path. Run `sudo systemctl daemon-reload` and enable the service. Permit the deployment user to run only the required `systemctl restart netguard` command through sudo without a password. Do not grant unrestricted passwordless sudo.
5. Create GitHub environment `production`. Add secrets `GCP_HOST`, `GCP_USER`, `GCP_SSH_KEY`, and `GCP_KNOWN_HOSTS`. Store the SSH private key directly in GitHub Secrets, never chat or Git. Verify the server's host-key fingerprint through a trusted GCP console before saving known-hosts entries. Add environment variable `PRODUCTION_URL` with the actual HTTPS base URL. Restrict this environment to the main branch.
6. Verify `dev` CI, review the PR, record the release decision, then merge into `main`. Run **Deploy GCP and finalize KILO** from Actions on `main`, initially leaving finalization off. This tests the source, sends an archive of that exact commit over SSH, installs locked dependencies, switches releases, restarts the service, and verifies local MongoDB health and public endpoints. Failed local health checks attempt rollback to the prior release.
7. In a browser, verify public cards/history, a report and duplicate rejection, admin sign-in/CRUD, and MongoDB persistence across restart. Confirm forwarded client addresses work through the trusted proxy. Remove test reports from the production database if used for verification, or clearly disclose them.
8. Add production URL/evidence to `docs/kilo.md`, complete the personal report and ownership review, and merge those documentation updates through DEV. Run the workflow on that final MAIN commit with `finalize_release` enabled. It creates `v1.0-capstone` only after endpoint verification. Existing tags must not be moved.

Workflow: [production.yml](../.github/workflows/production.yml). Server-side script: [deploy.sh](../deploy/deploy.sh). The workflow is manual to prevent deploying onto an unconfigured or unintended VM. CI runs automatically on DEV/MAIN and pull requests. Browser verification and the owner's decision remain human release gates.

### Troubleshooting and rollback

Use `systemctl status netguard` and `journalctl -u netguard` on the VM; avoid sharing sensitive logs. Missing MongoDB credentials cause production startup to fail instead of silently using JSON. If a new release fails its local health check, the script restores the previous symlink when one exists. For a later regression, point `/opt/netguard/current` to the last verified release and restart the service; do not delete the database. Record the rollback and deploy a correction through DEV.

## Ownership and lifecycle after the course

The following plan needs Logan's confirmation before final handoff; resources not provisioned here are not claimed to exist.

| Resource | Owner / proposed action |
| --- | --- |
| GitHub repository | Logan (`ltortorigi`); retain as portfolio and handoff evidence |
| Domain / subdomain | Not supplied; confirm owner and expiry. If course-hosted, migrate to Logan-controlled hosting before retirement |
| GCP VM/project | Not supplied; Logan must identify owner, costs, and whether to retain, transfer or delete after backup |
| MongoDB | Not configured here; Logan must identify account owner and backup/retention plan |
| Render DEV | No verified deployment; confirm whether one exists and remove only if unused |
| SSH/API keys | Deployment SSH key stays in GitHub Secrets; restrict, rotate or revoke at handoff. No Downdetector API key is used |
| Demo accounts | No public shared admin password. Rotate the configured admin secret after demonstrations; active sessions disappear on restart |

Course subdomains may retire around the next cohort's INDIA–KILO cycle (roughly one year). Confirm retention with the instructor.

Final cleanup: private backup/export, production screenshots or recording, final release/tag, review/remove unused collaborators, rotate/revoke unused secrets, remove unused DEV resources, and disable shared demo access. Do not delete cloud resources, accounts, keys or collaborators without checking ownership and current use.
