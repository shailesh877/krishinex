
import re
import os

def fix_file(filepath, repairs):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original_content = content
    for pattern, replacement in repairs:
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes made to: {filepath} (Target patterns not found)")

# --- Analytics_Reports.html ---
analytics_repairs = [
    # Remove orphaned class and duplicated Dynamic Advisory
    (r'</a>\s+class="group w-full flex items-center gap-3 px-3 py-2\.5 rounded-xl text-\[13px\] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">.*?Dynamic Advisory</span>\s+</a>', '</a>'),
    # Fix fragmented Analytics & Reports link and restore missing sections
    (r'<div class="pt-3">\s+<p class="px-3 py-1 text-\[10px\] uppercase tracking-wider text-slate-500 font-black">Users</p>\s+</div>\s+<i class="fas fa-chart-line text-indigo-600"></i>\s+</span>\s+<span class="truncate font-black">Analytics & Reports</span>\s+</a>', 
     '''<div class="pt-3">
          <p class="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-black">Users</p>
        </div>

        <a href="employee_managment.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-user-tie text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Employee Management</span>
        </a>

        <a href="users_managment.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-green-100 transition-all">
            <i class="fas fa-seedling text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Farmers & Users</span>
        </a>

        <a href="field_executive.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-user-tag text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Field Executives</span>
        </a>

        <a href="payout_management.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 hover:text-blue-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-blue-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-hand-holding-dollar text-slate-600 group-hover:text-blue-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Payout Management</span>
        </a>

        <div class="pt-3">
          <p class="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-black">System</p>
        </div>

        <a href="kyc_and_compliance_management.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-shield-halved text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">KYC & Compliance</span>
        </a>

        <a href="finance_payouts_management.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-wallet text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Finance & Payouts</span>
        </a>

        <a href="Analytics_Reports.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 text-indigo-700 border-2 border-indigo-200 shadow-md">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 shadow-sm">
            <i class="fas fa-chart-line text-indigo-600"></i>
          </span>
          <span class="truncate font-black">Analytics & Reports</span>
        </a>''')
]

# --- buyer_managment.html ---
buyer_repairs = [
    # Fix fragmented Employee Management
    (r'</span>\s+<span class="truncate font-semibold">Employee Management</span>\s+</a>', 
     '''<span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-user-tie text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Employee Management</span>
        </a>'''),
    # Fix fragmented Finance & Payouts (if exists)
    (r'<i\s+<span class="truncate font-semibold">Finance & Payouts</span>\s+</a>',
     '''<i class="fas fa-wallet text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Finance & Payouts</span>
        </a>''')
]

# --- employee_managment.html ---
employee_repairs = [
    # Remove first partial sidebar and redundant header
    (r'<!DOCTYPE html>.*?<aside id="sidebar".*?<!-- Navigation -->.*?<nav.*?>.*?Labour Aggregation</span>\s+</a>.*?<!-- MOBILE OVERLAY -->', 
     '<!-- REPAIRED START -->\\n<!DOCTYPE html>\\n<html lang="en" class="h-full">', 
     ),
    # Fix the corrupted fragments in the second sidebar
    (r'</a>\s+class="group w-full flex items-center gap-3 px-3 py-2\.5 rounded-xl text-\[13px\] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">\s+<span\s+class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">', 
     '''<a href="field_executive.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">'''),
    (r'<i class="fas fa-chart-line text-slate-600 group-hover:text-indigo-600 transition-colors"></i>\s+</span>\s+<span class="truncate font-semibold">Analytics & Reports</span>\s+</a>',
     '''<a href="Analytics_Reports.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-chart-line text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Analytics & Reports</span>
        </a>''')
]

# Run repairs
fix_file('Analytics_Reports.html', analytics_repairs)
fix_file('buyer_managment.html', buyer_repairs)
# Special handling for employee_managment.html because of the complex cleanup
# Actually let's use a simpler approach for employee_managment.html if possible
fix_file('employee_managment.html', employee_repairs[1:]) # Apply fragments first

print("Repair script completed.")
