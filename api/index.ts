// Vercel Serverless Function entry. Vercel routes /api/* here (see vercel.json),
// and the Express app — which defines /api/* routes — handles them.
// @vercel/node compiles this TypeScript function automatically.
import app from '../backend/src/app.js';

export default app;
