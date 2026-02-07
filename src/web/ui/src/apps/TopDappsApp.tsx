import React, { useState } from 'react';
import { LayoutGrid, RefreshCw, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';

interface FetchResult {
    image: string | null;
    caption: string;
    timestamp: string;
    data?: any;
}

export const TopDappsApp: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FetchResult | null>(null);

    // Auto-fetch on mount
    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fetch/top-dapps');
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setData(result);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-indigo-950/20 font-mono">
            {/* Header */}
            <div className="p-4 border-b border-indigo-500/20 bg-indigo-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <LayoutGrid className="text-indigo-400" size={20} />
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-100">Top Dapps</h2>
                        <p className="text-[10px] text-indigo-400/60">User Activity Rankings</p>
                    </div>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 p-2 px-3 rounded text-[10px] font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    SCAN DAPPS
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {data ? (
                    <>
                        {data.image ? (
                            <div className="relative group overflow-hidden rounded-lg border border-indigo-500/30 bg-black/40">
                                <img
                                    src={`data:image/png;base64,${data.image}`}
                                    alt="Top Dapps Report"
                                    className="w-full h-auto display-block"
                                />
                                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded text-xs text-indigo-200 mb-2">
                                    <h3 className="font-bold mb-1">TOP DAPPS (TEXT ONLY)</h3>
                                    <p className="opacity-70">Image generation skipped for performance.</p>
                                </div>
                                <div className="bg-indigo-950/20 rounded-lg border border-indigo-500/20 p-4">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-indigo-500/20 text-indigo-400/50 uppercase tracking-wider">
                                                <th className="pb-2 pl-2">#</th>
                                                <th className="pb-2">Name</th>
                                                <th className="pb-2">Users</th>
                                                <th className="pb-2 text-right">Transactions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-500/10">
                                            {(data.data || []).map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-indigo-500/5">
                                                    <td className="py-2 pl-2 text-indigo-400/60">{item.rank || i + 1}</td>
                                                    <td className="py-2 font-bold text-indigo-100">
                                                        <div className="flex items-center gap-2">
                                                            {item.logo && <img src={item.logo} className="w-4 h-4 rounded-full" />}
                                                            {item.name}
                                                        </div>
                                                        <span className="text-[10px] text-indigo-400/50 font-normal">{item.category}</span>
                                                    </td>
                                                    <td className="py-2 font-mono text-indigo-300">
                                                        {item.users}
                                                    </td>
                                                    <td className="py-2 text-right font-mono text-indigo-400">
                                                        {item.transactions}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3 text-[10px] text-indigo-400/50 uppercase tracking-widest">
                                <span>Report Narrative</span>
                                <div className="flex gap-3">
                                    <button className="hover:text-indigo-400"><Download size={12} /></button>
                                    <button className="hover:text-indigo-400"><Share2 size={12} /></button>
                                </div>
                            </div>
                            <pre className="text-xs text-indigo-50/80 leading-relaxed whitespace-pre-wrap font-sans italic border-l-2 border-indigo-500/50 pl-3">
                                {data.caption}
                            </pre>
                            <div className="mt-4 text-[10px] text-indigo-500/50 text-right">
                                Generated: {new Date(data.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                        <LayoutGrid size={64} className="mb-4 text-indigo-500" />
                        <p className="text-sm font-bold uppercase tracking-widest text-indigo-200">Dapps Scan Required</p>
                        <p className="text-[10px] mt-1 text-indigo-400/80 max-w-[200px]">Analyze top performing decentralized applications on BNB Chain.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
