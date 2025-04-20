"use client"; // Make it a client component to use hooks

import React, { useState, useEffect, Fragment, useRef, useLayoutEffect } from 'react'; // Import useLayoutEffect

// --- Spinner Component --- (No changes)
const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Popup Component --- (Revised Positioning Logic)
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

    // <<< Use useLayoutEffect for DOM measurements and positioning >>>
    useLayoutEffect(() => {
        if (popupRef.current && targetElement) {
            const targetRect = targetElement.getBoundingClientRect(); // Coords relative to viewport
            const popupEl = popupRef.current;

            // --- Get Popup Dimensions ---
            // Temporarily ensure it's measurable if using display:none initially
            // Note: This might cause a quick flicker in dev tools, but necessary for measurement
            const originalDisplay = popupEl.style.display;
            if (originalDisplay === 'none') {
                 popupEl.style.visibility = 'hidden'; // Keep hidden
                 popupEl.style.display = 'block';     // Make block to measure
            }
            const popupRect = popupEl.getBoundingClientRect(); // Measure AFTER ensuring display is not 'none'
            // Restore original display if we changed it
            if (originalDisplay === 'none') {
                 popupEl.style.display = 'none';
                 popupEl.style.visibility = '';
            }
            // --- End Measurement ---


            // *** CRITICAL CHECK: Ensure dimensions are valid ***
            if (popupRect.height <= 0 || popupRect.width <= 0) {
                // console.log("Popup dimensions not ready or invalid:", popupRect.width, popupRect.height);
                if (position !== null) setPosition(null); // Clear stale position
                return; // Wait for next render/effect run
            }

            // Viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const gap = 8; // Space

            // --- Calculate Ideal Position (Relative to Viewport) ---
            let idealTop = targetRect.top - popupRect.height - gap; // Above target
            let idealLeft = targetRect.left + (targetRect.width / 2) - (popupRect.width / 2); // Centered horizontally

            // --- Final Position Variables ---
            let finalTop = idealTop;
            let finalLeft = idealLeft;

            // --- Boundary Checks (Relative to Viewport 0,0 top-left) ---

            // 1. Check Top Boundary & Flip if necessary
            if (finalTop < gap) {
                const topIfBelow = targetRect.bottom + gap;
                if (topIfBelow + popupRect.height < viewportHeight - gap) {
                    // console.log("Flipping below");
                    finalTop = topIfBelow;
                } else {
                    // console.log("Sticking to top");
                    finalTop = gap; // Stick to top edge if below doesn't fit
                }
            }
            // 2. Check Bottom Boundary (If not flipped or flip failed)
            else if (finalTop + popupRect.height > viewportHeight - gap) {
                // console.log("Adjusting up from bottom");
                finalTop = viewportHeight - popupRect.height - gap;
                if (finalTop < gap) finalTop = gap; // Ensure top boundary isn't violated
            }

            // 3. Check Left Boundary
            if (finalLeft < gap) {
                finalLeft = gap;
            }

            // 4. Check Right Boundary
            if (finalLeft + popupRect.width > viewportWidth - gap) {
                finalLeft = viewportWidth - popupRect.width - gap;
                if (finalLeft < gap) finalLeft = gap; // Re-check left
            }

            // --- Set Final Position State ---
            if (!isNaN(finalTop) && !isNaN(finalLeft)) {
                 setPosition(prevPosition => {
                    if (!prevPosition || Math.abs(prevPosition.top - finalTop) > 1 || Math.abs(prevPosition.left - finalLeft) > 1) {
                        // console.log("Setting final pos:", { top: finalTop, left: finalLeft });
                        return { top: finalTop, left: finalLeft };
                    }
                    return prevPosition;
                });
            } else {
                console.error("Popup position calculation resulted in NaN.");
                setPosition(null);
            }
        } else {
             // Target or ref missing, clear position
             if (position !== null) setPosition(null);
        }
    // Rerun when target changes, or when content affecting size might change.
    // Including 'position' helps re-evaluate if dimensions were initially 0.
    }, [targetElement, term, pinyin, definition, example, isLoading, error, position]); // Dependency array includes position


    // Control visibility/render based on state
    const isPositioned = position !== null;

    return (
        <div
            ref={popupRef}
            className={`fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3 text-sm text-gray-800 dark:text-gray-200 max-w-xs ${isPositioned ? 'animate-fade-in-up' : ''}`}
            style={{
                // Use display none when not positioned for stable measurement
                 display: isPositioned ? 'block' : 'none',
                top: isPositioned ? `${position.top}px` : undefined,
                left: isPositioned ? `${position.left}px` : undefined,
            }}
            role="dialog" aria-modal={isPositioned ? "true" : "false"} aria-labelledby="popup-term"
            aria-hidden={!isPositioned}
        >
            {/* Header (No Changes) */}
            <div className="flex justify-between items-start mb-2">
                <div id="popup-term" className="mr-2">
                    <strong className="font-bold mr-1">{term}</strong>
                    {pinyin && ( <span className="text-gray-500 dark:text-gray-400 text-xs">({pinyin})</span> )}
                </div>
                <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-lg leading-none p-1 -m-1 flex-shrink-0" aria-label="Close popup">×</button>
            </div>
            {/* Body (No Changes) */}
            <div className="text-xs">
                {isLoading ? ( <div className="flex items-center justify-center space-x-2 py-4"> <Spinner /> <span>Loading...</span></div> )
                : error ? ( <p className="text-red-600 dark:text-red-400 italic">{error}</p> )
                : ( <> <p className="mb-2">{definition || "Definition not available."}</p> <p className="italic">{example || "Example not available."}</p> </> )}
            </div>
            {/* Animation Style (No Changes) */}
            <style jsx global>{` @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.2s ease-out; } `}</style>
        </div>
    );
};
// --- End Popup Component ---


// =========================================================================
// NO CHANGES below this line. The ArticlePage component remains the same.
// =========================================================================

export default function ArticlePage() {
    // --- State --- (No changes)
    const [articleContent, setArticleContent] = useState('Loading article...');
    const [articleTitle, setArticleTitle] = useState('');
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [popupTerm, setPopupTerm] = useState('');
    const [popupPinyin, setPopupPinyin] = useState<string | null>(null);
    const [popupDefinition, setPopupDefinition] = useState<string | null>(null);
    const [popupExample, setPopupExample] = useState<string | null>(null);
    const [isPopupLoading, setIsPopupLoading] = useState<boolean>(false);
    const [popupError, setPopupError] = useState<string | null>(null);
    const [popupTargetElement, setPopupTargetElement] = useState<HTMLElement | null>(null);
    const [activeOccurrenceKey, setActiveOccurrenceKey] = useState<string | null>(null);
    const currentFetchId = useRef<string | null>(null);
    const [isPuterSdkReady, setIsPuterSdkReady] = useState(false);
    const puterCheckTimer = useRef<NodeJS.Timeout | null>(null);
    type TermCache = Record<string, { pinyin: string | null; definition: string | null; example: string | null }>;
    const [termCache, setTermCache] = useState<TermCache>({});

    // --- Effects --- (No changes)
    useEffect(() => { /* Load Article Content */
        const content = sessionStorage.getItem('annotatedWorkText') || sessionStorage.getItem('articleContent') || 'Article content not found in session.';
        const lines = content.split('\n');
        const firstNonEmptyLineIndex = lines.findIndex(line => line.trim() !== '');
        let title = 'Article'; let contentBody = content;
        if (firstNonEmptyLineIndex !== -1) {
            title = lines[firstNonEmptyLineIndex];
            contentBody = lines.slice(firstNonEmptyLineIndex + 1).join('\n');
        } else {
            title = 'Article'; contentBody = 'Article content not found or empty.';
        }
        setArticleTitle(title);
        setArticleContent(contentBody);
    }, []);
    useEffect(() => { /* Check Puter SDK */
        const checkPuterAndInit = () => {
            if (typeof (window as any).puter !== 'undefined' && (window as any).puter.ai && typeof (window as any).puter.ai.chat === 'function') {
                // console.log("ArticlePage: Puter JS object and ai.chat found.");
                setIsPuterSdkReady(true);
                if (puterCheckTimer.current) { clearTimeout(puterCheckTimer.current); }
            } else {
                // console.warn("ArticlePage: Puter JS object/ai.chat not found yet, retrying...");
                if (!isPuterSdkReady) {
                    puterCheckTimer.current = setTimeout(checkPuterAndInit, 200);
                }
            }
        };
        checkPuterAndInit();
        return () => {
            if (puterCheckTimer.current) {
                clearTimeout(puterCheckTimer.current);
                // console.log("ArticlePage: Cleared Puter check timer on unmount.");
            }
        };
    }, [isPuterSdkReady]);

    // --- Click Handler --- (No changes)
    const handleTermClick = async (term: string, occurrenceKey: string, lineContent: string, event: React.MouseEvent<HTMLSpanElement>) => {
        const target = event.currentTarget;
        setActiveOccurrenceKey(occurrenceKey);

        const cleanedLineContent = lineContent.replace(/@@START@@|@@END@@/g, '').replaceAll(" ", "");
        // console.log(`Handle click for term: "${term}", key: ${occurrenceKey}, Cleaned line: "${cleanedLineContent}"`);

        // Check Cache
        if (termCache[occurrenceKey]) {
            // console.log(`Cache hit for occurrence: "${occurrenceKey}"`);
            const cachedData = termCache[occurrenceKey];
            setPopupTerm(term); setPopupTargetElement(target); setPopupPinyin(cachedData.pinyin);
            setPopupDefinition(cachedData.definition); setPopupExample(cachedData.example);
            setIsPopupLoading(false); setPopupError(null); setIsPopupVisible(true);
            currentFetchId.current = null;
            return;
        }

        // console.log(`Cache miss for occurrence: "${occurrenceKey}". Fetching...`);

        // Check SDK Readiness
        if (!isPuterSdkReady) {
            console.error("Puter SDK not ready.");
            setPopupTerm(term); setPopupTargetElement(target); setPopupError("AI service initializing or not available.");
            setIsPopupLoading(false); setIsPopupVisible(true);
            return;
        }

        // Set Loading State
        const fetchId = occurrenceKey + Date.now();
        currentFetchId.current = fetchId;
        setPopupTerm(term); setPopupTargetElement(target); setIsPopupLoading(true);
        setPopupPinyin(null); setPopupDefinition(null); setPopupExample(null);
        setPopupError(null); setIsPopupVisible(true);

        // Make API Call
        try {
            // Prompt still does NOT use cleanedLineContent yet
            const combinedPrompt = `For the Chinese term "${term}":\n1. Pinyin:\n2. Definition:\n3. Example sentence:\nRespond with each item on a new line, starting exactly with "1. Pinyin:", "2. Definition:", "3. Example sentence:". Respond with each item on a new line, starting exactly with "1. Pinyin:", "2. Definition:", "3. Example sentence:". You must give the term's definition, and define it contextually (referencing other areas of the article if needed). However, keep the example sentence separate from the context of this story.`;

            const definitionPrompt = await fetch("definitionPrompt.txt");

            const prompt = await definitionPrompt.text();

            const entireArticle = window.sessionStorage.getItem("entireArticle")

            const puterInstance = (window as any).puter;
            // console.log("Sending prompt:", combinedPrompt);
            const response = await puterInstance.ai.chat([
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'system',
                    content: `Here is the full article: \n\n${entireArticle}`
                },
                {
                    role: 'user',
                    content: combinedPrompt
                }
            ]);

            // Process Response
            if (currentFetchId.current === fetchId) {
                const fullResponseText = response?.message?.content || response?.text || "";
                // console.log("Raw AI Response for", occurrenceKey, ":\n", fullResponseText);

                const lines = fullResponseText.split('\n');
                let pinyinText: string | null = null;
                let definitionText: string | null = "Could not parse definition.";
                let exampleText: string | null = "Could not parse example.";

                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine.match(/^1\.\s*Pinyin:/i)) { pinyinText = trimmedLine.replace(/^1\.\s*Pinyin:\s*/i, '').trim(); }
                    else if (trimmedLine.match(/^2\.\s*Definition:/i)) { definitionText = trimmedLine.replace(/^2\.\s*Definition:\s*/i, '').trim(); }
                    else if (trimmedLine.match(/^3\.\s*Example sentence:/i)) { exampleText = trimmedLine.replace(/^3\.\s*Example sentence:\s*/i, '').trim(); }
                });

                // Cache Update
                const newCacheEntry = { pinyin: pinyinText, definition: definitionText, example: exampleText };
                setTermCache(prevCache => ({ ...prevCache, [occurrenceKey]: newCacheEntry }));
                // console.log(`Cached data for occurrence: "${occurrenceKey}"`, newCacheEntry);

                // Set state for popup display
                setPopupPinyin(pinyinText); setPopupDefinition(definitionText); setPopupExample(exampleText);
                setPopupError(null);
            } else { console.log(`Stale fetch ignored (cache update skipped) for occurrence: "${occurrenceKey}"`); }

        } catch (err: any) {
            console.error("Puter AI call failed:", err);
             if (currentFetchId.current === fetchId) {
                 setPopupError(`Failed to fetch info: ${err.message || 'Unknown error'}`);
                 setPopupPinyin(null); setPopupDefinition(null); setPopupExample(null);
             }
        } finally {
             if (currentFetchId.current === fetchId) {
                 setIsPopupLoading(false);
             }
        }
    };

    // --- Close Popup Handler --- (No changes)
    const closePopup = () => {
        setIsPopupVisible(false);
        setPopupTerm(''); setPopupPinyin(null); setPopupDefinition(null); setPopupExample(null);
        setIsPopupLoading(false); setPopupError(null); setPopupTargetElement(null);
        setActiveOccurrenceKey(null);
        currentFetchId.current = null;
    };

    // --- renderAnnotatedLine --- (No changes)
    const renderAnnotatedLine = (line: string, baseKey: string) => {
        if (!line) return null;
        if (!line.includes("@@START@@") || line.startsWith("[AI")) {
            return <Fragment key={`${baseKey}-plain`}>{line}</Fragment>;
        }
        const parts = line.split(/(@@START@@|@@END@@)/g);
        let isTerm = false;
        const elements = [];
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part === '@@START@@') { isTerm = true; }
            else if (part === '@@END@@') { isTerm = false; }
            else if (part) {
                if (isTerm) {
                    const occurrenceKey = `${baseKey}-term-${i}`;
                    elements.push(
                        <span key={occurrenceKey}
                            className={`cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 hover:outline hover:outline-1 hover:outline-gray-400 dark:hover:outline-gray-500 rounded-sm transition-colors duration-150 ${!isPuterSdkReady ? 'cursor-not-allowed opacity-70' : ''}`}
                            onClick={(e) => handleTermClick(part, occurrenceKey, line, e)}
                            title={isPuterSdkReady ? `Get info for "${part}"` : "AI service initializing..."}
                        >
                            {part}
                        </span>
                    );
                } else {
                    elements.push(<Fragment key={`${baseKey}-frag-${i}`}>{part}</Fragment>);
                }
            }
        }
        return elements;
    };
    // --- End renderAnnotatedLine ---

    // --- renderContent --- (No changes)
    const renderContent = () => {
        if (!articleContent || articleContent === 'Loading article...') {
            return <p className="text-gray-500 italic text-xl">{articleContent}</p>;
        }
        const lines = articleContent.split('\n');
        return (
            <div className="text-left text-gray-800 dark:text-gray-200 space-y-4 text-xl leading-relaxed md:text-2xl md:leading-relaxed">
                {lines.map((line, index) => (
                    <p key={`line-${index}`} className="mb-6 min-h-[1em]">
                        {renderAnnotatedLine(line, `line-${index}`)}
                    </p>
                ))}
            </div>
        );
    };
    // --- End renderContent ---


    // --- Main Return --- (No changes)
    return (
        <main className="flex min-h-screen flex-col items-center p-8 sm:p-16 md:p-24 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-8xl bg-white dark:bg-gray-800 p-12 md:p-16 rounded-lg shadow-lg relative">
                <h1 className="text-6xl md:text-7xl font-semibold text-gray-800 dark:text-white mb-12 md:mb-16 text-center">
                    {renderAnnotatedLine(articleTitle, 'title-line')}
                </h1>
                {renderContent()}
            </div>

            {/* Render Popup (No changes) */}
            {isPopupVisible && popupTargetElement && activeOccurrenceKey && (
                <Popup
                    key={activeOccurrenceKey}
                    term={popupTerm}
                    pinyin={popupPinyin}
                    definition={popupDefinition}
                    example={popupExample}
                    isLoading={isPopupLoading}
                    error={popupError}
                    targetElement={popupTargetElement}
                    onClose={closePopup}
                />
            )}
        </main>
    );
}