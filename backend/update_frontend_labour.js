const fs = require('fs');
const path = 'd:/khetify/khetify_admin/labour_managment.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix userRole
const roleRegex = /const AUTH_TOKEN = localStorage\.getItem\('employeeToken'\);\s*const userRole = 'super-admin';\s*const userPincode = null;/;
const roleReplacement = `const AUTH_TOKEN = localStorage.getItem('employeeToken');
    const userDataStr = localStorage.getItem('employeeUser');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const userRole = userData ? userData.role : 'employee';
    const userPincode = userData ? userData.pincode : null;`;
content = content.replace(roleRegex, roleReplacement);

// 2. Fix Sidebar User Name
const sidebarRegex = /<p class="text-xs font-black text-slate-900 truncate">Super Admin<\/p>/;
const sidebarReplacement = '<p id="sidebarUserName" class="text-xs font-black text-slate-900 truncate">Loading...</p>';
content = content.replace(sidebarRegex, sidebarReplacement);

// 3. Fix Header User Name
const headerRegex = /<span class="ml-2 mr-2 hidden sm:inline text-slate-900 font-black text-xs">SA<\/span>/;
const headerReplacement = '<span id="headerUserName" class="ml-2 mr-2 hidden sm:inline text-slate-900 font-black text-xs">...</span>';
content = content.replace(headerRegex, headerReplacement);

// 4. Fix DOMContentLoaded
const domRegex = /window\.addEventListener\('DOMContentLoaded', function \(\) \{\s*console\.log\('👷 Labour Aggregation Management Page Loaded'\);\s*applyRBAC\(\);\s*fetchLabourStats\(\);\s*fetchLabourers\(\);\s*fetchLabourJobs\(\);\s*fetchEmployeesToAssign\(\);\s*\}\);/;
const domReplacement = `window.addEventListener('DOMContentLoaded', function () {
      console.log('👷 Labour Aggregation Management Page Loaded');
      
      // Update UI with actual user name
      if (typeof userData !== 'undefined' && userData) {
          if (document.getElementById('sidebarUserName')) document.getElementById('sidebarUserName').textContent = userData.name;
          if (document.getElementById('headerUserName')) document.getElementById('headerUserName').textContent = userData.name.split(' ')[0];
      }

      applyRBAC();
      fetchLabourStats();
      fetchLabourers();
      fetchLabourJobs();
      fetchEmployeesToAssign();
    });`;
content = content.replace(domRegex, domReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Frontend labour_managment.html updated successfully!');
