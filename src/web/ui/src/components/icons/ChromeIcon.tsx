import React from 'react';

export const ChromeIcon: React.FC<{ size?: number, className?: string }> = ({ size = 24, className }) => (
    <div style={{ width: size, height: size }} className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
            <path fill="#4caf50" d="M45,24h-2.1c-0.5-0.1-1.1-0.2-1.7-0.2H24v-0.1c-0.1-4.8,3.2-8.9,7.6-10.2l2.3-3.9 C30.6,11.2,27.4,12,24,12c-6.6,0-12,5.4-12,12s5.4,12,12,12c0.4,0,0.8,0,1.2-0.1l-6.7-11.6L24,36c-4.4-1.3-7.6-5.4-7.6-10.2l0,0 h13.7c0-0.6,0.1-1.1,0.2-1.7H24L45,24L45,24z M36.6,33.5L34.2,37l2.8-5L36.6,33.5z" />
            <path fill="#fbc02d" d="M43.8,33l-4.7,0.1l-5.6-9.7c-0.6-1.1-1.3-2.2-2.2-3.2l0,0c0.9-0.9,2-1.7,3.2-2.2l5.6,9.7L43.8,33z M24,14 c3.2,0,6.1,1.5,8,3.9l-4.2,7.2l0,0c-0.5-2.7-2.9-4.8-5.8-4.8c-0.4,0-0.8,0.1-1.2,0.2l2.8-4.8l0.4,0.3L24,14z" />
            <path fill="#e53935" d="M12.9,32.1L7.5,22.8l0.1-4.7L12.9,32.1z M24,36c-3.1,0-5.8-1.4-7.7-3.6l4.2-7.3c0.4,2.5,2.6,4.4,5.2,4.4 c0.5,0,0.9-0.1,1.3-0.2l-2.8,4.9l0,0C24.1,34.2,24.1,34.2,24,36z" />
            <path fill="#1565c0" d="M24,24L24,24c-2.3,0-4.2-1.9-4.2-4.2s1.9-4.2,4.2-4.2s4.2,1.9,4.2,4.2S26.3,24,24,24z" />
            <circle cx="24" cy="24" r="10" fill="#fff" />
            <circle cx="24" cy="24" r="8" fill="#1a73e8" />
            <path fill="none" stroke="#fff" strokeWidth="2" d="M24,24 L44,24 M24,24 L14,41.3 M24,24 L14,6.7" strokeOpacity="0.2" />
            <path fill="#EA4335" d="M24 24h20c0-11-9-20-20-20V24z" />
            <path fill="#FBBC05" d="M24 24L14 6.7c-6 3.5-10 10-10 17.3H24z" />
            <path fill="#34A853" d="M24 24H4c0 11 9 20 20 20v-20z" />
            <path fill="#4285F4" d="M24 24v20c11 0 20-9 20-20H24z" />
            <circle cx="24" cy="24" r="9" fill="#fff" />
            <circle cx="24" cy="24" r="7" fill="#4285F4" />
        </svg>
    </div>
);
