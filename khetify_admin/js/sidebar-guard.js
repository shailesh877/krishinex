/**
 * sidebar-guard.js - Dynamic Module Access Control for KrishiNex Admin
 * This script hides/removes sidebar links based on the employee's assigned modules.
 */

(function () {
    const userJson = localStorage.getItem('employeeUser');
    if (!userJson) return; 

    const user = JSON.parse(userJson);
    
    // Super Admin (role: 'admin') gets full access to everything
    if (user.role === 'admin') {
        console.log('[SIDEBAR-GUARD] Super Admin detected - Full access granted.');
        return;
    }

    const allowedModules = user.employeeModules || [];
    console.log('[SIDEBAR-GUARD] Employee access modules:', allowedModules);

    const moduleMap = {
        'dashboard': 'index.html',
        'ksp_franchise': 'ksp_Franchise_managment.html',
        'mandi': 'mandi_management.html',
        'equipment': 'machine_partners_management.html',
        'labour': 'labour_managment.html',
        'buyer': 'buyer_managment.html',
        'shop': 'shop_patner.html',
        'banners': 'shop_banners.html',
        'soil': 'soil_testing_patner.html',
        'loan': 'loan_management.html',
        'pathshala': 'kisan_pathshala_management.html',
        'advisory': 'suggestion_management.html',
        'doctor': 'doctor_consultation_management.html',
        'contact': 'contact_management.html',
        'ad_enquiry': 'ad_management.html',
        'ksp_app': 'ksp_management.html',
        'employees': 'employee_managment.html',
        'users': 'users_managment.html',
        'field_executive': 'field_executive.html',
        'payout': 'payout_management.html',
        'kyc': 'kyc_and_compliance_management.html',
        'finance': 'finance_payouts_management.html',
        'analytics': 'Analytics_Reports.html',
        'settings': 'settings.html'
    };

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        // 1. Hide Links
        const links = sidebar.querySelectorAll('nav a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const moduleKey = Object.keys(moduleMap).find(key => moduleMap[key] === href);
            if (moduleKey && moduleKey !== 'dashboard') {
                if (!allowedModules.includes(moduleKey)) {
                    link.style.display = 'none';
                    link.classList.add('hidden-by-guard');
                }
            }
        });

        // 2. Hide Category Headers (CORE MODULES, etc.) if all children are hidden
        const nav = sidebar.querySelector('nav');
        if (nav) {
            const categories = nav.querySelectorAll('.pt-3');
            categories.forEach(cat => {
                let current = cat.nextElementSibling;
                let hasVisibleChild = false;
                
                // Scan until next category or end of nav
                while (current && !current.classList.contains('pt-3')) {
                    if (current.tagName === 'A' && current.style.display !== 'none') {
                        hasVisibleChild = true;
                        break;
                    }
                    current = current.nextElementSibling;
                }

                if (!hasVisibleChild) {
                    cat.style.display = 'none';
                }
            });
        }
    }

    // 3. URL Guard
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage && currentPage !== 'index.html' && currentPage !== 'login.html') {
        const currentModuleKey = Object.keys(moduleMap).find(key => moduleMap[key] === currentPage);
        if (currentModuleKey && !allowedModules.includes(currentModuleKey)) {
            alert('Security Alert: You do not have permission to access this module.');
            window.location.replace('index.html');
        }
    }
})();
