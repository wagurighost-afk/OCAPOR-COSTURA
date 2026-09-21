import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { APP_NAME, APP_SUBTITLE } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigured } from '@/firebase/config';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <div className="bg-brand-700 px-6 pb-12 pt-16 text-white">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="mt-1 text-brand-100">{APP_SUBTITLE}</p>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 px-6 -mt-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        >
          <h2 className="text-xl font-bold text-slate-900">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use seu e-mail e senha para acessar
          </p>

          <div className="mt-6 space-y-4">
            <Input
              label="Usuário / E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={submitting} className="mt-6">
            ENTRAR
          </Button>

          {!isFirebaseConfigured() && (
            <p className="mt-4 rounded-xl bg-warning-50 px-4 py-3 text-xs text-warning-700">
              Modo demonstração: use qualquer e-mail e senha com 4+ caracteres.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
