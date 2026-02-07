
import React, { useEffect, useRef, useState } from 'react';
import { useWalletStore } from '@/store/wallet-store';
import { JsonRpcProvider, formatEther, parseEther, parseUnits } from 'ethers';
import { Wallet, AlertTriangle, Key, ExternalLink } from 'lucide-react';

interface NativeWebAppProps {
    url: string;
}

const WALLET_BRIDGE_SCRIPT = `
(function() {
    if (window.parent === window) return;
    if (window.__chainmindInjected) return;
    window.__chainmindInjected = true;
    
    let chainId = '0x38';
    let selectedAddress = null;
    
    const provider = {
        isMetaMask: true,
        isChainMind: true,
        chainId: chainId,
        networkVersion: '56',
        selectedAddress: selectedAddress,
        
        request: async ({ method, params }) => {
            return new Promise((resolve, reject) => {
                const requestId = Date.now() + Math.random();
                
                window.parent.postMessage({
                    type: 'CHAINMIND_WALLET_REQUEST',
                    id: requestId,
                    method,
                    params
                }, '*');
                
                const handler = (event) => {
                    if (event.data?.type === 'CHAINMIND_WALLET_RESPONSE' && event.data?.id === requestId) {
                        window.removeEventListener('message', handler);
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
                                selectedAddress = event.data.result[0];
                                provider.selectedAddress = selectedAddress;
                            }
                            resolve(event.data.result);
                        }
                    }
                };
                window.addEventListener('message', handler);
                
                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    reject(new Error('Request timeout'));
                }, 60000);
            });
        },
        
        enable: async () => provider.request({ method: 'eth_requestAccounts' }),
        
        send: (methodOrPayload, paramsOrCallback) => {
            if (typeof methodOrPayload === 'string') {
                return provider.request({ method: methodOrPayload, params: paramsOrCallback });
            }
            return provider.request({ method: methodOrPayload.method, params: methodOrPayload.params });
        },
        
        sendAsync: (payload, callback) => {
            provider.request({ method: payload.method, params: payload.params })
                .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
                .catch(error => callback(error, null));
        },
        
        _events: {},
        on: (event, callback) => {
            if (!provider._events[event]) provider._events[event] = [];
            provider._events[event].push(callback);
            return provider;
        },
        removeListener: (event, callback) => {
            if (provider._events[event]) {
                provider._events[event] = provider._events[event].filter(cb => cb !== callback);
            }
            return provider;
        },
        emit: (event, ...args) => {
            if (provider._events[event]) {
                provider._events[event].forEach(callback => callback(...args));
            }
        }
    };
    
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'CHAINMIND_WALLET_EVENT') {
            const { eventName, data } = event.data;
            if (eventName === 'accountsChanged') {
                selectedAddress = data[0] || null;
                provider.selectedAddress = selectedAddress;
                provider.emit('accountsChanged', data);
            } else if (eventName === 'chainChanged') {
                provider.chainId = data;
                provider.emit('chainChanged', data);
            } else if (eventName === 'connect') {
                provider.emit('connect', { chainId: provider.chainId });
            }
        }
    });
    
    Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: false,
        configurable: false
    });
    
    console.log('[ChainMind] Wallet provider injected into dApp');
})();
`;

export const NativeWebApp: React.FC<NativeWebAppProps> = ({ url }) => {
    const { address, chainId, signer, isConnected, privateKey } = useWalletStore();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [showWalletTip, setShowWalletTip] = useState(false);
    const [pendingRequest, setPendingRequest] = useState<any>(null);

    // Handle wallet requests from iframe
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type !== 'CHAINMIND_WALLET_REQUEST') return;

            const { id, method, params } = event.data;
            const iframe = iframeRef.current;
            if (!iframe?.contentWindow) return;

            try {
                let result: any;

                switch (method) {
                    case 'eth_requestAccounts':
                    case 'eth_accounts':
                        if (!isConnected || !address) {
                            setShowWalletTip(true);
                            throw new Error('Wallet not connected. Please connect your wallet in ChainMind OS first.');
                        }
                        result = [address];
                        break;

                    case 'eth_chainId':
                        result = `0x${(chainId || 56).toString(16)}`;
                        break;

                    case 'net_version':
                        result = String(chainId || 56);
                        break;

                    case 'eth_getBalance':
                        if (params?.[0]) {
                            const provider = new JsonRpcProvider('https://bsc-dataseed.binance.org/');
                            const balance = await provider.getBalance(params[0]);
                            result = '0x' + balance.toString(16);
                        }
                        break;

                    case 'eth_blockNumber':
                        const provider = new JsonRpcProvider('https://bsc-dataseed.binance.org/');
                        const blockNumber = await provider.getBlockNumber();
                        result = '0x' + blockNumber.toString(16);
                        break;

                    case 'eth_call':
                        const callProvider = new JsonRpcProvider('https://bsc-dataseed.binance.org/');
                        result = await callProvider.call(params[0]);
                        break;

                    case 'eth_estimateGas':
                        const gasProvider = new JsonRpcProvider('https://bsc-dataseed.binance.org/');
                        const gas = await gasProvider.estimateGas(params[0]);
                        result = '0x' + gas.toString(16);
                        break;

                    case 'eth_sendTransaction':
                        if (!signer) throw new Error('No signer available');
                        const txParams = params[0];
                        const tx = await signer.sendTransaction({
                            to: txParams.to,
                            value: txParams.value ? BigInt(txParams.value) : undefined,
                            data: txParams.data,
                            gasLimit: txParams.gas ? BigInt(txParams.gas) : undefined
                        });
                        result = tx.hash;
                        break;

                    case 'personal_sign':
                    case 'eth_sign':
                        if (!signer) throw new Error('No signer available');
                        const message = params[0];
                        result = await signer.signMessage(message);
                        break;

                    case 'wallet_switchEthereumChain':
                        // Only support BSC for now
                        if (params?.[0]?.chainId !== '0x38') {
                            throw new Error('ChainMind only supports BSC Mainnet');
                        }
                        result = null;
                        break;

                    default:
                        // Forward to RPC for other methods
                        const rpcProvider = new JsonRpcProvider('https://bsc-dataseed.binance.org/');
                        result = await rpcProvider.send(method, params || []);
                }

                iframe.contentWindow.postMessage({
                    type: 'CHAINMIND_WALLET_RESPONSE',
                    id,
                    result
                }, '*');

            } catch (error: any) {
                iframe.contentWindow?.postMessage({
                    type: 'CHAINMIND_WALLET_RESPONSE',
                    id,
                    error: error.message || 'Unknown error'
                }, '*');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [address, chainId, signer, isConnected]);

    // Notify iframe of wallet state changes
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        if (isConnected && address) {
            iframe.contentWindow.postMessage({
                type: 'CHAINMIND_WALLET_EVENT',
                eventName: 'accountsChanged',
                data: [address]
            }, '*');
            iframe.contentWindow.postMessage({
                type: 'CHAINMIND_WALLET_EVENT',
                eventName: 'connect',
                data: { chainId: `0x${(chainId || 56).toString(16)}` }
            }, '*');
        }
    }, [address, chainId, isConnected]);

    // Try to inject wallet on load
    const handleIframeLoad = () => {
        try {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                // Due to cross-origin, we can't directly inject. We rely on postMessage.
                // But we can try if same-origin
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const script = doc.createElement('script');
                    script.textContent = WALLET_BRIDGE_SCRIPT;
                    doc.head.appendChild(script);
                } catch (e) {
                    // Cross-origin - can't inject directly
                    console.log('[NativeWebApp] Cross-origin iframe, using postMessage fallback');
                }
            }
        } catch (e) {
            console.log('[NativeWebApp] Could not inject wallet:', e);
        }
    };

    return (
        <div className="h-full w-full bg-slate-950 flex flex-col relative">
            {/* Wallet connection banner */}
            {showWalletTip && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs">
                        <AlertTriangle size={14} />
                        <span>Connect your wallet in ChainMind OS first, then refresh this dApp.</span>
                    </div>
                    <button onClick={() => setShowWalletTip(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
            )}

            {/* Connection status bar */}
            {isConnected && address && (
                <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-400 text-xs">
                        <Wallet size={12} />
                        <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
                        <span className="text-slate-500">• BSC</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">ChainMind Wallet Active</span>
                    </div>
                </div>
            )}

            <iframe
                ref={iframeRef}
                src={url}
                className="flex-1 w-full h-full border-none bg-white"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                title="Native App"
                allow="clipboard-read; clipboard-write; web-share; accelerometer; autoplay; camera; encrypted-media; geolocation; gyroscope; microphone; payment; usb"
                onLoad={handleIframeLoad}
            />
        </div>
    );
};
