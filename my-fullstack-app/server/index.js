import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { assertDbConnection, pool } from './src/config/db.js';
import apiRoutes from './src/routes/index.js';
import mediaRoutes from './src/routes/media.routes.js';
import { notFoundHandler, errorHandler } from './src/middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Hostinger's Node.js hosting sits behind its own reverse proxy, which adds
// an X-Forwarded-For header on every request. Without this, Express refuses
// to trust that header at all — and express-rate-limit (used on auth,
// checkout, contact, etc.) throws on every single request trying to read
// the real client IP from it, since trusting a spoofable header blindly
// would be a security problem. `1` means "trust exactly one hop" (that
// proxy), so rate limiting still keys off the real visitor IP instead of
// the proxy's, without trusting anything further upstream. Harmless
// locally — there's no proxy in front of the dev server to forward from.
app.set('trust proxy', 1);

// Security & core middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(compression());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Payment slips are the one upload type still saved to local disk (they can
// be PDFs, and they're admin-viewed proof of payment rather than storefront
// content) — created up front since multer's diskStorage does NOT create
// missing destination directories itself; the first upload would crash with ENOENT.
// Everything else (product/banner/hero/review photos) is stored as binary
// data in the database instead — see /media below — specifically because
// Hostinger gives each deploy its own fresh folder, so anything only saved
// to local disk here is lost on the next redeploy.
//
// Deliberately NOT served via express.static: a slip is a customer's bank
// transfer proof (often a screenshot with account details), and a static
// route would make it fetchable by anyone with the URL, no login required.
// It's served instead through GET /api/admin/orders/:id/slip, gated by
// requireStaffOrAdmin — see admin.controller.js's getOrderSlip.
fs.mkdirSync(path.join(process.cwd(), 'uploads', 'slips'), { recursive: true });
app.use('/media', mediaRoutes);

// API routes
app.use('/api', apiRoutes);

// Legacy sample route (kept for parity with the original stub)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Express Backend working' });
});

// Serve the built React app from the same server, on the same domain.
// The frontend calls relative URLs like "/api/..." and "/uploads/...", so
// keeping everything on one origin means those calls work with zero extra
// config (no CORS, no subdomain, no hardcoded production URL). To use this,
// build the client (`npm run build` in client/) and copy the resulting
// client/dist folder into server/public before deploying. Locally in dev
// this folder won't exist, so this block is simply skipped.
const clientBuildPath = path.join(__dirname, 'public');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  // Any other GET request (e.g. a page refresh on /product/123) should still
  // load the React app, so the browser's own router can take over — except
  // requests meant for the API or uploaded files, which fall through instead.
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await assertDbConnection();
    console.log('Connected to MySQL.');
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Stop accepting new requests and close the database connections cleanly
  // before the process exits, instead of cutting everything off abruptly.
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Last-resort safety net. Every route is wrapped in catchAsync, and the one
  // fire-and-forget query in the codebase has its own .catch(), so in normal
  // operation these should never fire — but a stray rejection anywhere else
  // (a future fire-and-forget call, a bug in a dependency) would otherwise take
  // the whole process down immediately with no log line explaining why. Node
  // treats both as fatal already; we just make sure it's logged and the DB
  // pool is closed cleanly first instead of dying mid-connection.
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    server.close(() => process.exit(1));
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    server.close(() => process.exit(1));
  });
}

start();
