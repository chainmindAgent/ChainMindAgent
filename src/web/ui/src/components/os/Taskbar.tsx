import React, { useState, useEffect } from 'react';
import { useOSStore } from '@/store/os-store';
import { useWalletStore } from '@/store/wallet-store';
import { cn } from '@/lib/utils';
import { Battery, Wifi, Volume2, Search, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { StartMenu } from './StartMenu';
import { WalletApp } from '@/apps/WalletApp';

export const Taskbar: React.FC = () => {
    const { windows, activeWindowId, bringToFront, toggleStartMenu, isStartMenuOpen, minimizeWindow, openWindow } = useOSStore();
    const { isConnected, address, balance, connect } = useWalletStore();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [prices, setPrices] = useState<{ BTC?: string, ETH?: string, BNB?: string }>({});

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const res = await fetch('/api/prices');
                const data = await res.json();
                setPrices(data);
            } catch (e) {
                console.error('Failed to fetch prices', e);
            }
        };
        fetchPrices();
        const interval = setInterval(fetchPrices, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const handleWalletClick = () => {
        if (!isConnected) {
            connect();
        } else {
            // Open Wallet App
            openWindow('wallet', 'My Wallet', <WalletApp />, <Wallet size={14} className="text-yellow-400" />);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isStartMenuOpen && <StartMenu />}
            </AnimatePresence>
            <div className="h-12 bg-background/80 backdrop-blur-md border-t border-white/5 flex items-center px-2 justify-between z-50 fixed bottom-0 w-full select-none">
                <div className="flex items-center gap-2 h-full">
                    {/* Start Button */}
                    <button
                        onClick={toggleStartMenu}
                        className={cn(
                            "h-10 px-3 rounded-md flex items-center gap-2 transition-all hover:bg-white/5 active:scale-95",
                            isStartMenuOpen && "bg-white/10"
                        )}
                    >
                        <div className="w-6 h-6 rounded-sm flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-semibold text-sm hidden sm:block">Start</span>
                    </button>

                    <div className="w-[1px] h-6 bg-white/10 mx-1" />

                    {/* Search Bar (Visual Only) */}
                    <div className="h-9 bg-black/20 rounded-md border border-white/5 flex items-center px-3 gap-2 w-48 text-muted-foreground hover:bg-black/30 transition-colors">
                        <Search size={14} />
                        <span className="text-xs">Type to search...</span>
                    </div>

                    {/* Open Windows */}
                    <div className="flex items-center gap-1 ml-2">
                        <AnimatePresence mode='popLayout'>
                            {windows.filter(w => w.isOpen).map((window) => (
                                <motion.button
                                    layout
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    key={window.id}
                                    onClick={() => {
                                        if (activeWindowId === window.id && !window.isMinimized) {
                                            minimizeWindow(window.id);
                                        } else {
                                            bringToFront(window.id);
                                        }
                                    }}
                                    className={cn(
                                        "h-9 px-3 max-w-48 rounded-md flex items-center gap-2 transition-all border border-transparent",
                                        activeWindowId === window.id && !window.isMinimized
                                            ? "bg-white/10 border-white/5 shadow-inner"
                                            : "hover:bg-white/5 text-muted-foreground hover:text-foreground",
                                        window.isMinimized && "opacity-60"
                                    )}
                                >
                                    {window.icon}
                                    <span className="text-xs truncate">{window.title}</span>
                                    {activeWindowId === window.id && !window.isMinimized && (
                                        <motion.div layoutId="active-pill" className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 rounded-full" />
                                    )}
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* System Tray */}
                <div className="flex items-center gap-3 px-2">

                    {/* Wallet Connection */}
                    <button
                        onClick={handleWalletClick}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all",
                            isConnected
                                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <Wallet size={14} />
                        {isConnected ? (
                            <div className="flex flex-col items-end leading-none">
                                <span>{parseFloat(balance || '0').toFixed(3)} BNB</span>
                                <span className="text-[10px] opacity-70 font-mono">{address?.slice(0, 4)}...{address?.slice(-4)}</span>
                            </div>
                        ) : (
                            <span>Connect Wallet</span>
                        )}
                    </button>

                    <div className="w-[1px] h-6 bg-white/10 mx-1" />

                    {/* Price Ticker */}
                    <div className="hidden md:flex items-center gap-4 px-3 border-r border-white/10 mr-2 text-xs font-mono font-medium text-slate-300">
                        {prices.BTC && (
                            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                <span className="text-orange-500 font-bold">BTC</span>
                                <span>{prices.BTC}</span>
                            </div>
                        )}
                        {prices.ETH && (
                            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                <span className="text-blue-400 font-bold">ETH</span>
                                <span>{prices.ETH}</span>
                            </div>
                        )}
                        {prices.BNB && (
                            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                <span className="text-yellow-400 font-bold">BNB</span>
                                <span>{prices.BNB}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 px-2">
                        <Wifi size={16} className="text-muted-foreground" />
                        <Volume2 size={16} className="text-muted-foreground" />
                        <Battery size={16} className="text-muted-foreground" />
                    </div>
                    <div className="flex flex-col items-end justify-center h-full px-2 hover:bg-white/5 rounded-md transition-colors cursor-default">
                        <span className="text-xs font-medium leading-none">{format(time, 'h:mm aa')}</span>
                        <span className="text-xs text-muted-foreground leading-none mt-0.5">{format(time, 'MMM d, yyyy')}</span>
                    </div>
                </div>
            </div>
        </>
    );
};
