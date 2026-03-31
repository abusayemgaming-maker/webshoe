import * as React from 'react';
import { Link } from 'react-router-dom';

export const ADMIN_SESSION_STORAGE_KEY = 'velosnak-admin-session';

const isAdminEnabled = () => {
  if (import.meta.env.VITE_ADMIN_ENABLED === 'true') {
    return true;
  }

  if (import.meta.env.VITE_ADMIN_ENABLED === 'false') {
    return false;
  }

  return import.meta.env.DEV;
};

const hasAdminSession = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === 'true';
};

export const AdminAccessStub: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
    <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Admin access</p>
      <h1 className="mt-3 text-2xl font-black tracking-tight text-white">Owner panel is currently disabled.</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        Set <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-100">VITE_ADMIN_ENABLED=true</code> to use
        admin routes in this environment.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full border border-zinc-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition hover:border-zinc-400"
      >
        Back to storefront
      </Link>
    </div>
  </div>
);

interface AdminRouteGuardProps {
  children: React.ReactElement;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [hasSession, setHasSession] = React.useState(() => hasAdminSession());

  if (!isAdminEnabled()) {
    return <AdminAccessStub />;
  }

  if (hasSession) {
    return children;
  }

  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD ?? '';
  const isPasswordConfigured = expectedPassword.length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isPasswordConfigured) {
      setError('Admin password is not configured for this build.');
      return;
    }

    if (password !== expectedPassword) {
      setError('Incorrect password. Please try again.');
      return;
    }

    window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
    setError(null);
    setHasSession(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="w-full max-w-lg rounded-[2rem] border border-zinc-800 bg-zinc-900/80 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Owner panel</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Enter the admin password.</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-300">
          This gate is only meant to prevent casual access in client-hosted builds. Real production protection should
          be handled by the backend.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-400"
              autoComplete="current-password"
              aria-invalid={error ? 'true' : 'false'}
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-200"
              disabled={!isPasswordConfigured}
            >
              Unlock admin
            </button>
            <Link
              to="/"
              className="inline-flex rounded-full border border-zinc-600 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-zinc-100 transition hover:border-zinc-400"
            >
              Back to storefront
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRouteGuard;
