import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import { config, getSafeConfigSummary, validateProductionConfig } from './server/config.js';
import { initDatabase, db } from './server/db.js';
import { apiRouter } from './server/api.js';
import { adminAuthRouter, adminAuthMiddleware } from './server/adminAuth.js';

async function startServer() {
  console.log('[RoyCash] Initializing backend foundation...');

  // 1. Validate mandatory production secrets immediately on startup
  validateProductionConfig();

  console.log('[RoyCash] Server Configuration:', JSON.stringify(getSafeConfigSummary(), null, 2));

  // 2. Initialize SQLite tables & baseline settings
  initDatabase();

  const app = express();
  const PORT = config.port;
  const isProd = config.isProd;

  // Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

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

  // Anti-CSRF protection for cookie-authenticated mutating requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (mutatingMethods.includes(req.method) && req.path.startsWith('/api')) {
      // S2S postbacks are incoming server-to-server callbacks from advertiser networks,
      // authenticated by their own provider signature / cryptographic keys, not user cookies
      if (req.path.startsWith('/api/postback')) {
        return next();
      }

      // Check if request is authenticated via cookies (admin cookie or user cookie)
      const hasCookieAuth = Boolean(req.cookies?.roycash_admin_token || req.cookies?.roycash_token);

      // Verify Origin / Referer against trusted origins
      const rawOrigin = req.headers['origin'];
      const rawReferer = req.headers['referer'];

      let requestOrigin: string | null = null;
      if (typeof rawOrigin === 'string' && rawOrigin) {
        requestOrigin = rawOrigin.trim().toLowerCase();
      } else if (typeof rawReferer === 'string' && rawReferer) {
        try {
          const parsed = new URL(rawReferer);
          requestOrigin = parsed.origin.toLowerCase();
        } catch {
          requestOrigin = null;
        }
      }

      // Allowed origins: host header, APP_URL origin, localhost, or same host
      const host = req.get('host')?.toLowerCase();
      const allowedOrigins = new Set<string>();

      if (host) {
        allowedOrigins.add(`http://${host}`);
        allowedOrigins.add(`https://${host}`);
      }
      if (config.appUrl) {
        try {
          const appUrlParsed = new URL(config.appUrl);
          allowedOrigins.add(appUrlParsed.origin.toLowerCase());
        } catch {
          // ignore
        }
      }
      allowedOrigins.add('http://localhost:3000');
      allowedOrigins.add('http://127.0.0.1:3000');

      const currentEnv = process.env.NODE_ENV || (config.isProd ? 'production' : 'development');
      const isProductionMode = currentEnv === 'production';

      // If cookie-authenticated or mutating API request, require valid Origin / Referer from trusted origin
      if (hasCookieAuth || requestOrigin !== null) {
        if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: CSRF protection rejected request. Missing or untrusted Origin / Referer.',
          });
        }
      } else if (isProductionMode) {
        // In production, reject any mutating API call lacking a valid Origin/Referer
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Missing Origin or Referer header for mutating request.',
        });
      }
    }
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

  // Centralized Error Handling Middleware (hides database details and internal stack traces)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err.message || err);

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
  console.error('[RoyCash Fatal] Error starting server:', err.message || err);
  process.exit(1);
});
