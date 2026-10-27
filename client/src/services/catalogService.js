import api from './api';

/**
 * Client-Side Catalog Service
 * Fetches and manages departments, services, rooms, and staff directory
 */

// --- DEPARTMENTS ---
export async function getDepartments(params = {}) {
  const response = await api.get('/departments', { params });
  return response.data?.data?.departments || [];
}

export async function createDepartment(payload) {
  const response = await api.post('/departments', payload);
  return response.data?.data?.department;
}

export async function updateDepartment(id, payload) {
  const response = await api.patch(`/departments/${id}`, payload);
  return response.data?.data?.department;
}

export async function deleteDepartment(id) {
  const response = await api.delete(`/departments/${id}`);
  return response.data;
}

// --- SERVICES ---
export async function getServices(params = {}) {
  const response = await api.get('/services', { params });
  return response.data?.data?.services || [];
}

export async function createService(payload) {
  const response = await api.post('/services', payload);
  return response.data?.data?.service;
}

export async function updateService(id, payload) {
  const response = await api.patch(`/services/${id}`, payload);
  return response.data?.data?.service;
}

export async function deleteService(id) {
  const response = await api.delete(`/services/${id}`);
  return response.data;
}

// --- ROOMS ---
export async function getRooms(params = {}) {
  const response = await api.get('/rooms', { params });
  return response.data?.data?.rooms || [];
}

export async function createRoom(payload) {
  const response = await api.post('/rooms', payload);
  return response.data?.data?.room;
}

export async function updateRoom(id, payload) {
  const response = await api.patch(`/rooms/${id}`, payload);
  return response.data?.data?.room;
}

export async function deleteRoom(id) {
  const response = await api.delete(`/rooms/${id}`);
  return response.data;
}

// --- STAFF ---
export async function getStaffDirectory(params = {}) {
  const response = await api.get('/staff', { params });
  return response.data?.data?.staff || [];
}

export default {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getServices,
  createService,
  updateService,
  deleteService,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getStaffDirectory,
};
