import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/api';
import { ErrorMessage } from '../lib/ui';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/projects', { replace: true });
    } catch (err) {
      setError(errorText(err, 'No se pudo completar la operación'));
    } finally {
      setSubmitting(false);
    }
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
