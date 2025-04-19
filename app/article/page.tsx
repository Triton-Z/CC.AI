"use client"; // Make it a client component to use hooks

import React, { useState, useEffect, Fragment, useRef } from 'react';

// Define the structure for elements from the backend
type ArticleElement = [string, string]; // [tag, content]

// Simple Popup Component (remains the same)
const Popup = ({ content, onClose }: { content: string; onClose: () => void }) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    onClick={onClose} // Close on overlay click
  >
    <div
      className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-lg text-gray-800 dark:text-white max-w-xs"
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
    >
      <p>{content}</p>
      <button
        onClick={onClose}
        className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
      >
        Close
      </button>
    </div>
  </div>
);


export default function ArticlePage() {
  const [articleTitle, setArticleTitle] = useState('Loading title...');
  // State to hold the final annotated literary work text
  const [annotatedWorkText, setAnnotatedWorkText] = useState<string | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupContent, setPopupContent] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Combined loading state (initial + annotation)
  const [annotationStatus, setAnnotationStatus] = useState<string>('loading'); // 'loading', 'annotating', 'completed', 'failed'
  const [annotationError, setAnnotationError] = useState<string | null>(null); // Store annotation errors
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID

  // Effect: Load title and start polling for annotated text
  useEffect(() => {
    setIsLoading(true);
    setAnnotationStatus('loading');
    let taskId = '';
    try {
      const title = sessionStorage.getItem('articleTitle') || 'Article Not Found';
      taskId = sessionStorage.getItem('annotationTaskId') || '';
      setArticleTitle(title);

      if (taskId) {
        setAnnotationStatus('annotating'); // Indicate that annotation is in progress
        startPolling(taskId);
      } else {
        console.warn("No annotation task ID found in session storage.");
        setAnnotationStatus('failed'); // No task ID, cannot proceed
        setAnnotationError("Annotation task ID missing.");
        setIsLoading(false);
      }

    } catch (error) {
        console.error("Error retrieving initial data:", error);
        setArticleTitle('Error Loading Article');
        setAnnotationStatus('failed');
        setAnnotationError('An error occurred preparing the annotation task.');
        setIsLoading(false);
    }

    // Cleanup function to stop polling when component unmounts
    return () => {
      stopPolling();
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Function to start polling for annotation status
  const startPolling = (taskId: string) => {
    stopPolling(); // Clear any existing interval first

    pollingIntervalRef.current = setInterval(async () => {
      try {
        console.log(`Polling for task ID: ${taskId}`);
        const response = await fetch(`/api/annotation-status/${taskId}`);
        if (!response.ok) {
          console.error(`Annotation status check failed with status: ${response.status}`);
          setAnnotationError(`Failed to check status (HTTP ${response.status}).`);
          setAnnotationStatus('failed');
          stopPolling();
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (data.status === 'completed') {
          console.log('Annotation completed!', data.annotated_text);
          setAnnotatedWorkText(data.annotated_text || "[Annotation process completed, but no text was returned.]");
          sessionStorage.setItem('annotatedWorkText', data.annotated_text || ''); // Store final version
          stopPolling();
          setAnnotationStatus('completed');
          setAnnotationError(null);
          setIsLoading(false);
        } else if (data.status === 'failed') {
          console.error('Annotation task failed:', data.error);
          setAnnotationError(data.error || 'Annotation failed for an unknown reason.');
          setAnnotationStatus('failed');
          stopPolling();
          setIsLoading(false);
        } else if (data.status === 'pending') {
          console.log('Annotation still pending...');
          setAnnotationStatus('annotating'); // Ensure status stays annotating
          setIsLoading(true); // Keep loading true while annotating
        } else {
           console.warn(`Unknown task status received: ${data.status}`);
           setAnnotationError(`Unknown task status: ${data.status}`);
           setAnnotationStatus('failed');
           stopPolling();
           setIsLoading(false);
        }
      } catch (error) {
        console.error('Error during polling:', error);
        setAnnotationError('An error occurred while checking annotation status.');
        setAnnotationStatus('failed');
        stopPolling();
        setIsLoading(false);
      }
    }, 4000); // Poll every 4 seconds (adjust as needed)
  };

  // Function to stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Polling stopped.");
    }
  };


  const handleTermClick = (term: string) => {
    setPopupContent(`Dummy info for: ${term}`);
    setIsPopupVisible(true);
  };

  const closePopup = () => {
    setIsPopupVisible(false);
    setPopupContent('');
  };

  // Function to parse and render segmented text
  const renderSegmentedText = (text: string | null, baseKey: string) => {
     if (text === null || text === undefined) return null;
     if (!text.includes("@@TERM@@") || text.startsWith("[AI")) {
         // Render potentially multi-line text correctly
         return text.split('\n').map((line, index) => (
             <Fragment key={`${baseKey}-frag-plain-${index}`}>{line}<br/></Fragment>
         ));
     }

     // Process lines containing annotations
     return text.split('\n').map((line, lineIndex) => {
         const parts = line.split(/(@@TERM@@|@@ENDTERM@@)/g);
         let isTerm = false;
         const lineElements = [];
         for (let i = 0; i < parts.length; i++) {
             const part = parts[i];
             if (part === '@@TERM@@') isTerm = true;
             else if (part === '@@ENDTERM@@') isTerm = false;
             else if (part) {
                 if (isTerm) {
                     lineElements.push(
                         <span
                             key={`${baseKey}-L${lineIndex}-term-${i}`}
                             // Default: inherit text color, cursor pointer. Hover: subtle background. No padding/margin change.
                             className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-sm transition-colors duration-150"
                             onClick={() => handleTermClick(part)}
                         >
                             {part}
                         </span>);
                 } else {
                      lineElements.push(<Fragment key={`${baseKey}-L${lineIndex}-frag-${i}`}>{part}</Fragment>);
                 }
             }
         }
         // Wrap the processed line elements in a Fragment or span, add <br/> for line breaks
         return <Fragment key={`${baseKey}-line-${lineIndex}`}>{lineElements}{lineIndex < text.split('\n').length - 1 ? <br/> : null}</Fragment>;
     });
  };


  // Function to render the main content area
  const renderContentArea = () => {
    if (isLoading || annotationStatus === 'loading' || annotationStatus === 'annotating') {
        return (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                 <svg className="animate-spin h-5 w-5 mr-3 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                {annotationStatus === 'loading' ? 'Loading article data...' : 'Extracting and annotating literary work...'}
            </div>
        );
    }

    if (annotationStatus === 'failed') {
        return (
             <div className="text-center p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm">
                Error: {annotationError || 'Failed to load or annotate article.'}
             </div>
        );
    }

    if (annotationStatus === 'completed' && annotatedWorkText) {
        // Render the single block of annotated text
        // Apply line-height for better readability if needed
        return <div className="whitespace-pre-wrap leading-relaxed">{renderSegmentedText(annotatedWorkText, 'work')}</div>;
    }

    // Fallback if status is completed but text is missing
    return <p className="text-center text-gray-500 dark:text-gray-400">Annotation complete, but no content received.</p>;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-16 md:p-24 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-12xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md relative mt-10 mb-10">
        <h1 className="text-6xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
          {articleTitle}
        </h1>

        {/* Render the content area based on status */}
        <div className="text-3xl text-left text-gray-700 dark:text-gray-300 space-y-4 article-content">
          {renderContentArea()}
        </div>

        {/* Placeholder for chat interface - Needs update to pass annotatedWorkText */}
        {/* <div className="mt-8 border-t pt-6"> ... Chat UI ... </div> */}
      </div>

      {/* Conditionally render the Popup */}
      {isPopupVisible && <Popup content={popupContent} onClose={closePopup} />}
    </main>
  );
}