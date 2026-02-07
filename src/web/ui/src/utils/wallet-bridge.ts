// Web3 Provider Bridge - Creates a fake window.ethereum that communicates with parent
// This file will be served and injected into iframes

(function () {
    // Only run if we're in an iframe
    if (window.parent === window) return;

    let accounts: string[] = [];
    let chainId = '0x38'; // BSC Mainnet (56 in hex)

    const provider = {
        isMetaMask: true,
        isChainMind: true,
        chainId: chainId,
        networkVersion: '56',
        selectedAddress: null as string | null,

        // Standard request method (EIP-1193)
        request: async ({ method, params }: { method: string; params?: any[] }) => {
            return new Promise((resolve, reject) => {
                const requestId = Date.now() + Math.random();

                // Send request to parent window
                window.parent.postMessage({
                    type: 'CHAINMIND_WALLET_REQUEST',
                    id: requestId,
                    method,
                    params
                }, '*');

                // Listen for response
                const handler = (event: MessageEvent) => {
                    if (event.data?.type === 'CHAINMIND_WALLET_RESPONSE' && event.data?.id === requestId) {
                        window.removeEventListener('message', handler);
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            resolve(event.data.result);
                        }
                    }
                };
                window.addEventListener('message', handler);

                // Timeout after 30 seconds
                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    reject(new Error('Request timeout'));
                }, 30000);
            });
        },

        // Legacy methods for compatibility
        enable: async () => {
            return provider.request({ method: 'eth_requestAccounts' });
        },

        send: (method: string, params?: any[]) => {
            return provider.request({ method, params });
        },

        sendAsync: (payload: any, callback: (error: any, response: any) => void) => {
            provider.request({ method: payload.method, params: payload.params })
                .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
                .catch(error => callback(error, null));
        },

        // Event emitter for compatibility
        _events: {} as Record<string, Function[]>,

        on: (event: string, callback: Function) => {
            if (!provider._events[event]) {
                provider._events[event] = [];
            }
            provider._events[event].push(callback);
            return provider;
        },

        removeListener: (event: string, callback: Function) => {
            if (provider._events[event]) {
                provider._events[event] = provider._events[event].filter(cb => cb !== callback);
            }
            return provider;
        },

        emit: (event: string, ...args: any[]) => {
            if (provider._events[event]) {
                provider._events[event].forEach(callback => callback(...args));
            }
        }
    };

    // Listen for events from parent
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'CHAINMIND_WALLET_EVENT') {
            const { eventName, data } = event.data;

            if (eventName === 'accountsChanged') {
                accounts = data;
                provider.selectedAddress = data[0] || null;
                provider.emit('accountsChanged', data);
            } else if (eventName === 'chainChanged') {
                provider.chainId = data;
                provider.emit('chainChanged', data);
            } else if (eventName === 'connect') {
                provider.emit('connect', { chainId: provider.chainId });
            }
        }
    });

    // Inject as window.ethereum
    Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: false,
        configurable: false
    });

    // Announce via EIP-6963
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: {
            info: {
                uuid: 'chainmind-native-wallet',
                name: 'ChainMind Wallet',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>',
                rdns: 'dev.chainmind.wallet'
            },
            provider
        }
    }));

    console.log('[ChainMind] Wallet provider injected');
})();
