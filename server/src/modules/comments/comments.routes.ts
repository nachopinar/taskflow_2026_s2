import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as controller from './comments.controller';

const router = Router();

router.use(authenticate);

router.delete('/:commentId', controller.remove);

export default router;
