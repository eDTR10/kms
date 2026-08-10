// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/users';
import { getOfficesSlim } from '../../services/offices';
import { KMS_PROJECTS } from '../../constants/kmsProjects';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', position: '', projectOffices: [] };

const TIER_LABEL = (accLvl) =>
  accLvl === 0 ? 'Super Admin' : accLvl === 1 ? 'Admin' : accLvl === 2 ? 'Project Admin' : 'Viewer';

const TIER_BADGE = (accLvl) =>
  accLvl <= 1
    ? 'bg-[#0038A8] text-white'
    : accLvl === 2
    ? 'bg-[#FCD116] text-[#0038A8]'
    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

function formatApiError(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Something went wrong';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
    .join('\n');
}

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);

  useEffect(() => {
    Promise.all([getUsers(), getOfficesSlim()])
      .then(([u, o]) => { setUsers(u); setOffices(o); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // A project is only assignable once its backing office row actually exists — matches
  // AuthContext.resolveProjectSlug's KMS_PROJECTS[].officeId lookup exactly, so the
  // "current project" shown here never disagrees with where that user actually lands
  // after login. Assignment itself writes the user's `projects` field (a list of office
  // ids), not `office` — `office` is just where they're stationed, a separate concept.
  const existingOfficeIds = useMemo(() => new Set(offices.map((o) => o.office_id)), [offices]);
  const assignableProjects = useMemo(
    () => KMS_PROJECTS.filter((p) => existingOfficeIds.has(p.officeId)),
    [existingOfficeIds]
  );

  const unassignableProjectLabels = useMemo(() => {
    const matchedSlugs = new Set(assignableProjects.map((p) => p.slug));
    return KMS_PROJECTS.filter((p) => !matchedSlugs.has(p.slug)).map((p) => p.label);
  }, [assignableProjects]);

  if (currentUser != null && currentUser.acc_lvl !== 0) {
    return <Navigate to="/kms/admin" replace />;
  }

  const handleAdd = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
      alert('First name, last name, email and password are required.');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        email: form.email.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        password: form.password,
        position: form.position.trim(),
        ...(form.projectOffices.length ? { projects: form.projectOffices, acc_lvl: 2 } : {}),
      };
      const created = await createUser(payload);
      setUsers((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (targetUser) => {
    if (!confirm(`Delete ${targetUser.first_name} ${targetUser.last_name}? This cannot be undone.`)) return;
    try {
      await deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  const toggleActive = async (targetUser) => {
    const nextActive = !targetUser.is_active;
    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextActive } : u)));
    try {
      await updateUser(targetUser.id, { is_active: nextActive });
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: !nextActive } : u)));
      alert(formatApiError(err));
    }
  };

  // A project admin can now be assigned to more than one project — each pill in the
  // table toggles that one project's membership independently rather than replacing a
  // single selection. Only confirm when a toggle-off would leave zero projects (they'd
  // drop to Viewer); toggling a project on, or off while others remain, is low-stakes.
  const handleProjectToggle = async (targetUser, officeId) => {
    const current = targetUser.projects || [];
    const isAssigned = current.includes(officeId);
    const nextProjects = isAssigned ? current.filter((id) => id !== officeId) : [...current, officeId];

    if (isAssigned && nextProjects.length === 0) {
      const project = KMS_PROJECTS.find((p) => p.officeId === officeId);
      if (!confirm(`Remove ${targetUser.first_name} from ${project?.label ?? 'their last project'}? With no projects left, they will become a Viewer.`)) return;
    }

    const payload = nextProjects.length === 0 ? { projects: [], acc_lvl: 3 } : { projects: nextProjects, acc_lvl: 2 };
    setSavingUserId(targetUser.id);
    try {
      const updated = await updateUser(targetUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Users</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Add users and tag them to a project — tagging a user makes them that project's admin.
            A user can be tagged to more than one project.
          </p>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors"
        >
          <Plus size={15} /> Add User
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">New User</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              placeholder="First Name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
            <input
              placeholder="Last Name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
            <input
              placeholder="Position (optional)"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
              Projects <span className="text-gray-400">(leave empty for a Viewer with no admin access — a user can be tagged to more than one)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {assignableProjects.map((p) => (
                <button key={p.slug} type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    projectOffices: f.projectOffices.includes(p.officeId)
                      ? f.projectOffices.filter((id) => id !== p.officeId)
                      : [...f.projectOffices, p.officeId],
                  }))}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    form.projectOffices.includes(p.officeId)
                      ? 'bg-[#0038A8] text-white border-[#0038A8]'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd} disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors disabled:opacity-50">
              <Save size={13} /> {creating ? 'Saving…' : 'Save User'}
            </button>
            <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-semibold">Name</th>
              <th className="text-left px-5 py-3 font-semibold">Email</th>
              <th className="text-left px-5 py-3 font-semibold">Tier</th>
              <th className="text-left px-5 py-3 font-semibold">Project</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-right px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                    {u.first_name} {u.last_name}{isSelf && <span className="text-gray-400 font-normal"> (you)</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_BADGE(u.acc_lvl)}`}>
                      {TIER_LABEL(u.acc_lvl)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.acc_lvl <= 1 ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {assignableProjects.map((p) => {
                          const isAssigned = (u.projects || []).includes(p.officeId);
                          return (
                            <button key={p.slug} type="button"
                              onClick={() => handleProjectToggle(u, p.officeId)}
                              disabled={savingUserId === u.id}
                              title={isAssigned ? `Remove ${p.label}` : `Add ${p.label}`}
                              className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors disabled:opacity-50 ${
                                isAssigned
                                  ? 'bg-[#0038A8] text-white border-[#0038A8]'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                              }`}>
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {u.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={isSelf}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(u)}
                        disabled={isSelf}
                        className="p-1.5 text-gray-400 hover:text-[#CE1126] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {unassignableProjectLabels.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          * No office is set up (type "Project", named to match) for {unassignableProjectLabels.join(', ')} yet, so {unassignableProjectLabels.length === 1 ? "it can't" : "they can't"} be assigned to a user.
        </p>
      )}
    </div>
  );
}
