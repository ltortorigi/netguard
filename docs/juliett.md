# JULIETT — NetGuard Designed Product Demo Runbook

**Project:** NetGuard · **Owner:** Logan Tortorigi · **Target:** 9–10 minutes or less  
**Format:** Show the product first. Only show implementation details when they support the product story.

## Opening — problem and user

**Audience:** A student who manages a few personal cloud servers.

**Problem:** Checking services one at a time does not make it easy to see a service outage or when it recovered.

**Opening line:** "How do I know when one of my cloud services stops responding? NetGuard shows which approved services are reachable, when they were checked, and what happened over time."

## Links and pre-demo setup

| Item | Link / action |
| --- | --- |
| Repository | https://github.com/ltortorigi/netguard |
| Project purpose and decisions | [INDIA](india.md) |
| App source | [server/app.js](../server/app.js) |
| TCP checker | [server/tcp.js](../server/tcp.js) |
| Storage adapters | [server/store.js](../server/store.js) |
| Dashboard | [public/index.html](../public/index.html) and [public/app.js](../public/app.js) |
| Disposable TCP target | [server/demo-target.js](../server/demo-target.js) |
| Tests | [test/](../test/) |
| Issues / backlog | https://github.com/ltortorigi/netguard/issues |
| DEV deployment | **Not yet verified** |
| PROD deployment | **Not yet verified** |

**Before class:** Run `npm install`, copy `.env.example` to `.env`, and choose a private `ADMIN_PASSWORD` of at least 12 characters. Start `npm start`, open **http://127.0.0.1:3000**, and sign in. In a second terminal, run `npm run demo:target`. Do not paste passwords, connection strings, or secret files into the presentation.

**Storage distinction:** With no `MONGODB_URI`, this local demo stores history in `data/netguard.json` (persistent file mode). Only describe the data as MongoDB-backed if a real MongoDB connection is configured and verified. The dashboard displays which storage mode is active.

## Live demo flow (plan for 9:30 maximum)

| Time | Screen / action | What to explain |
| --- | --- | --- |
| **0:00–0:45** Problem + user | Open the NetGuard **app**, not slides or GitHub. | "I manage several services, and I need a quick way to notice a connection failure." |
| **0:45–1:45** Product experience | Sign in and show the services section. Add the approved `127.0.0.1:43080` target if it is not already present. | "Only a configured administrator can change monitors, and targets must be approved." |
| **1:45–2:45** Healthy state | Make sure `npm run demo:target` is running. Click **Check now** and show **Reachable** with a check time and duration. | "NetGuard opens a short TCP connection to the approved port. A successful connection is not a full health test." |
| **2:45–4:15** Something interesting: outage | Press **Ctrl+C** in the *second* terminal to stop only the disposable test target. Click **Check now** and show **Unreachable**. | "Now it cannot connect, and the result is recorded." |
| **4:15–5:45** Recovery | Restart `npm run demo:target` and click **Check now**. | "The same port is reachable again; the monitor captures the recovery." |
| **5:45–6:45** Saved history | Click **History** and point to the sequence reachable → unreachable → reachable; refresh the dashboard and reopen history. | "The observations are persisted. I can review the incident afterward." |
| **6:45–7:55** Behind the curtain | Briefly show [server/tcp.js](../server/tcp.js), [server/app.js](../server/app.js) and [server/store.js](../server/store.js). | "The browser calls an Express API; Node tests the TCP connection and stores the results. MongoDB is optional for the local demo." |
| **7:55–8:50** Reality check | Return to the dashboard. | "This checks connectivity to a TCP port, not application correctness. Short outages between scheduled checks may be missed. The tool only checks approved targets." |
| **8:50–9:30** Next steps | Leave the app on screen. | "Next I would verify a live cloud deployment with MongoDB and add HTTP health checks and notifications." |

**Optional audience participation:** Ask a classmate to choose when you stop/restart the **pre-approved disposable** service. Never allow unapproved hosts or ports to be scanned.

## Demo verification checklist

- [ ] Install dependencies and start the app on the actual presentation computer.
- [ ] Set a private administrator password and successfully sign in.
- [ ] Open the dashboard and verify which storage mode is active.
- [ ] Start the disposable TCP target and verify a reachable result.
- [ ] Stop **only** the disposable target and verify an unreachable result.
- [ ] Restart the target and verify a subsequent reachable result.
- [ ] Open History, refresh, and confirm saved results remain.
- [ ] Verify a second user cannot modify services without signing in.
- [ ] Run `npm test` and record observed results; do not claim unrun tests passed.
- [ ] Rehearse with a stopwatch; stay within 10 minutes.
- [ ] Add a real deployment URL here only after deployment succeeds.

## Backup and failure handling

If the classroom Internet is unavailable, use the local file-backed demo and localhost disposable target. If the monitor fails unexpectedly, explain the actual error and show a **clearly labeled real screen recording** if one was made during a successful rehearsal. Do not invent or edit check history. The source repository can support a short fallback explanation, but the presentation should lead with the app.

## Behind-the-scenes architecture

Browser dashboard → Express API → storage (local file by default, MongoDB when configured)  
　　　　　　　　　　　　　　↘ TCP checker → approved target

The scheduler checks enabled targets roughly every 60 seconds without overlapping checks for the same target. The **Check now** control allows the demo to move faster while saving authentic results.

## What is and is not done

- The project proposal, backlog, local monitor code, disposable demo target, and this runbook are provided.
- Local automated tests for real TCP connections, approved target restrictions, and file-history persistence passed when the feature branch was prepared; deployment and browser end-to-end tests still need to be run.
- No production/DEV URL or verified MongoDB-backed live demonstration is claimed. Do not present one as complete until it has been tested.
