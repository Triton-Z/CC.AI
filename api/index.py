from flask import Flask, request, jsonify
import httpx
import logging
import time
from bs4 import BeautifulSoup, Tag 

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

@app.route("/api/python")
def hello_world():

    return "<p>Hello, World!</p>"

@app.route("/api/process-url", methods=['POST'])
def process_url():
    """
    Accepts a URL, fetches content, parses using data-tag attributes,
    and returns title and the structured content.
    """
    start_process_time = time.time()

    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "Missing 'url' in request body"}), 400

    url_to_fetch = data['url']
    logging.info(f"Received request to process URL: {url_to_fetch}")

    if not url_to_fetch.startswith("https://baike.baidu.com/item/"):
         return jsonify({"error": "Invalid URL format. Must be a Baidu Baike item URL."}), 400

    headers = {
        "User-Agent": "curl/7.79.1", 
        "Accept": "*/*",
    }

    try:

        with httpx.Client(http2=True, headers=headers, timeout=20.0, follow_redirects=True) as http_client:
            logging.info(f"Attempting to fetch URL: {url_to_fetch}")
            fetch_start_time = time.time()
            response = http_client.get(url_to_fetch)
            response.raise_for_status() 
            fetch_end_time = time.time()
            logging.info(f"Successfully fetched URL in {fetch_end_time - fetch_start_time:.2f}s. Status: {response.status_code}")

        parse_start_time = time.time()
        soup = BeautifulSoup(response.text, "html.parser")

        title_element = soup.find("h1", class_="J-lemma-title")

        article_title = title_element.get_text(strip=True) if title_element else "Title Not Found"
        logging.info(f"Extracted title: {article_title}")

        tagged_elements = soup.find_all(attrs={"data-tag": True})
        logging.info(f"Found {len(tagged_elements)} elements with data-tag.")

        full_structure = []

        for element in tagged_elements:

            if not isinstance(element, Tag):
                continue

            data_tag = element.get("data-tag")
            if data_tag == "ref": continue 

            level = element.get("data-level")

            element_type = "TEXT"
            if level:
                try:
                    level_int = int(level)
                    if level_int == 1:
                        element_type = "HEADER"
                    elif level_int > 1:
                        element_type = "SUBHEADING"
                except ValueError:
                    logging.warning(f"Invalid data-level '{level}' found. Treating as TEXT.")

            text = element.get_text()

            if "播报编辑" in text:
                text = text[:text.index("播报编辑")]
            text = text.strip() 

            if not text: continue 

            full_structure.append({"type": element_type, "text": text})

        parse_end_time = time.time()
        logging.info(f"Parsing completed in {parse_end_time - parse_start_time:.2f}s. Found {len(full_structure)} structural elements.")

        end_process_time = time.time()
        logging.info(f"Total processing time for {url_to_fetch}: {end_process_time - start_process_time:.2f}s")

        if not full_structure:
             logging.warning(f"Parsing resulted in empty structure for {url_to_fetch}.")

             return jsonify({"error": "Failed to parse article structure."}), 500

        response_lines = [f"TITLE {article_title}", ""] 
        for element in full_structure:

            response_lines.append(f"{element['type']} {element['text']}")

        response_text = "\n".join(response_lines)

        return response_text, 200, {'Content-Type': 'text/plain; charset=utf-8'}

    except httpx.RequestError as exc:
        logging.error(f"An error occurred while requesting {exc.request.url!r}: {exc}")
        return jsonify({"error": f"Could not fetch URL: Request error - {exc}"}), 500
    except httpx.HTTPStatusError as exc:
        logging.error(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}: {exc.response.text[:500]}") 
        error_detail = f"HTTP error {exc.response.status_code}"
        try:
            baidu_error = exc.response.json()
            error_detail += f" - {baidu_error.get('error_msg', 'Unknown Baidu error')}"
        except Exception:
             if "html" in exc.response.headers.get("content-type", "").lower():
                 error_detail += " - Received HTML error page from Baidu."
             else:
                 error_detail += f" - Response: {exc.response.text[:200]}..."
        return jsonify({"error": f"Could not fetch URL: {error_detail}"}), 500
    except Exception as exc:
        logging.exception(f"An unexpected error occurred in process_url for {url_to_fetch}") 
        return jsonify({"error": f"An unexpected server error occurred."}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5328)