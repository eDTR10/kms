// @ts-nocheck
import api from './api';

export async function getOfficesSlim() {
  const { data } = await api.get('office/slim/');
  return data.results ?? data;
}
