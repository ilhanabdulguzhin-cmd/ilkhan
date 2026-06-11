const BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('vnuchok_token');
}

export function setSession(token, user) {
  localStorage.setItem('vnuchok_token', token);
  localStorage.setItem('vnuchok_user', JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem('vnuchok_user');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem('vnuchok_token');
  localStorage.removeItem('vnuchok_user');
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) {
    clearSession();
    window.location.href = '/';
    throw new Error('Сессия истекла');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || 'Ошибка сервера');
  }
  return data;
}

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* голосовое сопровождение опционально */
  }
}
