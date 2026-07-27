// @ts-nocheck
import api from './api';

export async function getFreeWifiSites() {
  const { data } = await api.get('kms/free-wifi-sites/');
  return data.results ?? data;
}

export async function getFreeWifiSummary() {
  const { data } = await api.get('kms/free-wifi-sites/summary/');
  return data;
}

export async function createFreeWifiSite(payload) {
  const { data } = await api.post('kms/free-wifi-sites/', payload);
  return data;
}

export async function updateFreeWifiSite(id, payload) {
  const { data } = await api.patch(`kms/free-wifi-sites/${id}/`, payload);
  return data;
}

export async function deleteFreeWifiSite(id) {
  await api.delete(`kms/free-wifi-sites/${id}/`);
}

export async function importFreeWifiSitesJson(jsonData) {
  const payload = Array.isArray(jsonData) ? jsonData : jsonData?.data ?? jsonData;
  const { data } = await api.post('kms/free-wifi-sites/import-json/', payload);
  return data;
}

export async function importFreeWifiSitesCsv(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('kms/free-wifi-sites/import-csv/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getXlsxSheets(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('kms/free-wifi-sites/import-xlsx/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function importFreeWifiSitesXlsx(file, sheetName) {
  const formData = new FormData();
  formData.append('file', file);
  if (sheetName) formData.append('sheet', sheetName);
  const { data } = await api.post('kms/free-wifi-sites/import-xlsx/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function importFreeWifiSitesXlsxAll(file) {
  const formData = new FormData();
  formData.append('file', file, file.name);
  const { data } = await api.post('kms/free-wifi-sites/import-xlsx-all/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 minute timeout for large files
  });
  return data;
}

export async function reorderFreeWifiSites(items) {
  const { data } = await api.post('kms/free-wifi-sites/reorder/', items);
  return data;
}

export async function deleteAllFreeWifiSites() {
  const { data } = await api.delete('kms/free-wifi-sites/delete-all/?confirm=yes');
  return data;
}
