// @ts-nocheck
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Users, LogOut, ChevronRight, Images } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ADMIN_LINKS = [
  { label: 'Dashboard', path: '/kms/admin', icon: LayoutDashboard },
  { label: 'Manage Projects', path: '/kms/admin/projects', icon: FolderOpen },
  { label: 'Manage Users', path: '/kms/admin/users', icon: Users },
  { label: 'Manage Carousel', path: '/kms/admin/carousel', icon: Images },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/kms');
  };

  return (
    <div className="min-h-screen flex dark:bg-gray-950 bg-gray-100 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-[#001a52] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <p className="text-xs text-white/50 uppercase tracking-wider">Admin Panel</p>
          <p className="font-bold mt-0.5">{user?.name}</p>
          <span className="text-xs bg-[#FCD116] text-[#0038A8] px-2 py-0.5 rounded-full font-bold capitalize">{user?.role}</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {ADMIN_LINKS.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === path
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
            >
              <Icon size={16} />
              {label}
              {location.pathname === path && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors">
            ← Back to Portal
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

