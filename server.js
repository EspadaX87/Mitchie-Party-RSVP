// Import necessary modules
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || "your_mongodb_connection_string_here";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log("MongoDB Connection Error:", err));

// Define a simple User Schema for authentication
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});

const User = mongoose.model("User", userSchema);

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "mitchie_secret_1234";

// Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (username !== "mitchie" || password !== "legends123") {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT Token (expires in 1 hour)
    const token = jwt.sign({ user: "mitchie" }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ token });
});

// Middleware to verify JWT Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ error: "No token provided" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Failed to authenticate token" });

        req.user = user;
        next();
    });
};

// Protected Route: Fetch RSVP List (Requires Authentication)
app.get("/rsvps", authenticateToken, (req, res) => {
    res.json({ message: "Welcome Mitchie! RSVP data would be here." });
});

// Set up server to listen on port
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
