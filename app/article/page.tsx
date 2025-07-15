"use client"; 

import React, { useState, useEffect, Fragment, useRef } from 'react'; 
import Popup from '../components/popup';

export default function ArticlePage() {

    const [articleContent, setArticleContent] = useState('Loading article...');
    const [articleTitle, setArticleTitle] = useState('');
    const [articleAuthor, setArticleAuthor] = useState('');
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [popupTerm, setPopupTerm] = useState('');
    const [popupPinyin, setPopupPinyin] = useState<string | null>(null);
    const [popupDefinition, setPopupDefinition] = useState<string | null>(null);
    const [popupExample, setPopupExample] = useState<string | null>(null);
    const [isPopupLoading, setIsPopupLoading] = useState<boolean>(false);
    const [popupError, setPopupError] = useState<string | null>(null);
    const [popupTarget, setPopupTarget] = useState<any>(null);
    const currentFetchId = useRef<string | null>(null);
    const contentContainerRef = useRef<HTMLDivElement>(null);
    const [highlightRects, setHighlightRects] = useState<any[]>([]);
    const [liveHighlightRects, setLiveHighlightRects] = useState<any[]>([]);
    const [selectedTextInfo, setSelectedTextInfo] = useState<{ text: string; range: any } | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPuterSdkReady, setIsPuterSdkReady] = useState(false);
    const puterCheckTimer = useRef<NodeJS.Timeout | null>(null);
    type TermCache = Record<string, { pinyin: string | null; definition: string | null; example: string | null }>;
    const [termCache, setTermCache] = useState<TermCache>({});
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

    useEffect(() => { 
        const content = sessionStorage.getItem('annotatedWorkText') || sessionStorage.getItem('articleContent') || 'Article content not found in session.';
        const lines = content.split('\n');
        const firstNonEmptyLineIndex = lines.findIndex(line => line.trim() !== '');
        let title = 'Article'; let author = 'Author'; let contentBody = content;
        if (firstNonEmptyLineIndex !== -1) {
            title = lines[firstNonEmptyLineIndex];
            author = lines[firstNonEmptyLineIndex + 1]
            contentBody = lines.slice(firstNonEmptyLineIndex + 2).join('\n');
        } else {
            title = 'Article'; author = 'Author'; contentBody = 'Article content not found or empty.';
        }
        setArticleTitle(title);
        setArticleAuthor(author);
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
    useEffect(() => {
        // Check if Speech Synthesis is supported
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis; // Store the synth object

            const loadVoices = () => {
                if (!synthRef.current) return; // Safety check

                const voices = synthRef.current.getVoices();
                console.log("Available Voices:", voices); // Log available voices

                if (voices.length > 0) {
                    // --- Select Voice (Example: Index 4, ADD SAFETY CHECKS) ---
                    // IMPORTANT: Voice indices can vary wildly between browsers/OS/updates.
                    // Relying on a fixed index like [4] is NOT reliable for production.
                    // You should ideally filter by language ('lang') or name ('name')
                    // For now, we'll use index 4 with checks.
                    const desiredVoiceIndex = 4; // As specified in your example
                    if (voices.length > desiredVoiceIndex) {
                        selectedVoiceRef.current = voices[desiredVoiceIndex];
                        console.log("Selected Voice (Index 4):", selectedVoiceRef.current);
                    } else if (voices.length > 0) {
                         // Fallback: Select the first available voice if index 4 is invalid
                        selectedVoiceRef.current = voices[0];
                        console.warn(`Voice index ${desiredVoiceIndex} out of bounds. Falling back to first voice:`, selectedVoiceRef.current);
                    } else {
                        console.warn("No voices available even after voiceschanged.");
                        selectedVoiceRef.current = null;
                    }
                    // --- End Voice Selection ---

                    // Optional: Remove listener after voices load if you only need it once
                    // synthRef.current.removeEventListener('voiceschanged', loadVoices);
                } else {
                    console.log("Voices list still empty, waiting for 'voiceschanged' event...");
                }
            };

            // Add event listener for when voices change/load
            synthRef.current.addEventListener('voiceschanged', loadVoices);

            // Call once immediately in case voices are already loaded
            loadVoices();

            // Cleanup: Remove event listener when component unmounts
            return () => {
                if (synthRef.current) {
                    synthRef.current.removeEventListener('voiceschanged', loadVoices);
                }
            };
        } else {
            console.warn("Speech Synthesis not supported by this browser.");
        }
    }, []);

    useEffect(() => {
        const handleLiveSelection = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
                if (document.activeElement?.tagName !== 'INPUT') {
                    setLiveHighlightRects([]);
                }
                return;
            }
            const popupNode = document.querySelector('[role="dialog"]');
            if (popupNode && popupNode.contains(selection.anchorNode)) {
                return;
            }
            const range = selection.getRangeAt(0);
            setLiveHighlightRects(Array.from(range.getClientRects()));
        };

        document.addEventListener('selectionchange', handleLiveSelection);

        return () => {
            document.removeEventListener('selectionchange', handleLiveSelection);
        };
    }, []);

    useEffect(() => {
        const handleGlobalMouseDown = (event: MouseEvent) => {
            const targetEl = event.target as HTMLElement;
            const popupNode = document.querySelector('[role="dialog"]');

            if (popupNode && popupNode.contains(targetEl)) {
                return;
            }

            if (targetEl.classList.contains('custom-highlight')) {
                return;
            }

            closePopup();
            setHighlightRects([]);
            setSelectedTextInfo(null);
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };

        document.addEventListener('mousedown', handleGlobalMouseDown);

        return () => {
            document.removeEventListener('mousedown', handleGlobalMouseDown);
        };
    }, [highlightRects]);

    const closePopup = () => {
        setIsPopupVisible(false);
        setPopupTerm('');
        setPopupPinyin(null);
        setPopupDefinition(null);
        setPopupExample(null);
        setIsPopupLoading(false);
        setPopupError(null);
        setPopupTarget(null);
        currentFetchId.current = null;
    };


    const handleMouseUp = () => {
        const selection = window.getSelection();

        setIsSpeaking(false);

        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
            setLiveHighlightRects([]);
            return;
        }
        const range = selection.getRangeAt(0).cloneRange();
        const selectedText = selection.toString().trim();
        
        const popupNode = document.querySelector('[role="dialog"]');
        if (popupNode && popupNode.contains(selection.anchorNode)) {
            return;
        }

        if (selectedText) {
            setHighlightRects(Array.from(range.getClientRects()));
            setSelectedTextInfo({ text: selectedText, range });
        }
        setLiveHighlightRects([]);
    };

    const handleHighlightClick = async (event: React.MouseEvent<HTMLDivElement>) => {
        const targetEl = event.target as HTMLElement;
        if (!targetEl.classList.contains('custom-highlight')) {
            return;
        }
        if (!selectedTextInfo) return;

        const { text: term, range } = selectedTextInfo;
        const occurrenceKey = term;

        if (isPopupVisible && popupTerm === term) {
            closePopup();
            return;
        }

        setPopupTarget(range);
        setPopupTerm(term);

        if (termCache[occurrenceKey]) {
            const cachedData = termCache[occurrenceKey];
            setPopupPinyin(cachedData.pinyin);
            setPopupDefinition(cachedData.definition);
            setPopupExample(cachedData.example);
            setIsPopupLoading(false);
            setPopupError(null);
            setIsPopupVisible(true);
            return;
        }

        if (!isPuterSdkReady) {
            setPopupError("AI service initializing or not available.");
            setIsPopupLoading(false);
            setIsPopupVisible(true);
            return;
        }

        const fetchId = occurrenceKey + Date.now();
        currentFetchId.current = fetchId;
        setIsPopupLoading(true);
        setPopupPinyin(null);
        setPopupDefinition(null);
        setPopupExample(null);
        setPopupError(null);
        setIsPopupVisible(true);

        try {
            const entireArticle = window.sessionStorage.getItem("entireArticle");
            const lineContent = range.startContainer.textContent || '';
            const cleanedLineContent = lineContent.replace(/<|>/g, '').replaceAll(" ", "");

            const combinedPrompt = await fetch("definitionPrompt.txt");
            const prompt = await combinedPrompt.text();
            const finalPrompt = prompt.replace(/\${([^}]*)}/g, (m, n) => eval(n));

            const puterInstance = (window as any).puter;
            const response = await puterInstance.ai.chat(finalPrompt);

            if (currentFetchId.current === fetchId) {
                const fullResponseText = response?.message?.content || response?.text || "";
                const lines = fullResponseText.split('\n');
                let pinyinText: string | null = null;
                let definitionText: string | null = "Could not parse definition.";
                let exampleText: string | null = "Could not parse example.";

                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine.match(/^1\.\s*Pinyin:/i)) pinyinText = trimmedLine.replace(/^1\.\s*Pinyin:\s*/i, '').trim();
                    else if (trimmedLine.match(/^2\.\s*Definition:/i)) definitionText = trimmedLine.replace(/^2\.\s*Definition:\s*/i, '').trim();
                    else if (trimmedLine.match(/^3\.\s*Example sentence:/i)) exampleText = trimmedLine.replace(/^3\.\s*Example sentence:\s*/i, '').trim();
                });

                const newCacheEntry = { pinyin: pinyinText, definition: definitionText, example: exampleText };
                setTermCache(prevCache => ({ ...prevCache, [occurrenceKey]: newCacheEntry }));

                setPopupPinyin(pinyinText);
                setPopupDefinition(definitionText);
                setPopupExample(exampleText);
                setPopupError(null);
            }
        } catch (err: any) {
            console.error("Puter AI call failed:", err);
            if (currentFetchId.current === fetchId) {
                setPopupError(`Failed to fetch info: ${err.message || 'Unknown error'}`);
            }
        } finally {
            if (currentFetchId.current === fetchId) {
                setIsPopupLoading(false);
            }
        }
    };

    const handleHighlightRightClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const targetEl = event.target as HTMLElement;
        if (!targetEl.classList.contains('custom-highlight')) {
            return;
        }
        event.preventDefault();
        if (!selectedTextInfo) return;

        const { text } = selectedTextInfo;
        const speak = new SpeechSynthesisUtterance(text);
        speak.voice = selectedVoiceRef.current;
        speak.onstart = () => setIsSpeaking(true);
        speak.onend = () => setIsSpeaking(false);
        synthRef.current?.cancel();
        synthRef.current?.speak(speak);
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
                        {line}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-8 sm:p-16 md:p-24 bg-gray-50 dark:bg-gray-900">
            <div
                ref={contentContainerRef}
                className="w-full max-w-8xl bg-white dark:bg-gray-800 p-12 md:p-16 rounded-lg shadow-lg relative"
                onMouseUp={handleMouseUp}
                onClick={handleHighlightClick}
                onContextMenu={handleHighlightRightClick}
            >
                {[...liveHighlightRects, ...highlightRects].map((rect, i) => {
                    const containerRect = contentContainerRef.current?.getBoundingClientRect();
                    if (!containerRect) return null;

                    const isLive = i < liveHighlightRects.length;
                    const top = rect.top - containerRect.top;
                    const left = rect.left - containerRect.left;
                    
                    const speakingClass = !isLive && isSpeaking ? 'bg-blue-300 dark:bg-blue-500' : 'bg-gray-500 dark:bg-gray-400';
                    const liveClass = isLive ? 'opacity-20' : 'opacity-30 hover:opacity-40';
                    const committedClass = !isLive ? 'custom-highlight' : '';

                    return (
                        <div
                            key={i}
                            className={`absolute ${speakingClass} ${liveClass} ${committedClass} rounded-sm transition-colors duration-300`}
                            style={{
                                top: `${top}px`,
                                left: `${left}px`,
                                width: `${rect.width}px`,
                                height: `${rect.height}px`,
                                pointerEvents: isLive ? 'none' : 'auto',
                                cursor: isLive ? 'default' : 'pointer',
                            }}
                        />
                    );
                })}
                <h1 className="text-6xl md:text-7xl font-semibold text-gray-800 dark:text-white mb-1 md:mb-2 text-center">
                    {articleTitle}
                </h1>
                <p className="text-center text-base italic text-gray-500 dark:text-gray-400 mb-2 md:mb-3">
                   {articleAuthor}
                </p>
                {renderContent()}
            </div>

            {}
            {isPopupVisible && popupTarget && (
                <Popup
                    key={popupTerm}
                    term={popupTerm}
                    pinyin={popupPinyin}
                    definition={popupDefinition}
                    example={popupExample}
                    isLoading={isPopupLoading}
                    error={popupError}
                    target={popupTarget}
                    onClose={closePopup}
                />
            )}
        </main>
    );
}