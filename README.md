# Deriv Matches Online
A deployable Node/Express web app with secure Deriv OAuth 2.0 login and live Matches/Differs digit analysis.

Set these environment variables on your hosting provider:
- DERIV_CLIENT_ID = your Deriv OAuth client ID
- BASE_URL = your HTTPS website URL
- SESSION_SECRET = a long random secret

Register this exact Deriv callback URL:
https://YOUR-DOMAIN/auth/callback

Run locally:
npm install
npm start

The current dashboard is analysis-only and does not place trades automatically.
