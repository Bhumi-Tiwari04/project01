// otp page 



const express = require('express');
const session = require('express-session');
const crypto = require('crypto'); // For generating OTP

const app = express();

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));

// Configure session middleware
app.use(session({
  secret: 'your-secret-key', // Replace with a secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 2 * 60 * 1000 } // Session duration: 2 minutes
}));

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
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
