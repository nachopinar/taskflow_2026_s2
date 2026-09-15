import { Router } from 'express';
import * as controller from './auth.controller';

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

export default router;
