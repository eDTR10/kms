// @ts-nocheck
import api from './api';

export async function getHighlights() {
  const { data } = await api.get('kms/highlights/');
  return data.results ?? data;
}

export async function createHighlight(formData) {
  const { data } = await api.post('kms/highlights/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateHighlight(id, formData) {
  const { data } = await api.patch(`kms/highlights/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteHighlight(id) {
  await api.delete(`kms/highlights/${id}/`);
}

export async function importHighlightsJson(jsonData) {
  const payload = Array.isArray(jsonData) ? jsonData : jsonData?.data ?? jsonData;
  const { data } = await api.post('kms/highlights/import-json/', payload);
  return data;
}

export async function reorderHighlights(items) {
  const { data } = await api.post('kms/highlights/reorder/', items);
  return data;
}
