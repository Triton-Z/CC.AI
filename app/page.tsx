"use client"; // Add this directive for client-side interactivity

import React, { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator
  const router = useRouter(); // Initialize router

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    // Clear error message when user starts typing again
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => { // Make async
    if (event.key === 'Enter') {
      event.preventDefault();
      const url = inputValue.trim();

      if (!url) {
        setErrorMessage('Please enter a URL.');
        return;
      }

      if (!url.startsWith('https://baike.baidu.com/item/')) {
        setErrorMessage('Please enter a valid Baidu Baike article link (starting with "https://baike.baidu.com/item/").');
        return;
      }

      // Clear previous errors and set loading state
      setErrorMessage('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/process-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: url }),
        });

        const result = await response.json();

        if (!response.ok) {
          // Handle errors from the backend API
          throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        // Backend successfully processed the URL, now navigate
        console.log('Backend success:', result.message);
        // Store the URL for the next page (optional, could use query params or state management)
        // For simplicity, we'll just navigate for now. The article page won't know the URL yet.
        router.push('/article');

      } catch (error) {
        console.error("Error processing URL:", error);
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false); // Reset loading state regardless of outcome
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-6">
          What will you learn today?
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Paste your Baidu article link here..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading} // Disable input while loading
            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              errorMessage
                ? 'border-red-500 focus:ring-red-500 dark:border-red-500 dark:focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-500'
            }`}
            aria-invalid={!!errorMessage}
            aria-describedby="link-error"
          />
          {isLoading && (
             <div className="absolute inset-y-0 right-0 flex items-center pr-3">
               <svg className="animate-spin h-5 w-5 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             </div>
           )}
        </div>
        {errorMessage && (
          <p id="link-error" className="mt-2 text-sm text-red-600 dark:text-red-400 text-left">
            {errorMessage}
          </p>
        )}
      </div>
    </main>
  );
}
