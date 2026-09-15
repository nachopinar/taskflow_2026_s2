import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { idParam } from '../../lib/params';
import { requireTaskProjectMember } from '../../middleware/membership';
import * as controller from './tasks.controller';
import commentsRouter from '../comments/comments.task-routes';

const router = Router();

router.use(authenticate);

router.param('taskId', idParam('task', 'taskId', 'Task not found'));

router.get('/:taskId', requireTaskProjectMember(), controller.getOne);
router.get('/:taskId/history', requireTaskProjectMember(), controller.history);

router.patch('/:taskId', controller.update);
router.delete('/:taskId', controller.remove);

router.post('/:taskId/tags', requireTaskProjectMember(), controller.addTag);
router.delete('/:taskId/tags/:tagId', requireTaskProjectMember(), controller.removeTag);

router.use('/:taskId/comments', commentsRouter);

export default router;
