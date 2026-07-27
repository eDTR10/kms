// @ts-nocheck
import api from './api';

export async function getSliderItems() {
  const { data } = await api.get('kms/slider-items/');
  return data.results ?? data;
}

export async function createSliderItem(payload) {
  const { data } = await api.post('kms/slider-items/', payload);
  return data;
}

export async function updateSliderItem(id, payload) {
  const { data } = await api.patch(`kms/slider-items/${id}/`, payload);
  return data;
}

export async function deleteSliderItem(id) {
  await api.delete(`kms/slider-items/${id}/`);
}

export async function reorderSliderItems(items) {
  const { data } = await api.post('kms/slider-items/reorder/', items);
  return data;
}

export async function toggleSliderItemActive(id) {
  const { data } = await api.post('kms/slider-items/toggle-active/', { id });
  return data;
}
