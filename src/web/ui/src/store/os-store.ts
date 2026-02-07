import { create } from 'zustand';

export interface WindowState {
    id: string;
    title: string;
    isOpen: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    component: React.ReactNode;
    icon?: React.ReactNode;
    width: number;
    height: number;
    x?: number;
    y?: number;
}

interface OSState {
    windows: WindowState[];
    activeWindowId: string | null;
    nextZIndex: number;

    openWindow: (id: string, title: string, component: React.ReactNode, icon?: React.ReactNode) => void;
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
    bringToFront: (id: string) => void;
    resizeWindow: (id: string, width: number, height: number) => void;
    updateWindowPosition: (id: string, x: number, y: number) => void;
    toggleStartMenu: () => void;
    isStartMenuOpen: boolean;
}

export const useOSStore = create<OSState>((set, get) => ({
    windows: [],
    activeWindowId: null,
    nextZIndex: 100,
    isStartMenuOpen: false,

    openWindow: (id, title, component, icon) => {
        const { windows, nextZIndex } = get();
        const existingWindow = windows.find((w) => w.id === id);

        if (existingWindow) {
            set({
                windows: windows.map((w) =>
                    w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: nextZIndex } : w
                ),
                activeWindowId: id,
                nextZIndex: nextZIndex + 1,
            });
        } else {
            set({
                windows: [
                    ...windows,
                    {
                        id,
                        title,
                        isOpen: true,
                        isMinimized: false,
                        isMaximized: false,
                        zIndex: nextZIndex,
                        component,
                        icon,
                        width: 600, // Default width
                        height: 400, // Default height
                    },
                ],
                activeWindowId: id,
                nextZIndex: nextZIndex + 1,
            });
        }
    },

    closeWindow: (id) =>
        set((state) => ({
            windows: state.windows.map((w) => (w.id === id ? { ...w, isOpen: false } : w)),
        })),

    minimizeWindow: (id) =>
        set((state) => ({
            windows: state.windows.map((w) =>
                w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
            ),
            activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
        })),

    maximizeWindow: (id) =>
        set((state) => ({
            windows: state.windows.map((w) =>
                w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
            ),
        })),

    bringToFront: (id) =>
        set((state) => ({
            windows: state.windows.map((w) =>
                w.id === id ? { ...w, zIndex: state.nextZIndex } : w
            ),
            activeWindowId: id,
            nextZIndex: state.nextZIndex + 1,
        })),

    toggleStartMenu: () => set((state) => ({ isStartMenuOpen: !state.isStartMenuOpen })),

    resizeWindow: (id: string, width: number, height: number) => set((state) => ({
        windows: state.windows.map(w => w.id === id ? { ...w, width, height } : w)
    })),

    updateWindowPosition: (id: string, x: number, y: number) => set((state) => ({
        windows: state.windows.map(w => w.id === id ? { ...w, x, y } : w)
    })),
}));
