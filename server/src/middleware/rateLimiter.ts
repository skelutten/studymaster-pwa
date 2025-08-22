import { Request, Response, NextFunction } from 'express';

// Simple rate limiter implementation without external dependency
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  const clientData = requestCounts.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return next();
  }

  if (clientData.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.'
      }
    });
  }

  clientData.count++;
  next();
};

// Auth rate limiter
export const authLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;

  const key = `auth-${ip}`;
  const clientData = requestCounts.get(key);
  
  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return next();
  }

  if (clientData.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later.'
      }
    });
  }

  clientData.count++;
  next();
};

export default rateLimiter;