// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Search, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { getProjectDatasets } from '../services/projects';

const PAGE_SIZE_OPTIONS = [4, 8, 10, 20];

// Finds a dataset column by matching its ADMIN-TYPED LABEL (not the slugified field name,
// which depends on exactly how they phrased it) — e.g. a column labeled "Plan Title" or
// just "Title" both resolve here, so the admin isn't locked into one exact column name.
// `exclude` (field names already claimed by an earlier fieldByLabel call, e.g. imageField)
// skips those — without it, a generic keyword like 'url' matches EITHER "Image URL" or
// "Button URL" (both legitimately contain "url"), and since it just returns the first
// field in column order that matches, the more specific "Button URL" could lose to
// "Image URL" purely because of column order, silently pointing the View button at the
// image instead of the intended link.
function fieldByLabel(fields, keywords, exclude = []) {
  const lower = (fields || [])
    .filter((f) => !exclude.includes(f.name))
    .map((f) => ({ ...f, _label: (f.label || '').toLowerCase() }));
  for (const kw of keywords) {
    const match = lower.find((f) => f._label.includes(kw));
    if (match) return match.name;
  }
  return null;
}

function PaginationFooter({ currentPage, setCurrentPage, totalPages, filteredCount, pageSize }) {
  if (totalPages <= 1) return null;
  return (
    <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCount)} of {filteredCount} entries
      </p>
      <div className="flex items-center gap-2">
        <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
          className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 text-gray-600 dark:text-gray-300">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
          className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 text-gray-600 dark:text-gray-300">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Toolbar({ pageSize, setPageSize, setCurrentPage, searchTerm, setSearchTerm }) {
  return (
    <div className="flex items-center gap-3">
      <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
        className="px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
        {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} entries per page</option>)}
      </select>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search..." value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 w-40" />
      </div>
    </div>
  );
}

// Plans tab — reads the "ICT Plans and Policies" Dataset: Title, Description (optional),
// Image (optional), Link (optional). One card per row.
function PlansTab({ fields, rows }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  const titleField = fieldByLabel(fields, ['title', 'plan', 'name']);
  const descField = fieldByLabel(fields, ['description', 'desc']);
  const imageField = fieldByLabel(fields, ['image', 'thumbnail', 'photo', 'cover']);
  // Excludes imageField so a generic "url" keyword match can't land on "Image URL"
  // instead of "Button URL" — see fieldByLabel's own comment.
  const linkField = fieldByLabel(fields, ['link', 'button', 'url', 'view'], [imageField]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) =>
      [r.values?.[titleField], r.values?.[descField]].some((v) => String(v || '').toLowerCase().includes(term))
    );
  }, [rows, searchTerm, titleField, descField]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      <div className="p-5 flex flex-wrap items-center justify-end gap-3 border-b border-gray-200 dark:border-gray-700">
        <Toolbar pageSize={pageSize} setPageSize={setPageSize} setCurrentPage={setCurrentPage} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>
      {paginatedRows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No matching plans.</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {paginatedRows.map((row) => {
            const title = row.values?.[titleField] || '';
            const description = row.values?.[descField] || '';
            const image = row.values?.[imageField] || '';
            const link = row.values?.[linkField] || '';
            return (
              <div key={row.id} className="flex flex-col sm:flex-row gap-4 p-5">
                {image ? (
                  <img src={image} alt={title} className="w-full sm:w-56 h-70 object-contain shrink-0 border border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="w-full sm:w-56 h-80 shrink-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
                    No image
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0038A8] dark:text-blue-400">{title}</p>
                  {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-[#0038A8] hover:bg-[#002d86] text-white text-xs font-bold rounded-lg">
                      View <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PaginationFooter currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} filteredCount={filteredRows.length} pageSize={pageSize} />
    </div>
  );
}

// Policies tab — reads the "ICT Policies" Dataset: Provision, Description, Link (optional),
// Category (optional — Republic Acts / Executive Orders / DICT Issuances / Administrative
// Orders / Memorandum Orders, matching the source page's own grouping). Renders as a table
// plus, when Category is used, a collapsible accordion grouping every provision by it.
function PoliciesTab({ fields, rows }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openCategories, setOpenCategories] = useState(() => new Set());

  const provisionField = fieldByLabel(fields, ['provision', 'title', 'name']);
  const descField = fieldByLabel(fields, ['description', 'desc']);
  const linkField = fieldByLabel(fields, ['link', 'button', 'url', 'view']);
  const categoryField = fieldByLabel(fields, ['category', 'type', 'group']);

  // The table above the category accordion is the "detailed" list — only rows that
  // actually have a description. A row with just a Provision/Category (no description)
  // is reference-only: it still shows up down in the category accordion below (byCategory
  // reads every row, not just these), just not duplicated up here with a blank
  // Description cell.
  const describedRows = useMemo(() => rows.filter((r) => String(r.values?.[descField] || '').trim()), [rows, descField]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return describedRows;
    const term = searchTerm.trim().toLowerCase();
    return describedRows.filter((r) =>
      [r.values?.[provisionField], r.values?.[descField]].some((v) => String(v || '').toLowerCase().includes(term))
    );
  }, [describedRows, searchTerm, provisionField, descField]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const byCategory = useMemo(() => {
    if (!categoryField) return [];
    const map = new Map();
    rows.forEach((r) => {
      const cat = r.values?.[categoryField] || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(r);
    });
    return [...map.entries()];
  }, [rows, categoryField]);

  const toggleCategory = (cat) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  return (
    <div>
      <div className="p-5 flex flex-wrap items-center justify-end gap-3 border-b border-gray-200 dark:border-gray-700">
        <Toolbar pageSize={pageSize} setPageSize={setPageSize} setCurrentPage={setCurrentPage} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>

      {paginatedRows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No matching policies.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0038A8] text-white">
                <th className="text-left py-2.5 px-4 font-bold text-xs uppercase tracking-wide">Provision</th>
                <th className="text-left py-2.5 px-4 font-bold text-xs uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, i) => {
                const provision = row.values?.[provisionField] || '';
                const description = row.values?.[descField] || '';
                const link = row.values?.[linkField] || '';
                return (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40'}>
                    <td className="py-3 px-4 align-top w-1/3">
                      {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#0038A8] dark:text-blue-400 font-medium hover:underline">
                          {provision}
                        </a>
                      ) : (
                        <span className="text-[#0038A8] dark:text-blue-400 font-medium">{provision}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-gray-600 dark:text-gray-300">{description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <PaginationFooter currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} filteredCount={filteredRows.length} pageSize={pageSize} />

      {byCategory.length > 0 && (
        <div className="p-5 pt-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
          {byCategory.map(([cat, catRows]) => {
            const isOpen = openCategories.has(cat);
            return (
              <div key={cat} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 dark:bg-gray-900/60 hover:bg-gray-200 dark:hover:bg-gray-900 text-left">
                  <span className="text-xs font-bold text-[#0038A8] dark:text-blue-400">{cat} ({catRows.length})</span>
                  {isOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRightIcon size={14} className="text-gray-500" />}
                </button>
                {isOpen && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {catRows.map((row) => {
                      const provision = row.values?.[provisionField] || '';
                      const link = row.values?.[linkField] || '';
                      return (
                        <div key={row.id} className="px-4 py-2 text-sm">
                          {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#0038A8] dark:text-blue-400 hover:underline">{provision}</a>
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300">{provision}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Shown while the two Datasets are still loading, instead of the bare empty card the
// wrapper (DraggableChart/ChartCard) would otherwise show underneath its own already-
// rendered title — matches the real layout's shape (title + tabs + a few image/text
// rows) so there's no visible jump once the real content swaps in. Respects `title` the
// same way the real render does: blank when used as a widget (the wrapper already shows
// its own title there), so the skeleton doesn't show a placeholder bar the real content
// never had either.
function IctPlansAndPoliciesSkeleton({ title }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="p-5 pb-0">
        {title && <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-3" />}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 -mb-px pb-2">
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="p-5 space-y-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-24 h-24 shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 min-w-0 space-y-2 py-1">
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mirrors ictstatistics.dict.gov.ph's "ICT Plans and Policies" page (blocked behind
// Cloudflare bot protection, so it can't be proxied/embedded live — see the two Datasets
// this reads from instead). "Plans" comes from a Dataset named "ICT Plans and Policies"
// (Title/Description/Image/Link columns); "Policies" from one named "ICT Policies"
// (Provision/Description/Link/Category columns). Either tab only appears once its own
// Dataset exists with at least one row — with neither, this renders nothing.
//
// Used both as a movable admin widget (ProjectBuiltinWidget, widget_type
// 'ict-plans-policies' — see renderBuiltinWidgetInstance in FreeWifiCharts.tsx and its
// equivalent in ProjectChartsDisplay.tsx) and could be dropped into any project page
// directly; `slug` is the only thing it needs, since it has no other per-instance config.
export default function IctPlansAndPolicies({ slug = 'nippsb', title = 'ICT Plans and Policies' }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');

  useEffect(() => {
    setLoading(true);
    getProjectDatasets(slug)
      .then(setDatasets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const plansDataset = datasets.find((d) => d.name.trim().toLowerCase() === 'ict plans and policies');
  const policiesDataset = datasets.find((d) => d.name.trim().toLowerCase() === 'ict policies');
  const hasPlans = !!plansDataset && (plansDataset.rows || []).length > 0;
  const hasPolicies = !!policiesDataset && (policiesDataset.rows || []).length > 0;

  if (loading) return <IctPlansAndPoliciesSkeleton title={title} />;
  if (!hasPlans && !hasPolicies) return null;

  const tab = hasPlans && hasPolicies ? activeTab : hasPlans ? 'plans' : 'policies';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-5 pb-0">
        {title && <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3">{title}</h3>}
        {hasPlans && hasPolicies && (
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 -mb-px">
            {[{ id: 'plans', label: 'Plans' }, { id: 'policies', label: 'Policies' }].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.id ? 'border-[#0038A8] text-[#0038A8] dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {tab === 'plans' ? (
        <PlansTab fields={plansDataset?.fields || []} rows={plansDataset?.rows || []} />
      ) : (
        <PoliciesTab fields={policiesDataset?.fields || []} rows={policiesDataset?.rows || []} />
      )}
    </div>
  );
}
