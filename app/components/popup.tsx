import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import Spinner from './spinner';

interface PopupProps {
    term: string;
    pinyin: string | null;
    definition: string | null;
    example: string | null;
    isLoading: boolean;
    error: string | null;
    target: HTMLElement | Range;
    onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ term, pinyin, definition, example, isLoading, error, target, onClose }) => {
    const [size, setSize] = useState({ width: 400, height: 200 });
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; top: number; left: number } | null>(null);
    const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

    useLayoutEffect(() => {
        if (target && !position) {
            const targetRect = target.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const gap = 8;

            let initialTop = targetRect.top - size.height - gap;
            if (initialTop < gap) {
                initialTop = targetRect.bottom + gap;
            }
            if (initialTop + size.height > viewportHeight - gap) {
                initialTop = viewportHeight - size.height - gap;
            }

            let initialLeft = targetRect.left + (targetRect.width / 2) - (size.width / 2);
            if (initialLeft < gap) initialLeft = gap;
            if (initialLeft + size.width > viewportWidth - gap) {
                initialLeft = viewportWidth - size.width - gap;
            }
            
            setPosition({ top: Math.max(gap, initialTop), left: Math.max(gap, initialLeft) });
        }
    }, [target, position, size.height, size.width]);

    const handleMouseDownDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!position) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            top: position.top,
            left: position.left,
        };
    };

    const handleMouseDownResize = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && dragStartRef.current && position) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                setPosition({
                    top: dragStartRef.current.top + dy,
                    left: dragStartRef.current.left + dx,
                });
            }
            if (isResizing && resizeStartRef.current) {
                const dx = e.clientX - resizeStartRef.current.x;
                const dy = e.clientY - resizeStartRef.current.y;
                setSize({
                    width: Math.max(200, resizeStartRef.current.width + dx),
                    height: Math.max(150, resizeStartRef.current.height + dy),
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, position]);

    if (!position) return null;

    return (
        <div
            ref={popupRef}
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3 text-sm text-gray-800 dark:text-gray-200 flex flex-col"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="popup-term"
        >
            <div
                className="flex justify-between items-start mb-2 cursor-move"
                onMouseDown={handleMouseDownDrag}
            >
                <div id="popup-term" className="mr-2">
                    <strong className="font-bold mr-1">{term}</strong>
                    {pinyin && ( <span className="text-gray-500 dark:text-gray-400 text-xs">({pinyin})</span> )}
                </div>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-lg leading-none p-1 -m-1 flex-shrink-0" aria-label="Close popup">×</button>
            </div>
            <div className="text-xs flex-grow overflow-y-auto">
                {isLoading ? ( <div className="flex items-center justify-center space-x-2 py-4"> <Spinner /> <span>Loading...</span></div> )
                : error ? ( <p className="text-red-600 dark:text-red-400 italic">{error}</p> )
                : ( <> <p className="mb-2">{definition || "Definition not available."}</p> <p className="italic">{example || "Example not available."}</p> </> )}
            </div>
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={handleMouseDownResize}
            />
        </div>
    );
};

export default Popup;