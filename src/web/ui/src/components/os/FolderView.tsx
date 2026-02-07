import React from 'react';
import { useOSStore } from '@/store/os-store';

interface AppItem {
    id: string;
    name: string;
    icon: React.ReactNode;
    component: React.ReactNode;
    description?: string;
}

interface FolderViewProps {
    items: AppItem[];
    windowId?: string;
}

export const FolderView: React.FC<FolderViewProps> = ({ items, windowId }) => {
    const { openWindow, closeWindow } = useOSStore();

    const handleAppClick = (item: AppItem) => {
        openWindow(item.id, item.name, item.component, item.icon);
        if (windowId) {
            closeWindow(windowId);
        }
    };

    return (
        <div className="h-full bg-slate-900/80 p-6 overflow-y-auto">
            <div className="grid grid-cols-4 gap-4">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleAppClick(item)}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all text-slate-200 shadow-lg border border-white/5">
                            {/* Clone element to potentially resize icon if needed, or just render */}
                            {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-white">{item.name}</div>
                            {item.description && (
                                <div className="text-[10px] text-slate-500 mt-0.5 max-w-[80px] truncate">{item.description}</div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
