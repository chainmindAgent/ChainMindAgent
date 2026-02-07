import React, { useState, useEffect } from 'react';
import { Brain, Database, FileText, Search, RefreshCw, Layers } from 'lucide-react';

interface BrainStats {
    total: number;
    sources: string[];
    lastRun: string;
}

interface MemoryEntry {
    id: string;
    source: string;
    category: string;
    title: string;
    content: string;
    createdAt: string;
}

const AgentBrainApp: React.FC = () => {
    const [stats, setStats] = useState<BrainStats | null>(null);
    const [memories, setMemories] = useState<MemoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSource, setActiveSource] = useState<string>('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stats
            const statsRes = await fetch('/api/stats');
            const statsData = await statsRes.json();
            setStats(statsData);

            // Fetch memory stream
            const memoryRes = await fetch('/api/brain/memory?limit=100');
            const memoryData = await memoryRes.json();
            setMemories(memoryData);
        } catch (error) {
            console.error('Failed to fetch brain data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Auto-refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const filteredMemories = memories.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSource = activeSource === 'all' || m.source === activeSource;
        return matchesSearch && matchesSource;
    });

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'analysis': return 'text-blue-400';
            case 'post': return 'text-green-400';
            case 'news': return 'text-yellow-400';
            case 'manual_trigger': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0f16] text-[#e2e8f0] font-[Inter]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1e293b] bg-[#0f172a]/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                        <Brain className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                            Agent Brain
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <Database className="w-3 h-3" /> {stats?.total || 0} Entries
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" /> {stats?.sources.length || 0} Sources
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${loading ? 'opacity-50' : 'opacity-100'}`}
                >
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filters & Search */}
            <div className="p-4 flex gap-4 border-b border-[#1e293b] bg-[#0f172a]/30">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search memory..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#1e293b]/50 border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                </div>
                <select
                    value={activeSource}
                    onChange={(e) => setActiveSource(e.target.value)}
                    className="bg-[#1e293b]/50 border border-[#334155] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                >
                    <option value="all">All Sources</option>
                    {stats?.sources.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="manual_trigger">Manual Trigger</option>
                </select>
            </div>

            {/* Memory Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredMemories.map((mem) => (
                    <div key={mem.id} className="bg-[#1e293b]/30 border border-[#334155]/50 rounded-lg p-3 hover:bg-[#1e293b]/50 transition-colors cursor-default group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold uppercase tracking-wider ${getCategoryColor(mem.category)}`}>
                                    {mem.category}
                                </span>
                                <span className="text-xs text-slate-500 bg-[#0f172a] px-2 py-0.5 rounded-full border border-white/5">
                                    {mem.source}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(mem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-purple-300 transition-colors">
                            {mem.title}
                        </h3>
                        <p className="text-xs text-slate-400 bg-[#0f172a]/50 p-2 rounded-md font-mono border border-white/5 line-clamp-3">
                            {mem.content}
                        </p>
                    </div>
                ))}

                {filteredMemories.length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No memories found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentBrainApp;
