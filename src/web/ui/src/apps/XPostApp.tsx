import React, { useState } from 'react';
import { Twitter, Send, Loader2, Hash, Image as ImageIcon } from 'lucide-react';

export const XPostApp: React.FC = () => {
    const [feed, setFeed] = useState<any[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch feed on mount
    React.useEffect(() => {
        // Initial fetch (cache mostly)
        fetchFeed();
        // Trigger refresh
        refreshTweets();
    }, []);

    const refreshTweets = async () => {
        setRefreshing(true);
        try {
            await fetch('/api/fetch/twitter');
            fetchFeed(); // Reload feed after refresh
        } catch (e) {
            console.error('Failed to refresh tweets', e);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchFeed = async () => {
        setLoadingFeed(true);
        try {
            const res = await fetch('/api/knowledge/feed?source=twitter&limit=50'); // Changed source to 'twitter' to match Brain
            const data = await res.json();
            setFeed(data);
        } catch (e) {
            console.error('Failed to fetch feed', e);
        } finally {
            setLoadingFeed(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950/50 p-4 font-mono text-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-2">
                <div className="flex items-center gap-3">
                    <Twitter className="text-blue-400" size={24} />
                    <h2 className="text-lg font-bold">X Station - Feed</h2>
                </div>
                <button
                    onClick={refreshTweets}
                    disabled={refreshing}
                    className={`p-2 rounded-full hover:bg-white/10 ${refreshing ? 'animate-spin' : ''}`}
                    title="Refresh Tweets"
                >
                    <Loader2 size={16} className={refreshing ? "text-blue-400" : "text-slate-400"} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {loadingFeed ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-400" /></div>
                ) : feed.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 text-xs">No recent tweets found.</div>
                ) : (
                    feed.map((item: any) => {
                        let meta: any = {};
                        try { meta = JSON.parse(item.metadata || '{}'); } catch { }
                        return (
                            <div key={item.id} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-blue-500/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                            {meta.author ? meta.author[0].toUpperCase() : 'X'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-200">@{meta.author || 'ChainMind'}</div>
                                            <div className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <a href={meta.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                                        <Twitter size={14} />
                                    </a>
                                </div>
                                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {item.content}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
