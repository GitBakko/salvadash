import { Router, type Router as RouterType } from 'express';
import authRoutes from './auth.js';
import inviteCodeRoutes from './invite-codes.js';
import accountRoutes from './accounts.js';
import incomeSourceRoutes from './income-sources.js';
import entryRoutes from './entries.js';
import dataRoutes from './data.js';
import adminRoutes from './admin.js';
import notificationRoutes from './notifications.js';
import pushRoutes from './push.js';
import backupRoutes from './backup.js';

const router: RouterType = Router();

router.use('/auth', authRoutes);
router.use('/invite-codes', inviteCodeRoutes);
router.use('/accounts', accountRoutes);
router.use('/income-sources', incomeSourceRoutes);
router.use('/entries', entryRoutes);
router.use('/data', dataRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/push', pushRoutes);
router.use('/backup', backupRoutes);

export default router;
