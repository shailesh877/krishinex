/**
 * auth.js - Global Session Management for KrishiNex Admin
 * This script ensures the user is authenticated and handles secure logout.
 */

(function () {
    const AUTH_TOKEN = localStorage.getItem('employeeToken');
    const LOGIN_PAGE = 'login.html';
    const DASHBOARD_PAGE = 'index.html';

    const isLoginPage = window.location.pathname.includes(LOGIN_PAGE);

    // 1. Immediate Session Check
    if (!AUTH_TOKEN && !isLoginPage) {
        window.location.replace(LOGIN_PAGE);
    } else if (AUTH_TOKEN && isLoginPage) {
        // Automatically move to dashboard if already logged in
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
})();
