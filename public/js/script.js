const socket = io(); // Initialize Socket.io connection to the server

// --- DOM ELEMENTS ---
// Selecting all necessary HTML elements to manipulate them later
const loginScreen = document.getElementById("login-screen");
const joinBtn = document.getElementById("join-btn");
const roomInput = document.getElementById("room-input");
const passwordInput = document.getElementById("password-input");
const chatContainer = document.getElementById("chat-container");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");
const emojiInput = document.getElementById("emoji-input");
const togglePasswordBtn = document.getElementById("toggle-password");
const emojiHelp = document.getElementById("emoji-help");
const tabPrivate = document.getElementById("tab-private");
const tabPublic = document.getElementById("tab-public");
const privateInputs = document.getElementById("private-inputs");
const publicMessage = document.getElementById("public-message");
const recenterBtn = document.getElementById("recenter-btn");
const themeBtn = document.getElementById("theme-btn");

// Stream Controls (Go Live features)
const goLiveBtn = document.getElementById("go-live-btn");
const streamInputBox = document.getElementById("stream-input-box");
const startStreamBtn = document.getElementById("start-stream-btn");
const cancelStreamBtn = document.getElementById("cancel-stream-btn");
const streamUrlInput = document.getElementById("stream-url");

// --- STATE VARIABLES ---
let isPublicMode = false; // Tracks if user is in Public or Private room
let isStreaming = false;  // Tracks if current user is broadcasting
let watchId = null;       // Stores the GPS tracker ID to stop it later
let firstLoad = true;     // Flag to prevent map from snapping to user repeatedly
let destinationMarker = null; // Stores the "Meeting Point" flag
const markers = {};       // Object to store all other users' markers by ID

// Clear inputs on page load for a fresh start
roomInput.value = "";
passwordInput.value = "";

// --- MAP SETUP ---
// Initialize Leaflet map, centered at 0,0 initially
const map = L.map("map").setView([0,0], 16);

// Define Map Layers (Light vs Dark tiles)
const lightLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "OpenStreetMap" });
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: "CartoDB" });

// Start with Dark Layer by default
darkLayer.addTo(map);
let currentLayer = darkLayer;

// --- THEME LOGIC ---
let themeMode = "dark"; // Can be 'light', 'dark', or 'auto'
let lastKnownLat = 0;   // Saved for sun calculations
let lastKnownLng = 0;

// Function to switch visual map layers
function setLayer(type) {
    if (type === "dark") {
        map.removeLayer(lightLayer);
        darkLayer.addTo(map);
        currentLayer = darkLayer;
        
        // Update button style
        themeBtn.style.background = "#333";
        themeBtn.style.color = "#fff";
    } else {
        map.removeLayer(darkLayer);
        lightLayer.addTo(map);
        currentLayer = lightLayer;
        
        // Update button style
        themeBtn.style.background = "#fff";
        themeBtn.style.color = "#333";
    }
}

// Function to calculate Sunrise/Sunset based on GPS
function checkSunTime(lat, lng) {
    if (themeMode !== "auto") return; 

    const now = new Date();
    
    // Check if SunCalc library exists (loaded in index.ejs)
    if (typeof SunCalc !== 'undefined') {
        const times = SunCalc.getTimes(now, lat, lng);
        
        // If current time is between Sunrise and Sunset -> Light Mode
        if (now > times.sunrise && now < times.sunset) {
            setLayer("light"); 
            themeBtn.innerText = "🤖 Auto (Day)"; 
        } else {
            setLayer("dark");
            themeBtn.innerText = "🤖 Auto (Night)"; 
        }
    } else {
        console.error("SunCalc library missing! Add it to index.ejs");
    }
}

// Handle Theme Button Clicks (Cycles: Light -> Dark -> Auto)
themeBtn.addEventListener("click", () => {
    if (themeMode === "light") {
        themeMode = "dark";
        setLayer("dark");
        themeBtn.innerText = "🌙 Dark";
    } else if (themeMode === "dark") {
        themeMode = "auto";
        themeBtn.innerText = "🤖 Auto"; 
        
        // Check sun immediately if we have location
        if(lastKnownLat !== 0) {
            checkSunTime(lastKnownLat, lastKnownLng);
        } else {
            themeBtn.innerText = "🤖 Auto (Waiting for GPS...)";
        }
    } else {
        themeMode = "light";
        setLayer("light");
        themeBtn.innerText = "☀️ Light";
    }
});

// --- HELPER FUNCTIONS ---

// Converts standard YouTube links to Embed links for the iframe
function getEmbedUrl(url) {
    if (url.includes("youtube.com/watch?v=")) return url.replace("watch?v=", "embed/");
    else if (url.includes("youtu.be/")) return url.replace("youtu.be/", "youtube.com/embed/");
    return url;
}

// Detects if user is on Mobile or Desktop to show correct Emoji instructions
function detectDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
        emojiHelp.innerText = "Tap to open your emoji keyboard 😃";
    } else {
        if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) emojiHelp.innerText = "Press ( Cmd + Ctrl + Space ) for emojis";
        else emojiHelp.innerText = "Press ( Win + . ) for emojis";
    }
}
detectDevice(); // Run immediately

// --- EVENT LISTENERS (UI INTERACTIONS) ---

// Prevent spaces in Room Name and Password
function preventSpaces(e) {
    if (e.target.value.includes(' ')) e.target.value = e.target.value.replace(/\s/g, "");
}
roomInput.addEventListener("input", preventSpaces);
passwordInput.addEventListener("input", preventSpaces);

// Emoji Input Logic: Clear on click, allow only 1 char
emojiInput.addEventListener("click", () => { emojiInput.value = ""; });
emojiInput.addEventListener("focus", () => { emojiInput.select(); });
emojiInput.addEventListener("input", (e) => {
    const text = e.target.value;
    if (Array.from(text).length > 1) {
        const chars = Array.from(text);
        e.target.value = chars[chars.length - 1]; // Keep last char
    }
});

// Show/Hide Password Toggle
togglePasswordBtn.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
});

// Tab Switching (Private Room)
tabPrivate.addEventListener("click", () => {
    isPublicMode = false;
    tabPrivate.classList.add("active");
    tabPublic.classList.remove("active");
    privateInputs.classList.remove("hidden");
    publicMessage.classList.add("hidden");
});

// Tab Switching (Public Meetup)
tabPublic.addEventListener("click", () => {
    isPublicMode = true;
    tabPublic.classList.add("active");
    tabPrivate.classList.remove("active");
    privateInputs.classList.add("hidden");
    publicMessage.classList.remove("hidden");
});

// Join Button Logic
joinBtn.addEventListener("click", () => {
    const emoji = emojiInput.value;
    if (isPublicMode) {
        // Send special ID for public room
        socket.emit("join-room", { roomName: "GLOBAL_PUBLIC", password: "", emoji });
    } else {
        // Send normal credentials for private room
        const roomName = roomInput.value;
        const password = passwordInput.value;
        if(!roomName || !password) return alert("Please enter both Room Name and Password!");
        socket.emit("join-room", { roomName, password, emoji });
    }
});

// --- SOCKET EVENTS (REAL-TIME COMMUNICATION) ---

// 1. Success: User joined room
socket.on("join-success", () => {
    // Hide login, show app controls
    loginScreen.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    recenterBtn.classList.remove("hidden");
    themeBtn.classList.remove("hidden");

    // Start GPS Tracking
    if(navigator.geolocation){
        watchId = navigator.geolocation.watchPosition((position)=>{
            const {latitude, longitude} = position.coords;

            // Save for Recenter button & SunCalc
            lastKnownLat = latitude;
            lastKnownLng = longitude;

            if(themeMode === "auto") checkSunTime(latitude, longitude);

            // Send Location to Server
            socket.emit("send-location", {latitude, longitude});
            
            // Initial Map Zoom Logic
            if(firstLoad) {
                if(isPublicMode) {
                    // Zoom OUT for World View
                    map.setView([20, 0], 2); 
                } else {
                    // Zoom IN for Private View
                    map.setView([latitude, longitude], 16);
                }
                firstLoad = false; // Stop auto-centering after first load
            }
        }, (error)=>{
            console.error(error);
        }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    }
});

// 2. Error: Wrong password
socket.on("join-error", (msg) => { alert(msg); });

// 3. CORE LOGIC: Receive other users' locations
socket.on("receive-location", (data) => {
    const { id, latitude, longitude, emoji, streamUrl } = data;
    
    // Check if marker already exists for this user
    if (markers[id]) {
        // Update position
        markers[id].setLatLng([latitude, longitude]);
        
        // --- LIVE STREAMING CHECK ---
        // If user just went LIVE (started streaming)
        if (streamUrl && !markers[id].isLive) {
            markers[id].setIcon(L.divIcon({
                className: 'live-marker', // CSS Pulse Effect
                html: `<div>${emoji}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            }));
            markers[id].isLive = true;
            // Add Video Embed Popup
            markers[id].bindPopup(`<div style="width:300px;"><b style="color:red;">🔴 LIVE NOW</b><br><iframe width="100%" height="200" src="${streamUrl}" frameborder="0" allowfullscreen></iframe></div>`);
        } 
        // If user STOPPED streaming
        else if (!streamUrl && markers[id].isLive) {
            markers[id].setIcon(L.divIcon({
                className: 'emoji-marker', // Normal Effect
                html: `<div>${emoji}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            }));
            markers[id].isLive = false;
            // Revert Popup
            markers[id].bindPopup(id === socket.id ? "You (" + emoji + ")" : "User (" + emoji + ")");
        }
    } else {
        // --- CREATE NEW MARKER ---
        const isLive = !!streamUrl;
        
        // Choose icon based on live status
        const markerIcon = L.divIcon({
            className: isLive ? 'live-marker' : 'emoji-marker',
            html: `<div>${emoji}</div>`,
            iconSize: isLive ? [40, 40] : [30, 30],
            iconAnchor: isLive ? [20, 20] : [15, 15]
        });

        // Add to map
        markers[id] = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
        markers[id].isLive = isLive;

        // Set Popup
        if (isLive) {
            markers[id].bindPopup(`<div style="width:300px;"><b style="color:red;">🔴 LIVE NOW</b><br><iframe width="100%" height="200" src="${streamUrl}" frameborder="0" allowfullscreen></iframe></div>`);
        } else {
            markers[id].bindPopup(id === socket.id ? "You (" + emoji + ")" : "User (" + emoji + ")");
        }
    }
});

// 4. Handle Disconnect: Remove marker
socket.on("user-disconnected", (id) => {
    if(markers[id]){
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});

// --- CHAT LOGIC ---
sendBtn.addEventListener("click", () => {
    const message = messageInput.value;
    if(message.trim()){
        socket.emit("send-message", message);
        messageInput.value = ""; 
    }
});
messageInput.addEventListener("keypress", (e) => { if(e.key === "Enter") sendBtn.click(); });

socket.on("receive-message", (data) => {
    const { id, message } = data;
    if(markers[id]){
        // Show message in popup for 5 seconds
        markers[id].bindPopup(message).openPopup();
        setTimeout(() => { markers[id].closePopup(); }, 5000);
    }
});

// --- CONTROLS LOGIC ---

// Logout: Reset everything
logoutBtn.addEventListener("click", () => {
    socket.emit("leave-room");
    
    // Hide App, Show Login
    logoutBtn.classList.add("hidden");
    chatContainer.classList.add("hidden");
    recenterBtn.classList.add("hidden");
    themeBtn.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    
    // Reset Data
    roomInput.value = "";
    passwordInput.value = "";
    firstLoad = true; 

    // Remove all markers
    for (const id in markers) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
    // Stop GPS
    if(watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
});

// Recenter: Instant snap to last known location
recenterBtn.addEventListener("click", () => {
    if (lastKnownLat !== 0 && lastKnownLng !== 0) {
        map.setView([lastKnownLat, lastKnownLng], 16);
    } else {
        // Fallback if no data yet
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 16);
        }, (error) => {
            console.error("Error finding location:", error);
            alert("Still waiting for GPS signal...");
        });
    }
});

// Live Stream Buttons
goLiveBtn.addEventListener("click", () => {
    if (!isStreaming) {
        streamInputBox.classList.remove("hidden"); // Open input
    } else {
        socket.emit("stop-stream");
        isStreaming = false;
        goLiveBtn.innerText = "📡 Go Live";
        goLiveBtn.style.background = "red";
    }
});

cancelStreamBtn.addEventListener("click", () => { streamInputBox.classList.add("hidden"); });

startStreamBtn.addEventListener("click", () => {
    let rawUrl = streamUrlInput.value;
    if (!rawUrl) return alert("Please enter a link!");
    
    // Send embedded URL to server
    socket.emit("start-stream", getEmbedUrl(rawUrl));
    
    isStreaming = true;
    streamInputBox.classList.add("hidden");
    goLiveBtn.innerText = "⏹ Stop Stream";
    goLiveBtn.style.background = "#333";
});

// --- DESTINATIONS (Meeting Points) ---

// Right-click to set destination
map.on("contextmenu", function(e) {
    const { lat, lng } = e.latlng;
    socket.emit("send-destination", { latitude: lat, longitude: lng });
});

// Render the Checkered Flag
socket.on("update-destination", (data) => {
    const { latitude, longitude } = data;
    if(destinationMarker) map.removeLayer(destinationMarker);
    
    const flagIcon = L.divIcon({
        className: 'emoji-marker', 
        html: '<div style="font-size: 35px; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.5));">🏁</div>', 
        iconSize: [35, 35],
        iconAnchor: [17, 35] 
    });
    
    destinationMarker = L.marker([latitude, longitude], { icon: flagIcon }).addTo(map);
    destinationMarker.bindPopup("<b>Meeting Point</b><br>Let's meet here!").openPopup();
});