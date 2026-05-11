// @ts-nocheck
import { BarChart2, Users, FolderOpen, FileText, TrendingUp, Activity } from 'lucide-react';

const STATS = [
  { label: 'Total Projects', value: '8', icon: FolderOpen, color: 'bg-blue-50 dark:bg-blue-900/20 text-[#0038A8] dark:text-blue-400' },
  { label: 'Active Dashboards', value: '8', icon: BarChart2, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
  { label: 'Registered Users', value: '2', icon: Users, color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' },
  { label: 'Documents', value: '6', icon: FileText, color: 'bg-red-50 dark:bg-red-900/20 text-[#CE1126] dark:text-red-400' },
];

const RECENT = [
  { action: 'User logged in', detail: 'admin', time: 'Just now' },
  { action: 'Dashboard viewed', detail: 'Free Wi-Fi', time: '5 min ago' },
  { action: 'Dashboard viewed', detail: 'NIPPSB', time: '12 min ago' },
  { action: 'File downloaded', detail: 'Annual Report 2024.pdf', time: '1 hr ago' },
];

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Overview of KMS PortalX activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <Activity size={16} className="text-[#0038A8]" />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {RECENT.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.action}</p>
                  <p className="text-xs text-gray-400">{item.detail}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <TrendingUp size={16} className="text-[#CE1126]" />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <a href="/kms/admin/projects"
              className="block w-full text-center py-2.5 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors">
              Manage Projects
            </a>
            <a href="/kms/admin/users"
              className="block w-full text-center py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Manage Users
            </a>
            <a href="/kms/afd"
              className="block w-full text-center py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              View AFD Documents
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

