/**
 * ksp_auth.js - Global Session, RBAC Permission Engine & Interceptor for KrishiNex Admin Portal
 */

window.API_BASE = 'https://demo.ranx24.com/api';
window.IMAGE_BASE = 'https://demo.ranx24.com';

// =============================================
// GLOBAL RBAC PERMISSION ENGINE
// =============================================
window.getCurrentUser = function () {
    try {
        const empStr = localStorage.getItem('employeeUser') || localStorage.getItem('kspUser');
        return empStr ? JSON.parse(empStr) : null;
    } catch (e) {
        return null;
    }
};

window.hasPermission = function (moduleKey) {
    if (!moduleKey || moduleKey === 'all' || moduleKey === 'public') return true;
    const user = window.getCurrentUser();
    if (!user) return true; // Default allow if unauthenticated (auth guard handles login redirect)

    const role = (user.role || '').toLowerCase();
    if (role === 'admin' || role === 'superadmin') return true;

    if (role === 'employee') {
        const modules = user.employeeModules || user.modules || [];
        return modules.includes(moduleKey) || modules.includes('all');
    }

    return false;
};

// Page Filename to Required Module Key mapping
const PAGE_MODULE_MAP = {
    'users_managment.html': 'users',
    'buyer_managment.html': 'buyer',
    'ksp_management.html': 'franchise',
    'ksp_franchise_managment.html': 'franchise',
    'shop_patner.html': 'shop',
    'shop_banners.html': 'shop',
    'soil_testing_patner.html': 'soil',
    'mandi_management.html': 'mandi',
    'labour_managment.html': 'labour',
    'machine_partners_management.html': 'machines',
    'doctor_consultation_management.html': 'doctor',
    'loan_management.html': 'loan',
    'farmer_credit.html': 'loan',
    'finance_payouts_management.html': 'finance',
    'payout_management.html': 'finance',
    'analytics_reports.html': 'analytics',
    'ad_management.html': 'ads',
    'field_executive.html': 'field',
    'contact_management.html': 'contact',
    'suggestion_management.html': 'contact',
    'nex_card_management.html': 'nexcard',
    'ksp_nex_card.html': 'nexcard'
};

window.applyGlobalPermissions = function () {
    const user = window.getCurrentUser();
    if (!user) return;

    // 1. Scan and hide UI elements marked with data-module or data-permission
    const permElements = document.querySelectorAll('[data-module], [data-permission]');
    permElements.forEach(el => {
        const requiredModule = el.dataset.module || el.dataset.permission;
        if (requiredModule && !window.hasPermission(requiredModule)) {
            el.style.display = 'none';
            el.classList.add('hidden');
        }
    });

    // 2. Scan standard sidebar links by href matching page map
    const sidebarLinks = document.querySelectorAll('a[href], nav a, aside a');
    sidebarLinks.forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase().split('?')[0].split('#')[0];
        const pageName = href.split('/').pop();
        if (pageName && PAGE_MODULE_MAP[pageName]) {
            const requiredModule = PAGE_MODULE_MAP[pageName];
            if (!window.hasPermission(requiredModule)) {
                const parentLi = link.closest('li') || link;
                parentLi.style.display = 'none';
                parentLi.classList.add('hidden');
            }
        }
    });
};

(function () {
    const KSP_TOKEN = localStorage.getItem('employeeToken') || localStorage.getItem('kspToken');
    const LOGIN_PAGE = 'login.html';

    const path = window.location.pathname.toLowerCase();
    const currentPage = path.split('/').pop();
    const isLoginPage = path.includes('login.html') || path.includes('ksp_login');

    // 1. Page Access Permission Check
    if (PAGE_MODULE_MAP[currentPage]) {
        const requiredModule = PAGE_MODULE_MAP[currentPage];
        if (!window.hasPermission(requiredModule)) {
            console.warn(`[RBAC] Access denied for page: ${currentPage}. Required module: ${requiredModule}`);
            setTimeout(() => {
                alert(`Access Denied: You are not eligible to view this page. ('${requiredModule}' permission required)`);
                window.location.replace('index.html');
            }, 200);
        }
    }

    // 2. Global Fetch Interceptor for 401 & 403 Errors
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch(...args);

        // Handle 403 Forbidden (Permission Denied)
        if (response.status === 403) {
            try {
                const clonedRes = response.clone();
                const data = await clonedRes.json();
                const errMsg = data.error || "Access Denied: You are not eligible for this action.";

                console.warn('[RBAC-INTERCEPTOR] 403 Forbidden:', errMsg);
                if (typeof window.showToast === 'function') {
                    window.showToast(errMsg, 'warning');
                } else {
                    alert(errMsg);
                }
            } catch (e) {
                if (typeof window.showToast === 'function') {
                    window.showToast("Access Denied: You are not eligible for this action.", 'warning');
                }
            }
        }

        // Handle 401 Unauthorized
        if (response.status === 401) {
            const currentPath = window.location.pathname.toLowerCase();
            if (!currentPath.includes('login.html') && !currentPath.includes('ksp_login')) {
                try {
                    const clonedRes = response.clone();
                    const data = await clonedRes.json();
                    if (data.error && (data.error.toLowerCase().includes('otp') || data.error.toLowerCase().includes('pin'))) {
                        return response;
                    }
                } catch (e) {}

                console.warn('[AUTH] Session expired or invalid - clearing session');
                localStorage.removeItem('employeeToken');
                localStorage.removeItem('employeeUser');
                localStorage.removeItem('kspToken');
                localStorage.removeItem('kspUser');
                window.location.replace(LOGIN_PAGE);
            }
        }

        return response;
    };

    // Automatically apply UI hiding once DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.applyGlobalPermissions);
    } else {
        window.applyGlobalPermissions();
    }

    // Observe dynamic DOM insertions (tables, modals, lists) to auto-hide newly rendered elements
    const observer = new MutationObserver(() => window.applyGlobalPermissions());
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
