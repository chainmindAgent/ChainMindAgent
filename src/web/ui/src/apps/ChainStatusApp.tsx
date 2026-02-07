import React, { useState, useEffect, useRef } from 'react';
import { JsonRpcProvider, formatUnits } from 'ethers';
import { Activity, Zap, Server, Database, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// BSC RPC
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

type BlockLog = {
    number: number;
    hash: string;
    txCount: number;
    timestamp: number;
};

type BurnData = {
    total: string;
    realTime: string;
};

export const ChainStatusApp: React.FC = () => {
    const [blockHeight, setBlockHeight] = useState<number>(0);
    const [gasPrice, setGasPrice] = useState<string>('0');
    const [tps, setTps] = useState<number>(0);
    const [logs, setLogs] = useState<BlockLog[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [burnData, setBurnData] = useState<BurnData>({ total: 'Loading...', realTime: '...' });

    // Keep reference to provider to clean up if needed (though jsonrpc providers are stateless mostly)
    const providerRef = useRef<JsonRpcProvider | null>(null);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const provider = new JsonRpcProvider(BSC_RPC);
                providerRef.current = provider;
                setIsConnected(true);

                // Initial fetch
                const blockNum = await provider.getBlockNumber();
                setBlockHeight(blockNum);

                const feeData = await provider.getFeeData();
                if (feeData.gasPrice) {
                    setGasPrice(formatUnits(feeData.gasPrice, 'gwei'));
                }

                // Listen for new blocks
                provider.on('block', async (blockNumber) => {
                    if (!mounted) return;
                    setBlockHeight(blockNumber);

                    // Fetch block details for Tx count (TPS proxy)
                    const block = await provider.getBlock(blockNumber);
                    if (block && mounted) {
                        const txCount = block.transactions.length;
                        // BSC block time is ~3s. Simple TPS est = txCount / 3
                        setTps(Math.round(txCount / 3));

                        const newLog = {
                            number: block.number,
                            hash: block.hash || '?',
                            txCount: txCount,
                            timestamp: Date.now()
                        };

                        setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50
                    }

                    // Update Gas
                    const newFee = await provider.getFeeData();
                    if (newFee.gasPrice && mounted) {
                        setGasPrice(parseFloat(formatUnits(newFee.gasPrice, 'gwei')).toFixed(2));
                    }
                });

            } catch (e) {
                console.error("Chain connection failed", e);
                setIsConnected(false);
            }
        };

        init();

        return () => {
            mounted = false;
            if (providerRef.current) {
                providerRef.current.removeAllListeners('block');
            }
        };
    }, []);

    // Fetch BNB Burn Data
    useEffect(() => {
        const fetchBurnData = async () => {
            try {
                const response = await fetch('/api/fetch/bnb-burn');
                if (response.ok) {
                    const data = await response.json();
                    setBurnData({
                        total: data.total_burned || 'N/A',
                        realTime: data.real_time_burn || 'N/A'
                    });
                } else {
                    console.error('Failed to fetch BNB burn data:', response.statusText);
                    setBurnData({ total: 'Error', realTime: 'Error' });
                }
            } catch (error) {
                console.error('Error fetching BNB burn data:', error);
                setBurnData({ total: 'Error', realTime: 'Error' });
            }
        };

        fetchBurnData();
        // Refresh every 5 minutes
        const interval = setInterval(fetchBurnData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full w-full bg-slate-950 text-emerald-500 font-mono p-4 flex flex-col gap-4 overflow-hidden relative">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4 shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <Activity className="animate-pulse" />
                    <h1 className="text-xl font-bold tracking-widest uppercase">Network Ops Center</h1>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                    <span>BSC MAINNET {isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
                </div>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-4 gap-4 shrink-0 z-10">
                <div className="bg-emerald-900/10 border border-emerald-500/30 p-3 rounded-md">
                    <div className="flex items-center gap-2 text-emerald-400/70 text-xs mb-1">
                        <Database size={14} /> LIVE BLOCK
                    </div>
                    <div className="text-2xl font-bold text-white tracking-wider">
                        #{blockHeight.toLocaleString()}
                    </div>
                </div>

                <div className="bg-emerald-900/10 border border-emerald-500/30 p-3 rounded-md">
                    <div className="flex items-center gap-2 text-emerald-400/70 text-xs mb-1">
                        <Zap size={14} /> GAS PRICE
                    </div>
                    <div className="text-2xl font-bold text-yellow-400 tracking-wider">
                        {gasPrice} <span className="text-sm font-normal text-emerald-500/70">Gwei</span>
                    </div>
                </div>

                <div className="bg-emerald-900/10 border border-emerald-500/30 p-3 rounded-md">
                    <div className="flex items-center gap-2 text-emerald-400/70 text-xs mb-1">
                        <Server size={14} /> EST. TPS
                    </div>
                    <div className="text-2xl font-bold text-cyan-400 tracking-wider">
                        {tps} <span className="text-sm font-normal text-emerald-500/70">tx/s</span>
                    </div>
                </div>

                <div className="bg-emerald-900/10 border border-emerald-500/30 p-3 rounded-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors" />
                    <div className="flex items-center gap-2 text-orange-400/70 text-xs mb-1 relative z-10">
                        <Flame size={14} /> BNB BURNED
                    </div>
                    <div className="text-lg font-bold text-orange-400 tracking-wider relative z-10 truncate" title={burnData.total}>
                        {burnData.total}
                    </div>
                    <div className="text-[10px] text-orange-500/60 relative z-10 flex justify-between items-center mt-1">
                        <span>REAL-TIME:</span>
                        <span className="font-bold">{burnData.realTime}</span>
                    </div>
                </div>
            </div>

            {/* Live Log Feed */}
            <div className="flex-1 border border-emerald-500/30 rounded-md bg-black/40 overflow-hidden flex flex-col z-10">
                <div className="bg-emerald-500/10 p-2 text-xs font-bold border-b border-emerald-500/30 flex justify-between">
                    <span>BLOCK STREAM</span>
                    <span className="animate-pulse">RECEIVING DATA...</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
                    <AnimatePresence initial={false}>
                        {logs.map((log) => (
                            <motion.div
                                key={log.number}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-4 border-b border-white/5 pb-1 text-emerald-400/80 hover:bg-white/5 transition-colors"
                            >
                                <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="text-white font-bold">#{log.number}</span>
                                <span className="truncate flex-1 text-emerald-600/70">{log.hash}</span>
                                <span className="text-cyan-400">{log.txCount} txs</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {logs.length === 0 && (
                        <div className="text-center text-emerald-500/30 mt-10">Waiting for next block...</div>
                    )}
                </div>
            </div>
        </div>
    );
};
