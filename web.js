// for blocking ip addresss




const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ip-block-example', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define a schema and model for blocked IPs
const ipSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
});

const BlockedIP = mongoose.model('BlockedIP', ipSchema);

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to check if IP is blocked
app.use(async (req, res, next) => {
    const userIP = req.ip; // Get user IP address
    const blockedEntry = await BlockedIP.findOne({ ip: userIP });

    if (blockedEntry) {
        return res.status(403).send('Access denied: Your IP is blocked.');
    }
    next();
});

// Serve a simple HTML form
app.get('/', (req, res) => {
    res.send(`
        <form method="POST" action="/submit">
            <input type="text" name="data" placeholder="Enter something" required>
            <button type="submit">Submit</button>
        </form>
    `);
});

// Route to handle submissions
app.post('/submit', async (req, res) => {
    const userIP = req.ip;

    // Here you can handle form submission, e.g., save data to a database
    // For this example, we won't save any data

    // Block the user's IP after the first entry
    const newBlockedIP = new BlockedIP({ ip: userIP });
    await newBlockedIP.save();

    res.send('Thank you for your submission! Your IP is now blocked from further submissions.');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto'); // For generating OTP

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ip-block-examplesss', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define a schema and model for blocked IPs
const ipSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
});

const BlockedIP = mongoose.model('BlockedIP', ipSchema);

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to check if IP is blocked
app.use(async (req, res, next) => {
    const userIP = req.ip; // Get user IP address
    const blockedEntry = await BlockedIP.findOne({ ip: userIP });

    if (blockedEntry) {
        return res.status(403).send('Access denied: Your IP is blocked.');
    }
    next();
});

// Configure session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a secure secret
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 1000 } // Session duration: 30 seconds
}));

// Serve a simple HTML form
app.get('/', (req, res) => {
    res.send(`
        <h1>Start Session</h1>
        <form action="/start-session" method="POST">
            <button type="submit">Start Session</button>
        </form>
    `);
});

// Route to initialize the session
app.post('/start-session', (req, res) => {
    req.session.active = true; // Start the session
    req.session.text = ''; // Initialize text storage
    res.send(`
        <h1>Session Active</h1>
        <form action="/add-text" method="POST">
            <input type="text" name="text" placeholder="Add text" required>
            <button type="submit">Submit</button>
        </form>
        <p>Your session will expire in 30 seconds.</p>
        <a href="/check-session">Check Session Status</a>
    `);
});

// Route to add text
app.post('/add-text', async (req, res) => {
    if (req.session.active) {
        req.session.text += req.body.text + ' '; // Append text to session
        res.send(`
            <h1>Text Added</h1>
            <p>Your text: ${req.session.text}</p>
            <a href="/">Go back</a>
        `);
        
        // Block the user's IP after the first entry
        const userIP = req.ip;
        const newBlockedIP = new BlockedIP({ ip: userIP });
        await newBlockedIP.save();
    } else {
        res.send(`
            <h1>Session Expired</h1>
            <p>Your session has expired. <a href="/">Start a new session</a></p>
        `);
    }
});

// Route to check session status
app.get('/check-session', (req, res) => {
    if (req.session.active) {
        res.send(`Session is active. Your text: ${req.session.text}`);
    } else {
        res.send(`
            <h1>Session Expired</h1>
            <p>Your session has expired. <a href="/">Start a new session</a></p>
        `);
    }
});

// Middleware to check session expiration on every request
app.use((req, res, next) => {
    if (req.session && !req.session.active) {
        res.locals.sessionExpired = true; // Indicate that the session has expired
    }
    next();
});

// Route for the teacher to generate an OTP
app.get('/teacher', (req, res) => {
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
    req.session.otp = otp; // Store OTP in session
    req.session.active = true; // Mark session as active
    res.send(`
        <h1>Teacher's Page</h1>
        <p>Your OTP is: ${otp}</p>
        <a href="/student">Go to Student Page</a>
    `);
});

// Route for students to enter the OTP
app.get('/student', (req, res) => {
    res.send(`
        <h1>Student's Page</h1>
        <form action="/verify-otp" method="POST">
            <input type="text" name="otp" placeholder="Enter OTP" required>
            <button type="submit">Verify OTP</button>
        </form>
        ${req.session.otp ? '' : '<p>Session expired. Please ask the teacher for a new OTP.</p>'}
    `);
});

// Route to verify the OTP
app.post('/verify-otp', (req, res) => {
    if (req.session.active && req.session.otp) {
        if (req.body.otp === req.session.otp) {
            res.send('<h1>OTP Verified!</h1><p>Access granted.</p>');
            req.session.otp = null; // Invalidate OTP after verification
        } else {
            res.send('<h1>Invalid OTP</h1><p>Please try again.</p>');
        }
    } else {
        res.send('<h1>Session Expired</h1><p>Your session has expired. Please ask the teacher for a new OTP.</p>');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
