const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./voting.db');

// Helper: Auth middleware
function authenticate(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).send('No token');
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).send('Invalid token');
  }
}
function isAdmin(req, res, next) {
  if (!req.user.is_admin) return res.status(403).send('Admins only');
  next();
}

// Registration
app.post('/api/register', async (req, res) => {
  const { username, password, is_admin } = req.body;
  if (!username || !password) return res.status(400).send('Missing fields');
  const hash = await bcrypt.hash(password, 10);
  db.run(
    'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
    [username, hash, is_admin ? 1 : 0],
    function (err) {
      if (err) return res.status(400).send('Username exists');
      const user = { id: this.lastID, username, is_admin: !!is_admin };
      const token = jwt.sign(user, process.env.JWT_SECRET);
      res.json({ token, user });
    }
  );
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (!user) return res.status(401).send('Invalid credentials');
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).send('Invalid credentials');
    const userData = { id: user.id, username: user.username, is_admin: !!user.is_admin };
    const token = jwt.sign(userData, process.env.JWT_SECRET);
    res.json({ token, user: userData });
  });
});

// Get running polls (with options)
app.get('/api/polls', authenticate, (req, res) => {
  db.all('SELECT * FROM polls WHERE is_active = 1', [], (err, polls) => {
    if (!polls.length) return res.json([]);
    const pollIds = polls.map(p => p.id);
    db.all(
      `SELECT * FROM options WHERE poll_id IN (${pollIds.map(() => '?').join(',')})`,
      pollIds,
      (err, options) => {
        const pollMap = {};
        polls.forEach(p => pollMap[p.id] = { ...p, options: [] });
        options.forEach(o => pollMap[o.poll_id].options.push(o));
        res.json(Object.values(pollMap));
      }
    );
  });
});

// Get all polls (for stats)
app.get('/api/polls/all', authenticate, isAdmin, (req, res) => {
  db.all('SELECT * FROM polls', [], (err, polls) => res.json(polls));
});

// Create poll (admin)
app.post('/api/polls', authenticate, isAdmin, (req, res) => {
  const { question, options } = req.body;
  if (!question || !options || options.length < 2) return res.status(400).send('Invalid');
  db.run(
    'INSERT INTO polls (question, created_by) VALUES (?, ?)',
    [question, req.user.id],
    function (err) {
      if (err) return res.status(500).send('DB error');
      const pollId = this.lastID;
      const stmt = db.prepare('INSERT INTO options (poll_id, option_text) VALUES (?, ?)');
      options.forEach(opt => stmt.run(pollId, opt));
      stmt.finalize();
      res.json({ pollId });
    }
  );
});

// Stop poll (admin)
app.post('/api/polls/:pollId/stop', authenticate, isAdmin, (req, res) => {
  db.run('UPDATE polls SET is_active = 0 WHERE id = ?', [req.params.pollId], err => {
    if (err) return res.status(500).send('DB error');
    res.send('Poll stopped');
  });
});

// Vote
app.post('/api/polls/:pollId/vote', authenticate, (req, res) => {
  const pollId = req.params.pollId;
  const { optionId } = req.body;
  db.get('SELECT * FROM votes WHERE user_id = ? AND poll_id = ?', [req.user.id, pollId], (err, vote) => {
    if (vote) return res.status(400).send('Already voted');
    db.run(
      'INSERT INTO votes (user_id, poll_id, option_id) VALUES (?, ?, ?)',
      [req.user.id, pollId, optionId],
      function (err) {
        if (err) return res.status(500).send('DB error');
        db.run('UPDATE options SET vote_count = vote_count + 1 WHERE id = ?', [optionId]);
        res.send('Vote recorded');
      }
    );
  });
});

// Poll stats
app.get('/api/polls/:pollId/stats', authenticate, isAdmin, (req, res) => {
  db.get('SELECT * FROM polls WHERE id = ?', [req.params.pollId], (err, poll) => {
    if (!poll) return res.status(404).send('Poll not found');
    db.all('SELECT * FROM options WHERE poll_id = ?', [poll.id], (err, options) => {
      res.json({ poll, options });
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Backend running on port', PORT));
