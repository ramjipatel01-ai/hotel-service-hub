import api from './api';

/**
 * User Service (Client-Side)
 * Handles profile updates and administrative user management
 */

export async function getUsers(params = {}) {
  const response = await api.get('/users', { params });
  return response.data?.data?.users || [];
}

export async function createUser(payload) {
  const response = await api.post('/users', payload);
  return response.data?.data?.user;
}

export async function updateUserStatus(id, { isActive, isOnDuty }) {
  const response = await api.patch(`/users/${id}/status`, { isActive, isOnDuty });
  return response.data?.data?.user;
}

export async function getProfile() {
  const response = await api.get('/users/me');
  return response.data?.data?.user;
}

export async function updateProfile(data) {
  const response = await api.patch('/users/me', data);
  return response.data?.data?.user;
}

export async function updateDutyStatus(isOnDuty) {
  const response = await api.patch('/users/me/on-duty', { isOnDuty });
  return response.data?.data?.user;
}

export async function updateUserRole(id, { role, department, room }) {
  const response = await api.patch(`/users/${id}/role`, { role, department, room });
  return response.data?.data?.user;
}

export async function switchMyRole({ role, departmentId }) {
  const response = await api.patch('/users/me/switch-role', { role, departmentId });
  return response.data?.data;
}

export default {
  getUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
  switchMyRole,
  getProfile,
  updateProfile,
  updateDutyStatus,
};
