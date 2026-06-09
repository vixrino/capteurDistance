import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const NAV = [
  { to: "/", label: "Accueil" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/history", label: "Historique" },
  { to: "/games", label: "Mini-jeux" },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="border-b border-line bg-paper sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Brand */}
        <Link to="/" className="flex items-baseline gap-2 group">
          <span className="font-serif text-xl leading-none text-ink">Distance</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-clay font-semibold">
            HC-SR04
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV.map(({ to, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative text-sm tracking-wide transition-colors ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
                <span
                  className={`absolute -bottom-1.5 left-0 h-px bg-clay transition-all duration-300 ${
                    active ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="hidden sm:block text-sm text-ink-muted italic font-serif">
                {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-ink-muted hover:text-clay transition-colors underline decoration-line underline-offset-4 hover:decoration-clay"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Connexion
              </Link>
              <Link to="/register" className="btn-ink text-xs py-2 px-4">
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
