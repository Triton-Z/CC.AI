"use client"; 

import React, { useState, useEffect, Fragment, useRef, useLayoutEffect } from 'react'; 

const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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

export default function ArticlePage() {

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

    useEffect(() => { 
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
    useEffect(() => { 
        const checkPuterAndInit = () => {
            if (typeof (window as any).puter !== 'undefined' && (window as any).puter.ai && typeof (window as any).puter.ai.chat === 'function') {

                setIsPuterSdkReady(true);
                if (puterCheckTimer.current) { clearTimeout(puterCheckTimer.current); }
            } else {

                if (!isPuterSdkReady) {
                    puterCheckTimer.current = setTimeout(checkPuterAndInit, 200);
                }
            }
        };
        checkPuterAndInit();
        return () => {
            if (puterCheckTimer.current) {
                clearTimeout(puterCheckTimer.current);

            }
        };
    }, [isPuterSdkReady]);

    const handleTermClick = async (term: string, occurrenceKey: string, lineContent: string, event: React.MouseEvent<HTMLSpanElement>) => {
        const target = event.currentTarget;
        setActiveOccurrenceKey(occurrenceKey);

        const cleanedLineContent = lineContent.replace(/@@START@@|@@END@@/g, '').replaceAll(" ", "");

        if (termCache[occurrenceKey]) {

            const cachedData = termCache[occurrenceKey];
            setPopupTerm(term); setPopupTargetElement(target); setPopupPinyin(cachedData.pinyin);
            setPopupDefinition(cachedData.definition); setPopupExample(cachedData.example);
            setIsPopupLoading(false); setPopupError(null); setIsPopupVisible(true);
            currentFetchId.current = null;
            return;
        }

        if (!isPuterSdkReady) {
            console.error("Puter SDK not ready.");
            setPopupTerm(term); setPopupTargetElement(target); setPopupError("AI service initializing or not available.");
            setIsPopupLoading(false); setIsPopupVisible(true);
            return;
        }

        const fetchId = occurrenceKey + Date.now();
        currentFetchId.current = fetchId;
        setPopupTerm(term); setPopupTargetElement(target); setIsPopupLoading(true);
        setPopupPinyin(null); setPopupDefinition(null); setPopupExample(null);
        setPopupError(null); setIsPopupVisible(true);

        try {

            const combinedPrompt = `For the Chinese term "${term}":\n1. Pinyin:\n2. Definition:\n3. Example sentence:\nRespond with each item on a new line, starting exactly with "1. Pinyin:", "2. Definition:", "3. Example sentence:". Respond with each item on a new line, starting exactly with "1. Pinyin:", "2. Definition:", "3. Example sentence:". You must give the term's definition, and define it contextually (referencing other areas of the article if needed). However, keep the example sentence separate from the context of this story.`;

            const definitionPrompt = await fetch("definitionPrompt.txt");

            const prompt = await definitionPrompt.text();

            const entireArticle = window.sessionStorage.getItem("entireArticle")

            const puterInstance = (window as any).puter;

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

            if (currentFetchId.current === fetchId) {
                const fullResponseText = response?.message?.content || response?.text || "";

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

                const newCacheEntry = { pinyin: pinyinText, definition: definitionText, example: exampleText };
                setTermCache(prevCache => ({ ...prevCache, [occurrenceKey]: newCacheEntry }));

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

    const closePopup = () => {
        setIsPopupVisible(false);
        setPopupTerm(''); setPopupPinyin(null); setPopupDefinition(null); setPopupExample(null);
        setIsPopupLoading(false); setPopupError(null); setPopupTargetElement(null);
        setActiveOccurrenceKey(null);
        currentFetchId.current = null;
    };

    const renderAnnotatedLine = (line: string, baseKey: string) => {
        if (!line) return null;
        if (!line.includes("@@START@@") || line.startsWith("[AI")) {
            return <Fragment key={`${baseKey}-plain`}>{line}</Fragment>;
        }
        const parts = line.split(/(@@START@@|@@END@@)/g);
        let isTerm = false;

        const elements: React.ReactNode[] = [];
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

    return (
        <main className="flex min-h-screen flex-col items-center p-8 sm:p-16 md:p-24 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-8xl bg-white dark:bg-gray-800 p-12 md:p-16 rounded-lg shadow-lg relative">
                <h1 className="text-6xl md:text-7xl font-semibold text-gray-800 dark:text-white mb-12 md:mb-16 text-center">
                    {renderAnnotatedLine(articleTitle, 'title-line')}
                </h1>
                {renderContent()}
            </div>

            {}
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