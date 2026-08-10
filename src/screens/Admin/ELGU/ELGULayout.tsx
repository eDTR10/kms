// @ts-nocheck
import { Link, useLocation, Outlet } from 'react-router-dom';
import { BarChart3, Database, Image } from 'lucide-react';
import logoElgu from '../../../assets/project-logo/eLGU Logo.png';

const TABS = [
  { label: 'Highlights', path: '/kms/admin/elgu/highlights', icon: Image },
  { label: 'Charts', path: '/kms/admin/elgu/charts', icon: BarChart3 },
  { label: 'Datasets', path: '/kms/admin/elgu/datasets', icon: Database },
];

export default function ELGULayout() {
  const location = useLocation();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#0038A8] flex items-center justify-center p-1.5">
          <img src={logoElgu} alt="eLGU" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">eLGU</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Project admin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <Outlet />
    </div>
  );
}
