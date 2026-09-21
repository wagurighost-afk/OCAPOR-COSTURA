import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, APP_SUBTITLE } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigured } from '@/firebase/config';

export function SplashPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (user) {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-brand-700 px-6 text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-4xl font-bold">
        O
      </div>
      <h1 className="mt-6 text-center text-3xl font-bold tracking-tight">
        {APP_NAME}
      </h1>
      <p className="mt-2 text-center text-brand-100">{APP_SUBTITLE}</p>
      <div className="mt-10 h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      {!isFirebaseConfigured() && (
        <p className="mt-6 max-w-xs text-center text-xs text-brand-200">
          Modo demonstração — configure o Firebase em .env para dados reais
        </p>
      )}
    </div>
  );
}
