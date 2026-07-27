// @ts-nocheck
import api from './api';

export async function getKmsSettings() {
  const { data } = await api.get('kms/settings/');
  return data;
}

export async function updateKmsSettings(settings) {
  const { data } = await api.patch('kms/settings/', settings);
  return data;
}
