# Downloading modules in deployment:
# "flask-dev": "pip3 install -r requirements.txt && python3 -m flask --app api/index run -p 5328"

from flask import Flask, request, jsonify
import httpx
import logging
from bs4 import BeautifulSoup, Tag
from g4f.client import Client
import time
import traceback
import uuid
import threading
from typing import Dict, Any, List, Tuple

# Configure basic logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

# --- In-memory Task Store ---
tasks: Dict[str, Dict[str, Any]] = {}
tasks_lock = threading.Lock()

# --- Initialize g4f client globally ---
g4f_client_global = None
try:
    g4f_client_global = Client()
    logging.info("g4f client initialized successfully at startup.")
except Exception as e:
    logging.error(f"Failed to initialize g4f client on startup: {e}. Will attempt per-request initialization.")

def get_g4f_client():
    """Helper function to get the global client or try creating one per request."""
    if g4f_client_global:
        return g4f_client_global
    else:
        logging.warning("g4f client not initialized at startup, attempting to create now.")
        try:
            temp_client = Client()
            logging.info("Temporary g4f client created successfully for request.")
            return temp_client
        except Exception as client_exc:
             logging.error(f"Failed to create g4f client for request: {client_exc}")
             return None

# --- Background AI Extraction and Annotation Function ---
def run_ai_extraction_annotation(task_id: str, full_html_text: str, article_title: str):
    global tasks
    logging.info(f"[Task {task_id}] Starting background extraction & annotation.")

    ai_client = get_g4f_client()
    if not ai_client:
        error_message = "Background task failed: g4f client unavailable."
        logging.error(f"[Task {task_id}] {error_message}")
        with tasks_lock:
            tasks[task_id].update({"status": "failed", "error": error_message})
        return

    try:
        start_time_total = time.time()

        # --- Construct the complex prompt for Extraction & Annotation ---
        # We need to provide enough context for the AI to find the work.
        # Sending the full HTML might be too much. Let's extract all text first.
        try:
            soup = BeautifulSoup(full_html_text, "html.parser")
            # Extract text from relevant parts, maybe main content area if identifiable
            # Or just extract all text as a simpler approach for context
            all_text_content = soup.get_text(separator='\n', strip=True)
            if not all_text_content:
                 raise ValueError("Could not extract any text content from the HTML.")
            logging.info(f"[Task {task_id}] Extracted text content for AI context (length: {len(all_text_content)}).")
        except Exception as parse_exc:
             raise ValueError(f"Failed to parse HTML content: {parse_exc}")


        # Define the complex prompt
        extraction_annotation_prompt = [
            {
                "role": "system",
                "content": (
                    f"You are an expert linguist helping English speakers learn Chinese. You will receive an entire webscraped article about {article_title}. As the webscraped text would be hard to understand, there is a term in front of each line, used to label what kind of line it is. It can be HEADING, SUBHEADING, or TEXT; use this to better understand the article. The article is generally about a a piece of Chinese literature; your primary goal is to find and locate the piece of literature (it's typically the text under a header of 原文, 全文, or something similar). After finding the piece of literature, separate every individual Chinese term (subject, adverb, verb, compliment, object, etc) in the format @@TERM@@ term itself @@ENDTERM@@ for the piece of literature. For example, if the piece contained the term '房子', you would format it as @@TERM@@房子@@ENDTERM@@. Additionally, please keep this formatting the same for all of the terms. After annotating every term inside the piece of literature, format the entire piece of literature to the best of your ability (adding things like line breaks to improve readability), and only return the annotated literature (disregard other parts of the article). Do not add any additional comments or information, only the annotated literature."
                )
            },
            {
                "role": "user",
                "content": f"Here is the article (please note that the first line with the TEXT term is part of the description of the article, and not a part of the actual literature):\n{all_text_content}" # Provide extracted text
            }
        ]

        logging.info(f"[Task {task_id}] Sending extraction & annotation prompt to g4f...")
        # This single call performs the complex task. Timeout needs to be sufficient.
        ai_response = ai_client.chat.completions.create(
            model="gpt-4o", # Consider if a more powerful model is needed
            messages=extraction_annotation_prompt,
            web_search=False
            # Timeout is handled by the underlying g4f provider/library settings
        )
        end_time_total = time.time()
        logging.info(f"[Task {task_id}] Received response from g4f in {end_time_total - start_time_total:.2f} seconds.")

        annotated_literary_work = ai_response.choices[0].message.content.strip()

        logging.info(f"[Task {task_id}] Successfully received annotated literary work.")


        # --- Store Result ---
        with tasks_lock:
            tasks[task_id].update({"status": "completed", "result": annotated_literary_work}) # Store the annotated text block

    except Exception as e:
        error_message = f"Error during background extraction/annotation: {e}"
        logging.error(f"[Task {task_id}] {error_message}")
        logging.error(traceback.format_exc())
        with tasks_lock:
            tasks[task_id].update({"status": "failed", "error": error_message})

# --- End Background Function ---


@app.route("/api/process-url", methods=['POST'])
def process_url_async():
    """
    Accepts a URL, fetches content, starts background AI extraction/annotation task,
    and returns immediately with a task ID and title.
    """
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "Missing 'url' in request body"}), 400

    url_to_fetch = data['url']
    logging.info(f"Received request to process URL (async extraction): {url_to_fetch}")

    if not url_to_fetch.startswith("https://baike.baidu.com/item/"):
         return jsonify({"error": "Invalid URL format. Must be a Baidu Baike item URL."}), 400

    headers = {"User-Agent": "curl/7.79.1", "Accept": "*/*"}

    try:
        # Fetching (keep timeout reasonable for initial fetch)
        with httpx.Client(http2=True, headers=headers, timeout=15.0, follow_redirects=True) as http_client:
            logging.info(f"Attempting to fetch URL: {url_to_fetch}")
            response = http_client.get(url_to_fetch)
            response.raise_for_status()
            html_content = response.text # Get the full HTML
            logging.info(f"Successfully fetched URL: {url_to_fetch}. Status code: {response.status_code}")

        # --- Basic Parsing for Title Only ---
        parser = BeautifulSoup(html_content, "html.parser")
        title_element = parser.find("h1", class_="J-lemma-title") or parser.find("h1", class_="lemmaTitle_zwG49")
        article_title = title_element.get_text(strip=True) if title_element else "Title Not Found"
        logging.info(f"Extracted title: {article_title}")
        # --- End Basic Parsing ---

        # --- Start Background Task ---
        task_id = str(uuid.uuid4())
        with tasks_lock:
            tasks[task_id] = {"status": "pending", "result": None, "error": None}

        # Pass the full HTML text to the background task
        thread = threading.Thread(target=run_ai_extraction_annotation, args=(task_id, html_content, article_title))
        thread.daemon = True
        thread.start()
        logging.info(f"Started background extraction/annotation task with ID: {task_id}")
        # --- End Background Task ---

        # --- Immediate Response ---
        # Return only title and task ID. Content will be fetched via status endpoint.
        return jsonify({
            "success": True,
            "message": "Article fetch accepted. Extraction and annotation started in background.",
            "title": article_title,
            "task_id": task_id # ID for frontend to poll
        }), 202 # 202 Accepted

    except httpx.RequestError as exc:
        logging.error(f"An error occurred while requesting {exc.request.url!r}: {exc}")
        return jsonify({"error": f"Could not fetch URL: Request error - {exc}"}), 500
    except httpx.HTTPStatusError as exc:
        logging.error(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}: {exc.response.text}")
        return jsonify({"error": f"Could not fetch URL: HTTP error {exc.response.status_code}"}), 500
    except Exception as exc:
        logging.error(f"An unexpected error occurred in process_url_async: {exc}")
        logging.error(traceback.format_exc())
        return jsonify({"error": f"An unexpected error occurred processing the article."}), 500


@app.route("/api/annotation-status/<task_id>", methods=['GET'])
def get_annotation_status(task_id: str):
    """
    Checks the status of a background task.
    Returns the annotated literary work text on completion.
    """
    global tasks
    with tasks_lock:
        task = tasks.get(task_id)

    if not task:
        return jsonify({"error": "Task ID not found."}), 404

    response_data = {"task_id": task_id, "status": task["status"]}

    if task["status"] == "completed":
        # Result is now expected to be the single annotated text block
        response_data["annotated_text"] = task.get("result")
    elif task["status"] == "failed":
        response_data["error"] = task.get("error")

    # Optional: Clean up task entry after retrieval?
    # if task["status"] in ["completed", "failed"]:
    #     with tasks_lock:
    #         tasks.pop(task_id, None) # Remove task after it's fetched

    return jsonify(response_data), 200


@app.route("/api/chat", methods=['POST'])
def handle_chat():
    """
    Accepts a user message and the *annotated literary work* as context.
    (Frontend needs to be updated to send this instead of elements).
    """
    chat_client = get_g4f_client()

    data = request.get_json()
    # Expect title and the annotated_text now
    if not data or 'message' not in data or 'title' not in data or 'annotated_text' not in data:
        return jsonify({"error": "Missing 'message', 'title', or 'annotated_text' in request body"}), 400

    user_message = data['message']
    article_title = data['title']
    # Use the annotated literary work directly as context
    article_context = data['annotated_text']
    logging.info(f"Received chat request: {user_message}")

    if not chat_client:
        logging.error("g4f client not available for chat request.")
        return jsonify({"error": "AI assistant client is not available."}), 500

    try:
        logging.info("Using g4f client for chat.")
        # Update system prompt to reflect the context is the annotated work
        system_prompt_content = (
            f"You are a helpful assistant discussing the original literary work titled '{article_title}'. "
            f"The work is provided below, potentially with term annotations like @@TERM@@term@@ENDTERM@@ which you can interpret as highlighted terms. "
            f"Focus your discussion on this provided text.\n\n{article_context}"
        )
        prompt_messages = [
            {"role": "system", "content": system_prompt_content},
            {"role": "user", "content": user_message}
        ]
        response = chat_client.chat.completions.create(
            model="gpt-4o-mini", messages=prompt_messages, web_search=False
        )
        logging.info("g4f chat response received.")
        ai_response = response.choices[0].message.content
        return jsonify({"success": True, "reply": ai_response}), 200

    except Exception as exc:
        logging.error(f"Error during g4f chat completion: {exc}")
        logging.error(traceback.format_exc())
        return jsonify({"error": "Failed to get response from AI assistant."}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5328, threaded=True)