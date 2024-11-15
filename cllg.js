
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/pro', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contactNumber: { type: String, required: true },
    role: { type: String }, // Optional role field
});

const User = mongoose.model("User", userSchema);

// Blocked IP schema
const ipSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
});

const BlockedIP = mongoose.model("BlockedIP", ipSchema);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 1000 }
}));

// Middleware to check if IP is blocked
app.use(async (req, res, next) => {
    const userIP = req.ip;
    const blockedEntry = await BlockedIP.findOne({ ip: userIP });
    if (blockedEntry) {
        return res.status(403).send('Access denied: Your IP is blocked.');
    }
    next();
});

// Home route
app.get("/", (req, res) => {
    res.send(`
        <h1>Welcome!</h1>
        <form action="/register" method="POST">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <input type="text" name="contactNumber" placeholder="Contact Number" required>
            <button type="submit">Register</button>
        </form>
        <form action="/login" method="POST">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <select name="userType" required>
                <option value="" disabled selected>Select User Type</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
            </select>
            <button type="submit">Login</button>
        </form>
    `);
});

// Registration route
app.post("/register", async (req, res) => {
    const { username, password, contactNumber, role } = req.body;
    
    const normalizedUsername = username.toLowerCase();
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
        return res.status(400).send("Username already exists. Please choose a different one.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: normalizedUsername, password: hashedPassword, contactNumber, role });
    await newUser.save();
    res.redirect("/"); // Redirect to home after registration
});

// Login route
app.post("/login", async (req, res) => {
    const { username, password, userType } = req.body;

    const existingUser = await User.findOne({ username: username });
    if (!existingUser) {
        return res.status(401).send("Invalid username or password. Please try again.");
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (isPasswordValid) {
        req.session.userId = existingUser._id;
        req.session.role = existingUser.role; // Add this line
    
        // Redirect based on userType
        if (userType === 'student') {
            return res.redirect('/attu.html'); // Adjust as necessary
        } else if (userType === 'teacher') {
            return res.render('t'); // Render the EJS template for the teacher
        }
    } else {
        res.status(401).send("Invalid password. Please try again.");
    }
});

// Session management routes
app.get("/start-session", (req, res) => {
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
        <a href="/teacher">Go to Teacher's Page</a>
    `);
});

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

app.get('/teacher', (req, res) => {
    if (!req.session.role || req.session.role !== 'teacher') {
        return res.status(403).send('Access denied: You are not authorized to view this page.');
    }

    const otp = Math.floor(Math.random() * 900000) + 100000; // Generate a 6-digit OTP
    req.session.otp = otp; // Store OTP in the session
    req.session.active = true;  // Ensure session is active

    res.render('t', { otp: otp }); // Pass OTP to the teacher page (optional, for display)
});



// Route for students to enter the OTP

app.get('/student', (req, res) => {
    if (!req.session.active) {
        return res.redirect('/'); // If the session has expired, redirect to the home page
    }

    // Retrieve OTP from the session (ensure it's set)
    const otp = req.session.otp;
    if (!otp) {
        return res.status(400).send("OTP has expired or is invalid.");
    }

    // Pass OTP to the student page (render the EJS with OTP)
    res.render('attu', { otp: otp });
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
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    
    // console.log(Server is running on http:localhost:${PORT});
});

