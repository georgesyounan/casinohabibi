# Northplay Casino

## Demo project status

**Prepared for project partners · 20 November 2026**

### Purpose

Northplay is a bilingual white-label **demonstration** of an online casino experience. English is the primary language, with Canadian French available. The demo shows player-facing screens and operator workflows using simulated accounts, games, and CAD balances. It is for review and presentation; **there is no plan to launch it as a real-money casino**.

### What the demo includes

- **Player experience:** Bilingual lobby, localized game catalog, search, category filters, newest-first or alphabetical provider-preview sorting, and live result counts that distinguish playable demo games from non-playable provider previews. Empty catalog states offer recovery actions. Signed-in players can filter recent plays and sync favorites. The demo balance can be restored to $100 CAD without erasing history or resetting daily wager progress.
- **White-label foundation:** Tenant branding and locale settings, platform onboarding endpoints, environment configuration, health checks, and SQLite backup and restore tools.
- **Localization coverage:** English is primary and Canadian French is secondary; a static scan found bilingual copy-map entries for every literal UI copy reference and server error/API message code it checked.
- **Operator tools:** Staff accounts with password rotation, tenant role assignment and changes, account disable and re-enable, two-step verification with per-account status and last recorded activity in the staff list, staff activity filters, filtered staff roster CSV export, casino branding with locally stored logos and favicons, bilingual lobby announcements, editable localized FAQ entries, optional localized terms and privacy links, editable bilingual footer text, and lobby content editing with a live draft preview, provider credential storage, a local sample provider catalog for preview, catalog import and individual listing controls, paginated, searchable and categorized staff audit history with localized action labels, UTC date-range filters, a clear-filters recovery action on no-match searches, and full-history filtered CSV export, a tenant-scoped operator overview with player totals, selectable 7/30/90-day demo rounds, active players, simulated CAD wager totals, a daily UTC rounds chart with accessible daily values, per-game activity metrics including share of rounds, open support tickets, catalog counts, and bilingual aggregate CSV export with daily and per-game counts but no player-level data; the export labels fictional showcase data when present. The dashboard also provides setup guidance on an empty fresh database, plus published-settings, preview-catalog, and signed-in staff MFA status, role-aware links to each section, and configurable featured placement for built-in demo games. The operator roster, existing audit rows, and staff role label refresh when switching languages.
- **Player accounts:** Email verification, password reset and change, verified email change, saved language preference, session revocation, and account data export in JSON and CSV, including current UTC daily wager usage in the JSON export.
- **Player protection examples:** Simulated wager limits with a live usage meter, a 15-minute break, one-, seven-, and 30-day cooling-off periods, self-exclusion, and player-configurable play-time reminders every 30, 60, or 120 minutes.
- **Accessibility polish:** Visible keyboard focus, reduced-motion support, named account dialogs that move focus to the new heading when their content changes, Escape-to-close behavior with cleanup of a guest's queued game, announced game results, and live updates for the operator support queue summary.
- **Support workflows:** Player support conversations and complaint classification; players can see a request reference plus opened and last-updated times, and their 50 most recently active requests remain visible when older cases receive updates; staff inbox with search, topic, case type, status, priority, and assignment filters, latest-activity ordering, cursor paging, and active player protection context on safer-play cases, private notes, replies, closure, stale-update protection for assignment, notes, replies, and closures, monotonically advancing ticket versions for rapid consecutive updates, a clear-filters recovery action when a search has no matches, and player display names alongside email.
- **Demo wallet records:** Simulated ledger, paginated account history, and downloadable activity export. Balances have no cash value.

### What is ready to preview

The repository includes the runnable local demo, setup instructions, roadmap and module documents, an optional development-only showcase data command for fresh databases with operator-dashboard setup guidance and a visible sample-data label, partner PDFs, a timed partner presentation script in Markdown and PDF, a detailed walkthrough in Markdown and PDF, an AI-ready partner handoff in Markdown and PDF, a Windows acceptance checklist in Markdown and PDF, and a Windows-ready ZIP named `Northplay-Casino-Windows.zip`. Operators can import, show, or hide individual provider listings for display, but games from external providers are not connected or launched.

### Deliberately outside the demo

These items are not pending demo deliverables; they are excluded because the project is a demonstration and is not intended for real-money launch:

- Deposits, withdrawals, cash balances, and real-money wagers.
- Live game-provider integrations, provider game sessions, and settlement.
- Production age and identity checks, geolocation eligibility, AML, and fraud operations.
- Province or territory licensing and a regulatory launch program.
- Production-grade tenant isolation, independent security certification, and live operational monitoring.

### Optional demo polish

Before presenting, the team can rehearse a player walkthrough and an operator walkthrough, and confirm that the sample catalog and admin account are ready on the computer used for the presentation. These are presentation preparations, not launch prerequisites.

\newpage

### Windows preview

Install Node.js 24 or newer. In File Explorer, extract `Northplay-Casino-Windows.zip` into a new folder (Windows may name it `Northplay-Casino-Windows`). Open that folder; `Start Northplay Demo.bat` should be beside `package.json`. The first run prompts for local operator credentials and creates a private `.env` file with the encryption key. Use the player and Admin URLs printed by the launcher; if port 3000 is busy, it selects the next available local port. Local player signup shows its verification link in the browser and server window. Keep `.env` private and retain it with the local demo database.

**This document describes a demo only. It is not a proposal or assessment for operating a real-money casino.**
