/**
 * Express application setup
 */

import express from 'express';
import cors from 'cors';
import { childrenRouter } from './routes/children.js';
import { measurementsRouter } from './routes/measurements.js';
import { medicalEventsRouter } from './routes/medical-events.js';
import attachmentsRouter from './routes/attachments.js';
import avatarsRouter from './routes/avatars.js';
import visitsRouter from './routes/visits.js';
import illnessesRouter from './routes/illnesses.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging (simple)
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  app.use('/api/children', childrenRouter);
  app.use('/api/visits', visitsRouter); // Unified visits endpoint
  app.use('/api/illnesses', illnessesRouter); // Illness tracking
  app.use('/api/measurements', measurementsRouter);
  app.use('/api/medical-events', medicalEventsRouter);
  app.use('/api', attachmentsRouter);
  app.use('/api', avatarsRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
