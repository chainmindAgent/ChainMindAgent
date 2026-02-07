import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, Lock, X } from 'lucide-react';

interface ChromeAppProps {
    initialUrl?: string;
}

export const ChromeApp: React.FC<ChromeAppProps> = ({ initialUrl }) => {
    const defaultUrl = initialUrl || 'https://www.google.com/search?igu=1';
    const [url, setUrl] = useState(defaultUrl);
    const [inputUrl, setInputUrl] = useState(defaultUrl);
    const [isLoading, setIsLoading] = useState(false);

    const handleNavigate = (e?: React.FormEvent) => {
        e?.preventDefault();
        let target = inputUrl;
        if (!target.startsWith('http')) {
            if (target.includes('.')) {
                target = `https://${target}`;
            } else {
                target = `https://www.google.com/search?igu=1&q=${encodeURIComponent(target)}`;
            }
        }
        setUrl(target);
        setInputUrl(target);
        setIsLoading(true);
    };

    return (
        <div className="h-full flex flex-col bg-white text-slate-800 font-sans">
            {/* Chrome Toolbar */}
            <div className="h-20 bg-slate-100 border-b border-slate-300 flex flex-col">
                {/* Tabs (Fake) */}
                <div className="h-9 flex items-end px-2 gap-2 pt-2">
                    <div className="bg-white rounded-t-lg px-3 py-1.5 min-w-[160px] flex items-center justify-between shadow-sm text-xs font-medium relative -bottom-[1px]">
                        <div className="flex items-center gap-2 truncate">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            New Tab
                        </div>
                        <X size={12} className="text-slate-500 hover:bg-slate-200 rounded p-0.5 cursor-pointer" />
                    </div>
                </div>

                {/* Navigation Bar */}
                <div className="flex-1 flex items-center gap-2 px-3 pb-2 pt-1">
                    <div className="flex gap-1 text-slate-500">
                        <button className="p-1 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30"><ArrowLeft size={16} /></button>
                        <button className="p-1 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30"><ArrowRight size={16} /></button>
                        <button className="p-1 hover:bg-slate-200 rounded-full transition-colors" onClick={() => setIsLoading(true)}><RotateCw size={14} className={isLoading ? 'animate-spin' : ''} /></button>
                        <button className="p-1 hover:bg-slate-200 rounded-full transition-colors" onClick={() => { setUrl('https://www.google.com/search?igu=1'); setInputUrl('https://www.google.com/search?igu=1'); }}><Home size={16} /></button>
                    </div>

                    <form onSubmit={handleNavigate} className="flex-1">
                        <div className="bg-slate-200 hover:bg-slate-300/70 focus-within:bg-white focus-within:shadow transition-all rounded-full h-8 flex items-center px-3 gap-2 border border-transparent focus-within:border-blue-500/30">
                            <Lock size={10} className="text-emerald-600" />
                            <input
                                type="text"
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-500"
                                placeholder="Search Google or type a URL"
                            />
                            <Search size={14} className="text-slate-500" />
                        </div>
                    </form>

                    <div className="w-7 h-7 bg-purple-600 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        C
                    </div>
                </div>
            </div>

            {/* Browser Content */}
            <div className="flex-1 bg-white relative">
                {isLoading && (
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-100 z-10">
                        <div className="h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '30%' }}></div>
                    </div>
                )}

                <iframe
                    src={url}
                    className="w-full h-full border-none"
                    onLoad={() => setIsLoading(false)}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    title="Browser"
                />
            </div>

            <style>{`
                @keyframes loading {
                    0% { left: -30%; }
                    100% { left: 100%; }
                }
            `}</style>
        </div>
    );
};
