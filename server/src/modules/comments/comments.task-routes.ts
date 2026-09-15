import { Router } from 'express';
import { requireTaskProjectMember } from '../../middleware/membership';
import * as controller from './comments.controller';

// Montado en /tasks/:taskId/comments
const router = Router({ mergeParams: true });

router.use(requireTaskProjectMember());

router.get('/', controller.list);
router.post('/', controller.create);

export default router;
