// @ts-nocheck
import api from './api';
import { KMS_PROJECTS } from '../constants/kmsProjects';

// Projects are offices_office rows (officeType "Project") — there is no separate
// Project table. Every per-project admin screen still identifies a project by its
// hardcoded slug (e.g. "ilcdb"); this resolves that slug to the office id backing it,
// read directly from KMS_PROJECTS[].officeId (set manually per project).
export async function getProjectOfficeId(slug) {
  const project = KMS_PROJECTS.find((p) => p.slug === slug);
  if (!project?.officeId) {
    const label = project?.label ?? slug;
    throw new Error(`No office is configured for the "${label}" project yet — set its officeId in kmsProjects.js.`);
  }
  return project.officeId;
}

// ── Project highlights slider (the "Highlights" tab — same feature as Free
// Wi-Fi's Highlights slider, just scoped to a project via ?office=<id>) ────────

export async function getProjectHighlights(slug) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-highlights/', { params: { office: officeId } });
  return data.results ?? data;
}

export async function createProjectHighlight(formData) {
  const { data } = await api.post('kms/project-highlights/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateProjectHighlight(id, formData) {
  const { data } = await api.patch(`kms/project-highlights/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteProjectHighlight(id) {
  await api.delete(`kms/project-highlights/${id}/`);
}

export async function reorderProjectHighlights(items) {
  const { data } = await api.post('kms/project-highlights/reorder/', items);
  return data;
}

export async function getProjectSliderDesign(slug) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-slider-design/', { params: { office: officeId } });
  return data;
}

export async function updateProjectSliderDesign(slug, settings) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.patch('kms/project-slider-design/', settings, { params: { office: officeId } });
  return data;
}

// ── Project datasets — admin-defined tables (the "Datasets" tab). The admin names
// the table, defines its own columns, then adds rows — no fixed schema. ──

export async function getProjectDatasets(slug) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-datasets/', { params: { office: officeId } });
  return data.results ?? data;
}

export async function createProjectDataset(payload) {
  const { data } = await api.post('kms/project-datasets/', payload);
  return data;
}

export async function updateProjectDataset(id, payload) {
  const { data } = await api.patch(`kms/project-datasets/${id}/`, payload);
  return data;
}

export async function deleteProjectDataset(id) {
  await api.delete(`kms/project-datasets/${id}/`);
}

export async function importProjectDatasetCsv(datasetId, payload) {
  const { data } = await api.post(`kms/project-datasets/${datasetId}/import-csv/`, payload);
  return data;
}

/** Re-fetches a linked Google Sheet tab (or links + syncs a new one if sheetUrl is
 * passed) and imports it the same way a pasted CSV would be. The sheet must be shared
 * as "Anyone with the link can view". */
export async function syncProjectDatasetSheet(datasetId, sheetUrl, headerRow) {
  const { data } = await api.post(`kms/project-datasets/${datasetId}/sync-sheet/`, { sheet_url: sheetUrl, header_row: headerRow });
  return data;
}

/** Pulls the Business Permit transaction-count API (see kms/views.py's
 * sync_bp_transaction_count / BpTransactionCountView) into this dataset's rows — one row
 * per LGU per calendar month. startDate/endDate (YYYY-MM-DD) are both optional; omitted,
 * the backend reuses the dataset's own last-synced range, then falls back to the current
 * calendar year. Every sync REPLACES this dataset's rows, same as syncProjectDatasetSheet. */
export async function syncProjectDatasetBpTransactionCount(datasetId, startDate, endDate) {
  const { data } = await api.post(`kms/project-datasets/${datasetId}/sync-bp-transaction-count/`, {
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
  });
  return data;
}

export async function createProjectDatasetField(payload) {
  const { data } = await api.post('kms/project-dataset-fields/', payload);
  return data;
}

export async function updateProjectDatasetField(id, payload) {
  const { data } = await api.patch(`kms/project-dataset-fields/${id}/`, payload);
  return data;
}

export async function deleteProjectDatasetField(id) {
  await api.delete(`kms/project-dataset-fields/${id}/`);
}

// Rows live in one of 8 per-project tables (see PROJECT_DATASET_ROW_MODELS on the
// backend), so every row call needs `slug` to say which one — unlike datasets/fields,
// which stay in one shared table and only need `office`/no scoping at all.
export async function createProjectDatasetRow(slug, payload) {
  const { data } = await api.post(`kms/project-dataset-rows/${slug}/`, payload);
  return data;
}

export async function updateProjectDatasetRow(slug, id, payload) {
  const { data } = await api.patch(`kms/project-dataset-rows/${slug}/${id}/`, payload);
  return data;
}

export async function deleteProjectDatasetRow(slug, id) {
  await api.delete(`kms/project-dataset-rows/${slug}/${id}/`);
}

// A dataset row's image-type field (e.g. "Image URL") — a separate multipart PATCH (vs.
// createProjectDatasetRow/updateProjectDatasetRow's plain JSON) since it's an actual file
// upload, converted/compressed server-side the same way Award/Accomplishment images and
// the chart card/marker icon uploads are. Needs an existing row id, so for a brand-new
// row the caller creates it (JSON) first, then calls this as a follow-up if the admin
// picked a file instead of pasting a URL for that field.
export async function uploadProjectDatasetRowImage(slug, rowId, fieldName, file) {
  const fd = new FormData();
  fd.append('image_file', file);
  fd.append('image_field_name', fieldName);
  const { data } = await api.patch(`kms/project-dataset-rows/${slug}/${rowId}/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Chart layouts — named, independently-scoped "pages" within a project's Charts
// tab, each with its own charts/widgets/filter bar. Opt-in: a project with none of
// these behaves exactly as it always has (see ProjectChartLayout's backend docstring) ──

export async function getProjectChartLayouts(slug) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-chart-layouts/', { params: { office: officeId } });
  return data.results ?? data;
}

export async function createProjectChartLayout(payload) {
  const { data } = await api.post('kms/project-chart-layouts/', payload);
  return data;
}

export async function updateProjectChartLayout(id, payload) {
  const { data } = await api.patch(`kms/project-chart-layouts/${id}/`, payload);
  return data;
}

export async function deleteProjectChartLayout(id) {
  await api.delete(`kms/project-chart-layouts/${id}/`);
}

export async function reorderProjectChartLayouts(items) {
  const { data } = await api.post('kms/project-chart-layouts/reorder/', items);
  return data;
}

// ── Project charts — admin-built charts plotted from one of the project's datasets.
// `layoutId` (optional, most callers omit it): scopes to one ProjectChartLayout's own
// charts instead of the project's original layout-less set — see getProjectChartLayouts
// above. ──
export async function getProjectChartConfigs(slug, layoutId) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-chart-configs/', { params: { office: officeId, ...(layoutId ? { layout: layoutId } : {}) } });
  return data.results ?? data;
}

export async function createProjectChartConfig(payload) {
  const { data } = await api.post('kms/project-chart-configs/', payload);
  return data;
}

export async function updateProjectChartConfig(id, payload) {
  const { data } = await api.patch(`kms/project-chart-configs/${id}/`, payload);
  return data;
}

export async function deleteProjectChartConfig(id) {
  await api.delete(`kms/project-chart-configs/${id}/`);
}

export async function reorderProjectChartConfigs(items) {
  const { data } = await api.post('kms/project-chart-configs/reorder/', items);
  return data;
}

// Value Card's 'image-bg' background photo — a separate multipart PATCH (vs.
// create/updateProjectChartConfig's plain JSON), same reasoning as
// uploadProjectChartSourceMarkerIcon below: it's an actual file upload, converted/
// compressed server-side the same way Award/Accomplishment images are. Needs an existing
// chart id, so for a brand-new chart the caller creates it (JSON) first, then calls this
// as a follow-up if the admin picked a file instead of pasting a URL.
export async function uploadProjectChartConfigCardImage(id, file) {
  const fd = new FormData();
  fd.append('card_image_file', file);
  const { data } = await api.patch(`kms/project-chart-configs/${id}/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Extra Summary/Map/Breakdown widget instances — additional, independently-
// configured copies of a built-in beyond ProjectChartSource's own singleton one ──

export async function getProjectBuiltinWidgets(slug, layoutId) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-builtin-widgets/', { params: { office: officeId, ...(layoutId ? { layout: layoutId } : {}) } });
  return data.results ?? data;
}

export async function createProjectBuiltinWidget(payload) {
  const { data } = await api.post('kms/project-builtin-widgets/', payload);
  return data;
}

export async function updateProjectBuiltinWidget(id, payload) {
  const { data } = await api.patch(`kms/project-builtin-widgets/${id}/`, payload);
  return data;
}

export async function deleteProjectBuiltinWidget(id) {
  await api.delete(`kms/project-builtin-widgets/${id}/`);
}

// ── Chart data source — which dataset (+ which of its columns) feeds a project's
// Summary Card / Map / Breakdown built-ins ──────────────────────────────────

export async function getProjectChartSource(slug, layoutId) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-chart-source/', { params: { office: officeId, ...(layoutId ? { layout: layoutId } : {}) } });
  return data;
}

export async function updateProjectChartSource(slug, settings, layoutId) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.patch('kms/project-chart-source/', settings, { params: { office: officeId, ...(layoutId ? { layout: layoutId } : {}) } });
  return data;
}

// Custom Map marker icon — a separate multipart PATCH (vs. updateProjectChartSource's
// plain JSON) since it's an actual file upload, converted/compressed server-side the same
// way Award/Accomplishment images are.
export async function uploadProjectChartSourceMarkerIcon(slug, file, layoutId) {
  const officeId = await getProjectOfficeId(slug);
  const fd = new FormData();
  fd.append('marker_icon_file', file);
  const { data } = await api.patch('kms/project-chart-source/', fd, {
    params: { office: officeId, ...(layoutId ? { layout: layoutId } : {}) },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Business Permit transaction count (proxied elguv1backend.ibpls.com) ────────
// See kms/views.py's BpTransactionCountView — that API's own CORS only allows
// https://dmt-lgu.github.io, so this goes through our own backend instead of calling
// ibpls.com directly from the browser. startDate/endDate are both optional (YYYY-MM-DD) —
// the backend defaults to the current calendar year when either is omitted.
export async function getBpTransactionCount(startDate, endDate) {
  const { data } = await api.get('kms/bp-transaction-count/', {
    params: { ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) },
  });
  return data;
}
