Voting System Backend

This is the backend for an online voting system built with Node.js, Express, and SQLite.
It provides a RESTful API for user authentication, poll management, voting, and statistics.
Table of Contents
Setup

    Install dependencies:

bash
npm install express sqlite3 bcryptjs jsonwebtoken cors dotenv

Initialize the database:

    Using Python:

bash
python init_db.py

Or using SQLite CLI:

    bash
    sqlite3 voting.db < schema.sql

Create a .env file:

text
JWT_SECRET=your_jwt_secret_here

Start the server:

    bash
    node app.js

    The backend will run on http://localhost:3000.

Database Schema

Tables:

    users: Stores user accounts (admin and normal users)

    polls: Stores poll questions

    options: Stores poll options

    votes: Stores user votes

See schema.sql for details.
Environment Variables

    JWT_SECRET: Secret key for JWT token signing (required)

API Endpoints

    All endpoints (except /api/register and /api/login) require a valid JWT token in the Authorization header:
    Authorization: Bearer <token>

User Authentication
Register

    POST /api/register

    Body:

json
{
  "username": "alice",
  "password": "password123",
  "is_admin": 0
}

Response:

    json
    {
      "token": "<jwt_token>",
      "user": { "id": 1, "username": "alice", "is_admin": false }
    }

Login

    POST /api/login

    Body:

json
{
  "username": "alice",
  "password": "password123"
}

Response:

    json
    {
      "token": "<jwt_token>",
      "user": { "id": 1, "username": "alice", "is_admin": false }
    }

Polls
Get Running Polls

    GET /api/polls

    Response:

    json
    [
      {
        "id": 1,
        "question": "Favorite color?",
        "is_active": 1,
        "created_by": 1,
        "created_at": "2024-06-01T12:00:00Z",
        "options": [
          { "id": 1, "poll_id": 1, "option_text": "Red", "vote_count": 5 },
          { "id": 2, "poll_id": 1, "option_text": "Blue", "vote_count": 3 }
        ]
      }
    ]

Create Poll (Admin only)

    POST /api/polls

    Body:

json
{
  "question": "Favorite fruit?",
  "options": ["Apple", "Banana", "Orange"]
}

Response:

    json
    { "pollId": 2 }

Stop Poll (Admin only)

    POST /api/polls/:pollId/stop

    Response:

    text
    Poll stopped

Voting
Vote on a Poll

    POST /api/polls/:pollId/vote

    Body:

json
{ "optionId": 1 }

Response:

    text
    Vote recorded

Statistics (Admin only)
List All Polls

    GET /api/polls/all

    Response:

    json
    [
      { "id": 1, "question": "Favorite color?", ... },
      { "id": 2, "question": "Favorite fruit?", ... }
    ]

Get Poll Statistics

    GET /api/polls/:pollId/stats

    Response:

    json
    {
      "poll": { "id": 1, "question": "Favorite color?", ... },
      "options": [
        { "id": 1, "poll_id": 1, "option_text": "Red", "vote_count": 5 },
        { "id": 2, "poll_id": 1, "option_text": "Blue", "vote_count": 3 }
      ]
    }

Troubleshooting
