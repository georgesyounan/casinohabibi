# Northplay Casino

## Partner demo walkthrough

This guide is for a local, simulated demo. Northplay is not being prepared for real-money launch. There are no deposits, withdrawals, cash prizes, or external game-provider connections.

### 1. Start the demo on Windows

1. Install Node.js 24 or newer.
2. In File Explorer, extract `Northplay-Casino-Windows.zip` into a new folder (Windows may name it `Northplay-Casino-Windows`). Open that folder; `Start Northplay Demo.bat` should be beside `package.json`.
3. Double-click `Start Northplay Demo.bat`. The first run asks you to choose an operator email and password and saves local settings in `.env`.
4. Keep the launcher window open and use the player and Admin URLs it prints. The default is `http://localhost:3000`; if that port is busy, the launcher selects the next available port and prints the replacement URLs.

For a partner presentation with non-empty operator metrics, stop the demo after its first initialization and double-click `Load Northplay Showcase Data.bat` in the extracted folder. This optional command only works in development and only with a fresh player/gameplay/support database; it adds fictional showcase records without contacting external services. Start the launcher again afterward. The showcase accounts cannot be used to sign in.

Keep `.env` private and with the demo database. The file contains the local operator password and encryption key. Do not include it when sharing project files. The secure password prompt accepts 12–128 letters, numbers, or these symbols: `! @ % $ _ . -`; it does not accept spaces or other symbols.

### 2. Show English and Canadian French

The site opens in English. Use the language button in the header to switch to Canadian French and back. The lobby, account dialogs, game instructions, support area, and operator pages include localized copy. Star games on their cards, then use the **Favorites** filter to find them again. After playing a round, signed-in players can use **Recently played** to find built-in games from their recent account history. Signed-in players sync favorites to their account; guest favorites stay in the browser. Imported provider listings remain preview-only.

### 3. Try a player account

1. Choose any built-in game and select **Play demo**.
2. Create a player account with an email address and password of at least 10 characters.
3. For a local signup, open the verification link shown in the browser dialog or the launcher window. Complete verification, then sign in. If you began from a game card in the same browser session, the selected game resumes after sign-in.
4. The verified demo account receives $100 CAD in simulated credit. The default daily demo wager limit is $25 CAD. The account and game dialogs show a progress bar with simulated wagers used and remaining for the UTC day. In the account panel, choose a play-time reminder every 30, 60, or 120 minutes; reminders apply to the current signed-in session and can be acknowledged as they appear.

### 4. Play a simulated round

- **Gold Rush and Aurora Spins:** Spin three reels. A pair adds one times the wager; three matching symbols add four times the wager; other results subtract one times the wager.
- **Midnight Blackjack:** Receive two cards. The dealer draws until reaching 17; the higher hand wins. A tie leaves the simulated balance unchanged.
- **Roulette Royale:** Choose red or black. A matching colour adds one times the wager. Zero is green and loses either bet.

All results use simulated funds. Select the balance button to open the account panel, set a tenant-specific display name or preferred language, and view recent activity, including each round’s outcome. The account panel can export activity as CSV and shows progress toward the daily simulated wager limit. The limit resets at UTC midnight. In the account or game panel, players can restore the simulated balance to $100 CAD; this adds a ledger entry and keeps previous activity and daily wager progress.

### 5. Preview operator catalog tools

1. Sign in at `/admin` using the operator email and password chosen by the launcher. The tenant dashboard summarizes player accounts, verified emails, the last 30 days of simulated play, open support requests, enabled catalog listings, and two-step verification status for the signed-in staff account. Leave **Authenticator code** blank unless you have already enabled two-step verification for this account.
2. In **Casino settings**, edit the brand name, optional PNG/JPEG/WebP logo (up to 48 KB) and PNG/WebP favicon (up to 16 KB), accent colour, support email, lobby headline and introduction, optional lobby announcement, and the three FAQ entries in both languages. Review the side-by-side preview, save the draft, then publish it for players to see. The operator overview shows whether saved changes still need publishing and provides a role-appropriate link back to Casino settings. Leave both announcement fields blank to hide the announcement. Add optional English and Canadian French terms and privacy HTTPS links, and edit the bilingual footer disclaimer. Select up to three built-in demo games to feature first; external provider listings remain separate and preview-only.
3. In **Catalog data**, choose **Prepare sample catalog**. Review the four bilingual listings. The sample provider is created when you sync.
4. Review the catalog changes, then choose **Sync catalog**. Use **Catalog listing management** to hide or restore individual preview cards. The operator overview confirms when at least one preview listing is enabled and links staff directly to catalog management; these listings do not connect to external games.
5. Return to the player lobby. The sample provider titles appear as preview-only cards; use the sort menu to see newest entries first or sort alphabetically. They cannot be played and no external service is contacted.

The sample key is a local placeholder, not a real provider credential. Do not enter real provider keys in this demo.

If the sign-in page says Admin setup is not loaded, confirm `.env` is beside `package.json` and restart `Start Northplay Demo.bat` so the server reads the settings. If startup reports `EADDRINUSE`, stop an older Northplay server with Ctrl+C before starting another copy; the launcher normally selects a free port when it detects a conflict.

### 6. Preview support workflows

From a signed-in player account, create a support request or formal complaint. Return to `/admin` and open the support inbox to find and respond to the request. Player display names appear with email addresses when the player has set a name. Player and operator sessions use separate cookies, so both pages can be kept open in separate tabs.

### Stop the demo

Press Ctrl+C in the launcher window. The local database and `.env` remain available for the next run.
