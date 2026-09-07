// @ts-nocheck
// Shared tab-bar UI for a project's Chart Layouts (see ProjectChartLayout on the
// backend) — same visual pattern as the sticky tab bar in screens/AboutUs.tsx, extracted
// so the admin Charts page and the public project page render/behave identically without
// duplicating the markup. Deliberately dumb/presentational: it doesn't know about layouts,
// URL params, or fetching — it just renders `tabs` and reports clicks via `onChange`, so
// each caller can persist "which tab is active" however suits it (the admin page uses
// plain useState; the public page syncs it to a `?layout=` query param the same way
// AboutUs.tsx syncs its own tabs to `?tab=`, so a specific layout is linkable/bookmarkable).
//
// Whether to render at all with fewer than 2 tabs is each caller's own call, not baked in
// here — the public page hides itself below 2 layouts (no visible change for a project
// that hasn't adopted layouts), but the admin page still wants to show its single
// "Default" tab (plus an "+ Add Layout" control next to it) the moment layouts exist at
// all, so an admin has somewhere to add a second one.
export default function LayoutTabs({ tabs, activeId, onChange, className = '' }) {
  if (!tabs || !tabs.length) return null;
  return (
    <div className={`border-b border-gray-200 dark:border-gray-800 ${className}`}>
      <div className="flex flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeId === tab.id
                ? 'border-[#0038A8] text-[#0038A8] dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
