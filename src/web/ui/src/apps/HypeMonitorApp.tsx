import React, { useState } from 'react';
import { Flame, RefreshCw, Download, Share2, Loader2 } from 'lucide-react';

interface FetchResult {
    image: string | null;
    caption: string;
    timestamp: string;
    data?: any;
}

export const HypeMonitorApp: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FetchResult | null>(null);

    // Auto-fetch on mount
    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fetch/hype');
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
        <div className="h-full flex flex-col bg-slate-950/20 font-mono">
            {/* Header */}
            <div className="p-4 border-b border-orange-500/20 bg-orange-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Flame className="text-orange-500" size={20} />
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-orange-100">Social Hype</h2>
                        <p className="text-[10px] text-orange-400/60">Community Attention Metrics</p>
                    </div>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 p-2 px-3 rounded text-[10px] font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(249,115,22,0.4)] text-white"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    TRACK HYPE
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {data ? (
                    <>
                        {data.image ? (
                            <div className="relative group overflow-hidden rounded-lg border border-orange-500/30 bg-black/40">
                                <img
                                    src={`data:image/png;base64,${data.image}`}
                                    alt="Hype Report"
                                    className="w-full h-auto display-block"
                                />
                                <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-orange-900/20 border border-orange-500/30 rounded text-xs text-orange-200 mb-2">
                                    <h3 className="font-bold mb-1">HYPE LEADERBOARD (TEXT ONLY)</h3>
                                    <p className="opacity-70">Image generation skipped for performance.</p>
                                </div>
                                <div className="bg-orange-950/20 rounded-lg border border-orange-500/20 p-4">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-orange-500/20 text-orange-400/50 uppercase tracking-wider">
                                                <th className="pb-2 pl-2">#</th>
                                                <th className="pb-2">Token</th>
                                                <th className="pb-2 text-right">Hype Score</th>
                                                <th className="pb-2 text-right">Sentiment</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-orange-500/10">
                                            {(data.data || []).map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-orange-500/5">
                                                    <td className="py-2 pl-2 text-orange-400/60">{i + 1}</td>
                                                    <td className="py-2 font-bold text-orange-100">
                                                        <div className="flex items-center gap-2">
                                                            {item.logoUrl && <img src={item.logoUrl} className="w-4 h-4 rounded-full" />}
                                                            {item.symbol}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 text-right font-mono text-orange-400">
                                                        {item.hypeScore}
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.sentimentType === 'bullish' ? 'bg-green-500/20 text-green-400' :
                                                            item.sentimentType === 'bearish' ? 'bg-red-500/20 text-red-400' :
                                                                'bg-slate-500/20 text-slate-400'
                                                            }`}>
                                                            {item.sentimentType?.toUpperCase() || 'NEUTRAL'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="bg-orange-950/20 border border-orange-500/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3 text-[10px] text-orange-400/50 uppercase tracking-widest">
                                <span>Report Insights</span>
                                <div className="flex gap-3">
                                    <button className="hover:text-orange-400"><Download size={12} /></button>
                                    <button className="hover:text-orange-400"><Share2 size={12} /></button>
                                </div>
                            </div>
                            <pre className="text-xs text-orange-50/80 leading-relaxed whitespace-pre-wrap font-sans italic border-l-2 border-orange-500/50 pl-3">
                                {data.caption}
                            </pre>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                        <Flame size={64} className="mb-4 text-orange-500" />
                        <p className="text-sm font-bold uppercase tracking-widest text-orange-200">Attention Scan Required</p>
                        <p className="text-[10px] mt-1 text-orange-400/80 max-w-[200px]">Monitor social sentiment and trending conversations on X and Binance Web3.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
