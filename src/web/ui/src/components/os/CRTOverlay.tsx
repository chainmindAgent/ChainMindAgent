import React from 'react';

export const CRTOverlay: React.FC = () => {
    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {/* Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]" />

            {/* Screen Flicker */}
            <div className="animate-flicker absolute inset-0 bg-[rgba(18,16,16,0.01)]" />

            {/* Vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.4)]" />

            <style>{`
                @keyframes flicker {
                    0% { opacity: 0.97; }
                    5% { opacity: 0.95; }
                    10% { opacity: 0.97; }
                    15% { opacity: 0.94; }
                    20% { opacity: 0.98; }
                    25% { opacity: 0.95; }
                    30% { opacity: 0.96; }
                    100% { opacity: 0.97; }
                }
                .animate-flicker {
                    animation: flicker 0.1s infinite;
                }
            `}</style>
        </div>
    );
};
