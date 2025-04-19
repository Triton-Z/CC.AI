"use client"; // Make it a client component to use hooks

import React, { useState, useEffect } from 'react';

// Define the structure for article elements received from backend
interface ArticleElement {
  type: 'HEADER' | 'SUBHEADING' | 'TEXT';
  text: string;
}

// Declare puter for TypeScript - assumes the script in layout.tsx has loaded it globally
declare const puter: any;

export default function ArticlePage() {
  const [articleTitle, setArticleTitle] = useState('Loading title...');
  const [articleStructure, setArticleStructure] = useState<ArticleElement[]>([]);
  const [isPuterReady, setIsPuterReady] = useState(false); // Track if puter object is available

  // Effect to load data from sessionStorage
  useEffect(() => {
    const title = sessionStorage.getItem('articleTitle') || 'Article Not Found';
    const structureString = sessionStorage.getItem('articleStructure');
    let structure: ArticleElement[] = [];

    if (structureString) {
      try {
        structure = JSON.parse(structureString);
        if (!Array.isArray(structure)) { // Basic validation
             console.error("Parsed structure is not an array:", structure);
             structure = [{ type: 'TEXT', text: 'Error: Invalid article structure format.' }];
        }
      } catch (e) {
        console.error("Failed to parse article structure from sessionStorage:", e);
        structure = [{ type: 'TEXT', text: 'Error loading article structure.' }];
      }
    } else {
       console.warn("Article structure not found in sessionStorage.");
       structure = [{ type: 'TEXT', text: 'Article structure not found.' }];
    }

    setArticleTitle(title);
    setArticleStructure(structure);

    // Check if Puter is loaded after a short delay
    const checkPuter = () => {
        if (typeof puter !== 'undefined') {
            console.log("Puter JS object found.");
            setIsPuterReady(true);
        } else {
            console.warn("Puter JS object not found yet.");
        }
    };
    checkPuter(); // Check immediately
    const timerId = setTimeout(checkPuter, 500); // Check again

    return () => clearTimeout(timerId); // Cleanup timer

  }, []); // Runs once on mount

  // Removed the useEffect hook that contained the MutationObserver and test call


  // Function to render the article based on the structure
  const renderArticleContent = () => {
    if (!articleStructure || articleStructure.length === 0 || articleStructure[0].text.startsWith('Error')) {
      const message = articleStructure.length > 0 ? articleStructure[0].text : 'Loading article content...';
      return <p className="text-gray-500 dark:text-gray-400">{message}</p>;
    }

    return articleStructure.map((element, index) => {
      switch (element.type) {
        case 'HEADER':
          return <h2 key={index} className="text-2xl font-semibold mt-6 mb-3 text-gray-800 dark:text-white">{element.text}</h2>;
        case 'SUBHEADING':
          return <h3 key={index} className="text-xl font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-300">{element.text}</h3>;
        case 'TEXT':
        default:
          return element.text.split('\n').map((paragraph, pIndex) => (
            paragraph.trim() ? <p key={`${index}-${pIndex}`} className="text-2xl mb-3 text-gray-700 dark:text-gray-300">{paragraph}</p> : null
          )).filter(p => p !== null);
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-16 md:p-24 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h1 className="text-6xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
          {articleTitle}
        </h1>
        <div className="text-left space-y-2">
          {renderArticleContent()}
        </div>
      </div>
    </main>
  );
}