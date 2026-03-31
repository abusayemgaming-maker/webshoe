import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminRouteGuard, { ADMIN_SESSION_STORAGE_KEY } from '../AdminRouteGuard';

const renderGuard = () =>
  render(
    <MemoryRouter>
      <AdminRouteGuard>
        <div>Admin dashboard shell</div>
      </AdminRouteGuard>
    </MemoryRouter>
  );

describe('AdminRouteGuard', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubEnv('VITE_ADMIN_ENABLED', 'true');
    vi.stubEnv('VITE_ADMIN_PASSWORD', 'atelier-admin');
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
  });

  it('renders the password form when no session exists', () => {
    renderGuard();

    expect(screen.getByRole('heading', { name: /enter the admin password\./i })).toBeInTheDocument();
    expect(screen.queryByText(/admin dashboard shell/i)).not.toBeInTheDocument();
  });

  it('grants access and stores a session after the correct password is entered', () => {
    renderGuard();

    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'atelier-admin' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock admin/i }));

    expect(screen.getByText(/admin dashboard shell/i)).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBe('true');
  });

  it('shows an error and does not grant access after an incorrect password', () => {
    renderGuard();

    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock admin/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/incorrect password/i);
    expect(screen.queryByText(/admin dashboard shell/i)).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('persists access after a re-render when the session flag already exists', () => {
    window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
    const { rerender } = renderGuard();

    expect(screen.getByText(/admin dashboard shell/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AdminRouteGuard>
          <div>Admin dashboard shell</div>
        </AdminRouteGuard>
      </MemoryRouter>
    );

    expect(screen.getByText(/admin dashboard shell/i)).toBeInTheDocument();
  });

  it('renders the disabled stub when admin is turned off', () => {
    vi.stubEnv('VITE_ADMIN_ENABLED', 'false');

    renderGuard();

    expect(screen.getByRole('heading', { name: /owner panel is currently disabled\./i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlock admin/i })).not.toBeInTheDocument();
  });
});
