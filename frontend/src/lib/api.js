import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('rize_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — only redirect on 401 (unauthenticated)
// 403 means "authenticated but forbidden" — don't wipe token for that
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem('rize_token');
            sessionStorage.removeItem('rize_user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const registerOrg = (data) => api.post('/auth/register-org', data);
export const loginOrg = (data) => api.post('/auth/login-org', data);
export const loginEmployee = (data) => api.post('/auth/login-employee', data);
export const getMe = () => api.get('/auth/me');

// Employees
export const getEmployees = () => api.get('/employees');
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// Tasks
export const getTasks = () => api.get('/tasks');
export const getTask = (id) => api.get(`/tasks/${id}`);
export const createTask = (data) => api.post('/tasks', data);
export const updateTaskStatus = (id, data) => api.patch(`/tasks/${id}/status`, data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const generateHash = (id, payload) => api.post(`/tasks/${id}/generate-hash`, payload);


// AI
export const getAiScore = (employeeId) => api.get(`/ai/score/${employeeId}`);
export const getAiInsights = (employeeId) => api.get(`/ai/insights/${employeeId}`);
export const getDashboardStats = () => api.get('/ai/dashboard');
export const getAssignRecommendation = (taskId) => api.get(`/ai/assign-recommendation/${taskId}`);
export const getPerformanceTrend = (employeeId) => api.get(`/ai/trend/${employeeId}`);
export const getRankEmployees = (complexity) => api.get(`/ai/rank-employees?complexity=${complexity}`);

export default api;
