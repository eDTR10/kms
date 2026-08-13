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
export async function syncProjectDatasetSheet(datasetId, sheetUrl) {
  const { data } = await api.post(`kms/project-datasets/${datasetId}/sync-sheet/`, { sheet_url: sheetUrl });
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

// ── Project charts — admin-built charts plotted from one of the project's datasets ──

export async function getProjectChartConfigs(slug) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-chart-configs/', { params: { office: officeId } });
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

// ── Chart data source — which dataset (+ which of its columns) feeds a project's
// Summary Card / Map / Breakdown built-ins ──────────────────────────────────

export async function getProjectChartSource(slug) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.get('kms/project-chart-source/', { params: { office: officeId } });
  return data;
}

export async function updateProjectChartSource(slug, settings) {
  const officeId = await getProjectOfficeId(slug);
  const { data } = await api.patch('kms/project-chart-source/', settings, { params: { office: officeId } });
  return data;
}

// Custom Map marker icon — a separate multipart PATCH (vs. updateProjectChartSource's
// plain JSON) since it's an actual file upload, converted/compressed server-side the same
// way Award/Accomplishment images are.
export async function uploadProjectChartSourceMarkerIcon(slug, file) {
  const officeId = await getProjectOfficeId(slug);
  const fd = new FormData();
  fd.append('marker_icon_file', file);
  const { data } = await api.patch('kms/project-chart-source/', fd, {
    params: { office: officeId },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
