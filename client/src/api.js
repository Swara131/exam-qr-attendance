export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  let response;

  try {
    response = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Start the backend and refresh this page.');
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && path !== '/api/auth/login') {
    localStorage.removeItem('token');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }

  if (!response.ok) {
    throw new Error(data.error || 'The attendance server did not respond. Please try again.');
  }

  return data;
}
