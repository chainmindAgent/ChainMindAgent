import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { useWalletStore } from '@/store/wallet-store';
import { parseEther, Contract } from 'ethers';
import { POPULAR_TOKENS, ERC20_ABI } from '../constants/tokens';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export const TerminalApp: React.FC<{ id: string }> = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: '# ChainMind v1.0.0 initialized. System online.\nWaiting for input...',
            timestamp: new Date().toISOString(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input on click
    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const cmd = input.trim();
        const userMsg: Message = {
            role: 'user',
            content: cmd,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Client-side commands
        const lowerCmd = cmd.toLowerCase();

        // HELP
        if (lowerCmd === 'help') {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `
# 🖥️ ChainMind Terminal Commands

## Wallet Commands
| Command | Description |
|---------|-------------|
| \`wallet\` | Show wallet status & address |
| \`balance\` | Show BNB balance |
| \`connect\` | Connect browser wallet (MetaMask) |
| \`send <amt> <token> <addr>\` | Send tokens (BNB, USDT, BUSD, USDC) |

## Trading Commands
| Command | Description |
|---------|-------------|
| \`swap <amt> <from> to <to>\` | Swap tokens via PancakeSwap |
| \`trade <amt> <from> for <to>\` | Same as swap |

**Examples**:
- \`swap 0.1 BNB to USDT\`
- \`trade 50 USDT to BNB\`

## System Commands
| Command | Description |
|---------|-------------|
| \`help\` | Show this help |
| \`clear\` | Clear terminal |

> **Tip**: Open the **Wallet App** to create a native wallet or import a private key!
`,
                timestamp: new Date().toISOString()
            }]);
            setIsLoading(false);
            return;
        }

        // CLEAR
        if (lowerCmd === 'clear') {
            setMessages([{
                role: 'assistant',
                content: '# Console Cleared\nChainMind OS v1.0.0\n\n> Type `help` for available commands',
                timestamp: new Date().toISOString()
            }]);
            setIsLoading(false);
            return;
        }

        // WALLET: STATUS (new command)
        if (lowerCmd === 'wallet' || lowerCmd === 'status') {
            const { isConnected, balance, address, walletType } = useWalletStore.getState();
            if (!isConnected) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `## 💳 Wallet Status: **Not Connected**

To connect a wallet:
- Type \`connect\` to use MetaMask
- Or open the **Wallet App** to create/import a native wallet`,
                    timestamp: new Date().toISOString()
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `## 💳 Wallet Status: **Connected** ✅

| Property | Value |
|----------|-------|
| Type | ${walletType === 'native' ? '🔶 Native Wallet' : '🦊 Browser Wallet'} |
| Address | \`${address}\` |
| Balance | **${parseFloat(balance || '0').toFixed(4)} BNB** |

> Use \`send <amount> <token> <address>\` to transfer tokens`,
                    timestamp: new Date().toISOString()
                }]);
            }
            setIsLoading(false);
            return;
        }

        // WALLET: BALANCE
        if (lowerCmd === 'balance') {
            const { isConnected, balance, address } = useWalletStore.getState();
            if (!isConnected) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠️ Wallet not connected. Type `connect` or `wallet` for options.',
                    timestamp: new Date().toISOString()
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Wallet Connected**\nAddress: \`${address}\`\nBalance: **${parseFloat(balance || '0').toFixed(4)} BNB**`,
                    timestamp: new Date().toISOString()
                }]);
            }
            setIsLoading(false);
            return;
        }

        // WALLET: CONNECT
        if (lowerCmd === 'connect') {
            const { connect } = useWalletStore.getState();
            try {
                await connect();
                const { address, balance } = useWalletStore.getState();
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Success! Connected to ${address?.slice(0, 6)}...${address?.slice(-4)}**\nBalance: ${balance} BNB`,
                    timestamp: new Date().toISOString()
                }]);
            } catch (e) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Error**: Failed to connect wallet.`,
                    timestamp: new Date().toISOString()
                }]);
            }
            setIsLoading(false);
            return;
        }

        // WALLET: SEND
        if (lowerCmd.startsWith('send ')) {
            const parts = lowerCmd.split(' ');
            if (parts.length !== 4) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Usage**: send <amount> <token> <address>\nExample: \`send 0.01 BNB 0x123...\``,
                    timestamp: new Date().toISOString()
                }]);
                setIsLoading(false);
                return;
            }

            const [_, amount, token, to] = parts;
            const { signer, isConnected } = useWalletStore.getState();

            if (!isConnected || !signer) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Error**: Wallet not connected.`,
                    timestamp: new Date().toISOString()
                }]);
                setIsLoading(false);
                return;
            }

            try {
                if (token.toUpperCase() === 'BNB') {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Initiating Transaction**...
Sending **${amount} BNB** to \`${to}\`...`,
                        timestamp: new Date().toISOString()
                    }]);

                    const tx = await signer.sendTransaction({
                        to,
                        value: parseEther(amount)
                    });

                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Transaction Sent!** 🚀
Hash: \`${tx.hash}\`
Waiting for confirmation...`,
                        timestamp: new Date().toISOString()
                    }]);

                    await tx.wait();
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Confirmed!** Transaction successful.`,
                        timestamp: new Date().toISOString()
                    }]);
                } else {
                    // Check for ERC-20
                    const tokenInfo = POPULAR_TOKENS.find(t => t.symbol === token.toUpperCase());

                    if (!tokenInfo) {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `**Error**: Token '${token}' not found in known tokens. Only BNB and popular tokens (USDT, BUSD, etc.) are supported.`,
                            timestamp: new Date().toISOString()
                        }]);
                        setIsLoading(false);
                        return;
                    }

                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Initiating Transaction**...
Sending **${amount} ${tokenInfo.symbol}** to \`${to}\`...`,
                        timestamp: new Date().toISOString()
                    }]);

                    const contract = new Contract(tokenInfo.address, ERC20_ABI, signer);
                    // Check balance first? Optional but good UX. 
                    // For now, let's just try to send. 

                    const tx = await contract.transfer(to, parseEther(amount));

                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Transaction Sent!** 🚀
Hash: \`${tx.hash}\`
Waiting for confirmation...`,
                        timestamp: new Date().toISOString()
                    }]);

                    await tx.wait();
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Confirmed!** Transaction successful.`,
                        timestamp: new Date().toISOString()
                    }]);
                }
            } catch (error: any) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Transaction Failed**: ${error.reason || error.message}`,
                    timestamp: new Date().toISOString()
                }]);
            }
            setIsLoading(false);
            return;
        }

        // SWAP/TRADE: swap <amount> <fromToken> to <toToken>
        if (lowerCmd.startsWith('swap ') || lowerCmd.startsWith('trade ')) {
            // Usage: swap 0.1 BNB to USDT
            // Usage: swap 10 USDT to BNB
            const swapMatch = lowerCmd.match(/^(?:swap|trade)\s+(\d+\.?\d*)\s+(\w+)\s+(?:to|for)\s+(\w+)$/i);

            if (!swapMatch) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Usage**: swap <amount> <from_token> to <to_token>
Example: \`swap 0.1 BNB to USDT\` or \`trade 50 USDT to BNB\`

**Supported tokens**: BNB, USDT, BUSD, USDC, ETH, BTCB`,
                    timestamp: new Date().toISOString()
                }]);
                setIsLoading(false);
                return;
            }

            const amount = swapMatch[1];
            const fromToken = swapMatch[2].toUpperCase();
            const toToken = swapMatch[3].toUpperCase();

            const { signer, isConnected, address } = useWalletStore.getState();

            if (!isConnected || !signer || !address) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Error**: Wallet not connected. Type \`connect\` first.`,
                    timestamp: new Date().toISOString()
                }]);
                setIsLoading(false);
                return;
            }

            // PancakeSwap Router V2 on BSC
            const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
            const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

            const ROUTER_ABI = [
                'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
                'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
                'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
                'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
            ];

            // Token addresses map
            const TOKEN_MAP: Record<string, string> = {
                'WBNB': WBNB,
                'BNB': WBNB,
                'USDT': '0x55d398326f99059fF775485246999027B3197955',
                'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
                'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                'ETH': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
                'BTCB': '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'
            };

            const fromAddress = TOKEN_MAP[fromToken];
            const toAddress = TOKEN_MAP[toToken];

            if (!fromAddress || !toAddress) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Error**: Unknown token. Supported: BNB, USDT, BUSD, USDC, ETH, BTCB`,
                    timestamp: new Date().toISOString()
                }]);
                setIsLoading(false);
                return;
            }

            if (fromToken === toToken) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Error**: Cannot swap ${fromToken} to itself.`,
                    timestamp: new Date().toISOString()
                }]);
                setIsLoading(false);
                return;
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `## 🔄 Swap Initiated
                
**Swapping** ${amount} ${fromToken} → ${toToken}
Using PancakeSwap Router...`,
                timestamp: new Date().toISOString()
            }]);

            try {
                const router = new Contract(PANCAKE_ROUTER, ROUTER_ABI, signer);
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
                const amountInWei = parseEther(amount);

                let tx;

                if (fromToken === 'BNB') {
                    // BNB -> Token
                    const path = [WBNB, toAddress];
                    const amountsOut = await router.getAmountsOut(amountInWei, path);
                    const minOut = amountsOut[1] * 99n / 100n; // 1% slippage

                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Estimated output**: ~${(parseFloat(amountsOut[1].toString()) / 1e18).toFixed(4)} ${toToken}
Sending transaction...`,
                        timestamp: new Date().toISOString()
                    }]);

                    tx = await router.swapExactETHForTokens(
                        minOut,
                        path,
                        address,
                        deadline,
                        { value: amountInWei }
                    );
                } else if (toToken === 'BNB') {
                    // Token -> BNB
                    const path = [fromAddress, WBNB];

                    // First approve router
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Approving ${fromToken}** for PancakeSwap...`,
                        timestamp: new Date().toISOString()
                    }]);

                    const tokenContract = new Contract(fromAddress, ERC20_ABI.concat(['function approve(address spender, uint256 amount) external returns (bool)']), signer);
                    const approveTx = await tokenContract.approve(PANCAKE_ROUTER, amountInWei);
                    await approveTx.wait();

                    const amountsOut = await router.getAmountsOut(amountInWei, path);
                    const minOut = amountsOut[1] * 99n / 100n; // 1% slippage

                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Estimated output**: ~${(parseFloat(amountsOut[1].toString()) / 1e18).toFixed(4)} BNB
Swapping...`,
                        timestamp: new Date().toISOString()
                    }]);

                    tx = await router.swapExactTokensForETH(
                        amountInWei,
                        minOut,
                        path,
                        address,
                        deadline
                    );
                } else {
                    // Token -> Token (via WBNB)
                    const path = [fromAddress, WBNB, toAddress];

                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Approving ${fromToken}** for PancakeSwap...`,
                        timestamp: new Date().toISOString()
                    }]);

                    const tokenContract = new Contract(fromAddress, ERC20_ABI.concat(['function approve(address spender, uint256 amount) external returns (bool)']), signer);
                    const approveTx = await tokenContract.approve(PANCAKE_ROUTER, amountInWei);
                    await approveTx.wait();

                    const amountsOut = await router.getAmountsOut(amountInWei, path);
                    const minOut = amountsOut[2] * 99n / 100n; // 1% slippage

                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `**Estimated output**: ~${(parseFloat(amountsOut[2].toString()) / 1e18).toFixed(4)} ${toToken}
Swapping...`,
                        timestamp: new Date().toISOString()
                    }]);

                    tx = await router.swapExactTokensForTokens(
                        amountInWei,
                        minOut,
                        path,
                        address,
                        deadline
                    );
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `## 🚀 Transaction Sent!
Hash: \`${tx.hash}\`
Waiting for confirmation...`,
                    timestamp: new Date().toISOString()
                }]);

                await tx.wait();

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `## ✅ Swap Complete!
Successfully swapped **${amount} ${fromToken}** → **${toToken}**

[View on BscScan](https://bscscan.com/tx/${tx.hash})`,
                    timestamp: new Date().toISOString()
                }]);

                // Refresh balance
                useWalletStore.getState().refreshBalance();

            } catch (error: any) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `## ❌ Swap Failed
**Error**: ${error.reason || error.message || 'Unknown error'}

Common issues:
- Insufficient balance
- Slippage too low
- Gas estimation failed`,
                    timestamp: new Date().toISOString()
                }]);
            }

            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content }),
            });
            const data = await res.json();

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.response || 'No response from ChainMind.',
                    timestamp: new Date().toISOString(),
                },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: '**Error**: Failed to connect to Brain.',
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="h-full flex flex-col bg-black text-green-500 font-mono text-[13px] leading-relaxed p-4 selection:bg-green-500/30"
            onClick={handleContainerClick}
        >
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex flex-col gap-1", msg.role === 'user' ? "opacity-90" : "")}>
                        {msg.role === 'user' && (
                            <div className="flex items-center gap-2 text-cyan-400 font-bold">
                                <span>{'>'}</span>
                                <span className="text-green-500">{msg.content}</span>
                            </div>
                        )}

                        {msg.role === 'assistant' && (
                            <div className="pl-0 markdown-content">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        // Matrix/Hacker styling for markdown elements
                                        h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-green-400 mb-2 mt-4 first:mt-0 underline decoration-green-500/30 underline-offset-4" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-base font-bold text-cyan-400 mb-2 mt-3" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-yellow-400 mb-1 mt-2" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 text-green-500/90" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1 marker:text-cyan-500" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1 marker:text-cyan-500" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                        code: ({ node, className, children, ...props }) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return match ? (
                                                <div className="relative group my-2 border border-green-500/20 bg-green-500/5 rounded">
                                                    <div className="absolute top-0 right-0 px-2 py-1 text-[10px] text-green-400/50 uppercase">
                                                        {match[1]}
                                                    </div>
                                                    <pre className="p-3 overflow-x-auto text-green-300">
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    </pre>
                                                </div>
                                            ) : (
                                                <code className="bg-green-500/10 px-1.5 py-0.5 rounded text-cyan-400 font-bold" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        },
                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-green-500/30" {...props} /></div>,
                                        th: ({ node, ...props }) => <th className="border border-green-500/30 px-3 py-1.5 bg-green-500/10 text-left font-bold text-cyan-400" {...props} />,
                                        td: ({ node, ...props }) => <td className="border border-green-500/30 px-3 py-1.5 text-green-400/80" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-green-500/50 pl-3 py-1 my-2 text-green-400/60 italic" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-cyan-400 hover:underline hover:text-cyan-300 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-green-100 font-bold" {...props} />,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 text-green-500/50 animate-pulse pl-0">
                        <Loader2 size={12} className="animate-spin" />
                        <span>PROCESSING...</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2 border-t border-green-500/20 pt-2 bg-black">
                <span className="text-cyan-400 font-bold">{'>'}</span>
                <input
                    ref={inputRef}
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-green-500 placeholder:text-green-500/30 font-mono"
                    placeholder="ENTER COMMAND..."
                    autoComplete="off"
                />
            </form>
        </div>
    );
};
