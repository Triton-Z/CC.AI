"use client"; // Make it a client component to use hooks

import React, { useState, useEffect } from 'react';

// Removed ArticleElement interface and puter declaration

export default function ArticlePage() {
  // State now holds the raw text content
  const [articleContent, setArticleContent] = useState('Loading article...');

  // Effect to load the raw text from sessionStorage
  useEffect(() => {
    const content = sessionStorage.getItem('articleContent') || 'Article content not found in session.';
    setArticleContent(content);
  }, []); // Runs once on mount

  // Simple rendering: Split the text by newlines and render each line as a paragraph
  const renderPlainText = () => {
    if (!articleContent || articleContent === 'Loading article...') {
      return <p className="text-gray-500 italic">{articleContent}</p>;
    }

    // Split content into lines, filter out potential empty lines from split
    const lines = articleContent.split('\n').filter(line => line.trim() !== '');

    // The first line is assumed to be the title
    const title = lines.length > 0 ? lines[0] : 'Article';
    // The rest are content paragraphs
    const contentLines = lines.slice(1);

    return (
      <>
        {/* Display Title */}
        <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
          {title}
        </h1>
        {/* Display Content Paragraphs */}
        <div className="text-left text-gray-700 dark:text-gray-300 space-y-3">
          {contentLines.length > 0 ? (
            contentLines.map((line, index) => (
              // Render each line as a paragraph with consistent styling
              <p key={index} className="text-base mb-3">{line}</p> // Use consistent text size
            ))
          ) : (
             <p className="text-gray-500 italic">No main content found after title.</p>
          )}
        </div>
      </>
    );
  };


  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-16 md:p-24 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        {/* Render the plain text content */}
        {renderPlainText()}
      </div>
    </main>
  );
}