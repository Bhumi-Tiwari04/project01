// const express = require('express');
// const session = require('express-session');
// const crypto = require('crypto');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');

// // Connect to MongoDB
// mongoose.connect('mongodb://localhost:27017/ip', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

// // Define a schema and model for blocked IPs
// const ipSchema = new mongoose.Schema({
//     ip: { type: String, required: true, unique: true },
//     date: { type: Date, default: Date.now },
// });
// const BlockedIP = mongoose.model('BlockedIP', ipSchema);

// // Initialize Express app
// const app = express();
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // Middleware to check if IP is blocked
// app.use(async (req, res, next) => {
//     const userIP = req.ip;
//     const blockedEntry = await BlockedIP.findOne({ ip: userIP });
//     if (blockedEntry) {
//         return res.status(403).send('Access denied: Your IP is blocked.');
//     }
//     next();
// });

// // Configure session middleware
// app.use(session({
//     secret: 'your-secret-key',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { maxAge: 2 * 60 * 1000 } // Session duration: 2 minutes
// }));

// // Route for the teacher to generate an OTP
// app.get('/teacher', (req, res) => {
//     const otp = crypto.randomInt(100000, 999999).toString();
//     req.session.otp = otp;
//     req.session.active = true;
//     res.send(`
//         <h1>Teacher's Page</h1>
//         <p>Your OTP is: ${otp}</p>
//         <a href="/student">Go to Student Page</a>
//     `);
// });

// // Route for students to enter the OTP
// app.get('/student', (req, res) => {
//     res.send(`
//         <h1>Student's Page</h1>
//         <form action="/verify-otp" method="POST">
//             <input type="text" name="otp" placeholder="Enter OTP" required>
//             <button type="submit">Verify OTP</button>
//         </form>
//         ${req.session.otp ? '' : '<p>Session expired. Please ask the teacher for a new OTP.</p>'}
//     `);
// });

// // Route to verify the OTP
// app.post('/verify-otp', (req, res) => {
//     if (req.session.active && req.session.otp) {
//         if (req.body.otp === req.session.otp) {
//             req.session.attendanceMarked = false; // Initialize attendance status
//             res.send(`
//                 <h1>OTP Verified!</h1>
//                 <p><a href="/mark-attendance">Mark Attendance</a></p>
//             `);
//             req.session.otp = null; // Invalidate OTP after verification
//         } else {
//             res.send('<h1>Invalid OTP</h1><p>Please try again.</p>');
//         }
//     } else {
//         res.send('<h1>Session Expired</h1><p>Your session has expired. Please ask the teacher for a new OTP.</p>');
//     }
// });

// // Route for marking attendance
// app.get('/mark-attendance', (req, res) => {
//     if (req.session.active) {
//         req.session.attendanceMarked = true; // Mark attendance
//         res.send(`
//             <h1>Attendance Marked!</h1>
//             <p>Your attendance has been marked.</p>
//             <p><a href="/">Go Back</a></p>
//         `);
//         // Block the IP after attendance is marked
//         const newBlockedIP = new BlockedIP({ ip: req.ip });
//         newBlockedIP.save().catch(err => console.log('Failed to block IP:', err));
//     } else {
//         res.send('<h1>Session Expired</h1><p>Your session has expired. Please ask the teacher for a new OTP.</p>');
//     }
// });

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });


const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ipst', {
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
    const userIP = req.ip;
    const blockedEntry = await BlockedIP.findOne({ ip: userIP });
    
    // Check if session exists and if it's not the teacher's IP
    if (blockedEntry && (!req.session || req.session.isTeacher !== true)) {
        return res.status(403).send('Access denied: Your IP is blocked.');
    }
    next();
});

// Configure session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2 * 60 * 1000 } // Session duration: 2 minutes
}));

// Route for the teacher to generate an OTP
app.get('/teacher', (req, res) => {
    const otp = crypto.randomInt(100000, 999999).toString();
    req.session.otp = otp;
    req.session.active = true;
    req.session.isTeacher = true; // Set teacher flag
    res.send(`
        <h1>Teacher's Page</h1>
        <p>Your OTP is: ${otp}</p>
        <a href="/student">Go to Student Page</a>
    `);
});

// Route for students to enter their name and OTP
app.get('/student', (req, res) => {
    res.send(`
        <h1>Student's Page</h1>
        <form action="/verify-otp" method="POST">
            <input type="text" name="name" placeholder="Enter your name" required>
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
            req.session.attendanceMarked = false; // Initialize attendance status
            req.session.studentName = req.body.name; // Save student's name
            req.session.isTeacher = false; // Ensure this session is for a student
            res.send(`
                <h1>OTP Verified!</h1>
                <p>Hello, ${req.session.studentName}!</p>
                <p><a href="/mark-attendance">Mark Attendance</a></p>
            `);
            req.session.otp = null; // Invalidate OTP after verification
        } else {
            res.send('<h1>Invalid OTP</h1><p>Please try again.</p>');
        }
    } else {
        res.send('<h1>Session Expired</h1><p>Your session has expired. Please ask the teacher for a new OTP.</p>');
    }
});

// Route for marking attendance
app.get('/mark-attendance', async (req, res) => {
    if (req.session.active && req.session.studentName) {
        req.session.attendanceMarked = true; // Mark attendance
        res.send(`
            <h1>Attendance Marked!</h1>
            <p>Your attendance has been marked, ${req.session.studentName}.</p>
            <p><a href="/">Go Back</a></p>
        `);
        
        // Block the IP after attendance is marked
        if (!req.session.isTeacher) { // Only block if it's a student
            const newBlockedIP = new BlockedIP({ ip: req.ip });
            await newBlockedIP.save().catch(err => console.log('Failed to block IP:', err));
        }
    } else {
        res.send('<h1>Session Expired</h1><p>Your session has expired. Please ask the teacher for a new OTP.</p>');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
