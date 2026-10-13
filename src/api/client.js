import axios from "axios";

// Empty string = same-origin (EC2 nginx). Unset falls back to local API.
const configured = import.meta.env.VITE_API_BASE;
const rawBase = configured === undefined ? "http://127.0.0.1:5001" : configured;
export const API_BASE = String(rawBase).replace(/\/$/, "");
export const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
