// session management
const express = require('express');
const session = require('express-session');

const app = express();

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));

// Configure session middleware
app.use(session({
  secret: 'your-secret-key', // Replace with a secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 30 * 1000 } // Session duration: 30 seconds
}));

// Route to start the session
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
app.post('/add-text', (req, res) => {
  if (req.session.active) {
    req.session.text += req.body.text + ' '; // Append text to session
    res.send(`
      <h1>Text Added</h1>
      <p>Your text: ${req.session.text}</p>
      <a href="/">Go back</a>
    `);
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

// Start server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
