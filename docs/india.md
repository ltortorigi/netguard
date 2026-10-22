# INDIA — NetGuard
Logan Tortorigi | October 22, 2026 | Proposal and project plan

## WHO — user and project

**Project:** NetGuard — a web dashboard that checks whether selected cloud services are reachable and records their availability history.

**Initial team/roles:** Logan Tortorigi — project owner, developer, tester, and documentation.

**Specific user:** Logan, as a student managing his own cloud services. The initial scope is a small set of approved services, not an entire organization's network.

**User story:** As a student managing cloud servers, I want to see service availability in one dashboard so that I can identify outages without checking each service individually.

## WHY — problem and value

Checking services separately makes it harder to see which services are reachable and when failures occurred. NetGuard will collect this information in one place.

For a student managing a few cloud services, NetGuard provides a clear status page and saved check history because it automatically checks selected services and makes failures and recovery visible.

## WHAT ALREADY EXISTS — landscape

The product descriptions below are based on the linked official sources. The tradeoffs and design choices are my assessment for this project, not claims about undocumented internal technology.

| Product | Documented strengths | Tradeoff for my project | What to borrow or avoid |
| --- | --- | --- | --- |
| [Uptime Kuma](https://github.com/louislam/uptime-kuma) | Self-hosted monitoring with TCP/HTTP checks, status pages, and many notification integrations. | Running a self-hosted tool means maintaining that deployment. Its existing features overlap substantially with my idea. | Borrow clear statuses and history; keep the first version's check types and notifications limited. |
| [UptimeRobot](https://uptimerobot.com/) | Hosted uptime monitoring and alerting. | A hosted product would provide monitoring without giving me the same opportunity to implement and explain the checking system myself. | Study the monitor setup and alert workflow; make adding a service straightforward. |
| [Zabbix](https://www.zabbix.com/network_monitoring) | Network monitoring, including availability and performance information. | Its breadth is more than my initial small collection of services requires. | Borrow useful organization and operational information; avoid trying to reproduce an enterprise monitoring platform. |

**Why build another one?** Existing tools could solve the monitoring problem. My version will focus on my own small deployment and make each check's result and failure reason easy to inspect. It is also an opportunity to learn networking, monitoring, and secure application administration. I am not claiming unique functionality or superiority over these products.

**Functionality clues:** mobile-readable status display, login/access control, timeouts, historical results, and future notifications. The first version will use TCP checks; accepting a TCP connection does not prove the whole application is healthy.

## DONE — KILO success test

At KILO, I should be able to demonstrate that I can:

1. Sign in and add, edit, pause, or remove an approved service.
2. See automatic checks run approximately every 60 seconds, with a five-second connection deadline.
3. View the latest reachable/unreachable result, TCP connection duration, last-check time, and saved history.
4. Stop a disposable test service, observe a failed check, restart it, and observe recovery.
5. Refresh the page and still see the saved results.

New services will show an unknown state until checked. Old results will be marked stale instead of implying the service is still reachable.

## PLAN — project system

**Starting point:** This is a new project proposal. I have experience with Node.js, Express, MongoDB, GitHub, and cloud servers. A working NetGuard application is not claimed at INDIA.

**Direction:** Build a small, authenticated dashboard for my own services. Develop locally first, then deploy the monitor on an always-running host. Use a separate test service for the final outage/recovery demonstration.

**Three initial capability directions:**

1. **Background network monitoring:** Compare TCP and HTTP checks, implement TCP checks with deadlines, schedule them without overlapping cycles, and preserve results.
2. **Secure administration:** Compare authentication approaches, protect administrator actions, restrict targets to approved addresses/ports, keep secrets out of Git, and record changes.
3. **Automated reliability testing:** Compare testing approaches and automate controlled reachable/unreachable/recovery cases, including whether check history persists.

For each capability, I will document the need, alternatives, decision, implementation, linked work, and evaluation. Background TCP monitoring is the initial direction for extending beyond the baseline web application.

**Biggest unknowns:** Handling connection failures and timing accurately; preventing overlapping checks; safely restricting targets; implementing authentication; and testing outages without disturbing real users.

**Development pathway:** Feature branches → pull requests into `dev` → development verification → reviewed releases into `main` → production. Record development progress and release evidence in GitHub. DEV/production deployment URLs will be added when available.

### Project milestones and initial backlog

The initial Issues are assigned to Logan (`ltortorigi`), labeled by work area and priority, and grouped into the following milestones. The live backlog will change as the project develops.

| Milestone | Initial Issue | Labels / priority |
| --- | --- | --- |
| [Project Foundation](https://github.com/ltortorigi/netguard/milestone/1) | [Research alternatives and document INDIA decisions](https://github.com/ltortorigi/netguard/issues/1) | research, documentation, priority-high |
| [Project Foundation](https://github.com/ltortorigi/netguard/milestone/1) | [Initialize Node/Express app and MongoDB connection](https://github.com/ltortorigi/netguard/issues/2) | backend, priority-high |
| [Working Monitor](https://github.com/ltortorigi/netguard/milestone/2) | [Implement approved service management](https://github.com/ltortorigi/netguard/issues/3) | backend, security, priority-high |
| [Working Monitor](https://github.com/ltortorigi/netguard/milestone/2) | [Implement TCP checks with connection deadlines](https://github.com/ltortorigi/netguard/issues/4) | backend, priority-high |
| [Working Monitor](https://github.com/ltortorigi/netguard/milestone/2) | [Schedule checks and save history](https://github.com/ltortorigi/netguard/issues/5) | backend, priority-high |
| [Dashboard and Security](https://github.com/ltortorigi/netguard/milestone/3) | [Display status, stale results, and history](https://github.com/ltortorigi/netguard/issues/6) | frontend, priority-high |
| [Dashboard and Security](https://github.com/ltortorigi/netguard/milestone/3) | [Protect administrator actions and record changes](https://github.com/ltortorigi/netguard/issues/7) | security, priority-high |
| [Tested Release](https://github.com/ltortorigi/netguard/milestone/4) | [Automate outage and recovery tests](https://github.com/ltortorigi/netguard/issues/8) | testing, priority-high |
| [Tested Release](https://github.com/ltortorigi/netguard/milestone/4) | [Deploy and document the demonstration](https://github.com/ltortorigi/netguard/issues/9) | deployment, documentation, priority-medium |

Each Issue includes a goal and completion criteria.

### Project links

Repository: `ltortorigi/netguard`. The proposal and project planning are available below. Application development and deployment are planned.

- [Repository](https://github.com/ltortorigi/netguard)
- [Backlog](https://github.com/ltortorigi/netguard/issues)
- [Milestones](https://github.com/ltortorigi/netguard/milestones)
- [Development branch](https://github.com/ltortorigi/netguard/tree/dev)
- DEV deployment: planned; URL will be added when deployed.
- Production deployment: planned; URL will be added when deployed.

## SPRING 99 — future

After KILO, I could add email notifications, HTTP health checks, and failed-SSH-login analysis. The next users could be classmates running their own cloud services. Supporting multiple users would require separate accounts, ownership rules, and stronger isolation between monitored targets.

## Assignment references

- [INDIA requirements](https://barrycumbie.com/assets/capstone/index.html#milestones/india.md)
- [Product Discovery](https://barrycumbie.com/assets/capstone/index.html#project/product-discovery.md)
- [Capability requirements](https://barrycumbie.com/assets/capstone/index.html#capabilities/capabilities.md)
