import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/os-store';
import {
    Terminal, Settings, LogOut, Shield, Zap, Globe,
    Radio, Twitter, BrainCircuit
} from 'lucide-react';
import { TerminalApp } from '@/apps/TerminalApp';
import { WebSearchApp } from '@/apps/WebSearchApp';
import AgentBrainApp from '@/apps/AgentBrainApp';
import { AgentBroadcastApp } from '@/apps/AgentBroadcastApp';
import { XPostApp } from '@/apps/XPostApp';
import { ChromeApp } from '@/apps/ChromeApp';
import { ChromeIcon } from '@/components/icons/ChromeIcon';

// Define structure types
type AppItem = {
    id: string;
    name: string;
    icon: React.ReactNode;
    component?: React.ReactNode;
    description: string;
};

type FolderItem = {
    id: string;
    name: string;
    icon: React.ReactNode;
    type: 'folder';
    items: AppItem[];
    description: string;
};

type MenuItem = AppItem | FolderItem;

export const StartMenu: React.FC = () => {
    const { toggleStartMenu, openWindow, isStartMenuOpen } = useOSStore();
    const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null);

    if (!isStartMenuOpen) return null;

    // Root Menu Structure
    // Root Menu Structure
    const rootItems: MenuItem[] = [
        {
            id: 'terminal', name: 'System Terminal', icon: <Terminal size={18} />, component: <TerminalApp id="terminal" />, description: 'Direct brain interface'
        },
        {
            id: 'search', name: 'Brave Search', icon: <Globe size={18} />, component: <WebSearchApp />, description: 'Real-time web explorer'
        },
        {
            id: 'broadcast', name: 'Agent Broadcast', icon: <Radio size={18} />, component: <AgentBroadcastApp />, description: 'TG Channel Uplink'
        },
        {
            id: 'xpost', name: 'X Post', icon: <Twitter size={18} />, component: <XPostApp />, description: 'Compose & Post'
        },
        {
            id: 'brain', name: 'Agent Brain', icon: <BrainCircuit size={18} className="text-purple-400" />, component: <AgentBrainApp />, description: 'Memory & Knowledge'
        },
    ];

    const displayItems = rootItems;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-14 left-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden flex"
        >
            {/* Sidebar */}
            <div className="w-12 bg-white/5 border-r border-white/5 flex flex-col items-center py-4 gap-4 justify-end">
                <Settings size={18} className="text-slate-400 hover:text-white cursor-pointer transition-colors" />
                <LogOut size={18} className="text-slate-400 hover:text-red-400 cursor-pointer transition-colors" />
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 flex flex-col h-[400px]"> {/* Fixed height for consistency */}
                {/* Header */}
                <div className="flex items-center gap-3 mb-4 px-2 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                        <img src="/logo.png" alt="ChainMind Logo" className="w-full h-full object-cover" />
                    </div>

                    <div>
                        <div className="text-sm font-bold text-white">ChainMind Alpha</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                            System Online
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">
                        System Apps
                    </div>

                    <div className="space-y-1">

                        {/* Chrome App */}
                        <button
                            onClick={() => {
                                openWindow('chrome', 'Google Chrome', <ChromeApp />, <ChromeIcon size={18} />);
                                toggleStartMenu();
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors group text-left"
                        >
                            <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0">
                                <ChromeIcon size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-medium text-slate-200 truncate">Google Chrome</div>
                                <div className="text-[10px] text-slate-500 truncate">Web Browser</div>
                            </div>
                        </button>

                        {/* Existing items without Brave Search */}
                        {rootItems.filter(i => i.id !== 'search' && i.id !== 'terminal').map((item: any) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    openWindow(item.id, item.name, item.component, item.icon);
                                    toggleStartMenu();
                                }}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors group text-left"
                            >
                                <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0">
                                    {item.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-medium text-slate-200 truncate">{item.name}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
                                </div>
                            </button>
                        ))}
                        {/* Terminal (added back at end or order manually) */}
                        <button
                            onClick={() => {
                                openWindow('terminal', 'System Terminal', <TerminalApp id="terminal" />, <Terminal size={14} />);
                                toggleStartMenu();
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors group text-left"
                        >
                            <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0">
                                <Terminal size={18} className="text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-medium text-slate-200 truncate">System Terminal</div>
                                <div className="text-[10px] text-slate-500 truncate">Direct brain interface</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-white/5 shrink-0">
                    <div className="flex flex-col gap-2 px-2">
                        <a
                            href="https://x.com/ChainMindAgent"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                        >
                            <Twitter size={10} />
                            <span>@ChainMindAgent</span>
                        </a>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Shield size={10} /> Secure Node</span>
                            <span>v1.2.1</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
