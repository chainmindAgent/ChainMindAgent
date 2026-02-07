import React, { useState } from 'react';
import { LayoutGrid, ExternalLink, Search, Zap, Users, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/store/os-store';
import { NativeWebApp } from './NativeWebApp';

interface Dapp {
    rank: number;
    name: string;
    category: string;
    users: string;
    transactions: string;
    volume: string;
    logo: string;
    website: string;
}

// Static curated dApps with proper logos
const CURATED_DAPPS: Dapp[] = [
    {
        rank: 1,
        name: 'PancakeSwap',
        category: 'DeFi',
        users: '1.2M',
        transactions: '15M',
        volume: '$450M',
        logo: 'https://pancakeswap.finance/logo.png',
        website: 'https://pancakeswap.finance/'
    },
    {
        rank: 2,
        name: 'Venus',
        category: 'DeFi',
        users: '250K',
        transactions: '500K',
        volume: '$120M',
        logo: 'https://venus.io/images/venus-logo.svg',
        website: 'https://venus.io/'
    },
    {
        rank: 3,
        name: 'Four.Meme',
        category: 'Meme',
        users: '150K',
        transactions: '2M',
        volume: '$10M',
        logo: 'https://four.meme/logo.png',
        website: 'https://four.meme/'
    },
    {
        rank: 4,
        name: 'Lista DAO',
        category: 'DeFi',
        users: '80K',
        transactions: '120K',
        volume: '$50M',
        logo: 'https://lista.org/logo.svg',
        website: 'https://lista.org/'
    },
    {
        rank: 5,
        name: 'GMGN',
        category: 'Trading',
        users: '50K',
        transactions: '300K',
        volume: '$5M',
        logo: 'https://gmgn.ai/static/logo512.png',
        website: 'https://gmgn.ai/bsc'
    },
    {
        rank: 6,
        name: 'Flap',
        category: 'Social',
        users: '45K',
        transactions: '150K',
        volume: '$2M',
        logo: 'https://flap.sh/logo.png',
        website: 'https://flap.sh/'
    },
];

export const DappStoreApp: React.FC = () => {
    const { openWindow } = useOSStore();
    const [search, setSearch] = useState('');

    const handleOpenDapp = (dapp: Dapp) => {
        openWindow(
            `app-${dapp.name.toLowerCase().replace(/\s+/g, '-')}`,
            dapp.name,
            <NativeWebApp url={dapp.website} />,
            <Globe size={14} className="text-yellow-400" />
        );
    };

    const filteredDapps = CURATED_DAPPS.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/50 flex flex-col gap-4 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">BNB Dapp Store</h1>
                            <p className="text-xs text-slate-400">Discover top applications on BNB Chain</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 flex items-center gap-2">
                            <Zap size={12} fill="currentColor" /> {CURATED_DAPPS.length} Apps
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search dApps, DeFi, Games..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDapps.map((dapp, i) => (
                        <motion.div
                            key={dapp.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="group border rounded-xl p-4 flex flex-col gap-3 transition-all bg-yellow-900/10 border-yellow-500/20 hover:bg-yellow-900/20"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-white/5 group-hover:scale-105 transition-transform">
                                        <img
                                            src={dapp.logo}
                                            alt={dapp.name}
                                            className="w-full h-full object-contain p-1"
                                            onError={(e) => {
                                                // Fallback to first letter if logo fails
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML = `<span class="text-xl font-bold text-yellow-500">${dapp.name[0]}</span>`;
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-bold text-yellow-100">{dapp.name}</h3>
                                            <Zap size={12} className="text-yellow-500" fill="currentColor" />
                                        </div>
                                        <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">{dapp.category}</span>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold select-none text-yellow-500/20">#{dapp.rank}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 my-1">
                                <div className="bg-black/20 rounded p-2 text-center">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                                        <Users size={10} /> Users (7d)
                                    </div>
                                    <div className="text-sm font-mono font-medium text-slate-200">{dapp.users}</div>
                                </div>
                                <div className="bg-black/20 rounded p-2 text-center">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                                        <Zap size={10} /> Txns
                                    </div>
                                    <div className="text-sm font-mono font-medium text-slate-200">{dapp.transactions}</div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto pt-2">
                                <button
                                    onClick={() => handleOpenDapp(dapp)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors bg-yellow-500 text-black hover:bg-yellow-400"
                                >
                                    <Globe size={12} /> OPEN APP
                                </button>
                                <a
                                    href={dapp.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
