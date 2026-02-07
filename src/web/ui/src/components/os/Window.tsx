import React from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useOSStore, type WindowState } from '@/store/os-store';
import { cn } from '@/lib/utils';

export const DraggableWindow: React.FC<WindowState & { children?: React.ReactNode }> = ({ id, title, zIndex, isMinimized, isMaximized, children, width, height, x, y }) => {
    const { activeWindowId, closeWindow, bringToFront, minimizeWindow, maximizeWindow, resizeWindow, updateWindowPosition } = useOSStore();
    const isActive = activeWindowId === id;
    const dragControls = useDragControls();

    // Initial position fallback if x/y not set
    const initialX = typeof x === 'number' ? x : window.innerWidth / 2 - width / 2;
    const initialY = typeof y === 'number' ? y : window.innerHeight / 2 - height / 2;

    if (isMinimized) return null;

    return (
        <motion.div
            drag={!isMaximized}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{
                opacity: 1,
                scale: 1,
                zIndex,
                width: isMaximized ? '100vw' : width,
                height: isMaximized ? 'calc(100vh - 48px)' : height,
                x: isMaximized ? 0 : (typeof x === 'number' ? x : initialX),
                y: isMaximized ? 0 : (typeof y === 'number' ? y : initialY),
            }}
            onDragEnd={(_, info) => {
                if (!isMaximized) {
                    updateWindowPosition(id, (typeof x === 'number' ? x : initialX) + info.offset.x, (typeof y === 'number' ? y : initialY) + info.offset.y);
                }
            }}
            onMouseDown={() => bringToFront(id)}
            className={cn(
                "fixed rounded-xl overflow-hidden border shadow-2xl flex flex-col transition-shadow",
                isActive ? "border-white/20 shadow-blue-500/10" : "border-white/5 shadow-none",
                isMaximized ? "top-0 left-0 rounded-none z-[40]" : "z-10 bg-background/90 backdrop-blur-xl"
            )}
            style={{
                position: isMaximized ? 'fixed' : 'absolute',
                // Remove top/left calc as we use x/y transform now for everything to be consistent
                top: 0,
                left: 0,
            }}
        >
            {/* Title Bar */}
            <div
                className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-3 cursor-move select-none shrink-0 relative"
            >
                {/* Drag Handle Layer - Covers entire title bar but sits below buttons */}
                <div
                    onPointerDown={(e) => dragControls.start(e)}
                    className="absolute inset-0 z-10"
                />

                <div className="flex items-center gap-2 relative z-20">
                    <div className="flex gap-1.5 mr-2">
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
                            className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer"
                        />
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}
                            className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer"
                        />
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); maximizeWindow(id); }}
                            className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer"
                        />
                    </div>
                    <span className="text-xs font-medium tracking-tight opacity-70 pointer-events-none">{title}</span>
                </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 overflow-hidden relative">
                {children}

                {/* Resize Handles */}
                {!isMaximized && (
                    <>
                        {/* Top */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startMouseY = e.clientY;
                                const startHeight = height;
                                const startY = typeof y === 'number' ? y : initialY;

                                const onMouseMove = (ev: MouseEvent) => {
                                    const deltaY = ev.clientY - startMouseY;
                                    let newHeight = startHeight - deltaY;
                                    let newY = startY + deltaY;

                                    if (newHeight < 200) {
                                        newHeight = 200;
                                        newY = startY + (startHeight - 200);
                                    }

                                    resizeWindow(id, width, newHeight);
                                    updateWindowPosition(id, typeof x === 'number' ? x : initialX, newY);
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute top-0 left-0 right-0 h-1 cursor-n-resize z-50 hover:bg-white/10"
                        />
                        {/* Bottom */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startMouseY = e.clientY;
                                const startHeight = height;

                                const onMouseMove = (ev: MouseEvent) => {
                                    const deltaY = ev.clientY - startMouseY;
                                    const newHeight = Math.max(200, startHeight + deltaY);
                                    resizeWindow(id, width, newHeight);
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize z-50 hover:bg-white/10"
                        />
                        {/* Left */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startMouseX = e.clientX;
                                const startWidth = width;
                                const startX = typeof x === 'number' ? x : initialX;

                                const onMouseMove = (ev: MouseEvent) => {
                                    const deltaX = ev.clientX - startMouseX;
                                    let newWidth = startWidth - deltaX;
                                    let newX = startX + deltaX;

                                    if (newWidth < 300) {
                                        newWidth = 300;
                                        newX = startX + (startWidth - 300);
                                    }

                                    resizeWindow(id, newWidth, height);
                                    updateWindowPosition(id, newX, typeof y === 'number' ? y : initialY);
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute top-0 bottom-0 left-0 w-1 cursor-w-resize z-50 hover:bg-white/10"
                        />
                        {/* Right */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startMouseX = e.clientX;
                                const startWidth = width;

                                const onMouseMove = (ev: MouseEvent) => {
                                    const deltaX = ev.clientX - startMouseX;
                                    const newWidth = Math.max(300, startWidth + deltaX);
                                    resizeWindow(id, newWidth, height);
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute top-0 bottom-0 right-0 w-1 cursor-e-resize z-50 hover:bg-white/10"
                        />

                        {/* Corners */}
                        {/* Top-Left */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startMouseX = e.clientX;
                                const startMouseY = e.clientY;
                                const startWidth = width;
                                const startHeight = height;
                                const startX = typeof x === 'number' ? x : initialX;
                                const startY = typeof y === 'number' ? y : initialY;

                                const onMouseMove = (ev: MouseEvent) => {
                                    const deltaX = ev.clientX - startMouseX;
                                    const deltaY = ev.clientY - startMouseY;

                                    let newWidth = startWidth - deltaX;
                                    let newX = startX + deltaX;
                                    if (newWidth < 300) {
                                        newWidth = 300;
                                        newX = startX + (startWidth - 300);
                                    }

                                    let newHeight = startHeight - deltaY;
                                    let newY = startY + deltaY;
                                    if (newHeight < 200) {
                                        newHeight = 200;
                                        newY = startY + (startHeight - 200);
                                    }

                                    resizeWindow(id, newWidth, newHeight);
                                    updateWindowPosition(id, newX, newY);
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-50 hover:bg-white/10"
                        />
                        {/* Top-Right */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startMouseX = e.clientX;
                                const startMouseY = e.clientY;
                                const startWidth = width;
                                const startHeight = height;
                                const startY = typeof y === 'number' ? y : initialY;

                                const onMouseMove = (ev: MouseEvent) => {
                                    const deltaX = ev.clientX - startMouseX;
                                    const deltaY = ev.clientY - startMouseY;

                                    const newWidth = Math.max(300, startWidth + deltaX);

                                    let newHeight = startHeight - deltaY;
                                    let newY = startY + deltaY;
                                    if (newHeight < 200) {
                                        newHeight = 200;
                                        newY = startY + (startHeight - 200);
                                    }

                                    resizeWindow(id, newWidth, newHeight);
                                    updateWindowPosition(id, typeof x === 'number' ? x : initialX, newY);
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-50 hover:bg-white/10"
                        />
                        {/* Bottom-Left */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startMouseX = e.clientX;
                                const startMouseY = e.clientY;
                                const startWidth = width;
                                const startHeight = height;
                                const startX = typeof x === 'number' ? x : initialX;

                                const onMouseMove = (ev: MouseEvent) => {
                                    const deltaX = ev.clientX - startMouseX;
                                    const deltaY = ev.clientY - startMouseY;

                                    let newWidth = startWidth - deltaX;
                                    let newX = startX + deltaX;
                                    if (newWidth < 300) {
                                        newWidth = 300;
                                        newX = startX + (startWidth - 300);
                                    }

                                    const newHeight = Math.max(200, startHeight + deltaY);

                                    resizeWindow(id, newWidth, newHeight);
                                    updateWindowPosition(id, newX, typeof y === 'number' ? y : initialY);
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-50 hover:bg-white/10"
                        />

                        {/* Bottom-Right (Original) */}
                        <div
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startWidth = width;
                                const startHeight = height;
                                const onMouseMove = (moveEvent: MouseEvent) => {
                                    resizeWindow(id, Math.max(300, startWidth + (moveEvent.clientX - startX)), Math.max(200, startHeight + (moveEvent.clientY - startY)));
                                };
                                const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                            }}
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end p-0.5 hover:bg-white/10 rounded-tl"
                        >
                            <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-white/30" />
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

