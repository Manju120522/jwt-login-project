// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const welcomeUser = document.getElementById('welcomeUser');
const loginTime = document.getElementById('loginTime');
const sessionExpiry = document.getElementById('sessionExpiry');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

// State
let currentUser = null;
let loginTimestamp = null;
let expiryInterval = null;

// API Base URL
const API_URL = 'http://localhost:3000';

// Toggle password visibility
togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
});

// Show message function
function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message show ${type}`;
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

// Format time
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Update session expiry countdown
function updateExpiryCountdown() {
    if (!loginTimestamp) return;
    
    const now = Date.now();
    const elapsed = now - loginTimestamp;
    const remaining = 3600000 - elapsed; // 1 hour in milliseconds
    
    if (remaining <= 0) {
        clearInterval(expiryInterval);
        showMessage('Session expired. Please login again.', 'error');
        showLoginSection();
        return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    sessionExpiry.textContent = `${minutes}m ${seconds}s`;
}

// Show login section
function showLoginSection() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
    currentUser = null;
    loginTimestamp = null;
    if (expiryInterval) {
        clearInterval(expiryInterval);
        expiryInterval = null;
    }
}

// Show dashboard section
function showDashboardSection(username) {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    currentUser = username;
    loginTimestamp = Date.now();
    
    welcomeUser.textContent = `Welcome, ${username}!`;
    loginTime.textContent = formatTime(new Date());
    
    // Start expiry countdown
    updateExpiryCountdown();
    expiryInterval = setInterval(updateExpiryCountdown, 1000);
}

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = 'Logging in<span class="spinner"></span>';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Login successful!', 'success');
            showDashboardSection(data.user.username);
        } else {
            showMessage(data.message || 'Login failed', 'error');
            passwordInput.classList.add('error');
            setTimeout(() => passwordInput.classList.remove('error'), 500);
        }
    } catch (error) {
        showMessage('Connection error. Please check if server is running on port 3000.', 'error');
        console.error('Login error:', error);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
    }
});

// Refresh button
refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '🔄 Refreshing<span class="spinner"></span>';

    try {
        const response = await fetch(`${API_URL}/dashboard`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Dashboard data refreshed!', 'success');
        } else {
            showMessage(data.message || 'Failed to refresh', 'error');
            if (response.status === 401 || response.status === 403) {
                showMessage('Session expired. Please login again.', 'error');
                showLoginSection();
            }
        }
    } catch (error) {
        showMessage('Connection error. Please check if server is running.', 'error');
        console.error('Refresh error:', error);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '🔄 Refresh Data';
    }
});

// Logout button
logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    logoutBtn.innerHTML = '🚪 Logging out<span class="spinner"></span>';

    try {
        const response = await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        showMessage(data.message || 'Logged out successfully', 'success');
        showLoginSection();
    } catch (error) {
        showMessage('Connection error during logout.', 'error');
        console.error('Logout error:', error);
        // Still show login section even if logout request fails
        showLoginSection();
    } finally {
        logoutBtn.disabled = false;
        logoutBtn.innerHTML = '🚪 Logout';
    }
});

// Check authentication status on page load
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_URL}/dashboard`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                showDashboardSection(data.user.username);
                showMessage('Session restored!', 'info');
            }
        }
    } catch (error) {
        console.log('No active session found');
    }
});

// Prevent back button after logout
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});