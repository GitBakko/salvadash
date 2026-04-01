import { Router, type Router as RouterType, type Request, type Response } from 'express';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  changeEmailSchema,
} from '@salvadash/shared';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  generateInviteCode,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from '../lib/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email-templates.js';
import { authenticate } from '../middleware/auth.js';
import type { AuthPayload } from '../middleware/auth.js';

const router: RouterType = Router();

// ─── Avatar Upload Config ──────────────────────────────────

const UPLOADS_DIR = path.resolve(import.meta.dirname, '../../uploads/avatars');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only .jpg, .png, .webp images are allowed'));
  },
});

// ─── POST /auth/register ───────────────────────────────────

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { name, email, password, inviteCode, language, currency } = parsed.data;

    // Validate invite code
    const invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!invite || !invite.isActive || invite.usedByUserId) {
      res.status(400).json({ success: false, error: 'Invalid or already used invite code' });
      return;
    }

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    // Generate username from email
    const baseUsername = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    let username = baseUsername;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix++}`;
    }

    const passwordHash = await hashPassword(password);
    const emailVerifyToken = generateRandomToken();

    // Create user + mark invite as used in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          username,
          passwordHash,
          language,
          currency,
          emailVerifyToken,
        },
      });

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { usedByUserId: newUser.id, isActive: false, usedAt: new Date() },
      });

      // Default income sources
      await tx.incomeSource.createMany({
        data: [
          { userId: newUser.id, name: 'Stipendio', sortOrder: 0 },
          { userId: newUser.id, name: 'Pensione', sortOrder: 1 },
        ],
      });

      return newUser;
    });

    // Send verification email (don't await to not block response)
    sendVerificationEmail(email, name, emailVerifyToken).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        message: 'Registration successful. Please verify your email.',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/login ──────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    if (!user.emailVerified) {
      res
        .status(403)
        .json({ success: false, error: 'Email not verified. Please check your inbox.' });
      return;
    }

    const payload: AuthPayload = { userId: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          language: user.language,
          currency: user.currency,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/verify-email ───────────────────────────────

router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'Token required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
    if (!user) {
      res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    res.json({ success: true, data: { message: 'Email verified successfully' } });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/forgot-password ────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed' });
      return;
    }

    // Always respond 200 to prevent email enumeration
    const successMsg = {
      success: true,
      data: { message: 'If the email exists, a reset link has been sent.' },
    };

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.isActive) {
      res.json(successMsg);
      return;
    }

    const resetToken = generateRandomToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken, passwordResetExpires: expires },
    });

    sendPasswordResetEmail(user.email, user.name, resetToken).catch((err) => {
      console.error('Failed to send password reset email:', err);
    });

    res.json(successMsg);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/reset-password ─────────────────────────────

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { token, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    });

    res.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/refresh ────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      res.status(401).json({ success: false, error: 'No refresh token' });
      return;
    }

    let decoded: AuthPayload;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      res.status(401).json({ success: false, error: 'User not found or inactive' });
      return;
    }

    const payload: AuthPayload = { userId: user.id, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.cookie('accessToken', newAccessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({ success: true, data: { message: 'Tokens refreshed' } });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/logout ─────────────────────────────────────

router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ success: true, data: { message: 'Logged out' } });
});

// ─── GET /auth/me ───────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        language: true,
        currency: true,
        avatarUrl: true,
        emailVerified: true,
        lastSeenVersion: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /auth/profile ──────────────────────────────────────

router.put('/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, language, currency } = req.body;
    const data: Record<string, string> = {};
    if (name && typeof name === 'string') data.name = name;
    if (language && ['it', 'en'].includes(language)) data.language = language;
    if (currency && ['EUR', 'GBP', 'USD'].includes(currency)) data.currency = currency;

    if (Object.keys(data).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        language: true,
        currency: true,
        avatarUrl: true,
      },
    });

    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /auth/change-password ──────────────────────────────

router.put('/change-password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstMessage = parsed.error.issues[0]?.message ?? 'Dati non validi';
      res.status(400).json({ success: false, error: firstMessage });
      return;
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'Utente non trovato' });
      return;
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ success: false, error: 'La password attuale non è corretta' });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /auth/change-email ─────────────────────────────────

router.put('/change-email', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = changeEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstMessage = parsed.error.issues[0]?.message ?? 'Dati non validi';
      res.status(400).json({ success: false, error: firstMessage });
      return;
    }

    const { newEmail, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'Utente non trovato' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(400).json({ success: false, error: 'La password non è corretta' });
      return;
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        language: true,
        currency: true,
        avatarUrl: true,
      },
    });

    res.json({ success: true, data: { user: updatedUser } });
  } catch (err) {
    console.error('Change email error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/avatar ──────────────────────────────────────

router.post('/avatar', authenticate, (req: Request, res: Response): void => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large (max 2MB)'
          : err.message;
      res.status(400).json({ success: false, error: message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    try {
      // Delete old avatar file if exists
      const current = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { avatarUrl: true },
      });
      if (current?.avatarUrl) {
        const oldPath = path.resolve(
          import.meta.dirname,
          '../..',
          current.avatarUrl.replace(/^\//, ''),
        );
        fs.unlink(oldPath, () => {}); // fire & forget
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { avatarUrl },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          language: true,
          currency: true,
          avatarUrl: true,
        },
      });

      res.json({ success: true, data: { user } });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
});

// ─── DELETE /auth/avatar ────────────────────────────────────

router.delete('/avatar', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const current = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { avatarUrl: true },
    });

    if (current?.avatarUrl) {
      const filePath = path.resolve(
        import.meta.dirname,
        '../..',
        current.avatarUrl.replace(/^\//, ''),
      );
      fs.unlink(filePath, () => {});
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        language: true,
        currency: true,
        avatarUrl: true,
      },
    });

    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Delete avatar error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /auth/resend-verification ─────────────────────────

router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'Email required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond 200 to prevent email enumeration
    const successMsg = {
      success: true,
      data: { message: 'If the email exists and is not verified, a new link has been sent.' },
    };

    if (!user || user.emailVerified || !user.isActive) {
      res.json(successMsg);
      return;
    }

    const newToken = generateRandomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: newToken },
    });

    sendVerificationEmail(user.email, user.name, newToken).catch((err) => {
      console.error('Failed to resend verification email:', err);
    });

    res.json(successMsg);
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
