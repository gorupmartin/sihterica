const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('sihterica_token');
}

function headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

async function request(url, options = {}) {
    const res = await fetch(url, { ...options, headers: headers(options.headers) });
    if (res.status === 401) {
        localStorage.removeItem('sihterica_token');
        localStorage.removeItem('sihterica_user');
        window.location.href = '/login';
        throw new Error('Neautoriziran');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Greška');
    return data;
}

const api = {
    // Auth
    login: (username, password) =>
        request(`${API_BASE}/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) }),

    // Workers
    getWorkers: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/workers?${q}`);
    },
    addWorker: (data) =>
        request(`${API_BASE}/workers`, { method: 'POST', body: JSON.stringify(data) }),
    updateWorker: (id, data) =>
        request(`${API_BASE}/workers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Locations
    getLocations: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/locations?${q}`);
    },
    addLocation: (data) =>
        request(`${API_BASE}/locations`, { method: 'POST', body: JSON.stringify(data) }),
    updateLocation: (id, data) =>
        request(`${API_BASE}/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Work Logs
    getLogs: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/logs?${q}`);
    },
    getWorkerDay: (worker_id, date) =>
        request(`${API_BASE}/logs/worker-day?worker_id=${worker_id}&date=${date}`),
    getMatrix: (month, year) =>
        request(`${API_BASE}/logs/matrix?month=${month}&year=${year}`),
    addLog: (data) =>
        request(`${API_BASE}/logs`, { method: 'POST', body: JSON.stringify(data) }),
    deleteLog: (id) =>
        request(`${API_BASE}/logs/${id}`, { method: 'DELETE' }),

    // Day Locks
    lockDay: (worker_id, date) =>
        request(`${API_BASE}/day-locks`, { method: 'POST', body: JSON.stringify({ worker_id, date }) }),
    lockAllDay: (date) =>
        request(`${API_BASE}/day-locks/lock-all`, { method: 'POST', body: JSON.stringify({ date }) }),
    unlockDay: (worker_id, date) =>
        request(`${API_BASE}/day-locks`, { method: 'DELETE', body: JSON.stringify({ worker_id, date }) }),
    getLocks: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/day-locks?${q}`);
    },

    // Machines
    getMachines: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/machines?${q}`);
    },
    addMachine: (data) =>
        request(`${API_BASE}/machines`, { method: 'POST', body: JSON.stringify(data) }),
    updateMachine: (id, data) =>
        request(`${API_BASE}/machines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Machine Logs
    getMachineLogs: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/machine-logs?${q}`);
    },
    addMachineLog: (data) =>
        request(`${API_BASE}/machine-logs`, { method: 'POST', body: JSON.stringify(data) }),
    toggleMachineLogBlock: (id) =>
        request(`${API_BASE}/machine-logs/${id}/block`, { method: 'PATCH' }),

    // Trucks
    getTrucks: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/trucks?${q}`);
    },
    addTruck: (data) =>
        request(`${API_BASE}/trucks`, { method: 'POST', body: JSON.stringify(data) }),
    updateTruck: (id, data) =>
        request(`${API_BASE}/trucks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Truck Logs
    getTruckLogs: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`${API_BASE}/truck-logs?${q}`);
    },
    addTruckLog: (data) =>
        request(`${API_BASE}/truck-logs`, { method: 'POST', body: JSON.stringify(data) }),
    toggleTruckLogBlock: (id) =>
        request(`${API_BASE}/truck-logs/${id}/block`, { method: 'PATCH' }),

    // Reports
    getWorkerReport: (month, year) =>
        request(`${API_BASE}/reports/workers?month=${month}&year=${year}`),
    getWorkerLocationBreakdown: (workerId, month, year) =>
        request(`${API_BASE}/reports/workers/${workerId}/locations?month=${month}&year=${year}`),
    getLocationReport: (month, year) =>
        request(`${API_BASE}/reports/locations?month=${month}&year=${year}`),
    getMachineReport: (month, year) =>
        request(`${API_BASE}/reports/machines?month=${month}&year=${year}`),
    getTruckReport: (month, year) =>
        request(`${API_BASE}/reports/trucks?month=${month}&year=${year}`),

    // Users (admin)
    getUsers: () => request(`${API_BASE}/users`),
    createUser: (data) =>
        request(`${API_BASE}/users`, { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id, data) =>
        request(`${API_BASE}/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id) =>
        request(`${API_BASE}/users/${id}`, { method: 'DELETE' }),
};

export default api;
