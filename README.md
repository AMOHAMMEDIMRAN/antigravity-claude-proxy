# Antigravity Claude Proxy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A local proxy server with a **Web GUI** that exposes an **Anthropic-compatible API** backed by **Antigravity's Cloud Code**, letting you use Claude and Gemini models with **Claude Code CLI** or the built-in chat interface.

> **Note:** This is a local development tool. Clone the repository to use it - not available as an npm package.

## ✨ Features

- 🎨 **Web GUI** - Beautiful chat interface with account management
- 🔐 **OAuth Authentication** - Easy Google account integration
- 💬 **Multi-Account Support** - Load balancing across multiple accounts
- 📊 **Real-time Status** - Monitor server health and account quotas
- 🚀 **One Command Setup** - Install and run with single command

## How It Works

```
┌──────────────────┐     ┌─────────────────────┐     ┌────────────────────────────┐
│   Web GUI or     │────▶│  This Proxy Server  │────▶│  Antigravity Cloud Code    │
│   Claude Code    │     │  (Anthropic → Google│     │  (daily-cloudcode-pa.      │
│   (Anthropic     │     │   Generative AI)    │     │   sandbox.googleapis.com)  │
│    API format)   │     │                     │     │                            │
└──────────────────┘     └─────────────────────┘     └────────────────────────────┘
```

1. Receives requests in **Anthropic Messages API format**
2. Uses OAuth tokens from added Google accounts (or Antigravity's local database)
3. Transforms to **Google Generative AI format** with Cloud Code wrapping
4. Sends to Antigravity's Cloud Code API
5. Converts responses back to **Anthropic format** with full thinking/streaming support

## Prerequisites

- **Node.js** 18 or later
- **Antigravity** installed (optional - for single-account mode)
- Google account(s) for multi-account mode

---

## 🚀 Quick Start

### Installation & Launch

```bash
git clone https://github.com/AMOHAMMEDIMRAN/antigravity-claude-proxy.git
cd antigravity-claude-proxy
npm install
npm run app
```

That's it! This will:

1. ✅ Install all dependencies (root + GUI)
2. ✅ Start the proxy server on `http://localhost:8080`
3. ✅ Start the GUI and open it in your browser
4. ✅ Ready to add accounts and chat!

### Add Your First Account

Once the GUI opens in your browser:

1. Click the **"+"** button in the Accounts section
2. Click **"🔐 Authenticate with Google"**
3. Sign in with your Google account
4. Start chatting with Claude models!

---

## Alternative: Server Only Mode

If you prefer CLI usage without the GUI:

```bash
# Start server only
npm start
```

Then add accounts via CLI:

```bash
npm run accounts:add
```

---

## Account Management

### Adding Accounts

**Option 1: Web GUI (Recommended)**

Use the GUI to add accounts with OAuth:

1. Click "+" button in Accounts section
2. Authenticate with Google
3. Start using immediately

**Option 2: CLI**

Add accounts via command line:

```bash
npm run accounts:add
```

This opens your browser for Google OAuth. Sign in and authorize access. Repeat for multiple accounts.

**Option 3: Antigravity (Auto-detect)**

If you have Antigravity installed and logged in, the proxy will automatically extract your token. No additional setup needed.

### Managing Accounts

```bash
# List all accounts
npm run accounts:list

# Verify accounts are working
npm run accounts:verify

# Interactive account management
npm run accounts
```

### Verify Server is Running

```bash
# Health check
curl http://localhost:8080/health

# Check account status and quota limits
curl "http://localhost:8080/account-limits?format=table"
```

---

## Using with Claude Code CLI

### Configure Claude Code

Create or edit the Claude Code settings file:

**macOS:** `~/.claude/settings.json`
**Linux:** `~/.claude/settings.json`
**Windows:** `%USERPROFILE%\.claude\settings.json`

Add this configuration:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "test",
    "ANTHROPIC_BASE_URL": "http://localhost:8080",
    "ANTHROPIC_MODEL": "claude-opus-4-5-thinking",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5-thinking",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5-thinking",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-sonnet-4-5",
    "CLAUDE_CODE_SUBAGENT_MODEL": "claude-sonnet-4-5-thinking"
  }
}
```

Or to use Gemini models:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "test",
    "ANTHROPIC_BASE_URL": "http://localhost:8080",
    "ANTHROPIC_MODEL": "gemini-3-pro-high",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "gemini-3-pro-high",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "gemini-3-flash",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "gemini-2.5-flash-lite",
    "CLAUDE_CODE_SUBAGENT_MODEL": "gemini-3-flash"
  }
}
```

### Load Environment Variables

Add the proxy settings to your shell profile:

**macOS / Linux:**

```bash
echo 'export ANTHROPIC_BASE_URL="http://localhost:8080"' >> ~/.zshrc
echo 'export ANTHROPIC_API_KEY="test"' >> ~/.zshrc
source ~/.zshrc
```

> For Bash users, replace `~/.zshrc` with `~/.bashrc`

**Windows (PowerShell):**

```powershell
Add-Content $PROFILE "`n`$env:ANTHROPIC_BASE_URL = 'http://localhost:8080'"
Add-Content $PROFILE "`$env:ANTHROPIC_API_KEY = 'test'"
. $PROFILE
```

**Windows (Command Prompt):**

```cmd
setx ANTHROPIC_BASE_URL "http://localhost:8080"
setx ANTHROPIC_API_KEY "test"
```

Restart your terminal for changes to take effect.

### Run Claude Code

```bash
# Make sure the proxy is running first
npm start

# In another terminal, run Claude Code
claude
```

> **Note:** If Claude Code asks you to select a login method, add `"hasCompletedOnboarding": true` to `~/.claude.json` (macOS/Linux) or `%USERPROFILE%\.claude.json` (Windows), then restart your terminal and try again.

---

## Available Models

### Claude Models

| Model ID                     | Description                              |
| ---------------------------- | ---------------------------------------- |
| `claude-sonnet-4-5-thinking` | Claude Sonnet 4.5 with extended thinking |
| `claude-opus-4-5-thinking`   | Claude Opus 4.5 with extended thinking   |
| `claude-sonnet-4-5`          | Claude Sonnet 4.5 without thinking       |

### Gemini Models

| Model ID            | Description                     |
| ------------------- | ------------------------------- |
| `gemini-3-flash`    | Gemini 3 Flash with thinking    |
| `gemini-3-pro-low`  | Gemini 3 Pro Low with thinking  |
| `gemini-3-pro-high` | Gemini 3 Pro High with thinking |

Gemini models include full thinking support with `thoughtSignature` handling for multi-turn conversations.

---

## Multi-Account Load Balancing

When you add multiple accounts, the proxy automatically:

- **Sticky account selection**: Stays on the same account to maximize prompt cache hits
- **Smart rate limit handling**: Waits for short rate limits (≤2 min), switches accounts for longer ones
- **Automatic cooldown**: Rate-limited accounts become available after reset time expires
- **Invalid account detection**: Accounts needing re-authentication are marked and skipped
- **Prompt caching support**: Stable session IDs enable cache hits across conversation turns

Check account status anytime:

```bash
curl "http://localhost:8080/account-limits?format=table"
```

---

## API Endpoints

| Endpoint          | Method | Description                                                           |
| ----------------- | ------ | --------------------------------------------------------------------- |
| `/health`         | GET    | Health check                                                          |
| `/account-limits` | GET    | Account status and quota limits (add `?format=table` for ASCII table) |
| `/v1/messages`    | POST   | Anthropic Messages API                                                |
| `/v1/models`      | GET    | List available models                                                 |
| `/refresh-token`  | POST   | Force token refresh                                                   |

---

## Testing

Run the test suite:

```bash
# Start server in one terminal
npm start

# Run tests in another terminal
npm test
```

Individual tests:

```bash
npm run test:signatures    # Thinking signatures
npm run test:multiturn     # Multi-turn with tools
npm run test:streaming     # Streaming SSE events
npm run test:interleaved   # Interleaved thinking
npm run test:images        # Image processing
npm run test:caching       # Prompt caching
```

---

## Troubleshooting

### "Could not extract token from Antigravity"

If using single-account mode with Antigravity:

1. Make sure Antigravity app is installed and running
2. Ensure you're logged in to Antigravity

Or add accounts via OAuth instead: `npm run accounts:add`

### 401 Authentication Errors

The token might have expired. Try:

```bash
curl -X POST http://localhost:8080/refresh-token
```

Or re-authenticate the account:

```bash
npm run accounts
```

### Rate Limiting (429)

With multiple accounts, the proxy automatically switches to the next available account. With a single account, you'll need to wait for the rate limit to reset.

### Account Shows as "Invalid"

Re-authenticate the account:

```bash
npm run accounts
# Choose "Re-authenticate" for the invalid account
```

---

## Safety, Usage, and Risk Notices

### Intended Use

- Personal / internal development only
- Respect internal quotas and data handling policies
- Not for production services or bypassing intended limits

### Not Suitable For

- Production application traffic
- High-volume automated extraction
- Any use that violates Acceptable Use Policies

### Warning (Assumption of Risk)

By using this software, you acknowledge and accept the following:

- **Terms of Service risk**: This approach may violate the Terms of Service of AI model providers (Anthropic, Google, etc.). You are solely responsible for ensuring compliance with all applicable terms and policies.

- **Account risk**: Providers may detect this usage pattern and take punitive action, including suspension, permanent ban, or loss of access to paid subscriptions.

- **No guarantees**: Providers may change APIs, authentication, or policies at any time, which can break this method without notice.

- **Assumption of risk**: You assume all legal, financial, and technical risks. The authors and contributors of this project bear no responsibility for any consequences arising from your use.

**Use at your own risk. Proceed only if you understand and accept these risks.**

---

## Legal

- **Not affiliated with Google or Anthropic.** This is an independent open-source project and is not endorsed by, sponsored by, or affiliated with Google LLC or Anthropic PBC.

- "Antigravity", "Gemini", "Google Cloud", and "Google" are trademarks of Google LLC.

- "Claude" and "Anthropic" are trademarks of Anthropic PBC.

- Software is provided "as is", without warranty. You are responsible for complying with all applicable Terms of Service and Acceptable Use Policies.

---

## Credits

This project is based on insights and code from:

- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - Antigravity OAuth plugin for OpenCode
- [claude-code-proxy](https://github.com/1rgs/claude-code-proxy) - Anthropic API proxy using LiteLLM

---

## License

MIT
