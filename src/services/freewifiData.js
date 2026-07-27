// @ts-nocheck
import api from './api';

// ── Free Wi-Fi Live Data ───────────────────────────────────────────────────

export async function getFreeWifiLiveData() {
  const { data } = await api.get('kms/free-wifi-live/');
  return data.results ?? data;
}

export async function createFreeWifiLiveData(payload) {
  const { data } = await api.post('kms/free-wifi-live/', payload);
  return data;
}

export async function deleteAllFreeWifiLiveData() {
  const { data } = await api.delete('kms/free-wifi-live/delete-all/?confirm=yes');
  return data;
}

export async function importFreeWifiLiveDataBatch(items) {
  const { data } = await api.post('kms/free-wifi-live/import-batch/', items);
  return data;
}

// ── Free Wi-Fi Main Data ───────────────────────────────────────────────────

export async function getFreeWifiMainData() {
  const { data } = await api.get('kms/free-wifi-main/');
  return data.results ?? data;
}

export async function createFreeWifiMainData(payload) {
  const { data } = await api.post('kms/free-wifi-main/', payload);
  return data;
}

export async function deleteAllFreeWifiMainData() {
  const { data } = await api.delete('kms/free-wifi-main/delete-all/?confirm=yes');
  return data;
}

export async function importFreeWifiMainDataBatch(items) {
  const { data } = await api.post('kms/free-wifi-main/import-batch/', items);
  return data;
}

// ── Free Wi-Fi Target Data ─────────────────────────────────────────────────

export async function getFreeWifiTargetData() {
  const { data } = await api.get('kms/free-wifi-target/');
  return data.results ?? data;
}

export async function createFreeWifiTargetData(payload) {
  const { data } = await api.post('kms/free-wifi-target/', payload);
  return data;
}

export async function deleteAllFreeWifiTargetData() {
  const { data } = await api.delete('kms/free-wifi-target/delete-all/?confirm=yes');
  return data;
}

export async function importFreeWifiTargetDataBatch(items) {
  const { data } = await api.post('kms/free-wifi-target/import-batch/', items);
  return data;
}

// ── Free Wi-Fi Masterlist Data ─────────────────────────────────────────────

export async function getFreeWifiMasterlistData() {
  const { data } = await api.get('kms/free-wifi-masterlist/');
  return data.results ?? data;
}

export async function createFreeWifiMasterlistData(payload) {
  const { data } = await api.post('kms/free-wifi-masterlist/', payload);
  return data;
}

export async function deleteAllFreeWifiMasterlistData() {
  const { data } = await api.delete('kms/free-wifi-masterlist/delete-all/?confirm=yes');
  return data;
}

export async function importFreeWifiMasterlistDataBatch(items) {
  const { data } = await api.post('kms/free-wifi-masterlist/import-batch/', items);
  return data;
}

// ── Free Wi-Fi Chart Config ─────────────────────────────────────────────────
// Custom chart definitions from the Admin Charts screen, persisted server-side
// so they show up on the public Free Wi-Fi page too (not just the admin's own browser).

export async function getFreeWifiChartConfigs() {
  const { data } = await api.get('kms/free-wifi-chart-configs/');
  return data.results ?? data;
}

export async function createFreeWifiChartConfig(payload) {
  const { data } = await api.post('kms/free-wifi-chart-configs/', payload);
  return data;
}

export async function updateFreeWifiChartConfig(id, payload) {
  const { data } = await api.patch(`kms/free-wifi-chart-configs/${id}/`, payload);
  return data;
}

export async function deleteFreeWifiChartConfig(id) {
  await api.delete(`kms/free-wifi-chart-configs/${id}/`);
}

// ── Free Wi-Fi Highlights (slider) ──────────────────────────────────────────
// Slides + slider design settings, persisted server-side so the Admin's slider
// shows up correctly for every visitor on the public Free Wi-Fi page.

export async function getFreeWifiHighlights() {
  const { data } = await api.get('kms/free-wifi-highlights/');
  return data.results ?? data;
}

export async function createFreeWifiHighlight(formData) {
  const { data } = await api.post('kms/free-wifi-highlights/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateFreeWifiHighlight(id, formData) {
  const { data } = await api.patch(`kms/free-wifi-highlights/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteFreeWifiHighlight(id) {
  await api.delete(`kms/free-wifi-highlights/${id}/`);
}

export async function reorderFreeWifiHighlights(items) {
  const { data } = await api.post('kms/free-wifi-highlights/reorder/', items);
  return data;
}

export async function getFreeWifiSliderDesign() {
  const { data } = await api.get('kms/free-wifi-slider-design/');
  return data;
}

export async function updateFreeWifiSliderDesign(settings) {
  const { data } = await api.patch('kms/free-wifi-slider-design/', settings);
  return data;
}
