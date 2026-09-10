# Deriv Matches Tool

A small, read-only web dashboard for viewing Deriv tick data and analyzing the distribution of the last digit.

## What it does

- Connects to Deriv's public WebSocket market-data stream.
- Shows the latest quote.
- Extracts the last digit of each quote.
- Counts how often each digit (0–9) appears.
- Shows the most frequent digit in the current sample.
- Shows the most recent 30 digits.
- Does **not** place trades or manage a Deriv account.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:10000`.

## Deploy on Render

Create a **Web Service** from this GitHub repository.

Recommended settings for this Docker project:

- Environment: Docker
- Branch: main
- Root Directory: leave blank
- Build Command: leave blank
- Start Command: leave blank
- Health Check Path: `/health`

Render will use the `Dockerfile`.

## GitHub upload

Upload all project files while keeping this structure:

```text
deriv-matches-tool/
├── .dockerignore
├── Dockerfile
├── README.md
├── package.json
├── server.js
└── public/
    ├── app.js
    ├── index.html
    └── style.css
```

Do not upload `.env` or passwords/API tokens to GitHub.
