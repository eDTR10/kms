// @ts-nocheck
import api from './api';

export async function getUsers() {
  const { data } = await api.get('users/manage/');
  return data.results ?? data;
}

export async function createUser(payload) {
  const { data } = await api.post('users/manage/', payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await api.patch(`users/manage/${id}/`, payload);
  return data;
}

export async function deleteUser(id) {
  await api.delete(`users/manage/${id}/`);
}
