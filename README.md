# ChainMind - BNB Chain Knowledge AI Agent

<p align="center">
  <img src="https://img.shields.io/badge/BNB%20Chain-Expert-F0B90B?style=for-the-badge" alt="BNB Chain Expert">
  <img src="https://img.shields.io/badge/Powered%20by-OpenClaw-blue?style=for-the-badge" alt="OpenClaw">
  <img src="https://img.shields.io/badge/LLM-Z.AI-purple?style=for-the-badge" alt="Z.AI">
</p>

**ChainMind** is an AI agent that specializes in BNB Chain knowledge. It features a self-training brain, autonomous posting capabilities, and a terminal-style web interface.

## ✨ Features

- 🧠 **Self-Training Brain** - Learns from DefiLlama, DappsBay, BNB Chain news, and Twitter
- 🦞 **Moltbook Integration** - Posts and interacts on the AI agent social network
- 🐦 **Twitter Integration** - Autonomous posting to X
- 💻 **Web Chat UI** - Terminal-style interface for direct interaction
- ⛓️ **BAP-578 Ready** - Compatible with Non-Fungible Agent standard
- 🤖 **Semi/Full Autonomy** - Configure your preferred autonomy level

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required:
- `ZAI_API_KEY` - Your Z.AI API key
- `MOLTBOOK_API_KEY` - Already provided from registration

### 3. Train the Brain

```bash
npm run cli train
```

### 4. Start the Agent

```bash
npm run dev
```

Or start just the web interface:

```bash
npm run web
```

## 📖 Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the full agent |
| `npm run web` | Start web chat interface |
| `npm run cli train` | Update knowledge brain |
| `npm run cli query "..."` | Ask a question |
| `npm run cli post-moltbook` | Post to Moltbook |
| `npm run cli stats` | Show brain statistics |

## 🏗️ Architecture

```
ChainMind/
├── src/
│   ├── brain/           # Knowledge brain & fetchers
│   │   ├── fetchers/    # Data source integrations
│   │   ├── storage.ts   # SQLite knowledge store
│   │   └── scheduler.ts # Autonomous task scheduler
│   ├── platforms/       # Moltbook & Twitter clients
│   ├── llm/             # Z.AI integration
│   ├── web/             # Web chat interface
│   └── cli.ts           # CLI commands
├── .agent/skills/       # OpenClaw skill definitions
└── data/                # Local data storage
```

## 🔧 Configuration

See `.env.example` for all configuration options:

- **Autonomy Mode**: `semi` (requires approval) or `full` (autonomous)
- **Post Frequency**: Hours between autonomous posts
- **Twitter Accounts**: Which accounts to monitor for knowledge

## 📊 Knowledge Sources

| Source | Data |
|--------|------|
| DefiLlama | TVL, protocols, metrics |
| DappsBay | dApp ecosystem |
| BNB Chain | News, announcements |
| Twitter | Real-time insights |

## 🦞 Moltbook Profile

Your agent is registered as **ChainMindX** on Moltbook.

Profile: https://moltbook.com/u/ChainMindX

## 📜 License

MIT

---

Built with ❤️ by OpenClaw
