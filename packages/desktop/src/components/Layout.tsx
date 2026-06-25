import type { ReactNode } from "react";
import { useAuth } from "../lib/auth.js";
import { navigate } from "../lib/router.js";
import { useApi } from "../lib/useApi.js";
import { api } from "../lib/api.js";
import { useConnection } from "../lib/useConnection.js";
import { Icon } from "./Icon.js";
import type { BusinessProfile, Role } from "../lib/types.js";

interface NavItem {
  key: string;
  label: string;
  icon: string;
  roles?: Role[]; // visible to these roles (ADMIN always sees everything)
}

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "new-bill", label: "New Bill", icon: "plus", roles: ["RECEPTION", "RESTAURANT"] },
  { key: "bookings", label: "Bookings", icon: "calendar", roles: ["RECEPTION"] },
  { key: "invoices", label: "Invoices", icon: "bill" },
  { key: "rooms", label: "Rooms", icon: "bed" },
  { key: "menu", label: "Menu", icon: "food", roles: ["RESTAURANT"] },
  { key: "guests", label: "Guests", icon: "users", roles: ["RECEPTION"] },
  { key: "reports", label: "Reports", icon: "chart", roles: ["RECEPTION"] },
  { key: "day-close", label: "Day Close", icon: "daclose", roles: ["RECEPTION"] },
  { key: "audit", label: "Audit Log", icon: "shield", roles: ["RECEPTION"] },
  { key: "staff", label: "Staff", icon: "users", roles: [] }, // ADMIN only
  { key: "settings", label: "Settings", icon: "gear", roles: [] }, // ADMIN only
];

export function Layout({ active, children }: { active: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const role = user?.role ?? "RECEPTION";
  const biz = useApi(() => api.get<{ profile: BusinessProfile | null }>("/business-profile"), []);
  const logo = biz.data?.profile?.logo;
  const online = useConnection();

  const visible = NAV.filter((n) => !n.roles || role === "ADMIN" || n.roles.includes(role));

  return (
    <div className="layout">
      <aside className="sidebar no-print">
        <div className="brand">
          {logo ? (
            <img className="brand-logo" src={logo} alt="Sanskar Palace" />
          ) : (
            <>
              <div className="brand-mark">SP</div>
              <div className="brand-text">
                <div className="brand-name">Sanskar Palace</div>
                <div className="brand-sub">Billing &amp; Front Desk</div>
              </div>
            </>
          )}
        </div>

        <nav className="nav">
          {visible.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${active === n.key ? "is-active" : ""}`}
              onClick={() => navigate(`/${n.key}`)}
            >
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="user-avatar">{user?.displayName?.[0]?.toUpperCase() ?? "?"}</div>
            <div className="user-meta">
              <div className="user-name">{user?.displayName}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        {!online && (
          <div className="offline-banner no-print">
            <Icon name="bill" size={15} /> No connection to the database — billing is paused until
            the internet/server is back. Your last actions are safe.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

/** Shared page header used by every screen. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head no-print">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-sub muted">{subtitle}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}
