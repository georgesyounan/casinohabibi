# Northplay Casino

## Demo project status

**Prepared for project partners · 19 November 2026**

### Purpose

Northplay is a bilingual white-label **demonstration** of an online casino experience. English is the primary language, with Canadian French available. The demo shows player-facing screens and operator workflows using simulated accounts, games, and CAD balances. It is for review and presentation; **there is no plan to launch it as a real-money casino**.

### What the demo includes

- **Player experience:** Bilingual lobby, localized game catalog, search and category filters, playable simulated games, and a demo balance.
- **White-label foundation:** Tenant branding and locale settings, platform onboarding endpoints, environment configuration, health checks, and SQLite backup and restore tools.
- **Operator tools:** Staff accounts and tenant roles, two-step verification, draft and publish casino settings, provider credential storage, a local sample provider catalog for preview, catalog import, and staff audit history.
- **Player accounts:** Email verification, password reset and change, verified email change, saved language preference, session revocation, and account data export in JSON and CSV.
- **Player protection examples:** Simulated wager limits, a 15-minute break, one-, seven-, and 30-day cooling-off periods, self-exclusion, and hourly play-time reminders.
- **Support workflows:** Player support conversations and complaint classification; staff inbox with search, filters, paging, assignment, priority, private notes, replies, and closure.
- **Demo wallet records:** Simulated ledger, paginated account history, and downloadable activity export. Balances have no cash value.

### What is ready to preview

The repository includes the runnable local demo, setup instructions, roadmap and module documents, a partner package PDF, and a Windows-ready ZIP named `Northplay-Casino-Windows.zip`. Operators can import a provider catalog for display, but games from external providers are not connected or launched.

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

Install Node.js 24 or newer, extract `Northplay-Casino-Windows.zip`, and double-click `Start Northplay Demo.bat` inside the `casinohabibi` folder. The first run prompts for local operator credentials and creates a private `.env` file with the encryption key. Use the player and Admin URLs printed by the launcher; if port 3000 is busy, it selects the next available local port. Local player signup shows its verification link in the browser and server window. Keep `.env` private and retain it with the local demo database.

**This document describes a demo only. It is not a proposal or assessment for operating a real-money casino.**
