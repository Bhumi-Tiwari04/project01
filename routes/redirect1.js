// routes/redirect1.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // For generating OTP

// Middleware to parse request body
router.use(express.urlencoded({ extended: true }));

// Route for the teacher to generate an OTP
router.get('/teacher', (req, res) => {
  const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
  req.session.otp = otp; // Store OTP in session
  req.session.active = true; // Mark session as active
  res.send(`
    <h1>Teacher's Page</h1>
    <p>Your OTP is: ${otp}</p>
    <a href="/redirect1/student">Go to Student Page</a>
  `);
});

// Route for students to enter the OTP
router.get('/student', (req, res) => {
  res.send(`
    <h1>Student's Page</h1>
    <form action="/redirect1/verify-otp" method="POST">
      <input type="text" name="otp" placeholder="Enter OTP" required>
      <button type="submit">Verify OTP</button>
    </form>
    ${req.session.otp ? '' : '<p>Session expired. Please ask the teacher for a new OTP.</p>'}
  `);
});

// Route to verify the OTP
router.post('/verify-otp', (req, res) => {
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

module.exports = router; // Export the router
