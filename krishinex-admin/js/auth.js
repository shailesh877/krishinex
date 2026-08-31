/**
 * auth.js - Global Session Management & Configuration for KrishiNex Admin
 * This script ensures the user is authenticated and handles global API settings.
 */

window.API_BASE = 'https://demo.ranx24.com/api';
window.IMAGE_BASE = 'https://demo.ranx24.com';

/**
 * Global helper to resolve image & document URLs.
 * Always resolves relative paths against production image host https://demo.ranx24.com
 */
window.fixImageUrl = function (url) {
    if (!url || url === 'undefined' || url === 'null' || url === 'none') return '';
    if (typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = (window.IMAGE_BASE || 'https://demo.ranx24.com').replace(/\/+$/, '');
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    return base + cleanUrl;
};
window.fixUrl = window.fixImageUrl;

/**
 * Global helper to filter out test/demo accounts in production.
 * In local environment (localhost / 127.0.0.1 / local IPs), test & demo accounts remain visible.
 * In production environment (demo.ranx24.com / live host), accounts with "demo", "testing", "test" names/emails are filtered out.
 */
window.isLocalEnv = function () {
    return isLocal;
};

window.filterTestAccounts = function (items) {
    if (isLocal) {
        // Show everything in local dev environment
        return items;
    }
    if (!Array.isArray(items)) return items;

    const isTestStr = (str) => {
        if (!str || typeof str !== 'string') return false;
        const s = str.toLowerCase().trim();
        return s.includes('demo') || s.includes('testing') || s === 'test' || s.startsWith('test ') || s.endsWith(' test') || s.includes('test user') || s.includes('dummy') || s.includes('sample');
    };

    return items.filter(item => {
        if (!item) return false;
        const name = (item.name || item.franchiseName || item.buyerName || item.labourName || item.farmerName || item.shopName || item.labName || item.businessName || item.ownerName || '').toString();
        const email = (item.email || '').toString();
        const note = (item.note || item.description || item.address || '').toString();

        if (isTestStr(name) || isTestStr(email) || isTestStr(note)) {
            return false;
        }
        return true;
    });
};

/**
 * Progressive Chunked Table Renderer for instant UI feel.
 * Immediately renders initial chunk (e.g. 20 items), then streams remaining items
 * in background animation frames without blocking the main thread or causing lag.
 */
window.progressiveRenderTable = function (tbodyEl, items, rowTemplateFn, options = {}) {
    const tbody = typeof tbodyEl === 'string' ? document.getElementById(tbodyEl) : tbodyEl;
    if (!tbody) return;

    if (tbody._progressiveTimer) {
        cancelAnimationFrame(tbody._progressiveTimer);
        tbody._progressiveTimer = null;
    }

    const list = (typeof window.filterTestAccounts === 'function') ? window.filterTestAccounts(items) : items;

    if (!list || list.length === 0) {
        tbody.innerHTML = options.emptyHtml || '<tr><td colspan="100" class="text-center py-8 text-slate-400 font-semibold">No records found.</td></tr>';
        return;
    }

    const chunkSize = options.chunkSize || 20;
    const initialItems = list.slice(0, chunkSize);
    const remainingItems = list.slice(chunkSize);

    // 1. Render first 20 items INSTANTLY
    tbody.innerHTML = initialItems.map((item, idx) => rowTemplateFn(item, idx)).join('');

    // 2. Stream remaining items in non-blocking animation frame chunks
    if (remainingItems.length > 0) {
        let currentIndex = 0;

        function renderNextChunk() {
            if (currentIndex >= remainingItems.length) return;

            const nextChunk = remainingItems.slice(currentIndex, currentIndex + chunkSize);
            const fragment = document.createDocumentFragment();

            nextChunk.forEach((item, idx) => {
                const globalIdx = chunkSize + currentIndex + idx;
                const htmlStr = rowTemplateFn(item, globalIdx);
                if (typeof htmlStr === 'string') {
                    const temp = document.createElement('tbody');
                    temp.innerHTML = htmlStr.trim();
                    while (temp.firstChild) {
                        fragment.appendChild(temp.firstChild);
                    }
                } else if (htmlStr instanceof HTMLElement) {
                    fragment.appendChild(htmlStr);
                }
            });

            tbody.appendChild(fragment);
            currentIndex += chunkSize;

            if (currentIndex < remainingItems.length) {
                tbody._progressiveTimer = requestAnimationFrame(renderNextChunk);
            }
        }

        tbody._progressiveTimer = requestAnimationFrame(renderNextChunk);
    }
};


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

    window.toggleUsersSubmenu = function (e) {
        if (e) e.stopPropagation();
        const menu = document.getElementById('usersSubmenu');
        const chevron = document.getElementById('usersSubmenuChevron');
        if (menu) {
            menu.classList.toggle('hidden');
            if (chevron) {
                chevron.classList.toggle('rotate-180');
            }
        }
    };

    /**
     * Global Mobile Sidebar Toggle
     */
    window.toggleSidebar = function (force) {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobile-backdrop');
        if (!sidebar) return;
        const isClosed = sidebar.classList.contains('-translate-x-full');
        const show = (typeof force === 'boolean') ? force : isClosed;
        if (show) {
            sidebar.classList.remove('-translate-x-full');
            if (backdrop) backdrop.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            if (backdrop) backdrop.classList.add('hidden');
        }
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
