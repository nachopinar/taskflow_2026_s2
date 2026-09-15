import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useAsyncAction } from '../lib/asyncAction';
import { ErrorMessage } from '../lib/ui';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { run, busy: submitting, error, setError } = useAsyncAction();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/projects', { replace: true });
    }, 'No se pudo completar la operación');
  }

  return (
    <div className="page page-narrow" data-testid="login-page">
      <h1>{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</h1>

      <form className="form" data-testid="login-form" onSubmit={onSubmit}>
        {mode === 'register' && (
          <label className="field">
            <span>Nombre</span>
            <input
              type="text"
              data-testid="login-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input
            type="text"
            data-testid="login-email-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            data-testid="login-password-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <ErrorMessage message={error} />

        <button type="submit" data-testid="login-submit" disabled={submitting}>
          {mode === 'login' ? 'Ingresar' : 'Registrarme'}
        </button>
      </form>

      <button
        type="button"
        className="link-button"
        data-testid="login-mode-toggle"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
      >
        {mode === 'login' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
      </button>
    </div>
  );
}
