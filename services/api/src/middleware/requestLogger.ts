import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique request ID to each request for tracing.
 * Logs minimal request info for audit purposes.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Avoid logging full request bodies in production (may contain PII)
    console.log(
      JSON.stringify({
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      })
    );
  });

  next();
}
