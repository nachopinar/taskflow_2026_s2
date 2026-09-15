import { Router } from 'express';
import { requireProjectMember } from '../../middleware/membership';
import * as controller from './tasks.controller';

// Montado en /projects/:projectId/tasks
const router = Router({ mergeParams: true });

router.use(requireProjectMember());

router.get('/', controller.listByProject);
router.post('/', controller.create);

export default router;
