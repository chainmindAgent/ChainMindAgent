import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const BOOT_LOGS = [
    "CHAINMIND BIOS v1.0.4.2",
    "Copyright (C) 2026 OpenClaw Tech.",
    "CPU: Neural Core x64 @ 4.2GHz",
    "Memory: 1024TB Quantum RAM",
    "Initializing hardware abstractions...",
    "Loading Neural Network weights...",
    "Scanning BNB Chain nodes...",
    "Connecting to DefiLlama data streams...",
    "Booting ChainMindOS...",
    "Checking system integrity: OK",
    "Starting Graphical User Interface...",
];

export const BootScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
    const [done, setDone] = useState(false);

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < BOOT_LOGS.length) {
                setVisibleLogs(prev => [...prev, BOOT_LOGS[i]]);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => setDone(true), 1000);
            }
        }, 150);
        return () => clearInterval(interval);
    }, []);

    if (done) {
        return (
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1 }}
                onAnimationComplete={onComplete}
                className="fixed inset-0 bg-black z-[10000]"
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-[10000] p-8 font-mono text-green-500 overflow-hidden text-sm uppercase">
            <div className="max-w-4xl mx-auto space-y-1">
                {visibleLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-4">
                        <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                        <span>{log}</span>
                    </div>
                ))}
                <div className="w-2 h-4 bg-green-500 animate-pulse inline-block" />
            </div>
        </div>
    );
};
