"use client"; 

import React, { useState, useEffect, Fragment, useRef, useLayoutEffect } from 'react'; 
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
            const entireArticle = window.sessionStorage.getItem("entireArticle");

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
                <h1 className="text-6xl md:text-7xl font-semibold text-gray-800 dark:text-white mb-1 md:mb-2 text-center">
                    {renderAnnotatedLine(articleTitle, 'title-line')}
                </h1>
                <p className="text-center text-base italic text-gray-500 dark:text-gray-400 mb-10 md:mb-14">
                   {renderAnnotatedLine(articleAuthor, 'author-line')}
                </p>
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