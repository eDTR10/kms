// @ts-nocheck
import { useState } from 'react';
import { Edit2, ExternalLink, Save, X } from 'lucide-react';

const INITIAL_PROJECTS = [
  { id: 1, name: 'Free Wi-Fi', path: '/projects/free-wifi', embedUrl: 'https://datastudio.google.com/embed/reporting/c016a68b-488e-41c2-95f3-fd5d8fde0b00/page/p_dqiy4l4zhd', active: true },
  { id: 2, name: 'ILCDB', path: '/projects/ilcdb', embedUrl: 'https://datastudio.google.com/embed/reporting/f8914384-b24f-4008-a338-a7f7ac14b425/page/IXtzD', active: true },
  { id: 3, name: 'eGov (NGP)', path: '/projects/egov', embedUrl: 'https://lookerstudio.google.com/embed/reporting/81b02c41-dbbc-46d4-ad8e-e349a72a2814/page/af24D', active: true },
  { id: 4, name: 'Cybersecurity / PNPKI', path: '/projects/cybersecurity', embedUrl: 'https://lookerstudio.google.com/embed/reporting/b6d40d56-33bd-4567-8d8a-20d16876deb4/page/p_gzgpvldahd', active: true },
  { id: 5, name: 'NBP / CDO GovNet', path: '/projects/govnet', embedUrl: 'https://datastudio.google.com/embed/reporting/d18767f5-b034-40b4-9215-93674ff57e47/page/fADIF', active: true },
  { id: 6, name: 'eLGU', path: '/projects/elgu', embedUrl: 'https://datastudio.google.com/embed/reporting/5fbcb36d-8893-4cbd-8d4e-a2153d0da75a/page/p_r4d3fta1td', active: true },
  { id: 7, name: 'IIDB', path: '/projects/iidb', embedUrl: 'https://datastudio.google.com/embed/reporting/6e8fb826-5f06-4950-a57d-7c2be915a918/page/p_4mlt23t9gd', active: true },
  { id: 8, name: 'NIPPSB', path: '/projects/nippsb', embedUrl: 'https://lookerstudio.google.com/embed/reporting/a41369e5-115f-4e05-8550-679234bad073/page/ZNmIF', active: true },
];

export default function ManageProjects() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [editing, setEditing] = useState(null);
  const [editUrl, setEditUrl] = useState('');

  const startEdit = (project) => {
    setEditing(project.id);
    setEditUrl(project.embedUrl);
  };

  const saveEdit = (id) => {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, embedUrl: editUrl } : p));
    setEditing(null);
  };

  const toggleActive = (id) => {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Projects</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Update Looker Studio embed URLs for each project dashboard.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {projects.map((project) => (
            <div key={project.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      project.active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {project.active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  {editing === project.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
                        placeholder="Paste Looker Studio embed URL..."
                      />
                      <button onClick={() => saveEdit(project.id)}
                        className="p-2 bg-[#0038A8] text-white rounded-lg hover:bg-[#001a52] transition-colors">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{project.embedUrl}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={project.path} target="_blank" rel="noreferrer"
                    className="p-2 text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 transition-colors">
                    <ExternalLink size={15} />
                  </a>
                  <button onClick={() => startEdit(project)}
                    className="p-2 text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => toggleActive(project.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      project.active
                        ? 'bg-red-50 dark:bg-red-900/20 text-[#CE1126] dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100'
                    }`}
                  >
                    {project.active ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        * Changes here are local only. Connect a backend/database to persist them.
      </p>
    </div>
  );
}

