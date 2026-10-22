// @ts-nocheck
import api from '../services/api';
import { KMS_PROJECTS } from '../constants/kmsProjects';
import { resolveHighlightTitle, computeBreakdownRows } from '../screens/Admin/FreeWifi/FreeWifiCharts';

// One datasets request per project, shared by the hero slider, accomplishments and project
// sliders on the same page (and briefly reused), so the numbers resolve quickly.
const datasetCache = new Map();
export function fetchOfficeDatasets(office) {
  const hit = datasetCache.get(office);
  if (hit && Date.now() - hit.at < 60000) return hit.promise;
  const promise = api.get('kms/project-datasets/', { params: { office } })
    .then(({ data }) => data.results ?? data)
    .catch(() => { datasetCache.delete(office); return []; });
  datasetCache.set(office, { at: Date.now(), promise });
  return promise;
}

// Used when the numbers can't be computed: never show a raw "{value}" to visitors.
export const stripPlaceholder = (text) => (typeof text === 'string' ? text.replace('{value}', '').trim() : text);
export const stripAccomplishments = (items) =>
  items.map((i) => (i.linked_highlight ? { ...i, metric: stripPlaceholder(i.metric) } : i));

// Accomplishments linked to a project highlight show that highlight's title as their
// metric (only the metric); when the title is dataset-driven, {value} is computed like a Value Card. Datasets are fetched once per project.
export async function resolveLinkedAccomplishments(items) {
  const hasBreakdown = (i) => i.breakdown_binding?.enabled && i.breakdown_binding.dataset;
  const bound = items.filter((i) => i.linked_highlight?.title_binding?.enabled || hasBreakdown(i));
  if (!bound.length && !items.some((i) => i.linked_highlight)) return items;
  const offices = [...new Set(bound.flatMap((i) => [
    i.linked_highlight?.title_binding?.enabled ? i.linked_highlight.office : null,
    hasBreakdown(i) ? i.breakdown_binding.office : null,
  ]).filter((o) => o != null))];
  const byOffice = {};
  await Promise.all(offices.map((o) => fetchOfficeDatasets(o).then((t) => { byOffice[o] = t; })));
  return items.map((i) => {
    let out = i;
    const lh = i.linked_highlight;
    if (lh) {
      // Highlight → accomplishment: title → Metric, description → Metric Label,
      // project name → Description (Title is untouched).
      out = {
        ...out,
        metric: resolveHighlightTitle(i.metric, lh.title_binding, byOffice[lh.office]),
        description: KMS_PROJECTS.find((p) => p.officeId === lh.office)?.label || out.description,
      };
    }
    if (hasBreakdown(i)) {
      const b = i.breakdown_binding;
      const rows = computeBreakdownRows((byOffice[b.office] || []).find((t) => t.id === Number(b.dataset)), b);
      if (rows) out = { ...out, breakdown: rows };
    }
    return out;
  });
}
