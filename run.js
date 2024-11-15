const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");

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

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contactNumber: { type: String, required: true },
    role: { type: String }, // Optional role field
});

const User = mongoose.model("User", userSchema);

// Assignment Schema
// Assignment Schema (updated)
const assignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },  // added 'title' field
    description: { type: String, required: true },  // added 'description' field
    deadline: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // teacher who created the assignment
    submittedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // students who submitted the assignment
});

const Assignment = mongoose.model("Assignment", assignmentSchema);


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
    cookie: { maxAge: 3600000 } // Session expires after 1 hour
}));

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // store files in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // unique filename
    }
});

const upload = multer({ storage: storage });

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
    try {
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
    } catch (error) {
        res.status(500).send("Error registering user: " + error.message);
    }
});

// Login route
app.post("/login", async (req, res) => {
    const { username, password, userType } = req.body;

    try {
        const existingUser = await User.findOne({ username: username });
        if (!existingUser) {
            return res.status(401).send("Invalid username or password. Please try again.");
        }

        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (isPasswordValid) {
            req.session.userId = existingUser._id;
            req.session.role = existingUser.role;
            
            // Redirect based on userType
            if (userType === 'student') {
                return res.redirect('/attu.html');
            } else if (userType === 'teacher') {
                return res.render('t');
            }
        } else {
            res.status(401).send("Invalid password. Please try again.");
        }
    } catch (error) {
        res.status(500).send("Error logging in: " + error.message);
    }
});

// Route to add a new assignment (for teachers)
app.post('/add-assignment', async (req, res) => {
    const { question, deadline } = req.body;
    const teacherId = req.session.userId;

    if (!teacherId) {
        return res.status(403).send("You must be logged in as a teacher to add assignments.");
    }

    try {
        const newAssignment = new Assignment({
            question,
            deadline,
            createdBy: teacherId
        });
        await newAssignment.save();
        res.redirect('/teacher');
    } catch (error) {
        res.status(500).send("Error adding assignment: " + error.message);
    }
});

// Route to get the latest assignment (for students)
app.get('/get-latest-assignment', async (req, res) => {
    try {
        const assignment = await Assignment.findOne().sort({ createdAt: -1 }); // Get latest assignment
        if (assignment) {
            res.json({ assignment });
        } else {
            res.json({ assignment: null });
        }
    } catch (error) {
        res.status(500).send("Error fetching assignment: " + error.message);
    }
});

// Route to submit an assignment (for students)
app.post('/submit-assignment', upload.single('assignment-file'), async (req, res) => {
    const studentId = req.session.userId;
    const assignmentName = req.body['assignment-name'];

    if (!studentId) {
        return res.status(403).send("You must be logged in as a student to submit assignments.");
    }

    const file = req.file;
    if (!file) {
        return res.status(400).send("Please upload the assignment file.");
    }

    try {
        const assignment = await Assignment.findOne({ question: assignmentName });
        if (!assignment) {
            return res.status(404).send("Assignment not found.");
        }

        // Here, you can handle file storage and link it to the assignment.
        assignment.submittedBy.push(studentId);
        await assignment.save();

        res.json({ message: 'Assignment submitted successfully!' });
    } catch (error) {
        res.status(500).send("Error submitting assignment: " + error.message);
    }
});
// Route to view teacher page (only for teachers)
app.get('/teacher', async (req, res) => {
    if (!req.session.role || req.session.role !== 'teacher') {
        return res.status(403).send('Access denied: You are not authorized to view this page.');
    }

    try {
        // Fetch assignments for the teacher
        const assignments = await Assignment.find();
        res.render('t', { assignments });  // Pass assignments to EJS template
    } catch (error) {
        res.status(500).send("Error fetching assignments: " + error.message);
    }
});



// Route to handle OTP verification (for students)
app.post('/verify-otp', (req, res) => {
    if (req.session.active && req.session.otp) {
        if (req.body.otp === req.session.otp) {
            res.send('<h1>OTP Verified!</h1><p>Access granted.</p>');
            req.session.otp = null; // Invalidate OTP after verification
        } else {
            res.send('<h1>Invalid OTP</h1><p>Please try again.</p>');
        }
    } else {
        res.send('<h1>Session Expired</h1><p>Your session has expired. Please log in again.</p>');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
