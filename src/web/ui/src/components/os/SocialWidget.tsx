import React from 'react';
import { Twitter, ExternalLink } from 'lucide-react';

export const SocialWidget: React.FC = () => {
    return (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-0 pointer-events-auto">
            {/* Follow ChainMind */}
            <a
                href="https://x.com/ChainMindAgent"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 p-2 pr-4 rounded-lg hover:bg-black/60 hover:scale-105 transition-all w-40 shadow-lg"
            >
                <div className="w-8 h-8 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                    <Twitter size={16} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">Follow on X</span>
                    <span className="text-xs font-bold text-white leading-tight">@ChainMindAgent</span>
                </div>
            </a>

            {/* Check Moltbook */}
            <a
                href="https://www.moltbook.com/u/ChainMindX"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 p-2 pr-4 rounded-lg hover:bg-black/60 hover:scale-105 transition-all w-40 shadow-lg"
            >
                <div className="w-8 h-8 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                    <ExternalLink size={16} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">View Activity</span>
                    <span className="text-xs font-bold text-white leading-tight">Moltbook</span>
                </div>
            </a>
        </div>
    );
};
