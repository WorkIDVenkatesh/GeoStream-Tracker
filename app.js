// --- IMPORTS & SETUP ---
const express = require("express");
const app = express();
const path = require("path");
const http = require("http");

// Socket.io allows real-time, bi-directional communication
const socketio = require("socket.io");

const server = http.createServer(app);
const io = socketio(server)

// Configure EJS as the view engine for rendering HTML
app.set("view engine", "ejs")

// Serve static files (CSS, JS, Images) from the "public" folder
app.use(express.static(path.join(__dirname, "public")))

// --- IN-MEMORY DATA STORAGE ---
// Note: Since we aren't using a database, these reset if the server restarts.
const roomPasswords = {};      // Stores passwords: { "roomName": "1234" }
const roomDestinations = {};   // Stores meeting points: { "roomName": {lat, lng} }

// --- SOCKET.IO LOGIC ---
io.on("connection", function(socket){
    
    // 1. LIVE STREAMING EVENTS
    socket.on("start-stream", (url) => {
        // Ensure user is in a room and has data
        if(socket.room && socket.userData){
            socket.userData.streamUrl = url; // Save URL to the user's socket session
            
            // Notify everyone in the room that this user went live
            io.to(socket.room).emit("user-started-stream", {
                id: socket.id,
                streamUrl: url
            });
        }
    });

    socket.on("stop-stream", () => {
        if(socket.room && socket.userData){
            delete socket.userData.streamUrl; // Remove URL from session
            
            // Notify everyone to remove the video feed
            io.to(socket.room).emit("user-stopped-stream", socket.id);
        }
    });

    // 2. JOINING ROOMS (The Core Security Logic)
    socket.on("join-room", (data) => {
        const { roomName, password, emoji } = data;

        // A. Handle "GLOBAL_PUBLIC" (Public Meetup Mode)
        // This bypasses password checks entirely
        if (roomName === "GLOBAL_PUBLIC") {
            socket.join(roomName);
            socket.room = roomName;
            socket.userData = { emoji: emoji || '📍' };
            
            socket.emit("join-success");
            console.log(`User ${socket.id} joined PUBLIC map`);
            
            // If there is an active meeting point, send it to the new user
            if(roomDestinations[roomName]) {
                socket.emit("update-destination", roomDestinations[roomName]);
            }
            return; // STOP HERE (Don't run the private logic below)
        }

        // B. Handle Private Rooms
        // Check if room already exists in memory
        if(roomPasswords[roomName]) {
            // Room exists: Validate Password
            if(roomPasswords[roomName] === password) {
                // Success: Join the room
                socket.join(roomName);
                socket.room = roomName;

                socket.userData = { 
                emoji: data.emoji || '📍' 
            };
                
                // Tell the user they successfully joined
                socket.emit("join-success"); 
                console.log(`User ${socket.id} joined room: ${roomName}`);
                
                // Send existing meeting point if one exists
                if(roomDestinations[roomName]) {
                    socket.emit("update-destination", roomDestinations[roomName]);
                }
            } else {
                // Fail: Wrong password
                socket.emit("join-error", "Incorrect Password for this Room!");
            }
        } else {
            // Room doesn't exist: Create it and set the password (First user becomes admin essentially)
            roomPasswords[roomName] = password;
            socket.join(roomName);
            socket.room = roomName;

            socket.userData = { emoji: emoji || '📍' };
            
            socket.emit("join-success");
            console.log(`Room Created: ${roomName} with password`);
        }
    });

    // 3. LOCATION UPDATES
    socket.on("send-location", function(data){
        // Retrieve saved emoji and streamURL from socket session
        const emoji = socket.userData ? socket.userData.emoji : '📍';
        const streamUrl = socket.userData ? socket.userData.streamUrl : null;
        
        // Broadcast location + metadata to everyone else in the room
        if(socket.room){
            io.to(socket.room).emit("receive-location", {id: socket.id, emoji: emoji, streamUrl: streamUrl,...data });
        }
    });
    

    // 4. HANDLING DISCONNECTS (Closing Tab/Browser)
    socket.on("disconnect", function(){
        if(socket.room){
            io.to(socket.room).emit("user-disconnected", socket.id);
        }
    });

    // 5. CHAT SYSTEM
    socket.on("send-message", (message) => {
    if(socket.room){
        // Broadcast the message to everyone in the room (including sender)
        io.to(socket.room).emit("receive-message", {
            id: socket.id,
            message: message
        });
    }
    });

    // 6. MEETING POINTS (Destinations)
    socket.on("send-destination", (data) => {
        if(socket.room){
            console.log(`New destination set in room ${socket.room}`);
            // Save to memory so new users see it when they join
            roomDestinations[socket.room] = data;
            // Broadcast to current users
            io.to(socket.room).emit("update-destination", data);
        }
    })

    // 7. MANUAL LOGOUT (Clicking "Leave Room")
    socket.on("leave-room", () => {
        if(socket.room){
            // Tell others to remove this user's marker
            io.to(socket.room).emit("user-disconnected", socket.id);
            
            // Make the socket leave the room group
            socket.leave(socket.room);
            console.log(`User ${socket.id} left room: ${socket.room}`);
            
            // Clear the room from the socket object
            socket.room = null;
        }
    });
});


// --- ROUTING ---
app.get("/", function (req, res){
    res.render("index")
})

// --- SERVER START ---
// Use environment port (for Cloud deployment) or 3000 (for Localhost)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});