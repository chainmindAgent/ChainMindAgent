import React, { useState, useEffect, useRef } from 'react';
import { JsonRpcProvider, formatEther, formatUnits } from 'ethers';
import { Radar, Target, TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BSC_RPC = 'https://bsc-dataseed.binance.org/';

// Configuration - Lowered thresholds for more activity
const PANCAKE_ROUTER_V2 = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

const TRACKED_TOKENS = {
    BNB: { address: 'NATIVE', decimals: 18, threshold: 10.0, symbol: 'BNB' }, // 10 BNB (~$3k)
    WBNB: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, threshold: 10.0, symbol: 'WBNB' },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, threshold: 5000.0, symbol: 'USDT' },
    ETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, threshold: 1.0, symbol: 'ETH' },
    BTCB: { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, threshold: 0.05, symbol: 'BTCB' },
    CAKE: { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, threshold: 200.0, symbol: 'CAKE' }
};

// ERC20 Transfer Event Topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

type TxType = 'buy' | 'sell' | 'transfer';

type WhaleTx = {
    id: string;
    hash?: string;
    value: string;
    symbol: string;
    from?: string;
    to?: string;
    timestamp: number;
    type: TxType;
    source?: 'onchain' | 'coinglass';
    timeAgo?: string;
};

// Sonar sound base64 (short beep)
const ALERT_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZDaG10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrZBhNjxWqauywXk4O1WfrLPDgjk6WZ+ss8F+OTtXn6yzwYE5O1ifrLPCgzk7WJ+ss8ODOjpYn6yzxIM6OlifrLPFhDo6WJ+ss8aFOjpYn6yzx4U6OlifrLLIhTo6WJ+sssmeOjpYn6yzyqA6OlifrLLKoTo6WJ+sssuiOjpYn6yzy6Q6OlifrLLLpjo6WJ+ssss=';

export const WhaleWatcherApp: React.FC = () => {
    const [whales, setWhales] = useState<WhaleTx[]>([]);
    const [scanning] = useState(true);
    const [lastBlock, setLastBlock] = useState<number>(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [coinglassStatus, setCoinglassStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [blocksScanned, setBlocksScanned] = useState(0);
    const providerRef = useRef<JsonRpcProvider | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const processedAlerts = useRef<Set<string>>(new Set());

    // Initialize Audio
    useEffect(() => {
        audioRef.current = new Audio(ALERT_SOUND);
        audioRef.current.volume = 0.5;
    }, []);

    // Helper to play sound
    const playAlert = () => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio play failed', e));
        }
    };

    // Coinglass Fetcher
    useEffect(() => {
        const fetchCoinglass = async () => {
            try {
                const res = await fetch('/api/fetch/coinglass-whales');
                if (!res.ok) {
                    setCoinglassStatus('error');
                    return;
                }
                const alerts: any[] = await res.json();

                if (Array.isArray(alerts) && alerts.length > 0) {
                    setCoinglassStatus('ok');
                    let newAlertFound = false;
                    const formattedAlerts: WhaleTx[] = alerts.map(a => {
                        if (!processedAlerts.current.has(a.id)) {
                            processedAlerts.current.add(a.id);
                            newAlertFound = true;
                        }
                        return {
                            id: a.id,
                            value: a.value || a.amount,
                            symbol: a.symbol,
                            from: a.from,
                            to: a.to,
                            timestamp: a.timestamp || Date.now(),
                            type: 'transfer' as TxType,
                            source: 'coinglass' as const,
                            timeAgo: a.time
                        };
                    });

                    if (newAlertFound) {
                        playAlert();
                        setWhales(prev => {
                            const combined = [...formattedAlerts, ...prev];
                            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                            return unique.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
                        });
                    }
                } else if (Array.isArray(alerts)) {
                    setCoinglassStatus('ok'); // No alerts, but API works
                }
            } catch (e) {
                console.error("Coinglass fetch failed", e);
                setCoinglassStatus('error');
            }
        };

        fetchCoinglass();
        const interval = setInterval(fetchCoinglass, 60000);
        return () => clearInterval(interval);
    }, [soundEnabled]);

    // On-Chain Listener
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const provider = new JsonRpcProvider(BSC_RPC);
                providerRef.current = provider;

                // Test connection
                await provider.getBlockNumber();
                setConnectionStatus('connected');

                provider.on('block', async (blockNumber) => {
                    if (!mounted) return;
                    setLastBlock(blockNumber);
                    setBlocksScanned(prev => prev + 1);

                    try {
                        const [block, logs] = await Promise.all([
                            provider.getBlock(blockNumber, true),
                            provider.getLogs({
                                fromBlock: blockNumber,
                                toBlock: blockNumber,
                                topics: [TRANSFER_TOPIC],
                                address: Object.values(TRACKED_TOKENS)
                                    .filter(t => t.address !== 'NATIVE')
                                    .map(t => t.address)
                            })
                        ]);

                        if (!block || !block.prefetchedTransactions) return;

                        const detectedWhales: WhaleTx[] = [];

                        // Scan Native BNB Transfers
                        block.prefetchedTransactions.forEach((tx: any) => {
                            try {
                                const val = parseFloat(formatEther(tx.value));
                                if (val >= TRACKED_TOKENS.BNB.threshold) {
                                    let type: TxType = 'transfer';
                                    if (tx.to && tx.to.toLowerCase() === PANCAKE_ROUTER_V2.toLowerCase()) {
                                        type = 'buy';
                                    }

                                    const id = `${tx.hash}-native`;
                                    if (!processedAlerts.current.has(id)) {
                                        processedAlerts.current.add(id);
                                        detectedWhales.push({
                                            id,
                                            hash: tx.hash,
                                            value: val.toFixed(2),
                                            symbol: 'BNB',
                                            from: tx.from,
                                            to: tx.to,
                                            timestamp: Date.now(),
                                            type,
                                            source: 'onchain'
                                        });
                                    }
                                }
                            } catch (e) { /* ignore */ }
                        });

                        // Scan Token Logs
                        const txsMap = new Map<string, any>();
                        block.prefetchedTransactions.forEach((tx: any) => txsMap.set(tx.hash, tx));

                        logs.forEach((log: any) => {
                            try {
                                const token = Object.values(TRACKED_TOKENS).find(t => t.address.toLowerCase() === log.address.toLowerCase());
                                if (!token) return;

                                const amount = parseFloat(formatUnits(log.data, token.decimals));
                                if (amount < token.threshold) return;

                                const from = `0x${log.topics[1].slice(26)}`;
                                const to = `0x${log.topics[2].slice(26)}`;

                                let type: TxType = 'transfer';
                                const parentTx = txsMap.get(log.transactionHash);
                                let displaySymbol = token.symbol;

                                if (parentTx && parentTx.to && parentTx.to.toLowerCase() === PANCAKE_ROUTER_V2.toLowerCase()) {
                                    if (from.toLowerCase() === parentTx.from.toLowerCase()) {
                                        type = 'sell';
                                    } else if (to.toLowerCase() === parentTx.from.toLowerCase()) {
                                        type = 'buy';
                                    }
                                    if (token.symbol === 'WBNB') {
                                        displaySymbol = 'TOKEN/BNB';
                                    }
                                }

                                const id = `${log.transactionHash}-${token.symbol}`;
                                if (!processedAlerts.current.has(id)) {
                                    processedAlerts.current.add(id);
                                    detectedWhales.push({
                                        id,
                                        hash: log.transactionHash,
                                        value: amount.toFixed(2),
                                        symbol: displaySymbol,
                                        from,
                                        to,
                                        timestamp: Date.now(),
                                        type,
                                        source: 'onchain'
                                    });
                                }
                            } catch (e) { /* decoding error, skip */ }
                        });

                        if (detectedWhales.length > 0 && mounted) {
                            playAlert();
                            setWhales(prev => {
                                const combined = [...detectedWhales, ...prev];
                                return combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
                            });
                        }
                    } catch (e) {
                        console.error("Error scanning block", e);
                    }
                });
            } catch (e) {
                console.error("Connection failed", e);
                setConnectionStatus('error');
            }
        };

        init();

        return () => {
            mounted = false;
            if (providerRef.current) {
                providerRef.current.removeAllListeners();
            }
        };
    }, [soundEnabled]);

    const getTypeIcon = (type: TxType) => {
        switch (type) {
            case 'buy': return <TrendingUp size={18} className="text-green-400" />;
            case 'sell': return <TrendingDown size={18} className="text-red-400" />;
            default: return <ArrowRightLeft size={18} className="text-blue-400" />;
        }
    };

    const getTypeColor = (type: TxType) => {
        switch (type) {
            case 'buy': return 'border-green-500/30 bg-green-900/10 text-green-400';
            case 'sell': return 'border-red-500/30 bg-red-900/10 text-red-400';
            default: return 'border-cyan-500/20 bg-black/40 text-cyan-300';
        }
    };

    return (
        <div className="h-full w-full bg-slate-900 text-cyan-500 font-mono flex flex-col overflow-hidden relative">
            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,255,255,0.5)_360deg)] animate-spin-slow rounded-full opacity-10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0f172a_70%)]" />
            </div>

            {/* Header */}
            <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-slate-900/80 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                    <Radar className={`text-cyan-400 ${scanning ? 'animate-spin-reverse-slow' : ''}`} size={24} />
                    <div>
                        <h1 className="text-xl font-bold text-cyan-100 tracking-wider">WHALE RADAR</h1>
                        <div className="text-[10px] text-cyan-400/70 flex items-center gap-2">
                            BLOCK #{lastBlock} | {blocksScanned} scanned
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        </div>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                    {/* Status Indicators */}
                    <div className="flex gap-2 items-center text-[10px]">
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${connectionStatus === 'connected' ? 'bg-green-900/30 text-green-400' : connectionStatus === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                            {connectionStatus === 'connected' ? <Wifi size={10} /> : connectionStatus === 'error' ? <WifiOff size={10} /> : <Wifi size={10} className="animate-pulse" />}
                            RPC
                        </div>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${coinglassStatus === 'ok' ? 'bg-green-900/30 text-green-400' : coinglassStatus === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                            {coinglassStatus === 'error' ? <AlertTriangle size={10} /> : null}
                            CG
                        </div>
                    </div>
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`text-[10px] px-2 py-1 rounded border ${soundEnabled ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}
                    >
                        🔊 {soundEnabled ? 'ON' : 'OFF'}
                    </button>
                    <div className="flex gap-1 flex-wrap justify-end">
                        {Object.values(TRACKED_TOKENS).map(t => (
                            <span key={t.symbol} className="text-[9px] bg-cyan-900/30 px-1 rounded text-cyan-300 border border-cyan-500/20">
                                {t.symbol} ≥{t.threshold}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {whales.map((tx) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={`p-3 rounded-lg relative overflow-hidden transition-colors group border ${getTypeColor(tx.type)}`}
                        >
                            {/* Alert Source Badge */}
                            {tx.source === 'coinglass' && (
                                <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded-bl">
                                    GLOBAL
                                </div>
                            )}
                            {tx.source === 'onchain' && (
                                <div className="absolute top-0 right-0 bg-cyan-500/20 text-cyan-400 text-[9px] px-1.5 py-0.5 rounded-bl">
                                    BSC
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 font-bold text-lg">
                                    {getTypeIcon(tx.type)}
                                    <span className={tx.type === 'buy' ? 'text-green-100' : tx.type === 'sell' ? 'text-red-100' : 'text-white'}>
                                        {tx.type === 'buy' ? 'BUY' : tx.type === 'sell' ? 'SELL' : 'MOVE'} {tx.value} {tx.symbol}
                                    </span>
                                </div>
                                <div className="text-[10px] opacity-50 font-mono mt-4">
                                    {tx.timeAgo ? tx.timeAgo : new Date(tx.timestamp).toLocaleTimeString()}
                                </div>
                            </div>

                            <div className="space-y-1 text-xs font-mono opacity-70">
                                <div className="flex justify-between">
                                    <span>FROM:</span>
                                    <span className="truncate w-32 text-right" title={tx.from}>{tx.from?.slice(0, 6)}...{tx.from?.slice(-4) || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>TO:</span>
                                    <span className="truncate w-32 text-right" title={tx.to}>{tx.to?.slice(0, 6)}...{tx.to?.slice(-4) || 'Unknown'}</span>
                                </div>
                                {tx.hash && (
                                    <a
                                        href={`https://bscscan.com/tx/${tx.hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="pt-2 text-[10px] text-cyan-400 hover:underline block"
                                    >
                                        View on BSCScan →
                                    </a>
                                )}
                            </div>

                            {/* Ping Effect on new item */}
                            <motion.div
                                initial={{ opacity: 0.5, scale: 0 }}
                                animate={{ opacity: 0, scale: 20 }}
                                transition={{ duration: 1 }}
                                className={`absolute top-1/2 left-1/2 w-4 h-4 rounded-full pointer-events-none ${tx.type === 'buy' ? 'bg-green-400' : tx.type === 'sell' ? 'bg-red-400' : 'bg-blue-400'}`}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {whales.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-cyan-500/30 gap-4 mt-20">
                        <Target size={48} className="animate-pulse opacity-50" />
                        <div className="text-center">
                            <p>SCANNING FOR TARGETS...</p>
                            <p className="text-xs mt-2">Monitoring {Object.keys(TRACKED_TOKENS).length} tokens on BSC</p>
                            <p className="text-[10px] mt-1 opacity-50">Large transfers will appear here in real-time</p>
                            {connectionStatus === 'error' && (
                                <p className="text-red-400 text-xs mt-4">⚠️ RPC Connection Failed</p>
                            )}
                            {coinglassStatus === 'error' && (
                                <p className="text-yellow-400 text-xs mt-2">⚠️ Global Alerts Unavailable</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
