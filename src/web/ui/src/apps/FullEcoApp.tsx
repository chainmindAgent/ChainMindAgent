import React, { useState } from 'react';
import { Layers, RefreshCw, Download, Share2, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface FetchResult {
    image: string | null;
    caption: string;
    timestamp: string;
    data?: Record<string, any[]>;
}

export const FullEcoApp: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FetchResult | null>(null);
    const [activeTab, setActiveTab] = useState<string>('defi');

    // Auto-fetch on mount
    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fetch/fulleco');
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setData(result);
            if (result.data) {
                const keys = Object.keys(result.data);
                if (keys.length > 0) setActiveTab(keys[0]);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const categories = data?.data ? Object.keys(data.data) : [];

    return (
        <div className="h-full flex flex-col bg-slate-950/20 font-mono">
            {/* Header */}
            <div className="p-4 border-b border-slate-500/20 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Layers className="text-emerald-400" size={20} />
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-100">Ecosystem</h2>
                        <p className="text-[10px] text-emerald-400/60">Full Chain Overview</p>
                    </div>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 p-2 px-3 rounded text-[10px] font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    SCAN ALL
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {data ? (
                    <>
                        {data.image ? (
                            <div className="flex-1 p-4 overflow-y-auto">
                                <div className="relative group overflow-hidden rounded-lg border border-slate-500/30 bg-black/40">
                                    <img
                                        src={`data:image/png;base64,${data.image}`}
                                        alt="Ecosystem Report"
                                        className="w-full h-auto display-block"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Categories Tabs */}
                                <div className="flex overflow-x-auto border-b border-slate-500/20 bg-slate-900/20 scrollbar-hide">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveTab(cat)}
                                            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap border-b-2 ${activeTab === cat
                                                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* List View */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {data.data && data.data[activeTab] && (
                                        <div className="bg-slate-950/20 rounded-lg border border-slate-500/20 overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-900/40">
                                                    <tr className="border-b border-slate-500/20 text-slate-400/50 uppercase tracking-wider">
                                                        <th className="p-3">Project</th>
                                                        <th className="p-3">Users</th>
                                                        <th className="p-3">Transactions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-500/10">
                                                    {data.data[activeTab].map((item: any, i: number) => (
                                                        <tr key={i} className="hover:bg-slate-500/5">
                                                            <td className="p-3 font-bold text-slate-200">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 overflow-hidden">
                                                                        {item.logoBase64 ? <img src={item.logoBase64} className="w-full h-full object-cover" /> : item.name[0]}
                                                                    </div>
                                                                    {item.name}
                                                                </div>
                                                            </td>
                                                            <td className="p-3 font-mono text-emerald-400">
                                                                {item.users}
                                                                <span className={`ml-2 text-[10px] ${item.uc.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>{item.uc}</span>
                                                            </td>
                                                            <td className="p-3 font-mono text-slate-400">
                                                                {item.txs}
                                                                <span className={`ml-2 text-[10px] ${item.tc.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>{item.tc}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Caption/Footer */}
                        {data.caption && (
                            <div className="p-3 border-t border-slate-500/20 bg-slate-950/40 text-[10px] text-slate-500 flex justify-between items-center">
                                <span>Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
                                <div className="flex gap-2">
                                    <button className="hover:text-emerald-400 transition-colors"><Download size={12} /></button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                        <Layers size={64} className="mb-4 text-emerald-500" />
                        <p className="text-sm font-bold uppercase tracking-widest text-emerald-200">Ecosystem Scan Required</p>
                        <p className="text-[10px] mt-1 text-emerald-400/80 max-w-[200px]">Analyze all BNB Chain sectors (DeFi, Games, Social, AI, etc.)</p>
                    </div>
                )}
            </div>
        </div>
    );
};
