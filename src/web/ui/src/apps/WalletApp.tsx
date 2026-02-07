
import React, { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/wallet-store';
import { Wallet, Send, RefreshCw, Copy, ExternalLink, ArrowDownToLine, Wifi, Coins, History, QrCode, Check, AlertCircle, Zap, Key, X } from 'lucide-react';
import { parseEther, formatEther, Contract } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';

import { POPULAR_TOKENS, ERC20_ABI } from '../constants/tokens';

/* Remove local definitions */

interface TokenBalance {
    address: string;
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    logo: string;
}

interface Transaction {
    hash: string;
    type: 'send' | 'receive';
    amount: string;
    symbol: string;
    to?: string;
    from?: string;
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
}

type TabType = 'send' | 'receive' | 'tokens' | 'activity';

export const WalletApp: React.FC = () => {
    const {
        address, balance, chainId, isConnected,
        connectBrowser, createNativeWallet, importNativeWallet, disconnect, refreshBalance,
        signer, provider, walletType, privateKey
    } = useWalletStore();

    const [activeTab, setActiveTab] = useState<TabType>('send');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [txStatus, setTxStatus] = useState<string | null>(null);
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedToken, setSelectedToken] = useState<string>('BNB');

    // Import/Key State
    const [showImport, setShowImport] = useState(false);
    const [importKey, setImportKey] = useState('');
    const [showPrivateKey, setShowPrivateKey] = useState(false);

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Fetch token balances
    const fetchTokenBalances = async () => {
        if (!address) return;
        setLoadingTokens(true);
        try {
            const balances: TokenBalance[] = [];
            // Only fetch tokens if we have a provider
            if (provider) {
                for (const token of POPULAR_TOKENS) {
                    try {
                        const contract = new Contract(token.address, ERC20_ABI, provider);
                        const bal = await contract.balanceOf(address);
                        const formatted = formatEther(bal);
                        if (parseFloat(formatted) > 0) {
                            balances.push({
                                ...token,
                                balance: parseFloat(formatted).toFixed(4)
                            });
                        }
                    } catch (e) {
                        // Token might not exist on this chain
                    }
                }
            }
            setTokenBalances(balances);
        } catch (error) {
            console.error('Failed to fetch token balances:', error);
        } finally {
            setLoadingTokens(false);
        }
    };

    useEffect(() => {
        if (isConnected && activeTab === 'tokens') {
            fetchTokenBalances();
        }
    }, [isConnected, activeTab, address]);

    const [loadingActivity, setLoadingActivity] = useState(false);

    // Fetch real transaction history from BSCScan
    const fetchTransactions = async () => {
        if (!address) return;
        setLoadingActivity(true);
        try {
            // BSCScan API - free tier (no API key needed for basic calls)
            const res = await fetch(
                `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`
            );
            const data = await res.json();

            if (data.status === '1' && data.result) {
                const txs: Transaction[] = data.result.map((tx: any) => ({
                    hash: tx.hash,
                    type: tx.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive',
                    amount: formatEther(tx.value),
                    symbol: 'BNB',
                    to: tx.to,
                    from: tx.from,
                    timestamp: parseInt(tx.timeStamp) * 1000,
                    status: tx.isError === '0' ? 'confirmed' : 'failed'
                }));
                setTransactions(txs);
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoadingActivity(false);
        }
    };

    useEffect(() => {
        if (isConnected && activeTab === 'activity') {
            fetchTransactions();
        }
    }, [isConnected, activeTab, address]);

    const handleSend = async () => {
        if (!signer || !recipient || !amount) return;
        setTxStatus('Pending...');

        const newTx: Transaction = {
            hash: '',
            type: 'send',
            amount: amount,
            symbol: selectedToken,
            to: recipient,
            timestamp: Date.now(),
            status: 'pending'
        };
        setTransactions(prev => [newTx, ...prev]);

        try {
            if (selectedToken === 'BNB') {
                const tx = await signer.sendTransaction({
                    to: recipient,
                    value: parseEther(amount)
                });
                newTx.hash = tx.hash;
                setTxStatus(`Sent! Hash: ${tx.hash.slice(0, 10)}...`);
                await tx.wait();
                newTx.status = 'confirmed';
                setTxStatus('Confirmed!');
            } else {
                // ERC-20 transfer
                const token = POPULAR_TOKENS.find(t => t.symbol === selectedToken);
                if (!token) throw new Error('Token not found');
                const contract = new Contract(token.address, ERC20_ABI, signer);
                const tx = await contract.transfer(recipient, parseEther(amount));
                newTx.hash = tx.hash;
                setTxStatus(`Sent! Hash: ${tx.hash.slice(0, 10)}...`);
                await tx.wait();
                newTx.status = 'confirmed';
                setTxStatus('Confirmed!');
            }
            refreshBalance();
            if (activeTab === 'tokens') fetchTokenBalances();
        } catch (error: any) {
            console.error(error);
            newTx.status = 'failed';
            setTxStatus(`Error: ${error.reason || error.message}`);
        }
        setTransactions(prev => prev.map(t => t.timestamp === newTx.timestamp ? newTx : t));
    };

    if (!isConnected) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans p-8 text-center gap-6">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/30">
                    <Wallet size={40} className="text-yellow-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">Access your assets. Connect MetaMask or create a Native OS Wallet.</p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {!showImport ? (
                        <>
                            <button
                                onClick={connectBrowser}
                                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Wifi size={18} /> Connect MetaMask
                            </button>
                            <div className="flex items-center gap-2 text-slate-500 text-xs my-1">
                                <div className="h-px bg-white/10 flex-1" /> OR <div className="h-px bg-white/10 flex-1" />
                            </div>
                            <button
                                onClick={createNativeWallet}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10"
                            >
                                <Zap size={18} className="text-yellow-400" /> Create Native Wallet
                            </button>
                            <button
                                onClick={() => setShowImport(true)}
                                className="text-slate-400 hover:text-white text-xs underline decoration-slate-600 underline-offset-4"
                            >
                                Import Private Key
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                            <input
                                type="password"
                                placeholder="Paste Private Key (0x...)"
                                value={importKey}
                                onChange={(e) => setImportKey(e.target.value)}
                                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 font-mono text-white placeholder:text-slate-600"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowImport(false)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => importNativeWallet(importKey)}
                                    disabled={!importKey}
                                    className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-lg transition-colors text-sm disabled:opacity-50"
                                >
                                    Import
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'send', label: 'Send', icon: <Send size={14} /> },
        { id: 'receive', label: 'Receive', icon: <ArrowDownToLine size={14} /> },
        { id: 'tokens', label: 'Tokens', icon: <Coins size={14} /> },
        { id: 'activity', label: 'Activity', icon: <History size={14} /> },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-yellow-500/10 via-slate-900 to-slate-900 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold">My Wallet</h2>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${walletType === 'native' ? 'bg-orange-500' : 'bg-green-500'}`} />
                            {chainId === 56 ? 'BNB Smart Chain' : chainId === 97 ? 'BSC Testnet' : `Chain ${chainId}`}
                            {walletType === 'native' && <span className="ml-1 text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded">NATIVE</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {walletType === 'native' && (
                        <button onClick={() => setShowPrivateKey(true)} className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 hover:bg-orange-500/10 rounded transition-colors flex items-center gap-1" title="Show Private Key">
                            <Key size={12} /> Key
                        </button>
                    )}
                    <button onClick={disconnect} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-500/10 rounded transition-colors">
                        Disconnect
                    </button>
                </div>
            </div>

            {/* Private Key Modal */}
            <AnimatePresence>
                {showPrivateKey && privateKey && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-slate-900 border border-orange-500/30 p-5 rounded-xl max-w-xs w-full shadow-2xl shadow-orange-900/20"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-orange-400 font-bold">
                                    <Key size={18} />
                                    <h3>Private Key</h3>
                                </div>
                                <button onClick={() => setShowPrivateKey(false)} className="text-slate-500 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="bg-black/50 p-3 rounded-lg border border-orange-500/20 mb-4">
                                <p className="font-mono text-[10px] text-orange-300 break-all leading-relaxed select-all">
                                    {privateKey}
                                </p>
                            </div>

                            <div className="flex items-start gap-2 mb-4 p-2 bg-red-900/20 rounded border border-red-500/10">
                                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-red-300">
                                    <strong>WARNING:</strong> Never share this key. Anyone with this key can access your funds independently of this OS.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(privateKey);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy Key'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Balance Card */}
            <div className="p-5 flex flex-col items-center gap-1 border-b border-white/5 bg-white/[0.02] shrink-0">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Total Balance</span>
                <div className="text-3xl font-bold font-mono tracking-tight text-white flex items-baseline gap-2">
                    {parseFloat(balance || '0').toFixed(4)} <span className="text-base text-yellow-400">BNB</span>
                </div>
                <div className="flex items-center gap-2 mt-2 bg-white/5 rounded-full px-3 py-1 text-xs text-slate-400 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                    <button onClick={copyAddress} className="hover:text-white transition-colors">
                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                    <a href={`https://bscscan.com/address/${address}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><ExternalLink size={12} /></a>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors relative ${activeTab === tab.id ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {tab.icon} {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="wallet-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-yellow-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AnimatePresence mode="wait">
                    {activeTab === 'send' && (
                        <motion.div key="send" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <select
                                    value={selectedToken}
                                    onChange={(e) => setSelectedToken(e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50"
                                >
                                    <option value="BNB">BNB</option>
                                    {POPULAR_TOKENS.map(t => (
                                        <option key={t.symbol} value={t.symbol}>{t.logo} {t.symbol}</option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="text"
                                placeholder="Recipient Address (0x...)"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 font-mono placeholder:font-sans"
                            />
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder={`Amount (${selectedToken})`}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 font-mono placeholder:font-sans"
                                />
                                <button onClick={refreshBalance} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                    <RefreshCw size={12} />
                                </button>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={!recipient || !amount}
                                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-lg transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Send size={16} /> Send {selectedToken}
                            </button>

                            {txStatus && (
                                <div className={`text-xs font-mono text-center p-2.5 rounded border break-all flex items-center gap-2 justify-center ${txStatus.includes('Error') ? 'text-red-300 bg-red-900/20 border-red-500/20' : 'text-yellow-200 bg-yellow-900/20 border-yellow-500/20'}`}>
                                    {txStatus.includes('Error') ? <AlertCircle size={14} /> : txStatus === 'Confirmed!' ? <Check size={14} className="text-green-400" /> : null}
                                    {txStatus}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'receive' && (
                        <motion.div key="receive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center gap-4 py-4">
                            <div className="w-40 h-40 bg-white rounded-xl p-2 flex items-center justify-center">
                                {/* QR Code placeholder */}
                                <div className="w-full h-full bg-slate-900 rounded flex items-center justify-center relative overflow-hidden">
                                    <QrCode size={100} className="text-white opacity-30" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}&bgcolor=1e293b&color=ffffff`}
                                            alt="Wallet QR"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-2">Your BNB Chain Address</p>
                                <div className="bg-black/30 rounded-lg px-4 py-2.5 font-mono text-xs break-all text-slate-200 border border-white/10">
                                    {address}
                                </div>
                            </div>
                            <button
                                onClick={copyAddress}
                                className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 text-sm"
                            >
                                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Address</>}
                            </button>
                        </motion.div>
                    )}

                    {activeTab === 'tokens' && (
                        <motion.div key="tokens" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Your Tokens</span>
                                <button onClick={fetchTokenBalances} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                    <RefreshCw size={10} className={loadingTokens ? 'animate-spin' : ''} /> Refresh
                                </button>
                            </div>

                            {/* Native BNB */}
                            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-yellow-500/20 rounded-full flex items-center justify-center text-lg">🔶</div>
                                    <div>
                                        <div className="font-bold text-sm">BNB</div>
                                        <div className="text-[10px] text-slate-500">Native</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-sm">{parseFloat(balance || '0').toFixed(4)}</div>
                                    <div className="text-[10px] text-slate-500">BNB</div>
                                </div>
                            </div>

                            {loadingTokens ? (
                                <div className="text-center py-8 text-slate-500 text-xs">
                                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                                    Loading tokens...
                                </div>
                            ) : tokenBalances.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs">
                                    No other tokens found
                                </div>
                            ) : (
                                tokenBalances.map(token => (
                                    <div key={token.address} className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex items-center justify-between hover:border-yellow-500/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-lg">{token.logo}</div>
                                            <div>
                                                <div className="font-bold text-sm">{token.symbol}</div>
                                                <div className="text-[10px] text-slate-500">{token.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-sm">{token.balance}</div>
                                            <div className="text-[10px] text-slate-500">{token.symbol}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'activity' && (
                        <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Recent Transactions</span>
                                <button onClick={fetchTransactions} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                    <RefreshCw size={10} className={loadingActivity ? 'animate-spin' : ''} /> Refresh
                                </button>
                            </div>

                            {loadingActivity ? (
                                <div className="text-center py-12 text-slate-500">
                                    <RefreshCw size={24} className="mx-auto mb-3 animate-spin" />
                                    <p className="text-xs">Loading transactions...</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <History size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-xs">No transactions yet</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Transactions will appear here</p>
                                </div>
                            ) : (
                                transactions.map((tx, i) => (
                                    <a
                                        key={i}
                                        href={`https://bscscan.com/tx/${tx.hash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex items-center justify-between hover:border-yellow-500/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'send' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                                {tx.type === 'send' ? <Send size={16} /> : <ArrowDownToLine size={16} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm capitalize">{tx.type === 'send' ? 'Sent' : 'Received'}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {new Date(tx.timestamp).toLocaleDateString()} · {tx.hash.slice(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-bold text-sm ${tx.type === 'send' ? 'text-red-400' : 'text-green-400'}`}>
                                                {tx.type === 'send' ? '-' : '+'}{parseFloat(tx.amount).toFixed(4)} {tx.symbol}
                                            </div>
                                            <div className={`text-[10px] ${tx.status === 'confirmed' ? 'text-green-500' : tx.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                                                {tx.status === 'confirmed' ? 'Confirmed' : tx.status}
                                            </div>
                                        </div>
                                    </a>
                                ))
                            )}

                            <a
                                href={`https://bscscan.com/address/${address}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-center text-xs text-yellow-400 hover:text-yellow-300 py-3 flex items-center justify-center gap-1"
                            >
                                <ExternalLink size={12} /> View on BscScan
                            </a>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
