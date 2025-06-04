
// Text to Speech
const textInput = document.getElementById('text-input'); // Get the text input element by its ID
const speakButton = document.getElementById('speak-button'); // Get the speak button element by its ID
const startRecordingButton = document.getElementById('start-recording'); // Get the start recording button element by its ID
const stopRecordingButton = document.getElementById('stop-recording'); // Get the stop recording button element by its ID
const recordingStatus = document.getElementById('recording-status'); // Get the recording status element by its ID
const textOutput = document.getElementById('speech-to-text-output'); // Get the speech-to-text output element by its ID

let recognition; // Declare a variable for speech recognition
let mediaRecorder; // Declare a variable for media recorder
let audioChunks = []; // Initialize an array to store audio chunks
let audioBlob; // Declare a variable to store the audio blob
let audioUrl; // Declare a variable to store the audio URL



// Text to Speech function
speakButton.addEventListener('click', () => { // Add a click event listener to the speak button
    const text = textInput.value; // Get the text from the input field
    if (text) { // Check if there is text to speak
        fetch('https://' + window.location.hostname + ':3000/tts', { // Make a POST request to the TTS endpoint
            method: 'POST', // Set the request method to POST
            headers: {
                'Content-Type': 'application/json', // Set the content type to JSON
            },
            body: JSON.stringify({ text }), // Send the text as a JSON payload
        })
        .then(response => response.blob()) // Convert the response to a blob
        .then(blob => { // Handle the blob response
            const audioUrl = URL.createObjectURL(blob); // Create a URL for the audio blob
            const audio = new Audio(audioUrl); // Create a new audio element with the blob URL
            audio.play(); // Play the audio
        })
        .catch(error => { // Handle any errors
            console.error('Error:', error); // Log the error to the console
            alert('Error converting text to speech'); // Alert the user about the error
        });
    }
});

// Speech to Text function
startRecordingButton.addEventListener('click', async () => { // Add a click event listener to the start recording button
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // Request access to the microphone
        mediaRecorder = new MediaRecorder(stream); // Create a new MediaRecorder instance with the audio stream

        mediaRecorder.ondataavailable = (event) => { // Event handler for when data is available
            audioChunks.push(event.data); // Push the recorded audio data to the audioChunks array
        };

        mediaRecorder.onstop = () => { // Event handler for when recording stops
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' }); // Create a Blob from the audio chunks with WAV format
            audioUrl = URL.createObjectURL(audioBlob); // Create a URL for the audio blob
            displayRecordedAudio(); // Call function to display the recorded audio
            audioChunks = []; // Reset the audioChunks array for future recordings
        };

        mediaRecorder.start(); // Start recording
        recordingStatus.textContent = 'Recording...'; // Update the recording status text
        startRecordingButton.disabled = true; // Disable the start recording button to prevent multiple recordings
        stopRecordingButton.disabled = false; // Enable the stop recording button
    } catch (error) { // Catch any errors that occur during recording setup
        console.error('Error accessing microphone:', error); // Log the error to the console
    }
});

stopRecordingButton.addEventListener('click', () => { // Add a click event listener to the stop recording button
    if (mediaRecorder && mediaRecorder.state === 'recording') { // Check if mediaRecorder exists and is currently recording
        mediaRecorder.stop(); // Stop the recording
        recordingStatus.textContent = 'Recording stopped'; // Update the recording status text
        startRecordingButton.disabled = false; // Re-enable the start recording button
        stopRecordingButton.disabled = true; // Disable the stop recording button
    }
});

function displayRecordedAudio() { // Function to display the recorded audio and send button
    const audioPlayer = document.createElement('audio'); // Create a new audio element
    audioPlayer.controls = true; // Enable audio controls (play, pause, etc.)
    audioPlayer.src = audioUrl; // Set the source of the audio player to the recorded audio URL
    
    const sendButton = document.createElement('button'); // Create a new button element
    sendButton.textContent = 'Send to Server'; // Set the button text
    sendButton.onclick = () => sendAudioToServer(audioBlob); // Assign the sendAudioToServer function to the button's onclick event

    const container = document.createElement('div'); // Create a new div element to contain the audio player and send button
    container.appendChild(audioPlayer); // Append the audio player to the container
    container.appendChild(sendButton); // Append the send button to the container

    const audioContainer = document.getElementById('audio-container'); // Get the audio container element by its ID
    audioContainer.innerHTML = ''; // Clear any existing content in the audio container
    audioContainer.appendChild(container); // Append the new container with audio player and send button
}

function sendAudioToServer(audioBlob) { // Function to send the recorded audio to the server for transcription
    console.log('Sending audio blob:', audioBlob); // Log the audio blob to the console
    const formData = new FormData(); // Create a new FormData object
    formData.append('audio', audioBlob, 'recording.wav'); // Append the audio blob to the FormData with the filename 'recording.wav'

    isProcessing = true; // Set the processing flag to true to indicate that processing has started

    fetch('https://' + window.location.hostname + ':3000/stt', { // Make a POST request to the STT endpoint
        method: 'POST', // Set the request method to POST
        body: formData, // Attach the FormData containing the audio file
    })
    .then(response => response.json()) // Parse the response as JSON
    .then(data => { // Handle the JSON response
        console.log('Server response:', data); // Log the server response to the console
        if (data.transcription) { // Check if transcription is present in the response
            textOutput.value = data.transcription; // Display the transcription in the text output field
            scrollToOutput(); // Scroll to the text output field
        } else if (data.error) { // If there is an error in the response
            textOutput.value = `Error: ${data.error}`; // Display the error message
            console.error('Server error details:', data.error); // Log the server error details
            scrollToOutput(); // Scroll to the text output field
        } else { // If neither transcription nor error is present
            textOutput.value = 'An unknown error occurred'; // Display a generic error message
            scrollToOutput(); // Scroll to the text output field
        }
    })
    .catch(error => { // Catch any errors that occur during the fetch request
        console.error('Fetch error:', error); // Log the fetch error to the console
        textOutput.value = 'Error processing audio'; // Display an error message in the text output field
    })
    .finally(() => { // Execute after the fetch request is completed, regardless of success or failure
        isProcessing = false; // Set the processing flag to false to indicate that processing has ended
    });
}

// Three.js background setup
const scene = new THREE.Scene(); // Create a new Three.js scene
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Create a perspective camera with FOV 75, aspect ratio, and near/far planes
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('background-canvas'), alpha: true }); // Create a WebGL renderer, attaching it to the canvas with ID 'background-canvas' and enabling transparency
renderer.setSize(window.innerWidth, window.innerHeight); // Set the renderer size to match the window dimensions

const particleCount = 10000; // Define the number of particles in the background
const positions = new Float32Array(particleCount * 3); // Create a Float32Array to store particle positions (x, y, z for each)
const sizes = new Float32Array(particleCount); // Create a Float32Array to store particle sizes

for (let i = 0; i < particleCount; i++) { // Loop through each particle
    positions[i * 3] = THREE.MathUtils.randFloatSpread(2000); // Assign a random x position within a spread of 2000 units
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(2000); // Assign a random y position within a spread of 2000 units
    positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(2000); // Assign a random z position within a spread of 2000 units
    sizes[i] = THREE.MathUtils.randFloat(1, 5); // Assign a random size between 1 and 5 units
}

const geometry = new THREE.BufferGeometry(); // Create a new buffer geometry for particles
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); // Set the position attribute using the positions array, with 3 components per vertex
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // Set the size attribute using the sizes array, with 1 component per vertex

const material = new THREE.ShaderMaterial({ // Create a new shader material for custom particle appearance
    uniforms: { // Define uniforms to pass to the shaders
        color: { value: new THREE.Color(0x4dabf7) }, // Set the color uniform to a specific blue shade
    },
    vertexShader: ` // Define the vertex shader
        attribute float size; // Declare an attribute to receive the size of each particle
        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); // Calculate the model-view position of the particle
            gl_PointSize = size * (300.0 / -mvPosition.z); // Set the point size based on distance from the camera
            gl_Position = projectionMatrix * mvPosition; // Transform the position to clip space
        }
    `,
    fragmentShader: ` // Define the fragment shader
        uniform vec3 color; // Declare a uniform to receive the color
        void main() {
            if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard; // Create a circular point by discarding fragments outside a radius
            gl_FragColor = vec4(color, 1.0); // Set the fragment color with full opacity
        }
    `,
    transparent: true, // Enable transparency for the material
});

const particles = new THREE.Points(geometry, material); // Create a new Points object using the geometry and material
scene.add(particles); // Add the particles to the scene

camera.position.z = 1000; // Position the camera 1000 units away on the z-axis

let isProcessing = false; // Initialize a flag to track if processing is ongoing
let normalSpeed = 0.0001; // Define the normal rotation speed for particles
let fastSpeed = 0.0009; // Define the faster rotation speed for particles during processing

function updateParticleSpeed(speed) { // Function to update particle rotation speed
    particles.rotation.x += speed; // Rotate particles around the x-axis by the specified speed
    particles.rotation.y += speed; // Rotate particles around the y-axis by the specified speed
}

function animateBackground() { // Function to animate the background particles
    requestAnimationFrame(animateBackground); // Request the next animation frame
    updateParticleSpeed(isProcessing ? fastSpeed : normalSpeed); // Update rotation speed based on processing state
    renderer.render(scene, camera); // Render the scene from the perspective of the camera
}
animateBackground(); // Start the background animation

// Resize handler
window.addEventListener('resize', () => { // Add an event listener for window resize events
    camera.aspect = window.innerWidth / window.innerHeight; // Update the camera's aspect ratio to match the new window size
    camera.updateProjectionMatrix(); // Update the camera's projection matrix with the new aspect ratio
    renderer.setSize(window.innerWidth, window.innerHeight); // Update the renderer size to match the new window size
});

// UI enhancements
const converterBoxes = document.querySelectorAll('.converter-box'); // Select all elements with the class 'converter-box'
converterBoxes.forEach(box => { // Iterate over each converter box
    box.addEventListener('mouseenter', () => { // Add a mouseenter event listener
        box.style.transform = 'scale(1.02)'; // Slightly scale up the box on hover for a visual effect
    });
    box.addEventListener('mouseleave', () => { // Add a mouseleave event listener
        box.style.transform = 'scale(1)'; // Return the box to its original scale when not hovered
    });
});

// Button click effect
const buttons = document.querySelectorAll('button'); // Select all button elements
buttons.forEach(button => { // Iterate over each button
    button.addEventListener('click', () => { // Add a click event listener to each button
        button.style.transform = 'scale(0.95)'; // Slightly scale down the button on click for a pressed effect
        setTimeout(() => { // Set a timeout to reset the scale
            button.style.transform = 'scale(1)'; // Return the button to its original scale after 100ms
        }, 100);
    });
});

// Smooth scroll to output
function scrollToOutput() { // Function to smoothly scroll to the text output element
    textOutput.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Scroll the text output into view with smooth behavior
}



