# Northplay demo acceptance checklist

**Partner review copy · 20 November 2026**

Use this checklist to review the local Windows demo. Mark each item **Pass**, **Needs follow-up**, or **Not checked**. Record notes without including passwords, `.env` contents, provider credentials, or other secrets.

This review covers a simulated demonstration only. It does not assess readiness to operate a real-money casino.

## Review details

- Reviewer:
- Computer / browser:
- Review date:
- ZIP filename or version:

## 1. Windows setup and startup

- [ ] **Pass / Follow-up / Not checked** — Node.js 24 or newer is installed.
- [ ] **Pass / Follow-up / Not checked** — The ZIP extracts and `Start Northplay Demo.bat` opens the demo.
- [ ] **Pass / Follow-up / Not checked** — First startup accepts local operator credentials and saves `.env` beside `package.json`.
- [ ] **Pass / Follow-up / Not checked** — The launcher labels the player and Admin addresses separately, and both open in the browser.
- [ ] **Pass / Follow-up / Not checked** — Optional port-conflict check: with port 3000 occupied, the launcher selects another port and prints working player and Admin addresses for that port.
- [ ] **Pass / Follow-up / Not checked** — The launcher remains open while the demo is in use and Ctrl+C stops it.

Notes:

## 2. Language and player lobby

- [ ] **Pass / Follow-up / Not checked** — English is selected by default and the language control switches the interface to Canadian French and back.
- [ ] **Pass / Follow-up / Not checked** — Lobby copy, navigation, filters, account dialogs, and built-in game instructions update with the selected language.
- [ ] **Pass / Follow-up / Not checked** — Game search, category filters, favorites, and recently played work as expected.
- [ ] **Pass / Follow-up / Not checked** — Imported provider listings are clearly labeled as previews and cannot be launched.
- [ ] **Pass / Follow-up / Not checked** — The layout remains usable at desktop and narrow/mobile browser widths.
- [ ] **Pass / Follow-up / Not checked** — Keyboard focus is visible, reduced-motion preference is respected, game outcomes are announced, account dialogs have accessible names, move focus to the new heading when their screen changes, and close with Escape; guest dialog cancellation clears a queued game, and the language control announces its action in the current interface language.

Notes:

## 3. Player account and simulated play

- [ ] **Pass / Follow-up / Not checked** — A player can register, open the local verification link, verify the account, and sign in.
- [ ] **Pass / Follow-up / Not checked** — A verified account receives simulated starting credits and the balance is clearly presented as having no cash value.
- [ ] **Pass / Follow-up / Not checked** — A built-in demo round updates the simulated balance and account history.
- [ ] **Pass / Follow-up / Not checked** — The daily simulated wager limit and its progress display update during play.
- [ ] **Pass / Follow-up / Not checked** — The player can restore the demo balance to its starting amount without deleting activity or resetting daily wager progress.
- [ ] **Pass / Follow-up / Not checked** — Account activity CSV and JSON exports download and contain no internal staff notes or credentials.
- [ ] **Pass / Follow-up / Not checked** — Break, cooling-off, self-exclusion, and play-time reminder controls respond as described.
- [ ] **Pass / Follow-up / Not checked** — A player can open a support request or formal complaint, see its reference number and opened and last-updated times, and continue a conversation.

Notes:

## 4. Operator console

- [ ] **Pass / Follow-up / Not checked** — The launcher-created operator can sign in at `/admin` with two-step code blank unless it was enabled previously.
- [ ] **Pass / Follow-up / Not checked** — The dashboard's 7/30/90-day selector updates demo rounds, active demo players, simulated CAD wagers, the daily UTC rounds chart, and per-game rounds/share/activity; the accessible list shows every date; player, support, and catalog totals remain current; its bilingual CSV export matches the selected period, includes daily and per-game counts without player-level data, and identifies fictional showcase records when loaded; role-aware links open the relevant operator sections.
- [ ] **Pass / Follow-up / Not checked** — Optional `Load Northplay Showcase Data.bat` creates clearly fictional, non-login showcase records on a fresh local database and refuses to add sample rows to a database with existing player/gameplay/support data.
- [ ] **Pass / Follow-up / Not checked** — The operator overview shows setup guidance when a fresh demo has no players, labels the metrics and support examples when fictional showcase records are present, and hides both notices in other states.
- [ ] **Pass / Follow-up / Not checked** — Casino content can be edited in English and French, previewed, saved as a draft, and published.
- [ ] **Pass / Follow-up / Not checked** — The sample catalog can be prepared and synced; listings remain preview-only and no external provider is contacted.
- [ ] **Pass / Follow-up / Not checked** — The support inbox filters by topic, case type, status, priority, and assignment; safer-play requests show only relevant active player protection status; staff can find a player request, assign it, add an internal note, reply, and close or reopen it; a recent update to an older request appears in the first loaded page, paging continues through the remaining requests, a no-match search offers a one-click filter reset, and stale assignment/note/reply/close forms refresh when the conversation changes.
- [ ] **Pass / Follow-up / Not checked** — Staff role descriptions, email/role/status/MFA/activity filters, sorting, and filtered roster CSV export work; the CSV includes account status, MFA state, creation time, and last recorded activity in UTC.
- [ ] **Pass / Follow-up / Not checked** — Role changes, disabling accounts, re-enabling accounts, and disabling two-step verification show a confirmation before applying.
- [ ] **Pass / Follow-up / Not checked** — Staff audit history can be searched, categorized, filtered by UTC dates, paged, and exported as filtered CSV including matching events from pages not yet loaded; a no-match search offers a one-click filter reset.
- [ ] **Pass / Follow-up / Not checked** — While signed in as an operator admin, switching EN/FR-CA updates the staff role label, staff roster, and existing audit rows without clearing the active filters.
- [ ] **Pass / Follow-up / Not checked** — Two-step verification setup and sign-in work if this flow is included in the partner review.

Notes:

## 5. Demo boundary

- [ ] **Pass / Follow-up / Not checked** — No deposits, withdrawals, prizes, or real-money wagers are presented as available.
- [ ] **Pass / Follow-up / Not checked** — No real provider account or key is entered; the sample credential is understood to be a local placeholder.
- [ ] **Pass / Follow-up / Not checked** — Everyone reviewing understands this is a local demo and not a production casino service.

## Follow-up list

| Priority | Screen / step | What happened | Expected result | Owner / next action |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## Review outcome

- [ ] Ready for partner demo
- [ ] Ready after listed follow-ups
- [ ] Needs another review

Partner notes:
