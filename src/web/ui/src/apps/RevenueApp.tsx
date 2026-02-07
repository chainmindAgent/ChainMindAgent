import React, { useState } from 'react';
import { DollarSign, RefreshCw, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';

interface FetchResult {
    image: string | null;
    caption: string;
    timestamp: string;
    data?: any;
}

export const RevenueApp: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FetchResult | null>(null);

    // Auto-fetch on mount
    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fetch/revenue');
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
        <div className="h-full flex flex-col bg-zinc-950 font-mono border-t border-yellow-500/20">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-zinc-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DollarSign className="text-yellow-500" size={20} />
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-100">Revenue Rankings</h2>
                        <p className="text-[10px] text-yellow-400/60">Protocol Growth Metrics</p>
                    </div>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-black disabled:opacity-50 p-2 px-3 rounded text-[10px] font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    GENERATE REPORT
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
                                    alt="Revenue Report"
                                    className="w-full h-auto display-block"
                                />
                                <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-200 mb-2">
                                    <h3 className="font-bold mb-1">DATA REPORT (TEXT ONLY)</h3>
                                    <p className="opacity-70">Image generation skipped for performance.</p>
                                </div>
                                <div className="bg-zinc-900/60 rounded-lg border border-white/10 p-4">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10 text-zinc-500 uppercase tracking-wider">
                                                <th className="pb-2 pl-2">#</th>
                                                <th className="pb-2">Protocol</th>
                                                <th className="pb-2 text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(data.data || []).map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="py-2 pl-2 text-zinc-400">{i + 1}</td>
                                                    <td className="py-2 font-bold text-white">
                                                        <div className="flex items-center gap-2">
                                                            {item.logo && <img src={item.logo} className="w-4 h-4 rounded-full" />}
                                                            {item.name}
                                                        </div>
                                                        <span className="text-[10px] text-zinc-500 font-normal">{item.category}</span>
                                                    </td>
                                                    <td className="py-2 text-right font-mono text-yellow-400">
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.revenue)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="bg-zinc-900/80 border border-white/5 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3 text-[10px] text-zinc-500 uppercase tracking-widest">
                                <span>Report Caption</span>
                                <div className="flex gap-2">
                                    <button className="hover:text-yellow-400"><Download size={12} /></button>
                                    <button className="hover:text-yellow-400"><Share2 size={12} /></button>
                                </div>
                            </div>
                            <pre className="text-xs text-yellow-50/80 leading-relaxed whitespace-pre-wrap font-sans italic border-l-2 border-yellow-500/50 pl-3">
                                {data.caption}
                            </pre>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 py-12">
                        <ImageIcon size={64} className="mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">Revenue Scan Required</p>
                        <p className="text-[10px] mt-1 max-w-[200px]">Analyze protocol profitability across the BNB Chain ecosystem.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
