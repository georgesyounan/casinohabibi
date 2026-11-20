# Northplay partner handoff and AI context

Upload this file together with `Northplay-Casino-Windows.zip` when asking another assistant to review the project. The ZIP contains the current source code, local Windows launcher, and project documents. Use the ZIP as the source of truth if it differs from the GitHub repository.

## Project purpose

Northplay is a local demonstration of a Canadian white-label casino experience. English (`en-CA`) is the primary language and Canadian French (`fr-CA`) is available. The demo is for design and operator-workflow review only. It is not intended to launch or handle real-money play. Northplay is a working name and can be changed later.

## What is implemented

- **Localization coverage:** English (`en-CA`) is primary and Canadian French (`fr-CA`) is secondary. All scanned literal UI copy references and server error/API message codes have entries in the bilingual copy map.
- **Player lobby:** Tenant branding, bilingual lobby content and FAQs, announcements, terms/privacy links, featured games, catalog search and filters, favorites, and newest-first or alphabetical sorting for provider preview listings. A localized result summary separates playable demo games from provider previews. Provider cards are labeled as not playable. Signed-in players can filter by recently played built-in games. Empty search/filter states offer suitable recovery actions.
- **Simulated games and balance:** Four built-in demo games (two slot-style games, blackjack, and roulette) use simulated CAD credits. The server records rounds in a local ledger. Players can restore the simulated balance to its $100 CAD starting amount; the reset is recorded and does not erase play history or reset daily wager progress. Credits have no cash value.
- **Player accounts:** Local signup with email verification, sign-in, password reset/change, verified email changes, display name and language preferences, a personalized account greeting, active-session revocation, CSV activity download, and JSON account export with current UTC daily wager usage.
- **Player protection examples:** Daily simulated wager limit and progress meter, 15-minute break, one-, seven-, and 30-day cooling-off periods, self-exclusion, and play-time reminder settings of 30, 60, or 120 minutes.
- **Accessibility:** Visible keyboard focus, reduced-motion support, named account dialogs that move focus to a new heading when the screen changes, Escape-to-close behavior, cleanup of queued game selection when guests cancel sign-in, game result announcements, and live operator support queue summaries.
- **Support and complaints:** Players can open support requests or formal complaints and continue ticket conversations. Their request cards show a reference number and opened and last-updated times; the 50 most recently active requests stay visible when an older case receives a follow-up or reply. Conversation messages identify their authors with localized timestamps. For safer-play requests only, staff also see whether self-exclusion, a cooling-off period, or a short break is active, with an end time for temporary restrictions. Staff can search/filter and page through requests ordered by latest activity, filter by topic, case type, priority, status, and assignment, and reset filters from a no-match state. Updates to older cases appear in the first inbox page. Assignment, notes, replies, and closures reject stale ticket versions and refresh the inbox if a colleague updated the conversation. Ticket versions advance monotonically across player follow-ups and staff actions, including rapid consecutive updates.
- **Operator console:** Tenant-scoped dashboard with player totals, selectable 7/30/90-day demo rounds, active demo players and simulated CAD wager totals, a daily UTC rounds chart with an accessible data list, and a per-game breakdown of rounds, share of rounds, active players, and simulated wagers, plus open support tickets and catalog counts. Its bilingual aggregate CSV includes the selected period's daily and per-game counts, excludes player-level data, and identifies fictional showcase data when present. Other tools include active staff role changes, disabling and re-enabling staff accounts, password changes, authenticator-based two-step verification, per-account two-step-verification status and last recorded activity in the staff list, staff activity filters, filtered staff roster CSV export, paginated, searchable and categorized audit history with localized action labels, UTC date-range filters, a clear-filters action for no-match searches, and filtered CSV export that includes matching events from unloaded pages, casino content editing with draft preview and publish, and visible status for unpublished saved changes. Switching between English and Canadian French refreshes the currently visible staff list, audit rows, and role label.
- **Catalog preview:** Staff can prepare sample bilingual catalog entries, review changes, sync them, and enable or hide listings. The dashboard reports whether any preview listings are enabled. Imported entries are display-only; the sample key is a placeholder and no game provider is contacted.
- **Presentation data:** `Load Northplay Showcase Data.bat` (or `npm run demo:seed`) can add eight fictional, non-login player profiles, 64 simulated rounds, and five bilingual support examples to a fresh local development database. The empty operator overview explains how to load the fixtures, and labels these sample records when loaded. The command refuses to change databases with existing player/gameplay/support data and does not contact external services.
- **Local operations:** Windows launcher, SQLite database, health/readiness endpoints, and database backup/recovery scripts.

## Technology and project layout

- Node.js 24 or newer; server uses Node's built-in SQLite module and has no external package dependencies.
- `server.js` contains the HTTP API and database migrations.
- `public/` contains the bilingual player/admin interface.
- `Start Northplay Demo.bat` and `Start-Northplay-Demo.ps1` start the Windows demo.
- `Load Northplay Showcase Data.bat` loads optional fictional overview/support records into a fresh local demo database.
- `README.md` has detailed setup and operations instructions. `DEMO_PRESENTATION_SCRIPT.md` is the timed partner presentation guide; `DEMO_WALKTHROUGH.md` has the longer step-by-step flow. `DEMO_ACCEPTANCE_CHECKLIST.md` records final Windows review results. `PROJECT_STATUS_REPORT.md` summarizes scope and status. `ROADMAP.md` and the phase documents describe the broader project plan.
- Local `.env` settings and the `data/` database are private runtime files and are excluded from the shareable ZIP. Keep the `.env` encryption key paired with its local demo database.

### Where modules live

| Area | Main files | What to look for |
| --- | --- | --- |
| HTTP server, database schema/migrations, and APIs | `server.js` | Player account, safety, support, admin, provider/catalog, and platform tenant routes. |
| Player and operator interactions, bilingual copy | `public/app.js` | Screen rendering, form actions, EN/FR-CA translations, API calls, dashboard status. |
| Page and admin form structure | `public/index.html` | Lobby, navigation, admin sections, and their element IDs. |
| Responsive visual design | `public/style.css` | Colors, typography, cards, dialogs, admin layouts, and mobile breakpoints. |
| Windows first-run setup | `Start Northplay Demo.bat`, `Start-Northplay-Demo.ps1` | Local operator credential setup, `.env` creation, and launching the server. |
| SQLite backup and restore preparation | `scripts/db-ops.js` | Local database backup, verification, and restore preparation commands. |
| Optional showcase records | `scripts/demo-seed.js` | Adds fictional overview and support data to a fresh development database only. |
| Automated checks | `test/sandbox.test.js` | Existing sandbox checks; run `npm test` when asked to verify behavior. |

`server.js` is currently the central backend file rather than a split service directory. API route groups are handled there: `/api/account`, `/api/safety`, and `/api/support` cover player workflows; `/api/admin` and `/api/providers` cover operator workflows; `/api/platform` contains the early tenant onboarding prototype.

## Run the demo on Windows

1. Install Node.js 24 or newer.
2. Extract `Northplay-Casino-Windows.zip` and open the extracted project folder.
3. Double-click `Start Northplay Demo.bat`. On first run, choose a local operator email and password.
4. Keep the launcher window open and use the player and `/admin` URLs it prints. The launcher may choose a different port if port 3000 is busy.
5. Create a player account in the lobby. In local mode, the verification link is shown in the browser and launcher window.

The operator credentials are created locally and are not included in the ZIP. Do not share `.env` or the local database.

## Explicitly outside this demo

There are no deposits, withdrawals, cash prizes, real-money wagers, external provider game sessions, or settlement. There is no production identity/age verification, geolocation eligibility, AML/fraud operation, licensing program, production deployment, or live monitoring. Provider games should remain disconnected unless the project owner later approves a separate integration scope.

## Guidance for an AI assistant helping with this repository

Treat the uploaded ZIP as the current codebase and read `README.md`, `PROJECT_STATUS_REPORT.md`, and `DEMO_WALKTHROUGH.md` before proposing changes. Keep English primary and Canadian French secondary, and provide translations for new player-facing or operator-facing copy. Clearly label simulated features. Do not claim that provider integrations, payments, licensing, deployment, or production compliance exist. Keep `.env`, secrets, and the local database out of shared files. Make changes in the demo's scope unless the project owner asks to revise it.

## Repository

GitHub: <https://github.com/georgesyounan/casinohabibi>

The project owner last reported GitHub commit `534b845` on `main`. Subsequent changes may exist only in the current ZIP until they are committed and pushed, so prefer the uploaded ZIP when checking the latest implementation.
