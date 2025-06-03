from flask import Flask, render_template, request, send_from_directory, jsonify
from pythonosc import udp_client
import toml  # Replace json with toml
import os
import requests
import logging
import sys
import webbrowser
import threading
import time
import json  # Keep json for API requests

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add this function to get the correct resource path
def resource_path(relative_path):
    """ Get the correct resource path, suitable for both development and packaged environments """
    if getattr(sys, 'frozen', False):
        # Running in packaged environment
        base_path = os.path.dirname(sys.executable)
    else:
        # Running in development environment
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    return os.path.join(base_path, relative_path)

def load_config(file_path):
    """Load TOML configuration file"""
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            config = toml.load(f)
            return config
    else:
        error_msg = f"Config file {file_path} not found."
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

def translate_text(text, config, target_language):
    """Translate text using a large language model"""
    api_key = config["api"]["key"]
    prompt = config["prompt"]["template"]
    
    # Use target_language from frontend
    prompt = prompt.replace("{target_language}", target_language)
    prompt = prompt.replace("{text}", text)
    
    headers = {
        "Authorization": 'Bearer ' + api_key,
    }

    params = {
        "messages": [{
            "role": 'user',
            "content": f"{prompt}"
        }],
        "model": config["api"]["model"],
    }
    
    try:
        logger.info(f"Sending translation request: {text} to {target_language}")
        response = requests.post(
            f"{config['api']['url']}/v1/chat/completions",
            headers=headers,
            json=params,
            stream=False,
            timeout=60  # Add timeout
        )
        
        # Check HTTP status code
        response.raise_for_status()
        
        # Check if response content is empty
        if not response.text:
            raise ValueError("Empty response received from API")
        
        # Try to parse JSON
        try:
            res = response.json()
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            logger.error(f"Response content: {response.text}")
            raise ValueError(f"API returned invalid JSON: {str(e)}")
        
        # Check if response format is correct
        if 'choices' not in res or not res['choices'] or 'message' not in res['choices'][0]:
            logger.error(f"API response format is incorrect: {res}")
            raise ValueError(f"API response format is incorrect")
        
        res_content = res['choices'][0]['message']['content']
        logger.info(f"Translation result: {res_content}")
        return res_content
        
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {e}")
        raise ValueError(f"API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error during translation: {e}")
        raise ValueError(f"Translation failed: {str(e)}")

# Flask application main body
app = Flask(__name__, 
            static_folder=resource_path('static'),
            template_folder=resource_path('templates'))

# Global OSC client
client = None

@app.route('/', methods=['GET', 'POST'])
def home():
    """Main route handling GET and POST requests"""
    global client
    
    if request.method == 'POST':
        # Handle message sending request
        if 'message' in request.form:
            message = request.form['message']
            typing = int(request.form['typing'])
            
            try:
                client.send_message("/chatbox/input", [message, True, True])
                client.send_message("/chatbox/typing", typing)
                logger.info(f"Message sent: {message}")
                return "Message sent"
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                return f"Error sending message: {str(e)}", 500
        
        # Handle typing status request
        elif 'typing' in request.form and 'message' not in request.form:
            typing = int(request.form['typing'])
            
            try:
                client.send_message("/chatbox/typing", typing)
                logger.info(f"Typing status updated: {typing}")
                return "Typing status updated"
            except Exception as e:
                logger.error(f"Error updating typing status: {e}")
                return f"Error updating typing status: {str(e)}", 500
        
        # Handle translation request
        elif 'translate' in request.form:
            text = request.form['translate']
            target_language = request.form.get('target_language', 'English')
            
            try:
                logger.info(f"Translation request received: {text} to {target_language}")
                translated_text = translate_text(text, config, target_language)
                return translated_text
            except Exception as e:
                error_message = f"Translation failed: {str(e)}"
                logger.error(error_message)
                return error_message, 500
    
    # GET request returns the main page
    return render_template('index.html')

# Static file routes
@app.route('/static/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    return send_from_directory(os.path.join(app.static_folder, 'js'), filename)

@app.route('/static/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    return send_from_directory(os.path.join(app.static_folder, 'css'), filename)

@app.route('/static/lang/<path:filename>')
def serve_lang(filename):
    """Serve language files"""
    return send_from_directory(os.path.join(app.static_folder, 'lang'), filename)

def open_browser():
    """Open the browser after a brief delay to ensure Flask server has started"""
    time.sleep(1.5)  # Give the server some time to start
    url = f'http://127.0.0.1:{config["web"]["port"]}'
    logger.info(f"Opening browser: {url}")
    webbrowser.open(url)

if __name__ == '__main__':
    # Load configuration file
    try:
        config = load_config(resource_path('config.toml'))  # Changed config file name to config.toml
        logger.info("Configuration file loaded successfully")
    except Exception as e:
        logger.critical(f"Failed to load configuration file: {e}")
        exit(1)
    
    # OSC server configuration
    oscip = config["osc"]["ip"]
    oscport = config["osc"]["port"]
    
    # WEB server configuration
    webip = config["web"]["ip"]
    webport = config["web"]["port"]
    
    # Initialize OSC client
    try:
        client = udp_client.SimpleUDPClient(oscip, oscport)
        logger.info(f"OSC client initialized, connected to {oscip}:{oscport}")
    except Exception as e:
        logger.critical(f"Failed to initialize OSC client: {e}")
        exit(1)

    # Open the browser in a separate thread, so it doesn't block Flask server startup
    if config["app"]["open_browser"]:  # Can control whether to automatically open browser in the configuration
        threading.Thread(target=open_browser).start()
    
    # Start Flask application
    logger.info(f"Starting Web server, listening on {webip}:{webport}")
    app.run(debug=config["app"]["debug"], host=webip, port=webport)
