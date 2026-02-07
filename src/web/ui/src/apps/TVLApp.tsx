import React, { useState } from 'react';
import { BarChart3, RefreshCw, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';

interface FetchResult {
    image: string | null;
    caption: string;
    timestamp: string;
    data?: any;
}

export const TVLApp: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FetchResult | null>(null);

    // Auto-fetch on mount
    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fetch/tvl');
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
        <div className="h-full flex flex-col bg-slate-950 font-mono">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="text-blue-500" size={20} />
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-blue-100">TVL Rankings</h2>
                        <p className="text-[10px] text-blue-400/60">BNB Chain Ecosystem</p>
                    </div>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 p-2 px-3 rounded text-[10px] font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    FETCH LATEST
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {data ? (
                    <>
                        {data.image ? (
                            <div className="relative group overflow-hidden rounded-lg border border-white/10 bg-black/40">
                                <img
                                    src={`data:image/png;base64,${data.image}`}
                                    alt="TVL Report"
                                    className="w-full h-auto display-block"
                                />
                                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            // Text-only mode: Render structured data if available
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200 mb-2">
                                    <h3 className="font-bold mb-1">DATA REPORT (TEXT ONLY)</h3>
                                    <p className="opacity-70">Image generation skipped for performance.</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-lg border border-white/10 p-4">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10 text-slate-500 uppercase tracking-wider">
                                                <th className="pb-2 pl-2">#</th>
                                                <th className="pb-2">Protocol</th>
                                                <th className="pb-2 text-right">TVL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(data.data || []).map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="py-2 pl-2 text-slate-400">{i + 1}</td>
                                                    <td className="py-2 font-bold text-white">
                                                        <div className="flex items-center gap-2">
                                                            {item.logo && <img src={item.logo} className="w-4 h-4 rounded-full" />}
                                                            {item.name}
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-normal">{item.category}</span>
                                                    </td>
                                                    <td className="py-2 text-right font-mono text-blue-400">
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.tvl)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900/80 border border-white/5 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3 text-[10px] text-muted-foreground uppercase tracking-widest">
                                <span>Report Caption</span>
                                <div className="flex gap-2">
                                    <button className="hover:text-blue-400"><Download size={12} /></button>
                                    <button className="hover:text-blue-400"><Share2 size={12} /></button>
                                </div>
                            </div>
                            <pre className="text-xs text-blue-50/80 leading-relaxed whitespace-pre-wrap font-sans italic border-l-2 border-blue-500/50 pl-3">
                                {data.caption}
                            </pre>
                            <div className="mt-4 text-[10px] text-slate-500 text-right">
                                Generated: {new Date(data.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 py-12">
                        <ImageIcon size={64} className="mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Report Cached</p>
                        <p className="text-[10px] mt-1 max-w-[200px]">Click fetch to generate a real-time Total Value Locked report for BNB Chain.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
