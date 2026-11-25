# NetGuard capability records

The three INDIA directions remain, with UNA-specific HTTP checks and community reports added in response to the professor's feedback. Background networking extends beyond the baseline CRUD stack; instructor evaluation determines course credit.

## 1. Background monitoring and failure detection

**Problem:** Students need a shared view of UNA service entry points instead of trying each one separately.

**Options:** TCP-only checks are lightweight but cannot distinguish HTTP errors. Authenticated synthetic browser journeys could check real student tasks but need credentials and permission. Public HTTPS entry-point checks can capture response codes without accessing accounts.

**Decision and tradeoff:** Use fixed public HTTPS URLs every five minutes, no redirects, and a five-second wall-clock deadline. Keep TCP monitoring for controlled admin demos. This detects entry-point responses while deliberately giving up proof of complete application health. Email and Wi-Fi remain reports-only.

**Implementation:** `httpCheck`, `classifyHttp`, `campusStatus` and `installCampus` in [server/campus.js](../server/campus.js). The scheduler avoids overlapping cycles; stored timestamps drive stale status. The TCP deadline was also extended to cover DNS rather than only socket inactivity.

**Thread:** [Feedback #12](https://github.com/ltortorigi/netguard/issues/12) → fixed catalog → scheduled HTTPS request → `store.addCheck` → public `/api/campus` → status card and history dialog. Original [TCP task #4](https://github.com/ltortorigi/netguard/issues/4).

**Evaluation:** Automated fixtures test response/redirect classification, simulated outage/recovery, timeout and stale behavior. A login redirect or 403 must never be described as proof that Canvas assignments work. See [verification](verification.md) for executed tests and deployment gaps.

## 2. Secure administration and community reports

**Problem:** Public outage reporting should not give visitors access to monitoring configuration, leak student information, or turn repeated clicks into misleading totals.

**Options:** Admin-only reports prevent student participation. UNA SSO could identify students but needs institutional integration and additional identity handling. Unauthenticated category-only reports are accessible but less trustworthy.

**Decision and tradeoff:** Public categorical reports with an HMAC-based network/system/time-window identity; no free text or UNA credentials. A unique MongoDB key rejects duplicates atomically. The limit can undercount people behind campus NAT and does not prevent all abuse, so reports remain explicitly unverified. Existing cookie-authenticated administration and the TCP allowlist remain separate.

**Implementation:** `/api/campus/:id/reports`, `reportId`, report persistence in both storage adapters, aggregate-only API, same-origin mutation guard, strict browser content policy, and a mobile-readable report dialog.

**Thread:** [#12](https://github.com/ltortorigi/netguard/issues/12) → report dialog → Express validation → HMAC identity → unique saved report → hourly/24-hour aggregate → Down Detector chart. [Admin security #7](https://github.com/ltortorigi/netguard/issues/7) covers retained admin controls.

**Evaluation:** Tests check simultaneous duplicates, persistence after restart, unknown systems, extra fields, cross-origin requests, unauthenticated admin access, and non-allowlisted TCP hosts. External Downdetector is linked, not scraped or falsely represented as a data feed. Shared-address and distributed-abuse limitations remain documented.

## 3. Reliability testing and release handoff

**Problem:** A successful demo alone does not prove data persistence, recovery, or deployment repeatability.

**Options:** Manual demos are quick but hard to repeat. A third-party testing framework offers tooling but adds dependencies. Node's built-in test runner can exercise actual local TCP connections, a real Express subprocess, and isolated database adapters.

**Decision and tradeoff:** Keep built-in tests, add a MongoDB service in CI, and archive the exact tested commit for SSH deployment. This fits the existing GCP VM pathway but still requires host configuration, review and live browser checks.

**Implementation:** [Tests](../test/), [CI](../.github/workflows/ci.yml), [deployment workflow](../.github/workflows/production.yml), systemd template and rollback-aware deployment script. Production refuses to start without MongoDB. Final tagging occurs only after successful production endpoint checks.

**Thread:** [Testing #8](https://github.com/ltortorigi/netguard/issues/8) / [deployment #9](https://github.com/ltortorigi/netguard/issues/9) → feature PR → DEV tests/review → MAIN → GitHub Actions → GCP → verify → final tag/release.

**Evaluation:** Local tests and browser checks are recorded separately from CI and production verification. The pipeline is implementation evidence, not proof that GCP has been deployed. See [verification](verification.md) and [KILO remaining tasks](kilo.md).
