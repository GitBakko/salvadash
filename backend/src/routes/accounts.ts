import { Router, type Router as RouterType, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import {
  createAccountSchema,
  updateAccountSchema,
  reorderAccountsSchema,
  importLogoSchema,
} from '@salvadash/shared';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { isValidationOk } from '../lib/http.js';
import { config } from '../config/index.js';

const router: RouterType = Router();

router.use(authenticate);

// ─── Account Icons Storage ─────────────────────────────────

const ACCOUNT_ICONS_DIR = path.resolve(import.meta.dirname, '../../uploads/account-icons');
fs.mkdirSync(ACCOUNT_ICONS_DIR, { recursive: true });

function accountIconPath(accountId: string): string {
  return path.join(ACCOUNT_ICONS_DIR, `${accountId}.webp`);
}

function accountIconPublicUrl(accountId: string): string {
  return `/uploads/account-icons/${accountId}.webp`;
}

// ─── GET /accounts ─────────────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.userId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { balances: true } },
        balances: {
          orderBy: { entry: { date: 'desc' } },
          take: 1,
          select: { amount: true },
        },
      },
    });

    res.json({
      success: true,
      data: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        icon: a.icon,
        iconUrl: a.iconUrl,
        color: a.color,
        isActive: a.isActive,
        sortOrder: a.sortOrder,
        entryCount: a._count.balances,
        amount: a.balances[0] ? Number(a.balances[0].amount) : 0,
      })),
    });
  } catch (error) {
    console.error('GET /accounts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── GET /accounts/search-logo ─────────────────────────────
// NOTE: Must be before /:id to avoid Express matching "search-logo" as an :id param.

router.get('/search-logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
      return;
    }
    if (!config.brandfetch.apiKey) {
      res.status(503).json({ success: false, error: 'Logo search not configured' });
      return;
    }

    const url = `https://api.brandfetch.io/v2/search/${encodeURIComponent(q)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${config.brandfetch.apiKey}` },
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error('Brandfetch search failed:', resp.status, body);
      res.status(502).json({ success: false, error: 'Logo search upstream error' });
      return;
    }

    const raw = (await resp.json()) as Array<{
      brandId: string;
      claimed: boolean;
      domain: string;
      name: string;
      icon: string;
      _score: number;
      qualityScore: number;
      verified?: boolean;
    }>;

    const top = raw
      .filter((r) => r && typeof r.qualityScore === 'number' && r.qualityScore >= 0.2 && !!r.icon)
      .sort((a, b) => b.qualityScore - a.qualityScore || b._score - a._score)
      .slice(0, 5)
      .map((r) => ({
        brandId: r.brandId,
        name: r.name,
        domain: r.domain,
        iconUrl: r.icon,
        qualityScore: r.qualityScore,
        claimed: r.claimed,
      }));

    res.json({ success: true, data: top });
  } catch (err) {
    console.error('GET /accounts/search-logo error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /accounts/import-logo ────────────────────────────
// Body: { accountId, iconUrl } — downloads from CDN, resizes, extracts dominant color.

router.post('/import-logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = importLogoSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

    const userId = req.user!.userId;
    const { accountId, iconUrl } = parsed.data;

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    // Download CDN bytes
    let buf: Buffer;
    try {
      const resp = await fetch(iconUrl, { redirect: 'follow' });
      if (!resp.ok) {
        console.error('Logo download failed:', resp.status, iconUrl);
        res.status(502).json({ success: false, error: 'Failed to fetch logo' });
        return;
      }
      buf = Buffer.from(await resp.arrayBuffer());
    } catch (err) {
      console.error('Logo download error:', err);
      res.status(502).json({ success: false, error: 'Failed to fetch logo' });
      return;
    }

    // Process with sharp: extract dominant color + resize
    let hex: string;
    const fullPath = accountIconPath(accountId);
    try {
      const stats = await sharp(buf).stats();
      const { r, g, b } = stats.dominant;
      hex =
        '#' +
        [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

      await sharp(buf)
        .resize(256, 256, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 90 })
        .toFile(fullPath);
    } catch (err) {
      console.error('Sharp processing error:', err);
      res.status(422).json({ success: false, error: 'Downloaded file is not a valid image' });
      return;
    }

    const publicUrl = accountIconPublicUrl(accountId);
    await prisma.account.update({
      where: { id: accountId },
      data: { iconUrl: publicUrl, color: hex },
    });

    res.json({ success: true, data: { iconUrl: publicUrl, color: hex } });
  } catch (err) {
    console.error('POST /accounts/import-logo error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── POST /accounts ────────────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

    const userId = req.user!.userId;

    // Get next sortOrder
    const maxSort = await prisma.account.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });

    const account = await prisma.account.create({
      data: {
        ...parsed.data,
        userId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        icon: account.icon,
        iconUrl: account.iconUrl,
        color: account.color,
        isActive: account.isActive,
        sortOrder: account.sortOrder,
      },
    });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'An account with this name already exists' });
      return;
    }
    console.error('POST /accounts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /accounts/reorder ──────────────────────────────────
// NOTE: Must be before /:id to avoid Express matching "reorder" as an :id param

router.put('/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = reorderAccountsSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

    const userId = req.user!.userId;

    await prisma.$transaction(
      parsed.data.accounts.map((item) =>
        prisma.account.updateMany({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    res.json({ success: true, message: 'Accounts reordered' });
  } catch (error) {
    console.error('PUT /accounts/reorder error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── PUT /accounts/:id ─────────────────────────────────────

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateAccountSchema.safeParse(req.body);
    if (!isValidationOk(res, parsed)) return;

    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    const account = await prisma.account.update({
      where: { id },
      data: parsed.data,
    });

    res.json({
      success: true,
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        icon: account.icon,
        iconUrl: account.iconUrl,
        color: account.color,
        isActive: account.isActive,
        sortOrder: account.sortOrder,
      },
    });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'An account with this name already exists' });
      return;
    }
    console.error('PUT /accounts/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /accounts/:id/icon ──────────────────────────────
// Clear icon (revert to lucide fallback). Color is preserved — user choice.

router.delete('/:id/icon', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.account.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    fs.unlink(accountIconPath(id), () => {
      /* ignore ENOENT */
    });

    await prisma.account.update({
      where: { id },
      data: { iconUrl: null },
    });

    res.json({ success: true, message: 'Icon cleared' });
  } catch (error) {
    console.error('DELETE /accounts/:id/icon error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── DELETE /accounts/:id ───────────────────────────────────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.account.findFirst({
      where: { id, userId },
      include: { _count: { select: { balances: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    // If account has balances, soft-delete (deactivate) instead
    if (existing._count.balances > 0) {
      await prisma.account.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'Account deactivated (has existing entries)' });
      return;
    }

    await prisma.account.delete({ where: { id } });

    // Best-effort cleanup of icon file (ignore ENOENT)
    fs.unlink(accountIconPath(id), () => {
      /* ignore */
    });

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('DELETE /accounts/:id error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
