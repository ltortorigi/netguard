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

Pending final local browser verification; results will be recorded before merging.

## Production verification

Not performed. No GCP host, production URL, live MongoDB credentials or configured deployment identity were available. The production workflow and systemd/reverse-proxy files are templates until configured and executed. Required remaining checks are linked from [KILO](kilo.md).
