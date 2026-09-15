import { Router } from 'express';
import { idParam } from '../../lib/params';
import { authenticate } from '../../middleware/auth';
import * as controller from './projects.controller';
import tasksRouter from '../tasks/tasks.project-routes';

const router = Router();

router.use(authenticate);

router.param('projectId', idParam('proj', 'projectId', 'Project not found'));

router.post('/', controller.create);
router.get('/', controller.list);
router.patch('/:projectId', controller.update);
router.delete('/:projectId', controller.remove);
router.post('/:projectId/members', controller.addMember);
router.delete('/:projectId/members/:userId', controller.removeMember);

router.use('/:projectId/tasks', tasksRouter);

export default router;
