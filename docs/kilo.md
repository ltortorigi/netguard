# KILO — NetGuard: UNA systems status

Logan Tortorigi · November 25, 2026

NetGuard helps UNA students check campus service entry points, report problems, and compare their experience with other reports and official provider status pages.

**Delivery status: implementation and handoff prepared; production release pending.** A GCP deployment, live MongoDB configuration, and final production verification are still needed. This document does not claim the entire KILO milestone is complete.

## Delivery links

| Item | Link / status |
| --- | --- |
| Source | [NetGuard repository](https://github.com/ltortorigi/netguard) |
| Production app | Pending: GCP host, HTTPS domain, and runtime configuration have not been supplied/verified |
| Final release | [Releases](https://github.com/ltortorigi/netguard/releases) — `v1.0-capstone` must be created after production verification |
| Three capabilities and decisions | [Capability records](capabilities.md) |
| Handoff | [Setup, architecture, data, environment, deployment and ownership](handoff.md) |
| What changed after JULIETT | [Feedback Issue #12](https://github.com/ltortorigi/netguard/issues/12) and the section below |
| Verification | [Test evidence and remaining checks](verification.md) |
| Individual report | [Logan's report draft — personal evaluation still needed](reports/logan-tortorigi.md) |
| Known issues / next steps | [Deployment Issue #9](https://github.com/ltortorigi/netguard/issues/9) and the sections below |

## What changed after JULIETT

Logan relayed the professor's request to focus on UNA systems and include down detector. This led to:

- A public UNA-focused dashboard replacing the generic admin login as the home page.
- Scheduled HTTPS entry-point checks for UNA's website, Canvas, and UNAPortal. Email/Microsoft 365 and campus Wi-Fi have report-only cards because this monitor cannot validate a student's mailbox or on-campus connection.
- A Down Detector section with categorized reports, hourly counts, a 24-hour chart, and durable duplicate-report protection.
- Links to official Canvas and Microsoft status pages, UNA ITS, and the external Downdetector website. NetGuard does not scrape or import Downdetector data.
- Clear distinctions between responding, failed, restricted, stale, unknown, and report-only results.
- The existing authenticated TCP monitoring tools retained at `/admin`.

The feedback is recorded in Issue #12. No additional audience feedback has been invented.

## Capabilities delivered

1. Background availability monitoring with strict deadlines, saved results and stale-state handling.
2. Secure administration plus privacy-conscious community reporting and duplicate protection.
3. Automated reliability tests and a repeatable release/deployment workflow.

Each [capability record](capabilities.md) explains the need, alternatives, tradeoffs, implementation, traceable work, and evaluation.

## Known limitations

- No verified public DEV or GCP production URL yet. Deployment configuration must be completed before the final release.
- Local JSON storage supports demos. Production explicitly requires MongoDB; a live Atlas connection remains unverified.
- HTTP entry-point responses cannot prove SSO, assignment submission, grades, email delivery, or campus Wi-Fi health. A failed probe is not a confirmed UNA outage.
- Reports are unverified and may be inaccurate. One network address can report once per system in a fixed 15-minute window; shared campus networks can undercount people. Changing networks can evade this basic limit.
- Downdetector is an external reference link only, not an API integration or source of the chart's data.
- Single monitor instance. Sessions are in memory and end on restart. There is no UNA SSO, email notification, or multi-region monitoring.
- MongoDB checks/events currently have no automatic retention policy; reports expire after seven days. Plan retention before long-term operation.

## Release and handoff checklist

- [x] Implement UNA-focused monitoring and Down Detector reports.
- [x] Add automated checks and handoff documentation.
- [x] Confirm automated tests on Node 22/24, including isolated MongoDB CI; see verification evidence.
- [ ] Record Logan's release decision and complete the individual report in his own words.
- [ ] Deploy reviewed MAIN through GitHub Actions to the GCP VM.
- [ ] Verify HTTPS dashboard, login, MongoDB persistence, reports and service history in production.
- [ ] Add actual production URL and production screenshots to this document.
- [ ] Run the production workflow with `finalize_release` enabled to create `v1.0-capstone`.
- [ ] Confirm resource ownership, backups, unused access removal and secret rotation in the handoff.

## Next steps

Complete the deployment and personal report first. After KILO, consider authenticated reports, provider status-feed integration, HTTP content assertions, alert notifications, and a second monitoring location. Keep the fixed-target model until access controls and abuse protections support expansion.

[Assignment requirements](https://barrycumbie.com/assets/capstone/index.html#milestones/kilo.md)
