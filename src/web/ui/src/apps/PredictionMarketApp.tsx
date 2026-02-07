import React, { useState } from 'react';
import { BrainCircuit, RefreshCw, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';

interface FetchResult {
    image: string | null;
    caption: string;
    timestamp: string;
    data?: any;
}

export const PredictionMarketApp: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FetchResult | null>(null);

    // Auto-fetch on mount
    React.useEffect(() => {
        handleFetch();
    }, []);

    const handleFetch = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fetch/prediction');
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
        <div className="h-full flex flex-col bg-cyan-950/20 font-mono">
            {/* Header */}
            <div className="p-4 border-b border-cyan-500/20 bg-cyan-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="text-cyan-400" size={20} />
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-100">Prediction Markets</h2>
                        <p className="text-[10px] text-cyan-400/60">TVL & Volume Analytics</p>
                    </div>
                </div>
                <button
                    onClick={handleFetch}
                    disabled={loading}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 p-2 px-3 rounded text-[10px] font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(8,145,178,0.4)]"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    SCAN MARKETS
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {data ? (
                    <>
                        {data.image ? (
                            <div className="relative group overflow-hidden rounded-lg border border-cyan-500/30 bg-black/40">
                                <img
                                    src={`data:image/png;base64,${data.image}`}
                                    alt="Prediction Market Report"
                                    className="w-full h-auto display-block"
                                />
                                <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded text-xs text-cyan-200 mb-2">
                                    <h3 className="font-bold mb-1">MARKET DATA (TEXT ONLY)</h3>
                                    <p className="opacity-70">Image generation skipped for performance.</p>
                                </div>
                                <div className="bg-cyan-950/20 rounded-lg border border-cyan-500/20 p-4">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-cyan-500/20 text-cyan-400/50 uppercase tracking-wider">
                                                <th className="pb-2 pl-2">#</th>
                                                <th className="pb-2">Protocol</th>
                                                <th className="pb-2 text-right">TVL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-cyan-500/10">
                                            {(data.data || []).map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-cyan-500/5">
                                                    <td className="py-2 pl-2 text-cyan-400/60">{i + 1}</td>
                                                    <td className="py-2 font-bold text-cyan-100">
                                                        <div className="flex items-center gap-2">
                                                            {item.logo && <img src={item.logo} className="w-4 h-4 rounded-full" />}
                                                            {item.name}
                                                        </div>
                                                        <span className="text-[10px] text-cyan-400/50 font-normal">{item.category}</span>
                                                    </td>
                                                    <td className="py-2 text-right font-mono text-cyan-400">
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.tvl)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3 text-[10px] text-cyan-400/50 uppercase tracking-widest">
                                <span>Report Narrative</span>
                                <div className="flex gap-3">
                                    <button className="hover:text-cyan-400"><Download size={12} /></button>
                                    <button className="hover:text-cyan-400"><Share2 size={12} /></button>
                                </div>
                            </div>
                            <pre className="text-xs text-cyan-50/80 leading-relaxed whitespace-pre-wrap font-sans italic border-l-2 border-cyan-500/50 pl-3">
                                {data.caption}
                            </pre>
                            <div className="mt-4 text-[10px] text-cyan-500/50 text-right">
                                Generated: {new Date(data.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                        <BrainCircuit size={64} className="mb-4 text-cyan-500" />
                        <p className="text-sm font-bold uppercase tracking-widest text-cyan-200">Markets Scan Required</p>
                        <p className="text-[10px] mt-1 text-cyan-400/80 max-w-[200px]">Analyze prediction markets TVL and volume on BNB Chain.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
