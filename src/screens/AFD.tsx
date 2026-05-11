// @ts-nocheck
import { useState } from 'react';
import { FileText, Download, Upload, Folder, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PLACEHOLDER_FILES = [
  { id: 1, name: 'Annual Report 2024.pdf', size: '2.4 MB', category: 'Reports', date: '2024-12-15', type: 'pdf' },
  { id: 2, name: 'Budget Utilization Q4 2024.xlsx', size: '1.1 MB', category: 'Finance', date: '2024-12-31', type: 'xlsx' },
  { id: 3, name: 'Procurement Plan 2025.pdf', size: '890 KB', category: 'Procurement', date: '2025-01-10', type: 'pdf' },
  { id: 4, name: 'Work & Financial Plan.xlsx', size: '1.5 MB', category: 'Finance', date: '2025-01-05', type: 'xlsx' },
  { id: 5, name: 'Organizational Structure.pdf', size: '340 KB', category: 'Administrative', date: '2025-01-02', type: 'pdf' },
  { id: 6, name: 'Office Order No. 001-2025.pdf', size: '120 KB', category: 'Administrative', date: '2025-01-08', type: 'pdf' },
];

const CATEGORIES = ['All', 'Reports', 'Finance', 'Procurement', 'Administrative'];

const TYPE_COLOR = {
  pdf: 'bg-red-100 text-red-700 dark:bg-slate-700 dark:text-slate-300',
  xlsx: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function AFD() {
  const { user, isAdmin } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? PLACEHOLDER_FILES
    : PLACEHOLDER_FILES.filter((f) => f.category === activeCategory);

  return (
    <div className="dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <section className="bg-[#0038A8] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#FCD116] dark:text-blue-300 text-sm font-semibold uppercase tracking-wider mb-2">Division</p>
          <h1 className="text-4xl font-black">Administrative & Finance Division</h1>
          <p className="text-white/70 mt-2">Official documents, reports and administrative files.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#0038A8] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button className="flex items-center gap-2 px-4 py-2 bg-[#FCD116] text-[#0038A8] dark:bg-blue-600 dark:text-white rounded-lg text-sm font-bold hover:bg-yellow-300 dark:hover:bg-blue-700 transition-colors">
              <Upload size={14} />
              Upload File
            </button>
          )}
        </div>

        {/* Not logged in notice */}
        {!user && (
          <div className="flex items-center gap-3 bg-yellow-50 dark:bg-blue-900/20 border border-yellow-200 dark:border-blue-800 rounded-lg px-4 py-3 mb-6">
            <Lock size={16} className="text-yellow-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-blue-300">
              Some files may require login to download. <a href="/login" className="font-semibold underline">Login here</a>.
            </p>
          </div>
        )}

        {/* File list */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs text-gray-500 dark:text-gray-400 px-5 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold uppercase tracking-wider">
            <div className="col-span-2">File Name</div>
            <div className="text-right pr-6">Size</div>
            <div className="text-right pr-6">Date</div>
            <div />
          </div>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
              <Folder size={36} />
              <p>No files in this category.</p>
            </div>
          ) : (
            filtered.map((file, i) => (
              <div
                key={file.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                  i < filtered.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <FileText size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{file.category}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${TYPE_COLOR[file.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {file.type}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap hidden sm:block">{file.size}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap hidden md:block">{file.date}</span>
                <button
                  className="flex items-center gap-1 text-xs text-[#0038A8] dark:text-blue-400 hover:underline font-medium"
                  onClick={() => alert('File download coming soon. Connect to backend to enable downloads.')}
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          * Files shown are placeholders. Connect a backend to manage real documents.
        </p>
      </section>
    </div>
  );
}

