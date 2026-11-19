# Northplay Casino

## Partner demo walkthrough

This guide is for a local, simulated demo. Northplay is not being prepared for real-money launch. There are no deposits, withdrawals, cash prizes, or external game-provider connections.

### 1. Start the demo on Windows

1. Install Node.js 24 or newer.
2. Extract `Northplay-Casino-Windows.zip` and open the `casinohabibi` folder.
3. Double-click `Start Northplay Demo.bat`. The first run asks you to choose an operator email and password and saves local settings in `.env`.
4. Keep the launcher window open and use the player and Admin URLs it prints. The default is `http://localhost:3000`; if that port is busy, the launcher selects the next available port and prints the replacement URLs.

Keep `.env` private and with the demo database. The file contains the local operator password and encryption key. Do not include it when sharing project files.

### 2. Show English and Canadian French

The site opens in English. Use the language button in the header to switch to Canadian French and back. The lobby, account dialogs, game instructions, support area, and operator pages include localized copy.

### 3. Try a player account

1. Choose any built-in game and select **Play demo**.
2. Create a player account with an email address and password of at least 10 characters.
3. For a local signup, open the verification link shown in the browser dialog or the launcher window. Complete verification, then sign in. If you began from a game card in the same browser session, the selected game resumes after sign-in.
4. The verified demo account receives $100 CAD in simulated credit. The default daily demo wager limit is $25 CAD.

### 4. Play a simulated round

- **Gold Rush and Aurora Spins:** Spin three reels. A pair adds one times the wager; three matching symbols add four times the wager; other results subtract one times the wager.
- **Midnight Blackjack:** Receive two cards. The dealer draws until reaching 17; the higher hand wins. A tie leaves the simulated balance unchanged.
- **Roulette Royale:** Choose red or black. A matching colour adds one times the wager. Zero is green and loses either bet.

All results use simulated funds. Select the balance button to view recent activity, including each round’s outcome. The account panel can export activity as CSV.

### 5. Preview operator catalog tools

1. Sign in at `/admin` using the operator email and password chosen by the launcher. Leave **Authenticator code** blank unless you have already enabled two-step verification for this account.
2. In **Catalog data**, choose **Prepare sample catalog**. This saves a local placeholder key and prepares four bilingual sample listings.
3. Review the catalog changes, then choose **Sync catalog**.
4. Return to the player lobby. The sample provider titles appear as preview-only cards; they cannot be played and no external service is contacted.

The sample key is a local placeholder, not a real provider credential. Do not enter real provider keys in this demo.

If the sign-in page says Admin setup is not loaded, confirm `.env` is beside `package.json`. Stop any older server still using port 3000, then restart `Start Northplay Demo.bat` so the server reads the settings.

### 6. Preview support workflows

From a signed-in player account, create a support request or formal complaint. Return to `/admin` and open the support inbox to find and respond to the request. Player and operator sessions use separate cookies, so both pages can be kept open in separate tabs.

### Stop the demo

Press Ctrl+C in the launcher window. The local database and `.env` remain available for the next run.
