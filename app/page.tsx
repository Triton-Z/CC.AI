"use client"; 

import React, { useState, KeyboardEvent, useEffect } from 'react'; 
import { useRouter } from 'next/navigation'; 

declare const puter: any;

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  const router = useRouter(); 

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);

    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => { 
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

        const articleText = await fetchArticle.text();

        if (!fetchArticle.ok) {

          let errorMsg = `HTTP error! status: ${fetchArticle.status}`;
          try {
            const errorJson = JSON.parse(articleText);
            errorMsg = errorJson.error || errorMsg;
          } catch (e) {

             errorMsg = articleText.substring(0, 150) || errorMsg; 
          }
          throw new Error(errorMsg);
        }

        const fetchPrompt = await fetch("articlePrompt.txt");

        const prompt = await fetchPrompt.text();

        await puter.ai.chat([
            {
                role: 'system',
                content: prompt
            },
            {
                role: 'user',
                content: articleText
            }
        ], {
          model: "gpt-4o"
        })
        .then(response => {
          sessionStorage.setItem('entireArticle', articleText)
          sessionStorage.setItem('articleContent', response.message.content);

          router.push('/article');
        });  

        console.log('Backend success: Received article text.');

      } catch (error) {
        console.error("Error processing URL:", error);
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false); 
      }
    }
  };

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

                    dialog {
                        background: transparent;
                        border: none;
                        box-shadow: none;
                        outline: none;
                        padding: 1rem; 
                    }

                    .puter-dialog-content {
                        background-color: white;
                        border-radius: 0.75rem; 
                        padding: 2rem; 
                        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); 
                        color: #374151; 
                        position: relative;
                        border: 1px solid #e5e7eb; 

                        max-width: 500px; 
                        margin: auto; 
                        font-family: "Helvetica Neue", HelveticaNeue, Helvetica, Arial, sans-serif; 
                        -webkit-font-smoothing: antialiased; 
                    }

                    dialog * {
                        font-family: inherit;
                        box-sizing: border-box; 
                    }

                    .puter-dialog-content > a[href*="puter.com"] {
                        display: block;
                        width: 64px; 
                        height: 64px;
                        margin: 0 auto 1rem auto; 
                        border-radius: 0.375rem; 
                        outline: none;
                        border: none;
                    }

                    dialog p.about {
                        text-align: center;
                        font-size: 1rem; 
                        line-height: 1.5; 
                        color: #4b5563; 
                        padding: 0; 
                        margin: 20px auto 1.5rem auto; 
                    }

                    dialog .buttons {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 0.75rem; 
                        margin-top: 1.5rem; 
                        margin-bottom: 1rem; 
                        flex-wrap: wrap; 
                    }

                    dialog .button {
                        display: inline-flex; 
                        align-items: center;
                        justify-content: center;
                        padding: 0.625rem 1.25rem; 
                        font-size: 0.875rem; 
                        font-weight: 500; 
                        line-height: 1.25rem; 
                        border-radius: 0.375rem; 
                        border: 1px solid transparent; 
                        cursor: pointer;
                        text-align: center;
                        text-decoration: none;
                        outline: none;
                        transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                        -webkit-font-smoothing: antialiased;
                        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); 

                    }

                    dialog .button:focus-visible {
                        outline: 2px solid transparent;
                        outline-offset: 2px;
                        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5); 
                    }

                    #launch-auth-popup {
                        color: white;
                        background-color:rgb(238, 61, 49); 
                        border-color: transparent;

                    }
                    #launch-auth-popup:hover {
                        background-color: #d7281d; 
                    }
                    #launch-auth-popup:active {
                        background-color:rgb(185, 35, 24); 
                    }

                    dialog .button:disabled,
                    dialog .button.disabled,
                    dialog .button.is-disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        pointer-events: none;
                        box-shadow: none;

                    }

                    dialog a, dialog a:visited {
                        color: #d7281d; 
                        text-decoration: none;
                        font-weight: 500; 
                    }
                    dialog a:hover {
                        text-decoration: underline;
                        color:rgb(238, 62, 50); 
                    }
                    dialog a:focus-visible {
                        outline: 2px solid #93c5fd; 
                        outline-offset: 2px;
                        border-radius: 0.25rem; 
                    }
                    .puter-dialog-content a:focus{ 
                        outline: none;
                    }

                    p[style*="Powered by"] {
                        text-align: center;
                        font-size: 0.875rem; 
                        color: #6b7280; 
                        margin-top: 1rem; 
                        margin-bottom: 0;
                    }

                    .launch-auth-popup-footnote {
                        font-size: 0.75rem; 
                        color: #6b7280; 
                        position: absolute;
                        left: 1.5rem; 
                        right: 1.5rem;
                        bottom: 1rem; 
                        text-align: center;
                        line-height: 1.4;
                        margin: 0; 
                    }

                    dialog .close-btn {
                        position: absolute;
                        right: 0.75rem; 
                        top: 0.75rem;
                        font-size: 1rem; 
                        color: #9ca3af; 
                        background-color: transparent;
                        border: none;
                        padding: 0.25rem; 
                        line-height: 1;
                        cursor: pointer;
                        border-radius: 9999px; 
                        transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
                    }
                    dialog .close-btn:hover {
                        color: #4b5563; 
                        background-color: #f3f4f6; 
                    }
                    dialog .close-btn:focus-visible {
                        outline: 2px solid transparent;
                        outline-offset: 2px;
                        box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5); 
                    }

                    @media (max-width: 480px) {
                        .puter-dialog-content {
                            padding: 1.5rem; 

                            padding-bottom: 4.5rem; 
                        }
                        dialog .buttons {
                            flex-direction: column; 
                            gap: 0.5rem; 
                            width: 100%; 
                        }

                        dialog .button {
                            width: 100%;
                        }
                        .launch-auth-popup-footnote {
                            left: 1rem; 
                            right: 1rem;
                            bottom: 0.75rem; 
                        }
                        dialog p.about {
                            margin-bottom: 1rem;
                            max-width: 100%;
                        }
                    }

                    .button-action, .button-danger, .button-primary, .button-block,
                    .button-giant, .button-jumbo, .button-large, .button-normal,
                    .button-small, .button-tiny,
                    dialog .button-auth 
                    {

                    }

                    .error-container h1 { display: none; }
                `;
                }

                if (logo) {
                  logo.removeAttribute("href");

                  const img = logo.children[0] as HTMLImageElement;
                  img.src = ""; 
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

        console.log("Home Page: Sending test message via Puter...");
        if (puter && puter.ai && typeof puter.ai.chat === 'function') {
            puter.ai.chat("Knock knock!") 
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

    const checkPuterAndInit = () => {
        if (typeof puter !== 'undefined') {
            console.log("Home Page: Puter JS object found.");
            setupPuterObserver();
        } else {
            console.warn("Home Page: Puter JS object not found yet, retrying...");
            puterCheckTimer = setTimeout(checkPuterAndInit, 100); 
        }
    };

    const setup = window.localStorage.getItem("puter.auth.token")
    if (!setup) checkPuterAndInit(); 

    return () => {
      if (observer) {
        console.log("Home Page: Disconnecting Puter dialog observer.");
        observer.disconnect();
      }
      if (puterCheckTimer) {
        clearTimeout(puterCheckTimer);
      }
    };
  }, []); 

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
            disabled={isLoading} 
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