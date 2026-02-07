import React, { useState } from 'react';
import { Rocket, RefreshCw, Download, Share2, Loader2 } from 'lucide-react';

interface FetchResult {
    image: string | null;
    caption: string;
    timestamp: string;
    data?: any;
}

export const MemeRankApp: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FetchResult | null>(null);

    // Auto-fetch on mount
    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fetch/memerank');
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
        <div className="h-full flex flex-col bg-fuchsia-950/20 font-mono">
            {/* Header */}
            <div className="p-4 border-b border-fuchsia-500/20 bg-fuchsia-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Rocket className="text-fuchsia-400 animate-pulse" size={20} />
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-fuchsia-100">MemeRank</h2>
                        <p className="text-[10px] text-fuchsia-400/60">Community Sentiment Index</p>
                    </div>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 p-2 px-3 rounded text-[10px] font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(192,38,211,0.4)]"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    SCAN MEMES
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {data ? (
                    <>
                        {data.image ? (
                            <div className="relative group overflow-hidden rounded-lg border border-fuchsia-500/30 bg-black/40">
                                <img
                                    src={`data:image/png;base64,${data.image}`}
                                    alt="MemeRank Report"
                                    className="w-full h-auto display-block"
                                />
                                <div className="absolute inset-0 bg-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-fuchsia-900/20 border border-fuchsia-500/30 rounded text-xs text-fuchsia-200 mb-2">
                                    <h3 className="font-bold mb-1">MEME SENTIMENT (TEXT ONLY)</h3>
                                    <p className="opacity-70">Image generation skipped for performance.</p>
                                </div>
                                <div className="bg-fuchsia-950/20 rounded-lg border border-fuchsia-500/20 p-4">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-fuchsia-500/20 text-fuchsia-400/50 uppercase tracking-wider">
                                                <th className="pb-2 pl-2">#</th>
                                                <th className="pb-2">Token</th>
                                                <th className="pb-2 text-right">Sentiment</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-fuchsia-500/10">
                                            {(data.data || []).map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-fuchsia-500/5">
                                                    <td className="py-2 pl-2 text-fuchsia-400/60">{i + 1}</td>
                                                    <td className="py-2 font-bold text-fuchsia-100">
                                                        <div className="flex items-center gap-2">
                                                            {item.logoUrl && <img src={item.logoUrl} className="w-4 h-4 rounded-full" />}
                                                            {item.symbol}
                                                        </div>
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

                        <div className="bg-fuchsia-950/20 border border-fuchsia-500/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3 text-[10px] text-fuchsia-400/50 uppercase tracking-widest">
                                <span>Trending Narrative</span>
                                <div className="flex gap-3">
                                    <button className="hover:text-fuchsia-400"><Download size={12} /></button>
                                    <button className="hover:text-fuchsia-400"><Share2 size={12} /></button>
                                </div>
                            </div>
                            <pre className="text-xs text-fuchsia-50/80 leading-relaxed whitespace-pre-wrap font-sans italic border-l-2 border-fuchsia-500/50 pl-3">
                                {data.caption}
                            </pre>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                        <Rocket size={64} className="mb-4 text-fuchsia-500" />
                        <p className="text-sm font-bold uppercase tracking-widest text-fuchsia-200">Narrative Analysis Pending</p>
                        <p className="text-[10px] mt-1 text-fuchsia-400/80 max-w-[200px]">Identify the strongest community signals and trending meme tokens.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
