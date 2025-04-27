import React, { useState, useRef, useLayoutEffect } from 'react'; 
import Spinner from './spinner';

interface PopupProps {
    term: string;
    pinyin: string | null;
    definition: string | null;
    example: string | null;
    isLoading: boolean;
    error: string | null;
    targetElement: HTMLElement;
    onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ term, pinyin, definition, example, isLoading, error, targetElement, onClose }) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (popupRef.current && targetElement) {
            const targetRect = targetElement.getBoundingClientRect(); 
            const popupEl = popupRef.current;

            const originalDisplay = popupEl.style.display;
            if (originalDisplay === 'none') {
                 popupEl.style.visibility = 'hidden'; 
                 popupEl.style.display = 'block';     
            }
            const popupRect = popupEl.getBoundingClientRect(); 

            if (originalDisplay === 'none') {
                 popupEl.style.display = 'none';
                 popupEl.style.visibility = '';
            }

            if (popupRect.height <= 0 || popupRect.width <= 0) {

                if (position !== null) setPosition(null); 
                return; 
            }

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const gap = 8; 

            let idealTop = targetRect.top - popupRect.height - gap; 
            let idealLeft = targetRect.left + (targetRect.width / 2) - (popupRect.width / 2); 

            let finalTop = idealTop;
            let finalLeft = idealLeft;

            if (finalTop < gap) {
                const topIfBelow = targetRect.bottom + gap;
                if (topIfBelow + popupRect.height < viewportHeight - gap) {

                    finalTop = topIfBelow;
                } else {

                    finalTop = gap; 
                }
            }

            else if (finalTop + popupRect.height > viewportHeight - gap) {

                finalTop = viewportHeight - popupRect.height - gap;
                if (finalTop < gap) finalTop = gap; 
            }

            if (finalLeft < gap) {
                finalLeft = gap;
            }

            if (finalLeft + popupRect.width > viewportWidth - gap) {
                finalLeft = viewportWidth - popupRect.width - gap;
                if (finalLeft < gap) finalLeft = gap; 
            }

            if (!isNaN(finalTop) && !isNaN(finalLeft)) {
                 setPosition(prevPosition => {
                    if (!prevPosition || Math.abs(prevPosition.top - finalTop) > 1 || Math.abs(prevPosition.left - finalLeft) > 1) {

                        return { top: finalTop, left: finalLeft };
                    }
                    return prevPosition;
                });
            } else {
                console.error("Popup position calculation resulted in NaN.");
                setPosition(null);
            }
        } else {

             if (position !== null) setPosition(null);
        }

    }, [targetElement, term, pinyin, definition, example, isLoading, error, position]); 

    const isPositioned = position !== null;

    return (
        <div
            ref={popupRef}
            className={`fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3 text-sm text-gray-800 dark:text-gray-200 max-w-xs ${isPositioned ? 'animate-fade-in-up' : ''}`}
            style={{

                 display: isPositioned ? 'block' : 'none',
                top: isPositioned ? `${position.top}px` : undefined,
                left: isPositioned ? `${position.left}px` : undefined,
            }}
            role="dialog" aria-modal={isPositioned ? "true" : "false"} aria-labelledby="popup-term"
            aria-hidden={!isPositioned}
        >
            {}
            <div className="flex justify-between items-start mb-2">
                <div id="popup-term" className="mr-2">
                    <strong className="font-bold mr-1">{term}</strong>
                    {pinyin && ( <span className="text-gray-500 dark:text-gray-400 text-xs">({pinyin})</span> )}
                </div>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-lg leading-none p-1 -m-1 flex-shrink-0" aria-label="Close popup">×</button>
            </div>
            {}
            <div className="text-xs">
                {isLoading ? ( <div className="flex items-center justify-center space-x-2 py-4"> <Spinner /> <span>Loading...</span></div> )
                : error ? ( <p className="text-red-600 dark:text-red-400 italic">{error}</p> )
                : ( <> <p className="mb-2">{definition || "Definition not available."}</p> <p className="italic">{example || "Example not available."}</p> </> )}
            </div>
            {}
            <style jsx global>{` @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.2s ease-out; } `}</style>
        </div>
    );
};

export default Popup;