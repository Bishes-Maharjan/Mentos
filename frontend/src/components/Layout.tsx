import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, ShoppingCart } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Receipt' },
  { to: '/annex/sales', icon: FileText, label: 'Sales Register' },
  { to: '/annex/purchases', icon: ShoppingCart, label: 'Purchase Register' },
];

export default function Layout() {
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

        <div className="sidebar__footer">
          Kaji.ai v1.0 — MVP
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
