# Northplay demo presentation script

**Partner review guide · 20 November 2026**

This script guides a short review of the Northplay local demonstration. Use a fresh demo database or a prepared demo account. Do not share passwords, `.env` values, authenticator secrets, or real provider credentials during the presentation.

## Before the meeting

1. Extract the Windows ZIP into a new folder and confirm Node.js 24 or newer is installed.
2. Start the demo with `Start Northplay Demo.bat` once to initialize its local database and operator account. Stop it with Ctrl+C.
3. For a populated dashboard, double-click `Load Northplay Showcase Data.bat` in that folder. It only adds fictional sample records to a fresh local database; it refuses to change a database that already has player, gameplay, or support records.
4. Start the launcher again and confirm the printed player and Admin addresses open in the browser.
5. Have the local operator account ready; create its credentials privately on first startup.
6. Keep the [demo acceptance checklist](DEMO_ACCEPTANCE_CHECKLIST.md) open to record Pass, Needs follow-up, or Not checked.

## Suggested 10-minute walkthrough

### 1. Set context · 1 minute

Say: “This is a local product demonstration. Game rounds and CAD balances are simulated. It does not take deposits or withdrawals, and no external game provider is connected.”

Show the lobby and point out the EN/FR language control and demo-only notice.

### 2. Review the player lobby · 2 minutes

1. Search for a built-in game, then clear the search.
2. Select a category and demonstrate favorites or recently played if an account is available.
3. Switch to Canadian French, confirm the lobby labels change, then return to English.
4. Narrow the browser window briefly to review the responsive layout.
5. If provider-preview listings are present, show their preview-only label and confirm they cannot launch.

Expected result: the built-in demo games are playable simulations; provider catalog entries are informational previews only.

### 3. Review simulated player features · 2 minutes

1. Sign in to a prepared player account, or register and use the local verification link shown by the demo.
2. Play one built-in demo round and show the simulated balance and activity history update.
3. Open the player safety controls and show the daily wager meter and available break, cooling-off, self-exclusion, and reminder settings.
4. Open a support request and show its reference and timestamps, if time permits.

Expected result: the account and wallet records are local demo data with no cash value.

### 4. Review operator tools · 4 minutes

1. Open the printed Admin address and sign in with the local operator account. Leave the authenticator field blank unless two-step verification was enabled.
2. Change the overview period among 7, 30, and 90 days; point out the daily chart and per-game activity, including each game's share of demo rounds.
3. Export the overview CSV and confirm it contains aggregate demo metrics without player-level data.
4. Open casino settings and show the English/French content fields and draft preview. Do not publish unless the partner specifically wants to see that action.
5. Open catalog management and prepare the local sample catalog. Show the listing changes, publish the sample, and open its import receipt.
6. If a support request exists, find it in the support inbox and demonstrate assignment or a reply.

Expected result: operator actions are local to the demonstration. Imported listings remain non-playable previews.

### 5. Capture feedback · 1 minute

For each issue, record the page and action, what happened, what was expected, and its priority. Do not include passwords, secrets, or personal information in notes. Mark the corresponding item in the acceptance checklist and choose an outcome: ready for partner demo, ready after follow-ups, or needs another review.

## Review notes

| Page / action | Observed result | Expected result | Priority / owner |
| --- | --- | --- | --- |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## Closing statement

This review assesses presentation and demo workflows only. It does not assess readiness for real-money operation. Live providers, payments, production identity and location checks, licensing, and launch operations are outside the demo scope.
