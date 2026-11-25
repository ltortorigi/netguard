# Individual experience report — Logan Tortorigi

**Draft for Logan's review.** The technical evidence is prepared below. Personal learning and reflection must come from Logan; they are not claimed as completed here.

## My contribution

Logan selected NetGuard's networking/cybersecurity direction, owns the repository, and relayed the professor's request to focus on UNA systems and include down detector. AI assistance produced implementation and documentation changes under that direction. Evidence: [assigned Issues](https://github.com/ltortorigi/netguard/issues?q=is%3Aissue+assignee%3Altortorigi), [pull requests](https://github.com/ltortorigi/netguard/pulls?q=is%3Apr), and [capability records](../capabilities.md).

Before submission, add which implementation, testing, deployment, and review steps you personally performed.

## Independent learning

Technical topics in this project include TCP versus HTTP reachability, background scheduling, request deadlines, MongoDB persistence, and keyed duplicate-report identifiers. Add one specific topic you independently learned, the resource used, and how you demonstrated your understanding.

## Challenge and response

A responding public login page does not prove the underlying campus application works. The implementation separates automated entry-point checks from unverified student reports and links official status sources. Describe a challenge you personally encountered and what you tried; link the relevant Issue, code, or evidence.

## Decision and judgment

The implementation uses a fixed set of public entry points, avoids UNA credentials, and uses report-only cards for campus Wi-Fi and email. Explain in your own words why this scope was appropriate and one alternative you considered. [Recorded alternatives and tradeoffs](../capabilities.md).

## Experience and reflection / AI disclosure

ChatGPT/Codex assisted with code, tests, GitHub planning, and handoff drafts. Automated tests evaluate API behavior and persistence; they do not establish that Logan has personally reviewed every part or that production has been deployed.

Complete these points before submission: what the assistance did well; what was wrong/incomplete; how you personally evaluated it; what you changed; what you still needed to understand; and what you would do differently next time. Do not claim a production deployment until verified.

## Resume/interview draft

**Resume bullet:** Directed an AI-assisted Node.js/Express monitoring project for UNA systems, combining public endpoint checks, categorized outage reports, saved history, and automated reliability tests.

**30-second explanation:** NetGuard helps UNA students see whether campus service entry points respond and whether others are reporting problems. It checks fixed public URLs and saves results, while keeping community reports separate from confirmed outages. The project includes an administrator dashboard and a documented GCP deployment pathway.

**My role:** Project owner and scope lead, with AI-assisted development. Add your personally completed implementation, review, testing and deployment responsibilities before using this report or resume bullet.
