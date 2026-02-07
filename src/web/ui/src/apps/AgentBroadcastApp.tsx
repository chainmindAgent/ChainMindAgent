import React, { useState } from 'react';
import { Radio, Send, Loader2 } from 'lucide-react';

export const AgentBroadcastApp: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);

    // Poll for logs every 3 seconds
    React.useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Fetch actions (source=self) and specific telegram logs if any (source=telegram)
                // For now, we fetch 'self' which contains replies/posts
                const res = await fetch('/api/knowledge/feed?source=self&limit=50');
                const data = await res.json();
                setLogs(data);
            } catch (e) {
                console.error('Failed to fetch logs', e);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col bg-slate-950/50 p-4 font-mono text-slate-200">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-700/50 pb-2">
                <Radio className="text-red-500" size={24} />
                <h2 className="text-lg font-bold">Agent Broadcast Node</h2>
            </div>

            <div className="flex-1 bg-black/40 rounded-lg p-3 mb-4 border border-slate-800 overflow-y-auto custom-scrollbar font-mono">
                <div className="text-xs text-slate-500 mb-2 border-b border-white/5 pb-2">SYSTEM TELETYPE // LIVE</div>
                <div className="flex flex-col gap-2">
                    {logs.length === 0 ? (
                        <div className="text-xs text-slate-600 italic">Connected. Waiting for agent activity...</div>
                    ) : (
                        logs.map((log: any) => (
                            <div key={log.id} className="text-xs">
                                <span className="text-slate-500">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                                <span className="text-emerald-500 font-bold px-2">[{log.category.toUpperCase()}]</span>
                                <span className="text-slate-300">{log.title}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
