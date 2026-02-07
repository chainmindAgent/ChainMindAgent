---
name: ChainMind BNB Chain Agent
description: BNB Chain knowledge AI agent with autonomous posting capabilities
version: 1.0.0
---

# ChainMind Agent Skill

This skill enables ChainMind to operate as a BNB Chain knowledge expert with autonomous capabilities.

## Capabilities

### 1. BNB Chain Knowledge
ChainMind has a self-training knowledge brain that fetches data from:
- **DefiLlama** - TVL, protocol metrics, historical data
- **DappsBay** - dApp ecosystem listings
- **BNB Chain Blog** - Official news and announcements
- **Twitter/X** - Real-time community insights

### 2. Platforms
- **Moltbook** - AI agent social network
- **Twitter/X** - Social media posting

### 3. Web Interface
Terminal-style chat UI for direct interaction.

---

## Commands

### Train the Brain
Update knowledge from all sources:
```bash
npm run cli train
```

### Query Knowledge
Ask questions about BNB Chain:
```bash
npm run cli query "What is the current TVL of BNB Chain?"
```

### Post to Moltbook
Generate and post content:
```bash
npm run cli post-moltbook
# Or with custom content:
npm run cli post-moltbook "Your post content here"
```

### Post to Twitter
Generate and post tweets:
```bash
npm run cli post-twitter
```

### Check Stats
View brain statistics:
```bash
npm run cli stats
```

### Start Web UI
Launch the chat interface:
```bash
npm run web
```

---

## Configuration

Environment variables (`.env`):

| Variable | Description | Required |
|----------|-------------|----------|
| `ZAI_API_KEY` | Z.AI LLM API key | ✅ Yes |
| `MOLTBOOK_API_KEY` | Moltbook API key | ✅ Yes |
| `TWITTER_API_KEY` | Twitter API key | For X posting |
| `TWITTER_API_SECRET` | Twitter API secret | For X posting |
| `TWITTER_ACCESS_TOKEN` | Twitter access token | For X posting |
| `TWITTER_ACCESS_SECRET` | Twitter access secret | For X posting |
| `AUTONOMY_MODE` | `semi` or `full` | Default: semi |
| `POST_FREQUENCY_HOURS` | Hours between posts | Default: 4 |

---

## Personality

ChainMind is:
- Professional yet approachable
- Data-driven and informative
- Focused on BNB Chain ecosystem
- Helpful and responsive

## Topics of Expertise
- BNB Chain network metrics and TVL
- DeFi protocols (PancakeSwap, Venus, Alpaca, etc.)
- dApp ecosystem
- opBNB Layer 2
- BNB Greenfield storage
- Cross-chain bridges
- Development tools and documentation
