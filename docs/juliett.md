# JULIETTE — NetGuard five-minute product demonstration

**Presentation:** Tuesday, November 10, 2026. Professor's target is **approximately 5 minutes per student**.  
**Final application (KILO):** December 2, 2026.  
**Presenter:** Logan Tortorigi. **Demo:** Local Node.js / Express dashboard with a controlled localhost TCP service.

## The product and the problem

NetGuard gives a student managing a small number of cloud/network services one place to check whether approved TCP ports accept connections. It records results, timestamps, connection durations, and previous checks so the user can see an outage and subsequent recovery. An administrator can sign in and add, edit, pause, delete, manually check, and review history for allowed services. Enabled services are also checked automatically about every 60 seconds.

**Honest scope:** TCP reachability is not proof that an entire website or application is healthy. NetGuard is not a vulnerability scanner. The classroom demo uses a disposable local server on `127.0.0.1:43080`; it does not affect real cloud services.

## Files and links

| Resource | Location |
| --- | --- |
| Repository | https://github.com/ltortorigi/netguard |
| Plain-text speaking guide, app explanation, and Windows instructions | [PRESENTATION_GUIDE.txt](../PRESENTATION_GUIDE.txt) |
| INDIA proposal | [india.md](india.md) |
| Dashboard | [public/index.html](../public/index.html) / [public/app.js](../public/app.js) |
| Express app / API / scheduler | [server/app.js](../server/app.js) |
| Actual TCP test | [server/tcp.js](../server/tcp.js) |
| History storage (local file, optional MongoDB) | [server/store.js](../server/store.js) |
| Guided demo (automates local outage and recovery) | [server/demo-walkthrough.js](../server/demo-walkthrough.js) |
| Manual backup test service | [server/demo-target.js](../server/demo-target.js) |
| Automated tests | [test/](../test/) |
| Project backlog | https://github.com/ltortorigi/netguard/issues |

**Deployment:** A publicly hosted DEV or production application is **not yet verified**. This demonstration runs locally. Without `MONGODB_URI` configured, history is stored in `data/netguard.json`, **not MongoDB**. Do not claim otherwise.

## Before class: how to run on Windows 10

1. Install Node.js 22 or newer. Open PowerShell **in the NetGuard project folder that contains `package.json`**, not `C:\Windows\system32`.
2. First setup: run `npm.cmd install`, then `Copy-Item .env.example .env` **only if `.env` does not already exist**. Open `notepad .env`, set a unique private `ADMIN_PASSWORD` at least 12 characters long, and leave `ALLOWED_TARGETS=127.0.0.1:43080` for the demo. Do not upload or show `.env`.
3. **PowerShell Window 1:** run `npm.cmd start`, leave it running, and open `http://127.0.0.1:3000` in Chrome. Sign in using the private administrator password.
4. **PowerShell Window 2:** from that same folder run `npm.cmd run demo:walkthrough`. This script signs in to NetGuard's actual API, adds or reuses `NetGuard Guided Demo`, and starts the disposable TCP listener. It prompts when to stop and restart that listener. In Chrome click **Refresh** after every stage.
5. **Do not run `demo:target` at the same time as `demo:walkthrough`.** They both need port 43080. If you previously started the manual target, stop it with **Ctrl+C** before beginning the walkthrough.

## Live demo run of show (about five minutes)

| Time | What to do | What to say |
| --- | --- | --- |
| **0:00–0:35** Problem + user | Start with the **dashboard**, not GitHub or slides. | "If one of my network services stops responding, I don't want to check each one manually. NetGuard puts its connection status and history in one place." |
| **0:35–1:25** Experience the product | Show signed-in dashboard. Begin guided walkthrough in Window 2; click **Refresh** in Chrome. Point to **Reachable**. | "This approved test service is running on my computer. NetGuard opens a TCP connection and saves a successful check." |
| **1:25–2:20** Something interesting: outage | Press **Enter** at the first walkthrough prompt. Click **Refresh**. Show **Unreachable**. | "I stopped the disposable test service. NetGuard checked again, couldn't connect, and recorded the outage." |
| **2:20–3:10** Recovery | Press **Enter** at the second prompt. Click **Refresh**. Show **Reachable**. | "I restored the service. NetGuard detected that the connection works again while keeping the earlier failure." |
| **3:10–4:05** Persisted history | Click **History**. Show reachable → unreachable → reachable in the actual timestamps (newest first in the UI). Refresh the page and reopen History. | "The history includes the check time and connection duration. It stays saved after refreshing." |
| **4:05–5:00** Behind the curtain, reality check, next steps | Keep the app visible. Mention the TCP checker, Express API, and current storage mode. | "Node.js runs the checks, Express serves the API, and results are saved locally in this demo. TCP only proves that a port accepted a connection. Next I'd deploy the app and add HTTP checks and notifications." |

**Optional class interaction:** Invite a classmate to tell you when to press Enter to cause the outage. The target remains the pre-approved disposable localhost service; do not allow arbitrary hosts or ports.

## Demonstration checkpoints

- [ ] `npm.cmd start` launches successfully and the dashboard opens on the actual presentation PC.
- [ ] You can sign in with a private password without sharing it.
- [ ] The second window's `npm.cmd run demo:walkthrough` shows **Reachable → Unreachable → Reachable**.
- [ ] Clicking **Refresh** in Chrome displays those transitions for `NetGuard Guided Demo`.
- [ ] Clicking **History** displays each real check, and the history remains after a browser refresh.
- [ ] You have run `npm.cmd test` and confirmed its result in your environment.
- [ ] You have rehearsed the demonstration and finished near five minutes.
- [ ] The repository branch being submitted contains this runbook and the current app code.

## Backup and limitations

If the guided script cannot bind port 43080 (`EADDRINUSE`), stop any separate `demo:target` process and retry. If the browser status doesn't update, click **Refresh** and inspect the last-check timestamp. To do the sequence manually, run `npm.cmd run demo:target` in Window 2; use **Check now** in Chrome, press **Ctrl+C** to stop that disposable process, check again, then restart the disposable process and check once more. Never stop real services during the demo.

If a demo action actually fails, explain the failure rather than claiming it worked. A short genuine rehearsal recording may be a backup, clearly identified as a recording. No public deployment or live MongoDB demonstration is claimed until verified.

## Architecture you can explain in one sentence

**Browser dashboard → Express REST API → TCP checker of an approved port → saved check history (local JSON file by default, MongoDB optionally).** A background scheduler also performs checks about every 60 seconds, and the **Check now** button or guided script initiates a check immediately.