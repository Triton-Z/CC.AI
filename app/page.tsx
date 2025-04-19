"use client"; // Add this directive for client-side interactivity

import React, { useState, KeyboardEvent, useEffect } from 'react'; // Added useEffect
import { useRouter } from 'next/navigation';

// Declare puter for TypeScript
declare const puter: any;

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
        const fetchArticle = await fetch('/api/process-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: url }),
        });

        const article = await fetchArticle.json();

        if (!fetchArticle.ok) {
          // Handle errors from the backend API
          throw new Error(article.error || `HTTP error! status: ${fetchArticle.status}`);
        }

        const fetchPrompt = await fetch("prompt.txt");

        const prompt = await fetchPrompt.text();

        if (!fetchPrompt.ok) {
          // Handle errors from the backend API
          throw new Error(article.error || `HTTP error! status: ${fetchPrompt.status}`);
        }

        puter.ai.chat([
          {
              role: 'system',
              content: prompt
          },
          {
              role: 'user',
              content: 'What are you'
          }
      ])

        // Backend successfully processed the URL, now navigate
        console.log('Backend success:', article.message, 'Title:', article.title);
        // Store title and the full structure (as JSON string) in sessionStorage
        sessionStorage.setItem('articleTitle', article.title || 'Title Not Found');
        // Convert structure array to JSON string for storage
        sessionStorage.setItem('articleStructure', JSON.stringify(article.full_structure || []));
        // Navigate to the article page without query parameters

        router.push('/article');

      } catch (error) {
        console.error("Error processing URL:", error);
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false); // Reset loading state regardless of outcome
      }
    }
  };

  // --- Add Effect for Puter Observer and Test Call ---
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let puterCheckTimer: NodeJS.Timeout | null = null;

    const setupPuterObserver = () => {
        console.log("Home Page: Setting up MutationObserver for Puter dialog...");

        observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === "PUTER-DIALOG") {
                const style = document.getElementsByTagName("puter-dialog")[0].shadowRoot?.children[0];
                const dialog = document.getElementsByTagName("puter-dialog")[0].shadowRoot?.children[1]?.children[0];

                const logo = dialog?.children[1];
                const exit = dialog?.children[0];
                const accept = dialog?.children[3].children[1] as HTMLElement;
                const cancel = dialog?.children[3].children[0];
                const powered = dialog?.children[4];
                const about = dialog?.children[2];
                const footer = dialog?.children[5];

                if (style) {
                  style.innerHTML = `
                    /* Reset/Base for Dialog */
                    dialog {
                        background: transparent;
                        border: none;
                        box-shadow: none;
                        outline: none;
                        padding: 1rem; /* Add padding for spacing from viewport edges */
                    }

                    /* Main Dialog Content Box - Tailwind Inspired */
                    .puter-dialog-content {
                        background-color: white;
                        border-radius: 0.75rem; /* Tailwind: rounded-lg */
                        padding: 2rem; /* Tailwind: p-8 */
                        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); /* Tailwind: shadow-lg */
                        color: #374151; /* Tailwind: text-gray-700 */
                        position: relative;
                        border: 1px solid #e5e7eb; /* Tailwind: border border-gray-200 */
                        /* Removed background image */
                        max-width: 500px; /* Keep max-width constraint */
                        margin: auto; /* Center the dialog content */
                        font-family: "Helvetica Neue", HelveticaNeue, Helvetica, Arial, sans-serif; /* Keep font stack */
                        -webkit-font-smoothing: antialiased; /* Keep font smoothing */
                    }

                    /* Apply font stack to all children */
                    dialog * {
                        font-family: inherit;
                        box-sizing: border-box; /* Better box model */
                    }

                    /* Logo Link & Image */
                    .puter-dialog-content > a[href*="puter.com"] {
                        display: block;
                        width: 64px; /* Slightly smaller */
                        height: 64px;
                        margin: 0 auto 1rem auto; /* Center and add bottom margin */
                        border-radius: 0.375rem; /* Tailwind: rounded-md */
                        outline: none;
                        border: none;
                    }

                    /* About Paragraph */
                    dialog p.about {
                        text-align: center;
                        font-size: 1rem; /* Tailwind: text-base */
                        line-height: 1.5; /* Tailwind: leading-relaxed */
                        color: #4b5563; /* Tailwind: text-gray-600 */
                        padding: 0; /* Remove specific padding */
                        margin: 20px auto 1.5rem auto; /* Center text block */
                    }

                    /* Buttons Container */
                    dialog .buttons {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 0.75rem; /* Tailwind: gap-3 */
                        margin-top: 1.5rem; /* Tailwind: mt-6 */
                        margin-bottom: 1rem; /* Tailwind: mb-4 */
                        flex-wrap: wrap; /* Keep wrapping for safety */
                    }

                    /* Base Button Styles - Simplified */
                    dialog .button {
                        display: inline-flex; /* Use flex for alignment */
                        align-items: center;
                        justify-content: center;
                        padding: 0.625rem 1.25rem; /* Tailwind: py-2.5 px-5 */
                        font-size: 0.875rem; /* Tailwind: text-sm */
                        font-weight: 500; /* Tailwind: font-medium */
                        line-height: 1.25rem; /* Tailwind: leading-5 */
                        border-radius: 0.375rem; /* Tailwind: rounded-md */
                        border: 1px solid transparent; /* Base border */
                        cursor: pointer;
                        text-align: center;
                        text-decoration: none;
                        outline: none;
                        transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                        -webkit-font-smoothing: antialiased;
                        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* Tailwind: shadow-sm */
                        /* Remove old background gradients, shadows, specific heights */
                    }

                    /* Focus Visible State (Accessibility) */
                    dialog .button:focus-visible {
                        outline: 2px solid transparent;
                        outline-offset: 2px;
                        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5); /* Tailwind: ring-blue-300 */
                    }

                    /* Continue Button (Primary Look) */
                    #launch-auth-popup {
                        color: white;
                        background-color:rgb(238, 61, 49); /* Tailwind: bg-blue-500 */
                        border-color: transparent;
                        /* Removed inline width/margin/font styles, handled by button base/container */
                    }
                    #launch-auth-popup:hover {
                        background-color: #d7281d; /* Tailwind: hover:bg-blue-600 */
                    }
                    #launch-auth-popup:active {
                        background-color:rgb(185, 35, 24); /* Tailwind: active:bg-blue-700 */
                    }

                    /* Disabled Button State */
                    dialog .button:disabled,
                    dialog .button.disabled,
                    dialog .button.is-disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        pointer-events: none;
                        box-shadow: none;
                        /* Simplified from old complex styles */
                    }

                    /* Link Styles */
                    dialog a, dialog a:visited {
                        color: #d7281d; /* Tailwind: text-blue-500 */
                        text-decoration: none;
                        font-weight: 500; /* Tailwind: font-medium */
                    }
                    dialog a:hover {
                        text-decoration: underline;
                        color:rgb(238, 62, 50); /* Tailwind: hover:text-blue-600 */
                    }
                    dialog a:focus-visible {
                        outline: 2px solid #93c5fd; /* Tailwind blue-300 */
                        outline-offset: 2px;
                        border-radius: 0.25rem; /* Tailwind: rounded-sm */
                    }
                    .puter-dialog-content a:focus{ /* Keep this specific override */
                        outline: none;
                    }

                    /* Powered By Paragraph */
                    p[style*="Powered by"] {
                        text-align: center;
                        font-size: 0.875rem; /* Tailwind: text-sm */
                        color: #6b7280; /* Tailwind: text-gray-500 */
                        margin-top: 1rem; /* Tailwind: mt-4 */
                        margin-bottom: 0;
                    }

                    /* Footnote Paragraph */
                    .launch-auth-popup-footnote {
                        font-size: 0.75rem; /* Tailwind: text-xs */
                        color: #6b7280; /* Tailwind: text-gray-500 */
                        position: absolute;
                        left: 1.5rem; /* Tailwind: px-6 */
                        right: 1.5rem;
                        bottom: 1rem; /* Tailwind: pb-4 */
                        text-align: center;
                        line-height: 1.4;
                        margin: 0; /* Remove default margin */
                    }

                    /* Close Button */
                    dialog .close-btn {
                        position: absolute;
                        right: 0.75rem; /* Tailwind: top-3 right-3 */
                        top: 0.75rem;
                        font-size: 1rem; /* Tailwind: text-base */
                        color: #9ca3af; /* Tailwind: text-gray-400 */
                        background-color: transparent;
                        border: none;
                        padding: 0.25rem; /* Tailwind: p-1 */
                        line-height: 1;
                        cursor: pointer;
                        border-radius: 9999px; /* Tailwind: rounded-full */
                        transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
                    }
                    dialog .close-btn:hover {
                        color: #4b5563; /* Tailwind: hover:text-gray-600 */
                        background-color: #f3f4f6; /* Tailwind: hover:bg-gray-100 */
                    }
                    dialog .close-btn:focus-visible {
                        outline: 2px solid transparent;
                        outline-offset: 2px;
                        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5); /* Match button focus */
                    }


                    /* Responsive Adjustments */
                    @media (max-width: 480px) {
                        .puter-dialog-content {
                            padding: 1.5rem; /* Tailwind: p-6 */
                            /* Ensure footnote doesn't overlap buttons */
                            padding-bottom: 4.5rem; /* Adjust as needed */
                        }
                        dialog .buttons {
                            flex-direction: column; /* Stack buttons vertically */
                            gap: 0.5rem; /* Tailwind: gap-2 */
                            width: 100%; /* Make container full width */
                        }
                        /* Make buttons full width on mobile */
                        dialog .button {
                            width: 100%;
                        }
                        .launch-auth-popup-footnote {
                            left: 1rem; /* Tailwind: px-4 */
                            right: 1rem;
                            bottom: 0.75rem; /* Tailwind: pb-3 */
                        }
                        dialog p.about {
                            margin-bottom: 1rem;
                            max-width: 100%;
                        }
                    }

                    /* Remove unused complex styles */
                    .button-action, .button-danger, .button-primary, .button-block,
                    .button-giant, .button-jumbo, .button-large, .button-normal,
                    .button-small, .button-tiny,
                    dialog .button-auth /* Handled by button base and container gap */
                    {
                        /* Styles for these are now handled by base .button and specific IDs/classes above */
                        /* Or they are simply removed if not needed */
                    }
                    /* Remove error styles if not used */
                    .error-container h1 { display: none; }
                `;
                }

                if (logo) {
                  logo.removeAttribute("href");

                  const img = logo.children[0] as HTMLImageElement;
                  img.src = ""; //Remove image; just setting image will briefly flicker the original image, as the image takes time to load
                  img.src = "logo.png";
                  img.style.margin = "10px auto";
                }
                
                if (exit) {
                  exit.remove();
                }

                if (accept) {
                  accept.innerHTML = "Got it!";
                  accept.style.width = "100%";
                }

                if (cancel) {
                  cancel.remove();
                }

                if (powered) {
                  powered.remove();
                }     

                if (about) {
                  about.innerHTML = "This website uses <a href = 'https://docs.puter.com/' target = '_blank'>Puter.js</a> to bring you safe, secure, and reliable AI resources.";
                }

                if (footer) {
                  footer.remove();
                }
              }
            });
          });
        });

        observer.observe(document.body, { childList: true, subtree: false });

        // --- Send Test Message ---
        console.log("Home Page: Sending test message via Puter...");
        if (puter && puter.ai && typeof puter.ai.chat === 'function') {
            puter.ai.chat("Knock knock!") // Specific test message for this page
              .then((response: any) => {
                console.log("Home Page Puter AI Response:", response?.message?.content || 'No content');
              })
              .catch((error: any) => {
                console.error("Home Page Puter AI Error:", error);
              });
        } else {
            console.error("Home Page: puter.ai.chat function not found.");
        }
    };

    // Check if Puter is loaded, then setup observer and send message
    const checkPuterAndInit = () => {
        if (typeof puter !== 'undefined') {
            console.log("Home Page: Puter JS object found.");
            setupPuterObserver();
        } else {
            console.warn("Home Page: Puter JS object not found yet, retrying...");
            puterCheckTimer = setTimeout(checkPuterAndInit, 100); // Retry after delay
        }
    };

    const setup = window.localStorage.getItem("puter.auth.token")
    if (!setup) checkPuterAndInit(); // Start the check

    // Cleanup function
    return () => {
      if (observer) {
        console.log("Home Page: Disconnecting Puter dialog observer.");
        observer.disconnect();
      }
      if (puterCheckTimer) {
        clearTimeout(puterCheckTimer);
      }
    };
  }, []); // Run only once on mount

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
