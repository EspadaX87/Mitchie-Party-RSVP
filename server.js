app.use((req, res, next) => {
    console.log("Incoming Headers:", req.headers);
    next();
});

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = "mitchie_secret_1234"; // Make sure this matches your JWT verification

// Endpoint for user login (generates token)
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username === "mitchie" && password === "legends123") {
        const token = jwt.sign(
            { user: "mitchie", exp: Math.floor(Date.now() / 1000) + (60 * 60) }, // Expires in 1 hour
            SECRET_KEY
        );
        res.json({ token });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    
    if (!token) {
        return res.status(403).json({ error: "No token provided" });
    }

    const formattedToken = token.replace("Bearer ", ""); // Ensures proper formatting

    jwt.verify(formattedToken, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(500).json({ error: "Failed to authenticate token" });
        }
        req.user = decoded.user;
        next();
    });
};

// Protected route to fetch RSVPs
app.get("/rsvps", verifyToken, (req, res) => {
    res.json({ message: "Success! You are authenticated.", user: req.user });
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
