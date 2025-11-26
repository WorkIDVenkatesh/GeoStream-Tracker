# 📍 GeoStream: Real-Time Map Tracker

Welcome to **GeoStream**! This is a web application that lets you track your friends (or strangers) on a map in real-time. It works like a "Live Location" feature but runs entirely in your browser.

**🔗 [Click here to see the Live Demo](https://geostream-live.onrender.com)**

---

## 🧐 What can this app do?

* **See Movement Live:** When you move with your phone, the marker on the map moves instantly. No refreshing needed!
* **Public & Private Rooms:**
    * **Public:** Join the global map to see everyone.
    * **Private:** Create a secret room (with a password) for just you and your friends.
* **Live Video:** You can paste a YouTube or Twitch link, and your marker will turn **Red**. People can click you to watch your stream!
* **Day/Night Cycle:** The map automatically switches to "Dark Mode" at night and "Light Mode" during the day based on where the sun is at your location.
* **Chat:** Send messages to people on the map.

---

## 💻 Tech Used
*(What did I build this with?)*

* **Node.js & Express:** The backend server that runs the show.
* **Socket.io:** The magic library that sends data instantly between users.
* **Leaflet.js:** The library used to draw the map.
* **HTML/CSS:** For the design (Glassmorphism style).

---

## 🚀 How to Run this on Your Computer

If you want to run this code on your own laptop, follow these steps.

### Step 1: Install Node.js
You need "Node.js" installed to run this app.
1.  Go to [nodejs.org](https://nodejs.org/)
2.  Download the **LTS Version** (Recommended).
3.  Install it.

### Step 2: Download the Code
You can download this project in two ways:
* **Option A (Easy):** Click the green **Code** button at the top right of this page -> **Download ZIP**. Extract the folder.
* **Option B (Developer):** Open your terminal and type:
    ```bash
    git clone [https://github.com/YOUR_USERNAME/GeoStream-Tracker.git](https://github.com/YOUR_USERNAME/GeoStream-Tracker.git)
    ```

### Step 3: Install Dependencies
We need to download the libraries (like Socket.io and Express) that make the app work.
1.  Open your terminal (Command Prompt or VS Code Terminal).
2.  Navigate to the project folder.
3.  Type this command and hit Enter:
    ```bash
    npm install
    ```

### Step 4: Start the Server
Now, let's turn it on!
1.  Type this command:
    ```bash
    node app.js
    ```
2.  You should see a message saying: `Server running on port 3000`.

### Step 5: Open the App
1.  Open your web browser (Chrome, Firefox, Safari).
2.  Go to: `http://localhost:3000`
3.  Allow **Location Permission** when asked.
4.  Open the same link in a **Second Tab** to test tracking two people!


---

## ❓ Troubleshooting (Common Errors)

**1. "I don't see anyone on the map!"**
* Make sure you clicked **"Allow"** when the browser asked for your location.
* Make sure both tabs are in the **same room** (check your spelling!).

**2. "The map is stuck in the ocean (0,0)"**
* This means your GPS hasn't found you yet.
* Click the **"📍 Recenter"** button on the screen.

**3. "I can't see the Public users in my Private room"**
* This is intentional! Private rooms are isolated. Go to the "Public Meetup" tab to see everyone.

---

## 🤝 Contributing
Feel free to fork this project and add your own features!
1.  Fork the Project
2.  Create your Feature Branch
3.  Commit your Changes
4.  Push to the Branch
5.  Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Made with ❤️ by Venkatesh C**