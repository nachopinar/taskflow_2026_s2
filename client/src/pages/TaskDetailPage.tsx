import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useProject } from '../lib/project';
import { useMembers } from '../lib/members';
import { useTask, useTaskComments, useTaskHistory } from '../lib/task';
import { ErrorMessage, Loading } from '../lib/ui';
import TaskComments from '../components/task/TaskComments';
import TaskEditForm from '../components/task/TaskEditForm';
import TaskHistory from '../components/task/TaskHistory';
import TaskStatusForm from '../components/task/TaskStatusForm';
import TaskTags from '../components/task/TaskTags';
import type { Task } from '../types';

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { project } = useProject(projectId);
  const { members } = useMembers(project);

  // Las tres cargas arrancan en paralelo al montar la página.
  const { task, setTask, loading, error, reload: reloadTask } = useTask(taskId);
  const comments = useTaskComments(taskId);
  const history = useTaskHistory(taskId);

  async function onStatusChanged(updated: Task) {
    setTask(updated);
    await history.reload();
  }

  function memberLabel(userId: string): string {
    const found = members.find((m) => m.userId === userId);
    return found && found.email ? found.email : userId;
  }

  if (loading) return <Loading label="Cargando tarea…" />;
  if (error) return <ErrorMessage message={error} />;
  if (!task || !taskId) return <ErrorMessage message="No se encontró la tarea" />;

  return (
    <div className="page" data-testid="task-detail-page">
      <div className="page-head">
        <Link to={`/projects/${projectId}`} data-testid="task-detail-back-link">
          ← Volver al tablero
        </Link>
        <span data-testid="task-detail-id">{task.id}</span>
      </div>

      <TaskEditForm
        task={task}
        members={members}
        onSaved={setTask}
        onDeleted={() => navigate(`/projects/${projectId}`)}
      />
      <TaskStatusForm task={task} onChanged={onStatusChanged} />
      <TaskTags task={task} onChanged={reloadTask} />
      <TaskComments
        taskId={taskId}
        comments={comments.comments}
        loadError={comments.error}
        onChanged={comments.reload}
        currentUserId={user?.id}
        memberLabel={memberLabel}
      />
      <TaskHistory entries={history.entries} />
    </div>
  );
}
