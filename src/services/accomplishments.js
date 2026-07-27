// @ts-nocheck
import api from './api';

export async function getAccomplishments() {
  const { data } = await api.get('kms/accomplishments/');
  return data.results ?? data;
}

export async function createAccomplishment(formData) {
  const { data } = await api.post('kms/accomplishments/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateAccomplishment(id, formData) {
  const { data } = await api.patch(`kms/accomplishments/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAccomplishment(id) {
  await api.delete(`kms/accomplishments/${id}/`);
}

export async function importAccomplishmentsJson(jsonData) {
  const payload = Array.isArray(jsonData) ? jsonData : jsonData?.data ?? jsonData;
  const { data } = await api.post('kms/accomplishments/import-json/', payload);
  return data;
}

export async function reorderAccomplishments(items) {
  const { data } = await api.post('kms/accomplishments/reorder/', items);
  return data;
}
