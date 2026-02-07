import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/os-store';
import { Taskbar } from './Taskbar';
import { DraggableWindow } from './Window';
import { TerminalApp } from '@/apps/TerminalApp';
import { Terminal, Flame, Rocket, BarChart3, Landmark, DollarSign, Folder, Radio, Twitter, LayoutGrid, Layers, BrainCircuit, Globe, Activity, Radar } from 'lucide-react';
import { HypeMonitorApp } from '@/apps/HypeMonitorApp';
import { MemeRankApp } from '@/apps/MemeRankApp';
import { TopDappsApp } from '@/apps/TopDappsApp';
import { FullEcoApp } from '@/apps/FullEcoApp';
import { TVLApp } from '@/apps/TVLApp';
import { FeesApp } from '@/apps/FeesApp';
import { RevenueApp } from '@/apps/RevenueApp';
import AgentBrainApp from '@/apps/AgentBrainApp';
import { AgentBroadcastApp } from '@/apps/AgentBroadcastApp';
import { XPostApp } from '@/apps/XPostApp';
import { ChromeApp } from '@/apps/ChromeApp';
import { PredictionMarketApp } from '@/apps/PredictionMarketApp';
import { FolderView } from './FolderView';


import { BootScreen } from './BootScreen';
import { CRTOverlay } from './CRTOverlay';
import { ChainStatusApp } from '@/apps/ChainStatusApp';
import { WhaleWatcherApp } from '@/apps/WhaleWatcherApp';
import { MemeFolderApp } from '@/apps/MemeFolderApp';
import { SocialWidget } from './SocialWidget';

import { DappStoreApp } from '@/apps/DappStoreApp';
import { UserGuideApp } from '@/apps/UserGuideApp';
import { BookOpen } from 'lucide-react';

export const Desktop: React.FC = () => {
    const { windows, openWindow, closeWindow } = useOSStore();
    const [isBooting, setIsBooting] = React.useState(true);

    const handleBackgroundClick = () => {
        // Close any open folder windows when clicking the desktop background
        windows.forEach(w => {
            if (w.id.startsWith('folder-')) {
                closeWindow(w.id);
            }
        });
    };

    // Auto-open Terminal on startup
    useEffect(() => {
        if (!isBooting && !windows.some(w => w.id === 'terminal-1')) {
            openWindow('terminal-1', 'ChainMind Terminal', <TerminalApp id="terminal-1" />, <Terminal size={14} />);
        }
    }, [isBooting]);

    // Folder Collections
    const defiApps = [
        { id: 'tvl', name: 'TVL Rankings', icon: <BarChart3 className="text-blue-400" />, component: <TVLApp />, description: 'Protocol liquidity' },
        { id: 'revenue', name: 'Revenue', icon: <DollarSign className="text-yellow-400" />, component: <RevenueApp />, description: 'Protocol revenue' },
        { id: 'fees', name: 'Fees Paid', icon: <Landmark className="text-emerald-400" />, component: <FeesApp />, description: 'Network usage' },
        { id: 'prediction', name: 'Prediction Mkts', icon: <BrainCircuit className="text-purple-400" />, component: <PredictionMarketApp />, description: 'Market volume' },
    ];

    const binanceApps = [
        { id: 'hype', name: 'Social Hype', icon: <Flame className="text-orange-500" />, component: <HypeMonitorApp />, description: 'Market sentiment' },
        { id: 'memerank', name: 'MemeRank', icon: <Rocket className="text-pink-500" />, component: <MemeRankApp />, description: 'Meme leaderboard' },
    ];

    const dappsApps = [
        { id: 'dappstore', name: 'Dapp Store', icon: <LayoutGrid className="text-yellow-400" />, component: <DappStoreApp />, description: 'Browse BNB dApps' },
        { id: 'topdapps', name: 'Top Dapps', icon: <LayoutGrid className="text-cyan-400" />, component: <TopDappsApp />, description: 'Active users ranking' },
        { id: 'fulleco', name: 'Ecosystem', icon: <Layers className="text-emerald-500" />, component: <FullEcoApp />, description: 'Full chain overview' },
    ];

    const ChromeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
            <path fill="#4caf50" d="M45,24h-2.1c-0.5-0.1-1.1-0.2-1.7-0.2H24v-0.1c-0.1-4.8,3.2-8.9,7.6-10.2l2.3-3.9 C30.6,11.2,27.4,12,24,12c-6.6,0-12,5.4-12,12s5.4,12,12,12c0.4,0,0.8,0,1.2-0.1l-6.7-11.6L24,36c-4.4-1.3-7.6-5.4-7.6-10.2l0,0 h13.7c0-0.6,0.1-1.1,0.2-1.7H24L45,24L45,24z M36.6,33.5L34.2,37l2.8-5L36.6,33.5z" />
            <path fill="#fbc02d" d="M43.8,33l-4.7,0.1l-5.6-9.7c-0.6-1.1-1.3-2.2-2.2-3.2l0,0c0.9-0.9,2-1.7,3.2-2.2l5.6,9.7L43.8,33z M24,14 c3.2,0,6.1,1.5,8,3.9l-4.2,7.2l0,0c-0.5-2.7-2.9-4.8-5.8-4.8c-0.4,0-0.8,0.1-1.2,0.2l2.8-4.8l0.4,0.3L24,14z" />
            <path fill="#e53935" d="M12.9,32.1L7.5,22.8l0.1-4.7L12.9,32.1z M24,36c-3.1,0-5.8-1.4-7.7-3.6l4.2-7.3c0.4,2.5,2.6,4.4,5.2,4.4 c0.5,0,0.9-0.1,1.3-0.2l-2.8,4.9l0,0C24.1,34.2,24.1,34.2,24,36z" />
            <path fill="#1565c0" d="M24,24L24,24c-2.3,0-4.2-1.9-4.2-4.2s1.9-4.2,4.2-4.2s4.2,1.9,4.2,4.2S26.3,24,24,24z" />
            {/* Simplified Chrome Logo for context (using a standard SVG path representation would be better, but this approximates the structure) */}
            <circle cx="24" cy="24" r="10" fill="#fff" />
            <circle cx="24" cy="24" r="8" fill="#1a73e8" />
            <path fill="none" stroke="#fff" strokeWidth="2" d="M24,24 L44,24 M24,24 L14,41.3 M24,24 L14,6.7" strokeOpacity="0.2" />
            {/* Re-drawing standard parts for better visual */}
            <path fill="#EA4335" d="M24 24h20c0-11-9-20-20-20V24z" />
            <path fill="#FBBC05" d="M24 24L14 6.7c-6 3.5-10 10-10 17.3H24z" />
            <path fill="#34A853" d="M24 24H4c0 11 9 20 20 20v-20z" />
            <path fill="#4285F4" d="M24 24v20c11 0 20-9 20-20H24z" />
            <circle cx="24" cy="24" r="9" fill="#fff" />
            <circle cx="24" cy="24" r="7" fill="#4285F4" />
        </svg>
    );


    // Desktop Shortcuts
    const shortcuts = [
        {
            id: 'terminal-new', title: 'Terminal', icon: <Terminal size={32} />,
            action: () => openWindow(`term-${Date.now()}`, 'Terminal', <TerminalApp id={`term-${Date.now()}`} />, <Terminal size={14} />)
        },
        {
            id: 'dappstore', title: 'BNB Store', icon: <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center border border-yellow-500/40 text-yellow-400 group-hover:bg-yellow-500/30 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"><LayoutGrid size={24} /></div>,
            action: () => openWindow('dappstore', 'BNB Dapp Store', <DappStoreApp />, <LayoutGrid size={14} className="text-yellow-400" />)
        },
        {
            id: 'guide', title: 'User Guide', icon: <div className="w-12 h-12 bg-indigo-900/40 rounded-xl flex items-center justify-center border border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"><BookOpen size={24} /></div>,
            action: () => openWindow('guide', 'User Guide', <UserGuideApp />, <BookOpen size={14} className="text-indigo-400" />)
        },
        {
            id: 'chrome', title: 'Chrome', icon: <div className="w-8 h-8"><ChromeIcon /></div>,
            action: () => openWindow('chrome', 'Google Chrome', <ChromeApp />, <div className="w-3.5 h-3.5"><ChromeIcon /></div>)
        },
        {
            id: 'folder-defi', title: 'DefiLlama', icon: <Folder size={32} className="text-blue-400" fill="currentColor" fillOpacity={0.2} />,
            action: () => openWindow('folder-defi', 'DefiLlama Suite', <FolderView items={defiApps} windowId="folder-defi" />, <Folder size={14} className="text-blue-400" />)
        },
        {
            id: 'folder-binance', title: 'BinanceWeb3', icon: <Folder size={32} className="text-yellow-400" fill="currentColor" fillOpacity={0.2} />,
            action: () => openWindow('folder-binance', 'BinanceWeb3 Suite', <FolderView items={binanceApps} windowId="folder-binance" />, <Folder size={14} className="text-yellow-400" />)
        },
        {
            id: 'folder-dapps', title: 'DappsBay', icon: <Folder size={32} className="text-emerald-400" fill="currentColor" fillOpacity={0.2} />,
            action: () => openWindow('folder-dapps', 'DappsBay Suite', <FolderView items={dappsApps} windowId="folder-dapps" />, <Folder size={14} className="text-emerald-400" />)
        },
        {
            id: 'broadcast', title: 'Agent Broadcast', icon: <Radio size={32} className="text-red-500" />,
            action: () => openWindow('broadcast', 'Agent Broadcast', <AgentBroadcastApp />, <Radio size={14} />)
        },
        {
            id: 'xpost', title: 'X Post', icon: <Twitter size={32} className="text-white" />,
            action: () => openWindow('xpost', 'X Post', <XPostApp />, <Twitter size={14} />)
        },
        {
            id: 'folder-memes', title: 'Cool Memes', icon: <Folder size={32} className="text-pink-500" fill="currentColor" fillOpacity={0.2} />,
            action: () => openWindow('folder-memes', 'Meme Vault', <MemeFolderApp />, <Folder size={14} className="text-pink-500" />)
        },
        {
            id: 'noc', title: 'Start NOC', icon: <div className="w-12 h-12 bg-emerald-900/40 rounded-xl flex items-center justify-center border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all"><Activity size={24} /></div>,
            action: () => openWindow('noc', 'Network Ops', <ChainStatusApp />, <Activity size={14} className="text-emerald-400" />)
        },
        {
            id: 'whale', title: 'Whale Radar', icon: <div className="w-12 h-12 bg-cyan-900/40 rounded-xl flex items-center justify-center border border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-105 transition-all"><Radar size={24} /></div>,
            action: () => openWindow('whale', 'Whale Radar', <WhaleWatcherApp />, <Radar size={14} className="text-cyan-400" />)
        },
        {
            id: 'brain', title: 'Agent Brain', icon: <div className="w-12 h-12 bg-purple-900/40 rounded-xl flex items-center justify-center border border-purple-500/30 text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-105 transition-all"><BrainCircuit size={24} /></div>,
            action: () => openWindow('brain', 'Agent Brain', <AgentBrainApp />, <BrainCircuit size={14} className="text-purple-400" />)
        },
    ];

    return (
        <>
            <AnimatePresence>
                {isBooting && <BootScreen onComplete={() => setIsBooting(false)} />}
            </AnimatePresence>

            <div className="h-screen w-screen overflow-hidden bg-[url('/chainmindos.png')] bg-cover bg-center text-foreground selection:bg-primary/30 relative">
                {/* Dark Overlay - Click to close folders */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                    onClick={handleBackgroundClick}
                />




                {/* CRT Overlay */}
                <CRTOverlay />

                {/* Social Widget */}
                <SocialWidget />

                {/* Desktop Icons - Grid Layout */}
                <div className="absolute top-4 left-4 grid grid-flow-col grid-rows-6 gap-6 z-0">
                    {shortcuts.map(sc => (
                        <button
                            key={sc.id}
                            onClick={sc.action}
                            className="group flex flex-col items-center gap-2 w-24 p-2 rounded-lg hover:bg-white/10 transition-colors focus:bg-white/20 focus:outline-none"
                        >
                            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl shadow-lg group-hover:scale-105 transition-transform border border-white/10 backdrop-blur-sm text-foreground">
                                {sc.icon}
                            </div>
                            <span className="text-xs font-medium text-white shadow-black drop-shadow-md text-center leading-tight">{sc.title}</span>
                        </button>
                    ))}
                </div>

                {/* Windows Layer */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {windows.filter(w => w.isOpen).map((window) => (
                        <div key={window.id} className="pointer-events-auto">
                            <DraggableWindow {...window}>
                                {window.component}
                            </DraggableWindow>
                        </div>
                    ))}
                </div>

                {/* Taskbar */}
                <Taskbar />
            </div>
        </>
    );
};
