import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import { config, getSafeConfigSummary } from './server/config.js';
import { initDatabase, db } from './server/db.js';
import { apiRouter } from './server/api.js';
import { adminAuthRouter, adminAuthMiddleware } from './server/adminAuth.js';

async function startServer() {
  console.log('[RoyCash] Initializing backend foundation...');
  console.log('[RoyCash] Server Configuration:', JSON.stringify(getSafeConfigSummary(), null, 2));

  // Initialize SQLite tables & baseline settings
  initDatabase();

  const app = express();
  const PORT = config.port;
  const isProd = config.isProd;

  // Basic security and parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Request logging middleware (strips secrets, passwords, cookies, tokens)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      // Skip noisy static asset logs in dev
      if (!originalUrl.startsWith('/@') && !originalUrl.startsWith('/node_modules') && !originalUrl.startsWith('/src')) {
        console.log(`[HTTP] ${method} ${originalUrl} -> ${statusCode} (${duration}ms)`);
      }
    });

    next();
  });

  // Admin session extraction middleware
  app.use(adminAuthMiddleware as any);

  // Health check endpoint (checks both API and database readiness)
  app.get('/api/health', (req: Request, res: Response) => {
    try {
      const dbCheck = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
      const isDbOk = dbCheck?.alive === 1;

      res.status(isDbOk ? 200 : 503).json({
        status: isDbOk ? 'ok' : 'degraded',
        uptime: Math.floor(process.uptime()),
        database: isDbOk ? 'connected' : 'unreachable',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'error',
        error: 'Database connection check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Mount dedicated Admin Authentication & Management API
  app.use('/api/admin', adminAuthRouter);

  // Mount general API router
  app.use('/api', apiRouter);

  // Centralized Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);

    if (res.headersSent) {
      return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: isProd ? 'Internal server error.' : (err.message || 'Internal server error.'),
      timestamp: new Date().toISOString(),
    });
  });

  // Frontend integration: Vite middleware in dev, static files in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RoyCash] Server running on http://0.0.0.0:${PORT} [${config.nodeEnv.toUpperCase()}]`);
  });
}

startServer().catch((err) => {
  console.error('[RoyCash Fatal] Error starting server:', err);
  process.exit(1);
});
