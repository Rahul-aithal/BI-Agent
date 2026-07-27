# Skylark BI Agent

## Required environment variables

Create a `.env.local` file with:

```bash
AUTH_SECRET=your_auth_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=bi_agent
GEMINI_API_KEY=your_gemini_api_key
MONDAY_API_TOKEN=your_monday_api_token
MONDAY_DEALS_BOARD_ID=your_monday_deals_board_id
MONDAY_WORK_ORDERS_BOARD_ID=your_monday_work_orders_board_id
```

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and sign in with Google.
