import React, { useEffect, useState } from 'react';
import { Film, Image as ImageIcon } from 'lucide-react';

export const MemeFolderApp: React.FC = () => {
    const [files, setFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMemes = async () => {
            try {
                const res = await fetch('/api/memes');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setFiles(data);
                }
            } catch (e) {
                console.error('Failed to fetch memes', e);
            } finally {
                setLoading(false);
            }
        };

        fetchMemes();
    }, []);

    return (
        <div className="h-full bg-slate-900 p-4 overflow-y-auto custom-scrollbar">
            {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                    Loading memes...
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                    <Film size={48} className="opacity-20" />
                    <p>No memes found in /memes folder</p>
                    <p className="text-xs opacity-50">Add images/videos to D:\ChainMind\memes</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {files.map((file) => {
                        const isVideo = /\.(mp4|webm)$/i.test(file);
                        return (
                            <div key={file} className="group relative aspect-square bg-slate-800 rounded-lg overflow-hidden border border-white/5 hover:border-blue-500/50 transition-colors">
                                {isVideo ? (
                                    <video
                                        src={`/memes/${file}`}
                                        className="w-full h-full object-cover"
                                        controls
                                    />
                                ) : (
                                    <img
                                        src={`/memes/${file}`}
                                        alt={file}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[10px] text-white truncate text-center">{file}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
