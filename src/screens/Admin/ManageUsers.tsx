// @ts-nocheck
import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';

const INITIAL_USERS = [
  { id: 1, name: 'Admin User', username: 'admin', role: 'admin', status: 'active' },
  { id: 2, name: 'Viewer User', username: 'viewer', role: 'viewer', status: 'active' },
];

const ROLE_BADGE = {
  admin: 'bg-[#0038A8] text-white',
  viewer: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

export default function ManageUsers() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', role: 'viewer' });
  const [editing, setEditing] = useState(null);

  const handleAdd = () => {
    if (!newUser.name.trim() || !newUser.username.trim()) return;
    setUsers((prev) => [...prev, { ...newUser, id: Date.now(), status: 'active' }]);
    setNewUser({ name: '', username: '', role: 'viewer' });
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleStatus = (id) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Users</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add, edit or deactivate portal users.</p>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors"
        >
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">New User</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              placeholder="Full Name"
              value={newUser.name}
              onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
            <input
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors">
              <Save size={13} /> Save User
            </button>
            <button onClick={() => setShowAdd(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-semibold">Name</th>
              <th className="text-left px-5 py-3 font-semibold">Username</th>
              <th className="text-left px-5 py-3 font-semibold">Role</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-right px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">{user.name}</td>
                <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{user.username}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${ROLE_BADGE[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 font-medium transition-colors"
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(user.id)}
                      className="p-1.5 text-gray-400 hover:text-[#CE1126] transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        * User changes are local only. Connect a backend to persist data.
      </p>
    </div>
  );
}

