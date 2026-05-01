import rateLimit from 'express-rate-limit';

// General API limit — generous, mostly to deter scraping / runaway clients.
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
});

// Tighter limit for mutating routes that touch the filesystem (icon import/delete,
// avatar upload, backup export). Helps defend against abuse of disk I/O.
export const writeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many write requests, please try again later.' },
});

// Auth endpoints (login/refresh/forgot-password). Per-IP, conservative.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts.' },
});
