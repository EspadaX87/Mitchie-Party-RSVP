const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const { parse } = require('json2csv');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const rsvpSchema = new mongoose.Schema({
  name: String,
  phone: String,
  plusOne: {
    name: String,
    phone: String,
  },
});

const messageLogSchema = new mongoose.Schema({
  phone: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const RSVP = mongoose.model('RSVP', rsvpSchema);
const MessageLog = mongoose.model('MessageLog', messageLogSchema);

// Authentication Middleware
const authenticate = (req, res, next) => {
  const { username, password } = req.body;
  if (username === 'mitchie' && password === 'legends123') {
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Route for login
app.post('/login', authenticate);

// Protected Route Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(500).json({ error: 'Failed to authenticate token' });
    req.user = decoded;
    next();
  });
};

// Route to get all RSVPs (Protected)
app.get('/rsvps', verifyToken, async (req, res) => {
  try {
    const rsvps = await RSVP.find();
    res.status(200).json(rsvps);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching RSVPs' });
  }
});

// Route to export RSVPs as CSV (Protected)
app.get('/export-rsvps', verifyToken, async (req, res) => {
  try {
    const rsvps = await RSVP.find();
    
    const formattedData = rsvps.map(rsvp => ({
      Name: rsvp.name,
      Phone: rsvp.phone,
      PlusOneName: rsvp.plusOne ? rsvp.plusOne.name : '',
      PlusOnePhone: rsvp.plusOne ? rsvp.plusOne.phone : ''
    }));

    const csv = parse(formattedData);
    const filePath = './rsvps.csv';
    fs.writeFileSync(filePath, csv);
    res.download(filePath, 'rsvps.csv');
  } catch (error) {
    res.status(500).json({ error: 'Error exporting RSVPs' });
  }
});

// Function to determine the carrier gateway dynamically
async function getCarrierGateway(phone) {
  try {
    const response = await axios.get(`https://api.example.com/carrier-lookup?phone=${phone}`);
    const carrier = response.data.carrier.toLowerCase();
    const gateways = {
      'verizon': 'vtext.com',
      'at&t': 'txt.att.net',
      'tmobile': 'tmomail.net',
      'sprint': 'messaging.sprintpcs.com',
    };
    return gateways[carrier] ? `${phone}@${gateways[carrier]}` : null;
  } catch (error) {
    return null;
  }
}

// Function to generate a random 360-area-code number
function generateRandom360Number() {
  const randomNum = Math.floor(1000000 + Math.random() * 9000000);
  return `360${randomNum}`;
}

// Route to send SMS via Email-to-SMS Gateway (Protected)
app.post('/send-text', verifyToken, async (req, res) => {
  try {
    const { phone, message } = req.body;
    const smsGateway = await getCarrierGateway(phone);
    if (!smsGateway) return res.status(400).json({ error: 'Carrier not supported' });
    
    const randomSender = `${generateRandom360Number()}@gmail.com`;
    let transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: randomSender,
      to: smsGateway,
      subject: '',
      text: message,
    };

    await transporter.sendMail(mailOptions);
    await MessageLog.create({ phone, message });
    res.status(200).json({ message: 'Text sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Error sending text' });
  }
});

// Route to fetch message history (Protected)
app.get('/message-history', verifyToken, async (req, res) => {
  try {
    const messages = await MessageLog.find().sort({ timestamp: -1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching message history' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
