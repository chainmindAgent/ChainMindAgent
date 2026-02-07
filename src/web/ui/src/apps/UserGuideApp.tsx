
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    BookOpen, ShieldCheck, Terminal, Wallet, LayoutGrid, Cpu,
    Zap, Activity, Radar, Flame, Info, HelpCircle, ChevronRight,
    Search, ExternalLink, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Section {
    id: string;
    title: string;
    icon: React.ReactNode;
    content: string;
}

const SECTIONS: Section[] = [
    {
        id: 'intro',
        title: 'Introduction',
        icon: <BookOpen size={18} />,
        content: `
# 🦁 ChainMind OS
**The sovereign gateway to the BNB Chain ecosystem.**

ChainMind OS is a modular, agentic operating system designed to simplify high-level on-chain interactions. It combines real-time data analysis, AI-driven insights, and direct contract interaction into a single, premium interface.

### Core Pillars:
- **Automation**: Let the Agent Brain handle the heavy lifting.
- **Security**: Self-custodial and local-first data persistence.
- **Speed**: One-click trading, sending, and monitoring.
`
    },
    {
        id: 'wallet',
        title: 'Wallet System',
        icon: <Wallet size={18} />,
        content: `
# 💳 Wallet Management
ChainMind supports a dual-wallet architecture for maximum flexibility.

### 🔶 Native Wallet
- Create a new wallet or import via Private Key.
- Keys are stored locally in your browser's encrypted storage.
- **Security**: Never share your private key. Back it up manually!

### 🦊 Browser Wallet
- Connect MetaMask or Trust Wallet instantly.
- Auto-detects BNB Chain and prompts for network switches.

### 📊 Assets & Activity
- **Real-time Balance**: Tracks BNB and popular tokens (USDT, BUSD, USDC, ETH, BTCB).
- **History**: Fetches live data from BSCScan. Every transaction is clickable for full explorer details.
`
    },
    {
        id: 'terminal',
        title: 'Terminal Mastery',
        icon: <Terminal size={18} />,
        content: `
# ⌨️ Terminal (CLI)
The power-user tool for lightning-fast execution.

### Commands Reference
| Command | Usage |
|---------|-------|
| \`wallet\` | Show connection status & address |
| \`balance\` | Check current BNB balance |
| \`send\` | \`send 0.1 BNB 0x...\` |
| \`swap\` | \`swap 0.5 BNB to USDT\` |

### 🔄 One-Click Trading
- **Router**: Integration with PancakeSwap V2.
- **Slippage**: Defaulted to **1%** for safety.
- **Auto-Approval**: Handles ERC-20 approvals automatically before swapping.
`
    },
    {
        id: 'dapps',
        title: 'DApp Store',
        icon: <LayoutGrid size={18} />,
        content: `
# 🛒 BNB DApp Store
A curated launchpad for the best protocols on the chain.

### Features:
- **Native Web View**: Opens dApps in streamlined OS windows.
- **Wallet Bridge**: Our custom provider helps connect your native wallet to external iframes.
- **Curated Selection**: PancakeSwap, Venus, GMGN, and more for a trusted experience.
`
    },
    {
        id: 'monitoring',
        title: 'Monitoring Tools',
        icon: <Radar size={18} />,
        content: `
# 📡 Network Monitoring

### 🚩 NOC (Network Ops)
- Real-time Gas prices (Safe/Standard/Fast).
- **BNB Burn Engine**: Live stats on burn rates.

### 🐋 Whale Radar
- Monitors large movements (> $100k) on BNB Chain.
- **Sonar Alerts**: Audible pings for new institutional activity.
- **Coinglass Alerts**: Built-in scraper for cross-chain whale movement.
`
    },
    {
        id: 'brain',
        title: 'Agent Brain',
        icon: <Cpu size={18} />,
        content: `
# 🧠 The Agentic Brain
The AI core that powers ChainMind's autonomy.

### Capabilities:
- **Data Training**: Constantly updated with TVL, Revenue, and Fees from DeFiLlama.
- **Autonomous Posting**: Automatically generates market insights for Moltbook.
- **Market Intel**: Ask the Brain for specific protocol analysis or ecosystem trends.
`
    },
    {
        id: 'security',
        title: 'Security Manifesto',
        icon: <ShieldCheck size={18} />,
        content: `
# 🛡️ Security Protocol
1. **Self-Custody**: Your keys, your rules. We never see them.
2. **Local Persistence**: Data stays in your browser, not on our servers.
3. **MEV Protection**: 1% default slippage in the terminal prevents frontrunning.
4. **Verification**: Always double-check recipient addresses in the Terminal before pressing enter.
`
    }
];

export const UserGuideApp: React.FC = () => {
    const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const currentSection = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

    return (
        <div className="h-full flex bg-slate-950 text-slate-200 font-sans overflow-hidden border border-white/5">
            {/* Sidebar */}
            <motion.div
                animate={{ width: isSidebarOpen ? 240 : 0 }}
                className={cn(
                    "h-full bg-slate-900/50 border-r border-white/5 flex flex-col transition-all",
                    !isSidebarOpen && "border-none overflow-hidden"
                )}
            >
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <BookOpen size={16} className="text-indigo-400" />
                        </div>
                        <span className="font-bold tracking-tight text-white">Docs Center</span>
                    </div>

                    <nav className="space-y-1">
                        {SECTIONS.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                                    activeSection === section.id
                                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                                )}
                            >
                                <span className={cn(
                                    "transition-colors",
                                    activeSection === section.id ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                                )}>
                                    {section.icon}
                                </span>
                                <span className="text-sm font-medium">{section.title}</span>
                                {activeSection === section.id && (
                                    <motion.div layoutId="active" className="ml-auto">
                                        <ChevronRight size={14} />
                                    </motion.div>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6 space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="flex items-center gap-2 mb-1 text-indigo-400">
                            <HelpCircle size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Support</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">Need help with a trade? Ask the Agent Brain.</p>
                    </div>
                </div>
            </motion.div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-[url('/grid.svg')] bg-fixed bg-center relative">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-slate-900/30 backdrop-blur-xl z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                        <h2 className="text-sm font-semibold text-slate-100">{currentSection.title}</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-8 flex items-center gap-2 px-3 bg-white/5 border border-white/5 rounded-full">
                            <Search size={14} className="text-slate-500" />
                            <span className="text-xs text-slate-500">Quick Guide</span>
                        </div>
                    </div>
                </header>

                {/* Markdown View */}
                <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="max-w-3xl mx-auto p-12 lg:p-20">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="prose prose-invert prose-indigo max-w-none
                                           prose-headings:text-indigo-400 prose-headings:font-bold 
                                           prose-h1:text-5xl prose-h1:mb-12 prose-h1:tracking-tighter
                                           prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-6
                                           prose-h3:text-xl prose-h3:mt-8
                                           prose-p:text-slate-400 prose-p:leading-relaxed prose-p:text-lg
                                           prose-li:text-slate-400 prose-li:text-lg
                                           prose-strong:text-white prose-strong:font-bold
                                           prose-code:text-yellow-400 prose-code:bg-yellow-400/5 prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-base
                                           prose-table:border prose-table:border-white/5 prose-table:bg-white/[0.02] prose-table:rounded-2xl prose-table:overflow-hidden
                                           prose-th:bg-white/5 prose-th:p-4 prose-th:text-xs prose-th:uppercase prose-th:tracking-widest prose-th:text-slate-400
                                           prose-td:p-4 prose-td:border-t prose-td:border-white/5"
                            >
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {currentSection.content}
                                </ReactMarkdown>
                            </motion.div>
                        </AnimatePresence>

                        {/* Pagination / Next section hook */}
                        <div className="mt-20 pt-10 border-t border-white/5 flex justify-between items-center text-slate-500">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest font-bold">OS Engine</span>
                                <span className="text-xs">Version 1.0.0 Stable</span>
                            </div>
                            <button
                                onClick={() => {
                                    const index = SECTIONS.findIndex(s => s.id === activeSection);
                                    if (index < SECTIONS.length - 1) setActiveSection(SECTIONS[index + 1].id);
                                }}
                                className="flex items-center gap-2 group hover:text-indigo-400 transition-colors"
                            >
                                <span className="text-xs font-semibold">Next: {SECTIONS[(SECTIONS.findIndex(s => s.id === activeSection) + 1) % SECTIONS.length].title}</span>
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Background Accent */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-500/5 blur-[120px] rounded-full" />
            </div>
        </div>
    );
};

const GuideBadge: React.FC<{ icon: React.ReactNode, label: string, color: string }> = ({ icon, label, color }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black tracking-widest uppercase ${color}`}>
        {icon}
        {label}
    </div>
);
