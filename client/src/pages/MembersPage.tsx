import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsyncAction } from '../lib/asyncAction';
import { useAuth } from '../lib/auth';
import { useProject } from '../lib/project';
import { useMembers } from '../lib/members';
import { EmptyState, ErrorMessage, Loading } from '../lib/ui';
import { OWNER } from '../types';
import type { Member, Role } from '../types';

interface AddMemberResponse {
  projectId: string;
  userId: string;
  email: string;
  role: Role;
}

export default function MembersPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { project, loading, error } = useProject(projectId);
  const { members, addMember, removeMember } = useMembers(project);

  const [email, setEmail] = useState('');
  const add = useAsyncAction();
  const remove = useAsyncAction();

  const isOwner = !!project && !!user && project.ownerId === user.id;

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!project) return;
    await add.run(async () => {
      const res = await api<AddMemberResponse>(`/projects/${project.id}/members`, {
        method: 'POST',
        body: { email },
      });
      addMember({ userId: res.userId, email: res.email, role: res.role });
      setEmail('');
    }, 'No se pudo agregar el miembro');
  }

  async function onRemove(member: Member) {
    if (!project) return;
    await remove.run(async () => {
      await api(`/projects/${project.id}/members/${member.userId}`, { method: 'DELETE' });
      removeMember(member.userId);
    }, 'No se pudo quitar el miembro');
  }

  if (loading) return <Loading label="Cargando proyecto…" />;
  if (error) return <ErrorMessage message={error} />;
  if (!project) return <ErrorMessage message="No se encontró el proyecto" />;

  return (
    <div className="page" data-testid="members-page">
      <div className="page-head">
        <h1>Miembros · {project.name}</h1>
        <Link to={`/projects/${project.id}`} data-testid="members-board-link">
          Tablero
        </Link>
      </div>

      {isOwner ? (
        <form className="form form-inline" data-testid="member-add-form" onSubmit={onAdd}>
          <label className="field">
            <span>Email</span>
            <input
              type="text"
              data-testid="member-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" data-testid="member-add-button" disabled={add.busy}>
            Agregar miembro
          </button>
        </form>
      ) : (
        <p className="field-value" data-testid="members-readonly-note">
          Solo el owner puede administrar los miembros.
        </p>
      )}
      <ErrorMessage message={add.error} />
      <ErrorMessage message={remove.error} />

      <ul className="list" data-testid="member-list">
        {members.map((member) => (
          <li key={member.userId} className="card" data-testid="member-item">
            <span className="card-title" data-testid="member-item-email">
              {member.email || member.userId}
            </span>
            <span className="card-meta" data-testid="member-item-role">
              {member.userId === project.ownerId ? OWNER : member.role}
            </span>
            {isOwner && member.userId !== project.ownerId && (
              <button
                type="button"
                data-testid="member-remove-button"
                onClick={() => onRemove(member)}
              >
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>
      {members.length === 0 && <EmptyState>No hay miembros para mostrar.</EmptyState>}
    </div>
  );
}
