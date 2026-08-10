// @ts-nocheck
import api from './api';

export async function getAwards() {
  const { data } = await api.get('kms/awards/');
  return data.results ?? data;
}

export async function createAward(formData) {
  const { data } = await api.post('kms/awards/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateAward(id, formData) {
  const { data } = await api.patch(`kms/awards/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAward(id) {
  await api.delete(`kms/awards/${id}/`);
}

export async function importAwardsJson(jsonData) {
  const payload = Array.isArray(jsonData) ? jsonData : jsonData?.data ?? jsonData;
  const { data } = await api.post('kms/awards/import-json/', payload);
  return data;
}

export async function reorderAwards(items) {
  const { data } = await api.post('kms/awards/reorder/', items);
  return data;
}

// ── Award MOV images (one award can have several, each URL or uploaded) ────────

export async function createAwardImage(formData) {
  const { data } = await api.post('kms/award-images/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAwardImage(id) {
  await api.delete(`kms/award-images/${id}/`);
}
