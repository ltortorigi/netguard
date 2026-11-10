# JULIETT — NetGuard Demo Runbook

**Demo:** Tuesday, November 10, 2026. Plan for approximately **10 minutes maximum**, following the posted JULIETT requirements.  
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

## Demo flow

1. **Problem + user:** Start with the dashboard. Explain that NetGuard helps students managing a few network services check availability and review outages in one place.
2. **Experience the product:** Show the signed-in dashboard. Start the guided walkthrough in Window 2, click **Refresh** in Chrome, and show the approved test service as **Reachable**.
3. **Show something interesting:** Press **Enter** at the first walkthrough prompt to stop the disposable service. Refresh the dashboard and show **Unreachable**. Press **Enter** at the second prompt to restart it, refresh, and show **Reachable** again. Open **History** to show the saved success, failure, and recovery checks. Refresh the page and reopen History to demonstrate that the results remain saved.
4. **Behind the curtain:** Briefly explain how the browser dashboard uses the Express API, how Node.js checks an approved TCP port, and how results are saved. Use the linked code only when it helps explain the behavior just demonstrated.
5. **Reality check:** Explain that this demo runs locally and uses a JSON file unless MongoDB is configured. TCP reachability does not establish full application health. A public deployment and a live MongoDB-backed demonstration have not been verified.
6. **What comes next:** Describe the planned deployment, HTTP checks, and notifications. Explain that useful audience feedback will help prioritize the backlog before KILO.

**Optional class interaction:** Invite a classmate to tell you when to press Enter to cause the outage. The target remains the pre-approved disposable localhost service; do not allow arbitrary hosts or ports.

## Demonstration checkpoints

- [ ] `npm.cmd start` launches successfully and the dashboard opens on the actual presentation PC.
- [ ] You can sign in with a private password without sharing it.
- [ ] The second window's `npm.cmd run demo:walkthrough` shows **Reachable → Unreachable → Reachable**.
- [ ] Clicking **Refresh** in Chrome displays those transitions for `NetGuard Guided Demo`.
- [ ] Clicking **History** displays each real check, and the history remains after a browser refresh.
- [ ] You have run `npm.cmd test` and confirmed its result in your environment.
- [ ] You have rehearsed the demonstration within the approximately 10-minute maximum.
- [ ] The repository branch being submitted contains this runbook and the current app code.

## Backup and limitations

If the guided script cannot bind port 43080 (`EADDRINUSE`), stop any separate `demo:target` process and retry. If the browser status doesn't update, click **Refresh** and inspect the last-check timestamp. To do the sequence manually, run `npm.cmd run demo:target` in Window 2; use **Check now** in Chrome, press **Ctrl+C** to stop that disposable process, check again, then restart the disposable process and check once more. Never stop real services during the demo.

If a demo action actually fails, explain the failure rather than claiming it worked. A short genuine rehearsal recording may be a backup, clearly identified as a recording. No public deployment or live MongoDB demonstration is claimed until verified.

## Architecture you can explain in one sentence

**Browser dashboard → Express REST API → TCP checker of an approved port → saved check history (local JSON file by default, MongoDB optionally).** A background scheduler also performs checks about every 60 seconds, and the **Check now** button or guided script initiates a check immediately.

## Audience feedback and follow-up

After the demo, record useful audience feedback as **keep**, **improve**, **fix**, **consider**, or **drop**. Turn meaningful feedback into [GitHub Issues](https://github.com/ltortorigi/netguard/issues), backlog updates, or [milestone changes](https://github.com/ltortorigi/netguard/milestones).

Feedback is pending the demonstration. For each useful item, record:

- The category and audience suggestion.
- The decision or action to take.
- A link to the resulting Issue or planning change.

Before KILO, update this section with the resulting changes and evidence so it answers: **What changed because of JULIETT?**
