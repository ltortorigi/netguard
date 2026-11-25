# Verification evidence

## Automated local tests — November 25, 2026

`npm test` runs Node's built-in test runner. The initial 10 non-MongoDB tests passed under Node 24.22.3:

- Real local TCP listener accepts a connection and is unreachable after stopping.
- TCP targets outside the explicit allowlist are rejected.
- Service/check/event persistence survives reloading local storage.
- HTTP classification distinguishes response, restriction and failure; absent/old checks are unknown/stale.
- A redirect returns a response classification without following another URL.
- HTTP fixture outage/recovery and a hung request's wall-clock timeout behave as expected.
- Report aggregation excludes expired/future records and groups valid categories/hours.
- Duplicate identity is stable per network/system/window.
- Real Express subprocess: public catalog and pages, unauthorized admin rejection, input/origin checks, concurrent duplicate rejection, private report identity, admin login, disallowed targets, and report persistence across process restart.

An additional MongoDB integration test is included and requires `TEST_MONGODB_URI`. It must not be described as passed when skipped. GitHub CI provisions a disposable MongoDB service to test the adapter without production credentials.

## Browser verification

Passed using Chromium Headless Shell on an isolated local instance: all five system cards rendered; submitting a problem updated the chart/count; a repeated report showed the duplicate warning; the history dialog opened and closed; no JavaScript page errors occurred; a 390px mobile viewport had no horizontal overflow. Desktop and mobile screenshots were visually inspected. The single report shown is disposable test data, not a report from a UNA student and not production evidence.

- [Desktop screenshot](evidence/desktop.png)
- [Mobile screenshot](evidence/mobile.png)

## GitHub CI

[Run 45694135359](https://github.com/ltortorigi/netguard/actions/runs/45694135359) passed on Node 22 and 24, including the MongoDB integration test against an isolated MongoDB 7 service. This verifies the adapter, not a live Atlas deployment. [Implementation PR #13](https://github.com/ltortorigi/netguard/pull/13).

## Production verification

Not performed. No GCP host, production URL, live MongoDB credentials or configured deployment identity were available. The production workflow and systemd/reverse-proxy files are templates until configured and executed. Required remaining checks are linked from [KILO](kilo.md).
