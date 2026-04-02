/**
 * auth.js - Global Session Management & Configuration for KrishiNex Admin
 * This script ensures the user is authenticated and handles global API settings.
 */

window.API_BASE = 'https://demo.ranx24.com/api';
window.IMAGE_BASE = 'https://demo.ranx24.com';

console.log('[DEBUG] Admin API Base Initialized:', window.API_BASE);

(function () {
    const AUTH_TOKEN = localStorage.getItem('employeeToken');
    const LOGIN_PAGE = 'login.html';
    const DASHBOARD_PAGE = 'index.html';

    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.includes(LOGIN_PAGE) || path.endsWith('/login') || path.endsWith('/login/');

    console.log('[DEBUG] Auth Check:', { path, isLoginPage, hasToken: !!AUTH_TOKEN });

    // 1. Immediate Session Check
    if (!AUTH_TOKEN && !isLoginPage) {
        console.warn('[AUTH] No token found, redirecting to login...');
        window.location.replace(LOGIN_PAGE);
    } else if (AUTH_TOKEN && isLoginPage) {
        console.info('[AUTH] Token found on login page, moving to dashboard...');
        window.location.replace(DASHBOARD_PAGE);
    }

    // 2. Prevent Back-Button Access After Logout (BFCache handling)
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // Page was loaded from cache (e.g., user clicked back button)
            const token = localStorage.getItem('employeeToken');
            if (!token) {
                window.location.replace(LOGIN_PAGE);
            }
        }
    });

    // 3. Global Logout Function
    window.logoutSession = function () {
        // Clear all session data
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employeeUser');

        // Force immediate redirect to login
        // window.location.replace is better than .href for security as it removes the entry from history
        window.location.replace(LOGIN_PAGE);
    };
    // 4. Global Fetch Interceptor for 401 Unauthorized
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            // Check if we are already on the login page to avoid infinite loops
            const isLoginPage = window.location.pathname.includes('login.html');
            if (!isLoginPage) {
                console.warn('Unauthorized access - redirecting to login');
                if (window.logoutSession) {
                    window.logoutSession();
                } else {
                    localStorage.removeItem('employeeToken');
                    window.location.replace('login.html');
                }
            }
        }
        return response;
    };
    // 5. Global UI Initialization (Sidebars & Headers)
    document.addEventListener('DOMContentLoaded', () => {
        const userDataStr = localStorage.getItem('employeeUser');
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                const userName = userData.name || 'Admin';
                const firstName = userName.split(' ')[0];

                // Update Sidebar Name
                const sidebarName = document.getElementById('sidebarUserName');
                if (sidebarName) {
                    sidebarName.textContent = userName;
                } else {
                    // Fallback: search for <p> with class truncate containing "Super Admin"
                    const ps = document.getElementsByTagName('p');
                    for (let p of ps) {
                        if (p.classList.contains('truncate') && p.textContent.trim() === 'Super Admin') {
                            p.id = 'sidebarUserName';
                            p.textContent = userName;
                            break;
                        }
                    }
                }

                // Update Header Initial/Name
                const headerName = document.getElementById('headerUserName');
                if (headerName) {
                    headerName.textContent = firstName;
                } else {
                    // Fallback search for header element
                    const spans = document.getElementsByTagName('span');
                    for (let span of spans) {
                        if (span.textContent.trim() === 'SA' && span.classList.contains('sm:inline')) {
                            span.id = 'headerUserName';
                            span.textContent = firstName;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing user data for UI:', e);
            }
        }
    });
})();
