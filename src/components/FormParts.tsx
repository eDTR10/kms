// @ts-nocheck
// Shared building blocks for the admin card-style forms (Accomplishments, Project Highlights).

export const INPUT_BASE = 'px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/40 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0038A8]/40 focus:border-[#0038A8]';
export const INPUT = `w-full ${INPUT_BASE}`;

export function FormSection({ step, title, hint, children }) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-5 h-5 rounded-full bg-[#0038A8] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{step}</span>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        {hint && <span className="text-xs text-gray-400 hidden sm:inline">· {hint}</span>}
      </div>
      <div className="sm:pl-7">{children}</div>
    </section>
  );
}

// `badge` marks a field whose value is managed elsewhere: 'dynamic' (computed from a dataset)
// or 'linked' (follows a project highlight).
export function Field({ label, hint, badge, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
        {badge === 'dynamic' && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-semibold">● Dynamic</span>}
        {badge === 'linked' && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-semibold">Linked</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}
