// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, ChevronDown, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import dictLogo from '../assets/project-logo/DICT Logo.png';

const ABOUT_LINKS = [
  { label: 'Mandate, Powers and Functions', path: '/kms/about?tab=mandate' },
  { label: 'Mission and Vision', path: '/kms/about?tab=mission' },
  { label: 'DICT Quality Policy', path: '/kms/about?tab=quality' },
  { label: "Citizen's Charter 2025", path: '/kms/about?tab=charter' },
];

const PROJECT_LINKS = [
  { label: 'Free Wi-Fi', path: '/kms/projects/free-wifi' },
  { label: 'ILCDB', path: '/kms/projects/ilcdb' },
  { label: 'eGov (NGP)', path: '/kms/projects/egov' },
  { label: 'Cybersecurity / PNPKI', path: '/kms/projects/cybersecurity' },
  { label: 'NBP / CDO GovNet', path: '/kms/projects/govnet' },
  { label: 'eLGU', path: '/kms/projects/elgu' },
  { label: 'IIDB', path: '/kms/projects/iidb' },
  { label: 'NIPPSB', path: '/kms/projects/nippsb' },
];

const SIMPLE_LINKS = [
  { label: 'Maps', path: '/kms/maps' },
  { label: 'AFD', path: '/kms/afd' },
];

export default function Navbar() {
  const { dark, toggleTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const projectsRef = useRef(null);
  const aboutRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (projectsRef.current && !projectsRef.current.contains(e.target)) {
        setProjectsOpen(false);
      }
      if (aboutRef.current && !aboutRef.current.contains(e.target)) {
        setAboutOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-[#0038A8] dark:bg-background/80 dark:backdrop-blur-md dark:border-b dark:border-border text-white shadow-lg sticky top-0 z-50">
      {/* Top accent bar */}
      <div className="h-1 bg-linear-to-r from-[#CE1126] via-[#FCD116] to-[#CE1126] dark:from-primary/50 dark:via-primary dark:to-primary/50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/kms" className="flex items-center gap-3 shrink-0">
            <img
              src={dictLogo}
              alt="DICT Logo"
              className="w-10 h-10 object-contain rounded-full bg-white p-0.5"
            />
            <div className="hidden sm:block">
              <p className="font-bold text-sm leading-tight">DICT Region 10</p>
              <p className="text-[#FCD116] dark:text-primary text-xs font-medium">Knowledge Management System</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Home */}
            <Link
              to="/kms"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10 ${isActive('/kms') ? 'bg-white/20' : ''}`}
            >
              Home
            </Link>

            {/* About Us dropdown */}
            <div className="relative" ref={aboutRef}>
              <button
                onClick={() => { setAboutOpen((o) => !o); setProjectsOpen(false); }}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10 ${location.pathname === '/kms/about' ? 'bg-white/20' : ''
                  }`}
              >
                About Us
                <ChevronDown size={14} className={`transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
              </button>
              {aboutOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-card dark:border dark:border-border rounded-lg shadow-xl py-1 z-50">
                  {ABOUT_LINKS.map((data) => (
                    <Link
                      key={data.path}
                      to={data.path}
                      onClick={() => setAboutOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#e8edf7] dark:hover:bg-primary/20 transition-colors"
                    >
                      {data.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Projects dropdown */}
            <div className="relative" ref={projectsRef}>
              <button
                onClick={() => { setProjectsOpen((o) => !o); setAboutOpen(false); }}
                className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10 ${location.pathname.startsWith('/projects') ? 'bg-white/20' : ''
                  }`}
              >
                Projects
                <ChevronDown size={14} className={`transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
              </button>
              {projectsOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-card dark:border dark:border-border rounded-lg shadow-xl py-1 z-50">
                  {PROJECT_LINKS.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => setProjectsOpen(false)}
                      className={`block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#e8edf7] dark:hover:bg-primary/20 transition-colors ${isActive(child.path) ? 'text-[#0038A8] font-semibold bg-[#e8edf7] dark:bg-primary/20 dark:text-primary' : ''
                        }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Simple links */}
            {SIMPLE_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10 ${isActive(link.path) ? 'bg-white/20' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User menu or login */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} />
                  )}
                  <span className="hidden sm:inline max-w-30 truncate">{user.name}</span>
                  <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-card dark:border dark:border-border rounded-lg shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-border">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                        {user.email || user.role}
                      </p>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/kms/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-primary/20"
                      >
                        <LayoutDashboard size={14} />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#CE1126] hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/kms/login"
                className="px-4 py-1.5 bg-[#FCD116] text-[#0038A8] rounded-full text-sm font-bold hover:bg-yellow-300 transition-colors"
              >
                Login
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/20 mt-2 pt-2 space-y-1">
            <Link to="/kms" onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm hover:bg-white/10 ${isActive('/kms') ? 'bg-white/20' : ''}`}>
              Home
            </Link>

            <p className="px-3 pt-2 pb-1 text-xs text-white/50 uppercase tracking-wider font-semibold">
              About Us
            </p>
            {ABOUT_LINKS.map((child) => (
              <Link key={child.path} to={child.path} onClick={() => setMobileOpen(false)}
                className="block px-6 py-2 text-sm hover:bg-white/10 rounded-md">
                {child.label}
              </Link>
            ))}

            <p className="px-3 pt-2 pb-1 text-xs text-white/50 uppercase tracking-wider font-semibold">
              Projects
            </p>
            {PROJECT_LINKS.map((child) => (
              <Link key={child.path} to={`/kms/${child.path}`} onClick={() => setMobileOpen(false)}
                className="block px-6 py-2 text-sm hover:bg-white/10 rounded-md">
                {child.label}
              </Link>
            ))}

            {SIMPLE_LINKS.map((link) => (
              <Link key={link.path} to={`/kms/${link.path}`} onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm hover:bg-white/10 ${isActive(`/kms/${link.path}`) ? 'bg-white/20' : ''}`}>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

