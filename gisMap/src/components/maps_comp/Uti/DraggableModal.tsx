// components/DraggableModal.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { X, GripHorizontal, Loader2 } from "lucide-react";

interface DraggableModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    isLoading?: boolean;
}

export function DraggableModal({
    isOpen,
    onClose,
    children,
    title,
    subtitle,
    isLoading = false,
}: DraggableModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [size, setSize] = useState({ width: 480, height: 600 });
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const startSize = useRef({ width: 0, height: 0 });
    const startPos = useRef({ x: 0, y: 0 });

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (dragHandleRef.current?.contains(e.target as Node)) {
            setIsDragging(true);
            dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
    }, [position]);

    const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        startSize.current = { width: size.width, height: size.height };
        startPos.current = { x: position.x, y: position.y };
    }, [size, position]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStartPos.current.x;
                const newY = e.clientY - dragStartPos.current.y;

                const maxX = window.innerWidth - size.width - 20;
                const maxY = window.innerHeight - size.height - 20;

                setPosition({
                    x: Math.max(20, Math.min(newX, maxX)),
                    y: Math.max(20, Math.min(newY, maxY)),
                });
            } else if (isResizing && resizeDirection) {
                let newWidth = size.width;
                let newHeight = size.height;
                let newX = position.x;
                let newY = position.y;

                const deltaX = e.clientX - dragStartPos.current.x;
                const deltaY = e.clientY - dragStartPos.current.y;

                const minWidth = 380;
                const minHeight = 500;

                if (resizeDirection.includes('e')) {
                    newWidth = Math.max(minWidth, startSize.current.width + deltaX);
                }
                if (resizeDirection.includes('w')) {
                    const potentialWidth = Math.max(minWidth, startSize.current.width - deltaX);
                    if (potentialWidth !== startSize.current.width) {
                        newWidth = potentialWidth;
                        newX = startPos.current.x + (startSize.current.width - newWidth);
                    }
                }
                if (resizeDirection.includes('s')) {
                    newHeight = Math.max(minHeight, startSize.current.height + deltaY);
                }
                if (resizeDirection.includes('n')) {
                    const potentialHeight = Math.max(minHeight, startSize.current.height - deltaY);
                    if (potentialHeight !== startSize.current.height) {
                        newHeight = potentialHeight;
                        newY = startPos.current.y + (startSize.current.height - newHeight);
                    }
                }

                setSize({ width: newWidth, height: newHeight });
                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            setResizeDirection(null);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, resizeDirection, size.width, size.height, position.x, position.y]);

    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                backgroundColor: 'white',
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 1000,
                cursor: isDragging ? 'grabbing' : 'default',
                transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s',
                border: '1px solid #E5E7EB',
            }}
            onMouseDown={handleDragStart}
        >
            <div
                ref={dragHandleRef}
                style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'grab',
                    userSelect: 'none',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <GripHorizontal size={16} />
                    <div style={{ overflow: 'hidden' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {title}
                        </h3>
                        {subtitle && (
                            <p style={{ fontSize: 12, opacity: 0.9, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                >
                    <X size={14} />
                </button>
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: isLoading ? 0 : '16px',
                backgroundColor: 'white',
                position: 'relative',
            }}>
                {isLoading ? (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                    }}>
                        <Loader2 size={40} className="animate-spin" color="var(--color-primary)" />
                        <span style={{ color: '#6B7280', fontSize: 13 }}>Loading property details...</span>
                    </div>
                ) : children}
            </div>

            {/* Resize handles */}
            <div onMouseDown={(e) => handleResizeStart(e, 'n')} style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 6, cursor: 'n-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 's')} style={{ position: 'absolute', bottom: 0, left: 10, right: 10, height: 6, cursor: 's-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'e')} style={{ position: 'absolute', top: 10, bottom: 10, right: 0, width: 6, cursor: 'e-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'w')} style={{ position: 'absolute', top: 10, bottom: 10, left: 0, width: 6, cursor: 'w-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'ne')} style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, cursor: 'ne-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'nw')} style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, cursor: 'nw-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'se')} style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, cursor: 'se-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'sw')} style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, cursor: 'sw-resize' }} />
        </div>
    );
}