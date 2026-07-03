const API_BASE = window.location.origin;

function getToken(): string | null {
  return localStorage.getItem('relampago_token');
}

export async function apiGet(path: string): Promise<any> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body?: any): Promise<any> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut(path: string, body?: any): Promise<any> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<any> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiGetMany(table: string): Promise<any[]> {
  return apiGet(`/api/${table}`);
}

export async function apiGetOne(table: string, id: string): Promise<any> {
  return apiGet(`/api/${table}/${id}`);
}

export async function apiCreate(table: string, data: any): Promise<any> {
  return apiPost(`/api/${table}`, data);
}

export async function apiUpdate(table: string, id: string, data: any): Promise<any> {
  return apiPut(`/api/${table}/${id}`, data);
}

export async function apiRemove(table: string, id: string): Promise<any> {
  return apiDelete(`/api/${table}/${id}`);
}
