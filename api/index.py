# Downloading modules in deployment:
# "flask-dev": "pip3 install -r requirements.txt && python3 -m flask --app api/index run -p 5328"

from flask import Flask, request, jsonify
import httpx
import logging
from bs4 import BeautifulSoup

# Configure basic logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

@app.route("/api/python")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/api/process-url", methods=['POST'])
def process_url():
    """
    Accepts a URL via POST request, fetches its content using httpx,
    and returns a success/failure status.
    """
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "Missing 'url' in request body"}), 400

    url_to_fetch = data['url']
    logging.info(f"Received request to process URL: {url_to_fetch}")

    # Basic validation (can be expanded)
    if not url_to_fetch.startswith("https://baike.baidu.com/item/"):
         return jsonify({"error": "Invalid URL format. Must be a Baidu Baike item URL."}), 400

    headers = {
        "User-Agent": "curl/7.79.1", # Using a common user agent
        "Accept": "*/*",
    }

    try:
        with httpx.Client(http2=True, headers=headers, timeout=10.0, follow_redirects=True) as client:
            logging.info(f"Attempting to fetch URL: {url_to_fetch}")
            response = client.get(url_to_fetch)
            response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

            # For now, we just log success and don't process r.text
            logging.info(f"Successfully fetched URL: {url_to_fetch}. Status code: {response.status_code}")
            # In the future, you might process response.text here
            parser = BeautifulSoup(response.text, "html.parser")
            content = str(parser.find("div", class_="catalog_VTBTt"))

            if not "原文" in content:
                logging.info("The page does not contain the expected content.")
                return jsonify({"error": "The page does not contain the expected content (原文)"}), 400

            return jsonify({"success": True, "message": "URL fetched successfully"}), 200
    except httpx.RequestError as exc:
        logging.error(f"An error occurred while requesting {exc.request.url!r}: {exc}")
        return jsonify({"error": f"Could not fetch URL: Request error - {exc}"}), 500
    except httpx.HTTPStatusError as exc:
        logging.error(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}: {exc.response.text}")
        return jsonify({"error": f"Could not fetch URL: HTTP error {exc.response.status_code}"}), 500
    except Exception as exc:
        logging.error(f"An unexpected error occurred: {exc}")
        return jsonify({"error": f"An unexpected error occurred: {exc}"}), 500

if __name__ == "__main__":
    # This is useful for local development if not using `flask run`
    # Note: Vercel deployment uses a WSGI server, not this block.
    app.run(debug=True, port=5328)