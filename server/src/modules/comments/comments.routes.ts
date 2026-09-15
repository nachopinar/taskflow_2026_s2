import { Router } from 'express';
import { idParam } from '../../lib/params';
import { authenticate } from '../../middleware/auth';
import * as controller from './comments.controller';

const router = Router();

router.use(authenticate);

router.param('commentId', idParam('comment', 'commentId', 'Comment not found'));

router.delete('/:commentId', controller.remove);

export default router;
