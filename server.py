# Import necessary libraries
from flask import Flask, redirect, request, jsonify, send_file, render_template  # Flask for web server, other functions for handling requests and responses
from flask_cors import CORS  # Cross-Origin Resource Sharing for handling requests from different origins
import whisper  # OpenAI's Whisper model for speech recognition
from gtts import gTTS  # Google Text-to-Speech for converting text to speech
import os  # For file and directory operations
import tempfile  # For creating temporary files and directories
import logging  # For logging debug and error messages
from pydub import AudioSegment  # For audio file manipulation
import torch  # PyTorch for tensor computations, used by Whisper

# Initialize Flask app and configure CORS
app = Flask(__name__, static_folder='.', static_url_path='')  # Create Flask app instance
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for CORS

# Load the Whisper model
# Whisper is an automatic speech recognition (ASR) system trained on a large dataset of diverse audio
# It can transcribe speech in multiple languages and even translate to English
model = whisper.load_model("base", device="cpu", in_memory=True)  # Load the base Whisper model on CPU


# Set the model to evaluation mode
# This line sets the Whisper model to evaluation mode. In evaluation mode:
# 1. Dropout layers are disabled, ensuring consistent output.
# 2. Batch normalization uses running statistics instead of batch statistics.
# 3. The model doesn't accumulate gradients, which saves memory and computation.
# This is crucial for inference as it optimizes the model for prediction rather than training.
model.eval()  



model = model.to(torch.float32)  # Convert model to float32 precision
logging.debug("Whisper model loaded successfully in FP32")

# Configure logging
logging.basicConfig(level=logging.DEBUG)  # Set logging level to DEBUG for detailed output

# Route for serving the main page
@app.route('/')
def index():
    return app.send_static_file('index.html')  # Serve the static HTML file

# Route for Speech-to-Text functionality
@app.route('/stt', methods=['POST'])
def speech_to_text():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400  # Return error if no audio file is provided
    
    audio_file = request.files['audio']  # Get the audio file from the request
    
    temp_dir = tempfile.mkdtemp()  # Create a temporary directory
    temp_path = os.path.join(temp_dir, "temp_audio.wav")  # Create a path for temporary audio file
    
    try:
        # Convert audio to WAV using pydub
        audio = AudioSegment.from_file(audio_file)  # Load the audio file
        audio.export(temp_path, format="wav")  # Export as WAV format
        logging.debug(f"Saved audio file to: {temp_path}")
        
        result = model.transcribe(temp_path)  # Transcribe the audio using Whisper model
        logging.debug(f"Transcription result: {result['text']}")
        
        return jsonify({"transcription": result["text"]})  # Return the transcription as JSON
    
    except Exception as e:
        logging.error(f"Error during transcription: {str(e)}")
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500  # Return error if transcription fails
    
    finally:
        try:
            os.remove(temp_path)  # Remove temporary audio file
            os.rmdir(temp_dir)  # Remove temporary directory
        except Exception as e:
            logging.warning(f"Failed to remove temporary file or directory: {str(e)}")

# Route for Text-to-Speech functionality
@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400  # Return error if no text is provided
    
    text = data['text']  # Get the text from the request
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_audio:
        tts = gTTS(text=text, lang='en')  # Create gTTS object with the input text
        tts.save(temp_audio.name)  # Save the speech as an MP3 file
        
        return send_file(temp_audio.name, mimetype="audio/mpeg")  # Send the audio file as response

# Middleware to redirect HTTP requests to HTTPS
@app.before_request
def before_request():
    if not request.is_secure:
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)  # Redirect to HTTPS

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True, port=3000, host='0.0.0.0', ssl_context=('cert.pem', 'key.pem'))  # Run app with SSL