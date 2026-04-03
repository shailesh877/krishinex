/**
 * ksp_auth.js - Global Session Management & Configuration for KSP Partner Portal
 */

window.API_BASE = 'https://demo.ranx24.com:5500/api';
window.IMAGE_BASE = 'https://demo.ranx24.com:5500';

(function () {
    const KSP_TOKEN = localStorage.getItem('kspToken');
    const KSP_LOGIN_PAGE = 'ksp_login.html';
    const KSP_DASHBOARD = 'ksp_dashboard.html';

    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.includes(KSP_LOGIN_PAGE) || path.endsWith('/ksp_login') || path.endsWith('/ksp_login/');

    // 1. Immediate Session Check
    if (!KSP_TOKEN && !isLoginPage) {
        console.warn('[KSP-AUTH] No token found, redirecting to login...');
        window.location.replace(KSP_LOGIN_PAGE);
    } else if (KSP_TOKEN && isLoginPage) {
        // Optional: auto-redirect from login to dashboard if already authed
        // window.location.replace(KSP_DASHBOARD);
    }

    // 2. Global Fetch Interceptor for 401 Unauthorized
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            const currentPath = window.location.pathname.toLowerCase();
            if (!currentPath.includes(KSP_LOGIN_PAGE)) {
                console.warn('[KSP-AUTH] Unauthorized - clearing token and redirecting');
                localStorage.removeItem('kspToken');
                localStorage.removeItem('kspUser');
                window.location.replace(KSP_LOGIN_PAGE);
            }
        }
        return response;
    };
})();
