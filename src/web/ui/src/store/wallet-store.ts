
import { create } from 'zustand';
import { BrowserProvider, formatEther, Wallet, JsonRpcProvider } from 'ethers';
import type { Signer } from 'ethers';

interface WalletState {
    walletType: 'browser' | 'native' | null;
    address: string | null;
    balance: string | null;
    chainId: number | null;
    isConnecting: boolean;
    isConnected: boolean;
    provider: BrowserProvider | JsonRpcProvider | null;
    signer: Signer | null;
    privateKey: string | null;
    lastRefresh: number;

    connect: () => Promise<void>;
    connectBrowser: () => Promise<void>;
    createNativeWallet: () => Promise<void>;
    importNativeWallet: (pk: string) => Promise<void>;
    disconnect: () => void;
    refreshBalance: () => Promise<void>;
    initFromStorage: () => Promise<void>;
}

const BSC_RPC = 'https://bsc-dataseed.binance.org/';

export const useWalletStore = create<WalletState>((set, get) => ({
    walletType: null,
    address: null,
    balance: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    provider: null,
    signer: null,
    privateKey: null,
    lastRefresh: 0,

    connect: async () => {
        return get().connectBrowser();
    },

    connectBrowser: async () => {
        set({ isConnecting: true });
        try {
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask or Trust Wallet!');
                set({ isConnecting: false });
                return;
            }

            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const network = await provider.getNetwork();
            const balance = await provider.getBalance(address);

            set({
                walletType: 'browser',
                address,
                balance: formatEther(balance),
                chainId: Number(network.chainId),
                isConnected: true,
                provider,
                signer,
                isConnecting: false,
                privateKey: null,
                lastRefresh: Date.now()
            });

            // Setup listeners
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length === 0) {
                    get().disconnect();
                } else {
                    get().connectBrowser();
                }
            });

            window.ethereum.on('chainChanged', () => {
                get().connectBrowser();
            });

        } catch (error) {
            console.error('Wallet connection failed:', error);
            set({ isConnecting: false });
        }
    },

    createNativeWallet: async () => {
        set({ isConnecting: true });
        try {
            const wallet = Wallet.createRandom();
            const provider = new JsonRpcProvider(BSC_RPC);
            const connectedWallet = wallet.connect(provider);

            const address = wallet.address;
            const balance = await provider.getBalance(address);
            const network = await provider.getNetwork();

            localStorage.setItem('chainmind_pk', wallet.privateKey);

            set({
                walletType: 'native',
                address,
                balance: formatEther(balance),
                chainId: Number(network.chainId),
                isConnected: true,
                provider,
                signer: connectedWallet,
                privateKey: wallet.privateKey,
                isConnecting: false,
                lastRefresh: Date.now()
            });
        } catch (error) {
            console.error('Failed to create native wallet:', error);
            set({ isConnecting: false });
        }
    },

    importNativeWallet: async (pk: string) => {
        set({ isConnecting: true });
        try {
            const provider = new JsonRpcProvider(BSC_RPC);
            const wallet = new Wallet(pk, provider);

            const address = wallet.address;
            const balance = await provider.getBalance(address);
            const network = await provider.getNetwork();

            localStorage.setItem('chainmind_pk', pk);

            set({
                walletType: 'native',
                address,
                balance: formatEther(balance),
                chainId: Number(network.chainId),
                isConnected: true,
                provider,
                signer: wallet,
                privateKey: pk,
                isConnecting: false,
                lastRefresh: Date.now()
            });
        } catch (error) {
            console.error('Failed to import native wallet:', error);
            alert('Invalid Private Key');
            set({ isConnecting: false });
        }
    },

    disconnect: () => {
        localStorage.removeItem('chainmind_pk');
        set({
            walletType: null,
            address: null,
            balance: null,
            chainId: null,
            isConnected: false,
            provider: null,
            signer: null,
            isConnecting: false,
            privateKey: null
        });
    },

    refreshBalance: async () => {
        const { address, walletType, provider } = get();
        if (!address) return;

        try {
            let balance;
            if (walletType === 'browser' && provider) {
                balance = await provider.getBalance(address);
            } else {
                const rpcProvider = new JsonRpcProvider(BSC_RPC);
                balance = await rpcProvider.getBalance(address);
            }
            set({ balance: formatEther(balance), lastRefresh: Date.now() });
        } catch (e) {
            console.error("Failed to refresh balance", e);
        }
    },

    // Auto-reconnect from localStorage on app load
    initFromStorage: async () => {
        const storedPk = localStorage.getItem('chainmind_pk');
        if (storedPk && !get().isConnected) {
            console.log('[Wallet] Restoring from localStorage...');
            await get().importNativeWallet(storedPk);
        }
    }
}));

// Auto-initialize on load
if (typeof window !== 'undefined') {
    // Restore wallet from localStorage after a brief delay
    setTimeout(() => {
        useWalletStore.getState().initFromStorage();
    }, 500);

    // Auto-refresh balance every 15 seconds when connected
    setInterval(() => {
        const state = useWalletStore.getState();
        if (state.isConnected) {
            state.refreshBalance();
        }
    }, 15000);
}

// Add window.ethereum type
declare global {
    interface Window {
        ethereum?: any;
    }
}

