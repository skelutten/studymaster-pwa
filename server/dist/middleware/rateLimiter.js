"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.rateLimiter = void 0;
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxRequests = 100;
    const clientData = requestCounts.get(ip);
    if (!clientData || now > clientData.resetTime) {
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
exports.rateLimiter = rateLimiter;
const authLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
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
exports.authLimiter = authLimiter;
exports.default = exports.rateLimiter;
//# sourceMappingURL=rateLimiter.js.map