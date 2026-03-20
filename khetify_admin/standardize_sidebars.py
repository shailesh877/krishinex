
import re
import os

def get_nav_block(active_page):
    # Template links
    links = [
        ("index.html", "fas fa-home", "Dashboard", "emerald", "sky"),
        ("spacer", "Core Modules"),
        ("ksp_Franchise_managment.html", "fas fa-store", "KSP Franchise", "teal", "emerald"),
        ("mandi_management.html", "fas fa-chart-line", "Mandi Rates", "emerald", "sky"),
        ("machine_partners_management.html", "fas fa-tractor", "Equipment Rentals", "orange", "amber"),
        ("labour_managment.html", "fas fa-people-group", "Labour Aggregation", "purple", "violet"),
        ("buyer_managment.html", "fas fa-handshake", "Buyer Trading (B2B)", "blue", "sky"),
        ("shop_patner.html", "fas fa-shopping-cart", "Shop Management", "teal", "emerald"),
        ("spacer", "Supporting"),
        ("soil_testing_patner.html", "fas fa-flask", "Soil Testing", "indigo", "purple"),
        ("suggestion_management.html", "fas fa-lightbulb", "Dynamic Advisory", "emerald", "sky"),
        ("doctor_consultation_management.html", "fas fa-user-doctor", "Doctor Consultations", "emerald", "sky"),
        ("contact_management.html", "fas fa-ticket", "Contact Inquiries", "emerald", "sky"),
        ("ad_management.html", "fas fa-bullhorn", "Ad Enquiries", "emerald", "sky"),
        ("ksp_management.html", "fas fa-handshake", "KSP Applications", "emerald", "sky"),
        ("spacer", "Users"),
        ("employee_managment.html", "fas fa-user-tie", "Employee Management", "emerald", "sky"),
        ("users_managment.html", "fas fa-seedling", "Farmers & Users", "emerald", "green"),
        ("field_executive.html", "fas fa-user-tag", "Field Executives", "emerald", "sky"),
        ("payout_management.html", "fas fa-hand-holding-dollar", "Payout Management", "blue", "sky"),
        ("spacer", "System"),
        ("kyc_and_compliance_management.html", "fas fa-shield-halved", "KYC & Compliance", "emerald", "sky"),
        ("finance_payouts_management.html", "fas fa-wallet", "Finance & Payouts", "emerald", "sky"),
        ("Analytics_Reports.html", "fas fa-chart-line", "Analytics & Reports", "indigo", "purple"),
        ("settings.html", "fas fa-cog", "Settings", "emerald", "sky"),
    ]

    html = ['      <nav class="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scroll">']
    
    for link in links:
        if link[0] == "spacer":
            html.append(f'''
        <div class="pt-3">
          <p class="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-black">{link[1]}</p>
        </div>''')
            continue
        
        href, icon, label, c1, c2 = link
        is_active = (href == active_page)
        
        if is_active:
            # Determine active colors based on the page
            if active_page == "Analytics_Reports.html":
                ac1, ac2, atxt, aborder, aicon = "indigo-50", "purple-50", "indigo-700", "indigo-200", "indigo-600"
                as1, as2 = "indigo-100", "purple-100"
            elif active_page == "buyer_managment.html":
                ac1, ac2, atxt, aborder, aicon = "blue-50", "sky-50", "blue-700", "blue-200", "blue-600"
                as1, as2 = "blue-100", "sky-100"
            elif active_page == "employee_managment.html":
                ac1, ac2, atxt, aborder, aicon = "emerald-50", "teal-50", "emerald-700", "emerald-200", "emerald-600"
                as1, as2 = "emerald-100", "teal-100"
            else:
                ac1, ac2, atxt, aborder, aicon = f"{c1}-50", f"{c2}-50", f"{c1}-700", f"{c1}-200", f"{c1}-600"
                as1, as2 = f"{c1}-100", f"{c2}-100"

            html.append(f'''
        <a href="{href}"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] bg-gradient-to-r from-{ac1} via-{ac2} to-{ac1} text-{atxt} border-2 border-{aborder} shadow-md">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-{as1} to-{as2} shadow-sm">
            <i class="{icon} text-{aicon}"></i>
          </span>
          <span class="truncate font-black">{label}</span>
        </a>''')
        else:
            html.append(f'''
        <a href="{href}"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-{c1}-50 hover:to-{c2}-50 hover:text-{c1}-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-{c1}-100 group-hover:to-{c2}-100 transition-all">
            <i class="{icon} text-slate-600 group-hover:text-{c1}-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">{label}</span>
        </a>''')

    html.append('      </nav>')
    return "\n".join(html)

def robust_fix(filepath, active_page):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Define the new nav block
    new_nav = get_nav_block(active_page)

    # Find the range to replace. We look for <nav ...> and </nav>
    # Note: employee_managment has two sidebars. We want to clean up everything before the LAST </nav> in the sidebar area.
    # Actually, a safer way is to find the LAST <aside> and replace its <nav>.
    
    # regex for navigation block
    nav_pattern = re.compile(r'<nav.*?>.*?</nav>', re.DOTALL)
    
    # For employee_managment.html, we need to handle the double document first
    if filepath == 'employee_managment.html':
        # Find the second <!DOCTYPE html> or just clean up the first chunk
        content = re.sub(r'<!DOCTYPE html>.*?<!-- ========== SIDEBAR (REUSABLE) ========== -->', 
                         '<!DOCTYPE html>\\n<html lang="en" class="h-full">\\n<head>\\n...\\n</head>\\n<body class="h-full bg-slate-50 text-slate-900">\\n  <div class="flex min-h-screen">\\n    <!-- MOBILE OVERLAY -->\\n    <div id="mobile-backdrop" class="fixed inset-0 z-30 hidden bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onclick="toggleSidebar(false)"></div>\\n\\n    <!-- ========== SIDEBAR (REUSABLE) ========== -->', 
                         content, flags=re.DOTALL, count=1)
        # That's too aggressive. Let's just fix the sidebars.
    
    # Replace ALL navigation blocks found with the new one (standardizes even if multiple exist)
    content = nav_pattern.sub(new_nav, content)
    
    # Special cleanup for employee_managment double body/aside
    if filepath == 'employee_managment.html':
        # Remove extra MOBILE OVERLAY and SIDEBAR wrappers if they exist twice
        content = re.sub(r'<!-- MOBILE OVERLAY -->\s+<div id="mobile-backdrop".*?<!-- ========== SIDEBAR \(REUSABLE\) ========== -->\s+<aside id="sidebar".*?<!-- Navigation -->', 
                         '<!-- MOBILE OVERLAY -->\\n    <div id="mobile-backdrop" class="fixed inset-0 z-30 hidden bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onclick="toggleSidebar(false)"></div>\\n\\n    <!-- ========== SIDEBAR (REUSABLE) ========== -->\\n    <aside id="sidebar" class="fixed inset-y-0 left-0 z-40 w-64 transform -translate-x-full md:translate-x-0 flex flex-col bg-white border-r-2 border-slate-200 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]">\\n      <!-- Brand -->\\n      <div class="h-16 flex items-center px-4 border-b-2 border-slate-200 bg-gradient-to-r from-white via-emerald-50/40 to-sky-50/40 sticky top-0 z-10">\\n        <div class="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg">\\n          <img src="images/logo.png" alt="">\\n        </div>\\n        <div class="ml-3">\\n          <img src="images/Khetify_use_under_the_app-English.png" class="w-20" alt="">\\n          <p class="text-[10px] text-slate-600 font-bold">Super Admin</p>\\n        </div>\\n      </div>\\n\\n      <!-- Navigation -->', 
                         content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Standardized: {filepath}")

# Standarize all targets
robust_fix('Analytics_Reports.html', 'Analytics_Reports.html')
robust_fix('buyer_managment.html', 'buyer_managment.html')
robust_fix('employee_managment.html', 'employee_managment.html')
robust_fix('index.html', 'index.html')
robust_fix('contact_management.html', 'contact_management.html')

print("Final standardization completed.")
