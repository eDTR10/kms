// @ts-nocheck
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, ChevronDown, Wifi, Trophy, Star, Sparkles, Presentation, Image, BarChart3, Database, FileSpreadsheet, Layers, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Same 3-tab shape as Free Wi-Fi (Highlights / Charts / Datasets), each
// project routed under its own hardcoded /kms/admin/<slug>/* tree.
const projectSubMenus = (slug) => [
  { label: 'Highlights', path: `/kms/admin/${slug}/highlights`, icon: Image },
  { label: 'Charts', path: `/kms/admin/${slug}/charts`, icon: BarChart3 },
  { label: 'Datasets', path: `/kms/admin/${slug}/datasets`, icon: Database },
];

// Labels/slugs match the public-facing names in components/Navbar.tsx's PROJECT_LINKS —
// these are what site visitors (and thus admins) know each project as.
const PROJECTS = [
  {
    id: 'free-wifi',
    label: 'Free Wi-Fi',
    icon: Wifi,
    color: '#0038A8',
    subMenus: [
      { label: 'Highlights', path: '/kms/admin/free-wifi/highlights', icon: Image },
      { label: 'Charts', path: '/kms/admin/free-wifi/charts', icon: BarChart3 },
      { label: 'Datasets', path: '/kms/admin/free-wifi/datasets', icon: Database },
    ],
  },
  { id: 'ilcdb', label: 'ILCDB', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('ilcdb') },
  { id: 'egov', label: 'eGov (NGP)', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('egov') },
  { id: 'cybersecurity', label: 'Cybersecurity / PNPKI', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('cybersecurity') },
  { id: 'govnet', label: 'NBP / CDO GovNet', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('govnet') },
  { id: 'elgu', label: 'eLGU', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('elgu') },
  { id: 'iidb', label: 'IIDB', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('iidb') },
  { id: 'nippsb', label: 'NIPPSB', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('nippsb') },
  { id: 'drrm', label: 'DRRM', icon: Layers, color: '#0038A8', subMenus: projectSubMenus('drrm') },
];

const OTHER_LINKS = [
  { label: 'Hero Slider', path: '/kms/admin/slider', icon: Presentation },
  { label: 'Accomplishments', path: '/kms/admin/accomplishments', icon: Trophy },
  { label: 'Awards', path: '/kms/admin/awards', icon: Star },
  { label: 'Highlights', path: '/kms/admin/highlights', icon: Sparkles },
];

// KMS is the platform all the projects above live under, not a project itself —
// acc_lvl 0 only (stricter than isSuperAdmin, which also covers acc_lvl 1).
const KMS_LINKS = [
  { label: 'Manage Projects', path: '/kms/admin/projects', icon: FileSpreadsheet },
  { label: 'Manage Users', path: '/kms/admin/users', icon: Users },
];

export default function AdminLayout({ children }) {
  const { user, logout, isSuperAdmin, isProjectAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedProjects, setExpandedProjects] = useState(['free-wifi']);

  const handleLogout = () => {
    logout();
    navigate('/kms');
  };

  const toggleProject = (projectId) => {
    setExpandedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const isActive = (path) => location.pathname === path;
  const isProjectActive = (project) => project.subMenus.some((sub) => location.pathname.startsWith(sub.path));

  // A project admin only ever sees/edits the project(s) they're assigned to — show just
  // those entries (could be more than one) and hide the site-wide Content section
  // (Awards/Highlights/etc. aren't theirs to touch).
  const visibleProjects = isProjectAdmin && !isSuperAdmin
    ? PROJECTS.filter((p) => user?.projectSlugs?.includes(p.id))
    : PROJECTS;
  const visibleOtherLinks = isProjectAdmin && !isSuperAdmin ? [] : OTHER_LINKS;
  const visibleKmsLinks = user?.acc_lvl === 0 ? KMS_LINKS : [];

  return (
    <div className="min-h-screen flex dark:bg-gray-950 bg-gray-100 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[#001a52] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <p className="text-xs text-white/50 uppercase tracking-wider">Admin Panel</p>
          <p className="font-bold mt-0.5">{user?.name}</p>
          <span className="text-xs bg-[#FCD116] text-[#0038A8] px-2 py-0.5 rounded-full font-bold capitalize">{user?.role}</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* KMS Section — the platform itself, acc_lvl 0 only */}
          {visibleKmsLinks.length > 0 && (
            <p className="text-xs text-white/40 uppercase tracking-wider px-3 pt-2 pb-1">KMS</p>
          )}
          {visibleKmsLinks.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
              {isActive(path) && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}

          {/* Projects Section */}
          <p className="text-xs text-white/40 uppercase tracking-wider px-3 pt-2 pb-1">Projects</p>
          {visibleProjects.map((project) => {
            const isExpanded = expandedProjects.includes(project.id) || isProjectActive(project);
            const ProjectIcon = project.icon;
            return (
              <div key={project.id}>
                <button
                  onClick={() => toggleProject(project.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isProjectActive(project)
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <ProjectIcon size={16} />
                  <span className="flex-1 text-left">{project.label}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                    {project.subMenus.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive(sub.path)
                              ? 'bg-white/15 text-white'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <SubIcon size={14} />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Other Links */}
          {visibleOtherLinks.length > 0 && (
            <p className="text-xs text-white/40 uppercase tracking-wider px-3 pt-4 pb-1">Content</p>
          )}
          {visibleOtherLinks.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
              {isActive(path) && <ChevronRight size={14} className="ml-auto" />}
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
          <Link to="/kms" className="flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white/80 transition-colors">
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
