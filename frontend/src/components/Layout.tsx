import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, ShoppingCart, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Receipt' },
  { to: '/annex/sales', icon: FileText, label: 'Sales Register' },
  { to: '/annex/purchases', icon: ShoppingCart, label: 'Purchase Register' },
  { to: '/tax-return', icon: FileText, label: 'Tax Return (D2)' },
  { to: '/me', icon: User, label: 'My Profile' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">Kaji.ai</div>
          <div className="sidebar__tagline">Nepal VAT Compliance</div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <Icon className="sidebar__icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
              {user?.businessName}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              PAN: {user?.pan}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn--secondary btn--sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <LogOut className="sidebar__icon" style={{ width: 16, height: 16 }} />
            Log Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
