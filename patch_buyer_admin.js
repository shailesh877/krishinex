const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'khetify_admin', 'buyer_managment.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace JavaScript Logic
const oldJs = `        // ---- Buyer Profile Modal ----
        function viewBuyerDetails(buyerId) {
            const b = allBuyers.find(x => x._id === buyerId);
            if (!b) return;
            document.getElementById('modalBuyerName').textContent = b.businessName;
            document.getElementById('modalBuyerPhone').textContent = b.phone;
            document.getElementById('modalBuyerEmail').textContent = b.email || 'N/A';
            document.getElementById('modalBuyerAddress').textContent = b.address || 'N/A';
            document.getElementById('modalBuyerOrders').textContent = b.totalOrders;
            document.getElementById('modalBuyerQty').textContent = b.totalPurchaseQty + ' Q';
            document.getElementById('modalBuyerValue').textContent = formatCurrency(b.totalValue);
            document.getElementById('modalBuyerOutstanding').textContent = formatCurrency(b.outstandingAmount);
            const isActive = b.status === 'approved';
            document.getElementById('modalBuyerStatus').textContent = isActive ? 'Active' : 'Pending';
            document.getElementById('modalBuyerStatus').className = \`text-sm font-black \${isActive ? 'text-emerald-700' : 'text-amber-700'}\`;

            // Handle Aadhaar Document
            const docContainer = document.getElementById('modalBuyerDocContainer');
            if (b.aadhaarDocUrl) {
                const docUrl = fixImageUrl(b.aadhaarDocUrl);
                docContainer.innerHTML = \`<a href="\${docUrl}" target="_blank" class="inline-flex items-center justify-center w-full h-9 rounded-xl border-2 border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all"><i class="fas fa-file-invoice mr-2"></i> View Verification Document</a>\`;
            } else {
                docContainer.innerHTML = \`<button disabled class="inline-flex items-center justify-center w-full h-9 rounded-xl border-2 border-slate-100 bg-slate-50 text-xs font-bold text-slate-400 cursor-not-allowed"><i class="fas fa-file-invoice mr-2"></i> No Document Uploaded</button>\`;
            }

            document.getElementById('buyerProfileModal').classList.remove('hidden');
        }

        function closeBuyerProfile() {
            document.getElementById('buyerProfileModal').classList.add('hidden');
        }`;

const newJs = `        // ---- Buyer Profile Modal ----
        let currentBuyerId = null;
        let isEditMode = false;

        function viewBuyerDetails(buyerId) {
            const b = allBuyers.find(x => x._id === buyerId);
            if (!b) return;
            currentBuyerId = buyerId;
            isEditMode = false;
            updateModalUI(b);
            document.getElementById('buyerProfileModal').classList.remove('hidden');
        }

        function updateModalUI(b) {
            // View Mode Elements
            document.getElementById('view_businessName').textContent = b.businessName || '—';
            document.getElementById('view_phone').textContent = b.phone || '—';
            document.getElementById('view_email').textContent = b.email || 'N/A';
            document.getElementById('view_address').textContent = b.address || 'N/A';
            
            // Bank Info View
            const bank = b.bankDetails || {};
            document.getElementById('view_bankHolder').textContent = bank.holderName || '—';
            document.getElementById('view_bankName').textContent = bank.bankName || '—';
            document.getElementById('view_accountNumber').textContent = bank.accountNumber || '—';
            document.getElementById('view_ifscCode').textContent = bank.ifscCode || '—';

            // Edit Mode Elements (Inputs)
            document.getElementById('edit_businessName').value = b.businessName || '';
            document.getElementById('edit_phone').value = b.phone || '';
            document.getElementById('edit_email').value = b.email || '';
            document.getElementById('edit_address').value = b.address || '';
            document.getElementById('edit_bankHolder').value = bank.holderName || '';
            document.getElementById('edit_bankName').value = bank.bankName || '';
            document.getElementById('edit_accountNumber').value = bank.accountNumber || '';
            document.getElementById('edit_ifscCode').value = bank.ifscCode || '';

            // Stats
            document.getElementById('modalBuyerOrders').textContent = b.totalOrders || 0;
            document.getElementById('modalBuyerQty').textContent = (b.totalPurchaseQty || 0) + ' Q';
            document.getElementById('modalBuyerValue').textContent = formatCurrency(b.totalValue || 0);
            document.getElementById('modalBuyerOutstanding').textContent = formatCurrency(b.outstandingAmount || 0);
            
            const isActive = b.status === 'approved';
            document.getElementById('modalBuyerStatus').textContent = isActive ? 'Active' : 'Pending';
            document.getElementById('modalBuyerStatus').className = \`text-sm font-black \${isActive ? 'text-emerald-700' : 'text-amber-700'}\`;

            // Reset UI Visibility
            isEditMode = false;
            applyModeUI();

            // Handle Aadhaar Document
            const docContainer = document.getElementById('modalBuyerDocContainer');
            if (b.aadhaarDocUrl) {
                const docUrl = fixImageUrl(b.aadhaarDocUrl);
                docContainer.innerHTML = \`<a href="\${docUrl}" target="_blank" class="inline-flex items-center justify-center w-full h-8 rounded-xl border-2 border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all"><i class="fas fa-file-invoice mr-2"></i> View Verification Document</a>\`;
            } else {
                docContainer.innerHTML = \`<button disabled class="inline-flex items-center justify-center w-full h-8 rounded-xl border-2 border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 cursor-not-allowed"><i class="fas fa-file-invoice mr-2"></i> No Document Uploaded</button>\`;
            }
        }

        function toggleBuyerEdit() {
            isEditMode = !isEditMode;
            applyModeUI();
        }

        function applyModeUI() {
            const viewEls = document.querySelectorAll('[id^="view_"]');
            const editEls = document.querySelectorAll('[id^="edit_"]');
            const saveBtn = document.getElementById('saveEditBtn');
            const toggleBtn = document.getElementById('toggleEditBtn');

            if (isEditMode) {
                viewEls.forEach(el => el.classList.add('hidden'));
                editEls.forEach(el => el.classList.remove('hidden'));
                saveBtn.classList.remove('hidden');
                toggleBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel Edit';
                toggleBtn.classList.replace('text-blue-700', 'text-rose-700');
                toggleBtn.classList.replace('border-blue-200', 'border-rose-200');
                toggleBtn.classList.replace('bg-blue-50', 'bg-rose-50');
            } else {
                viewEls.forEach(el => el.classList.remove('hidden'));
                editEls.forEach(el => el.classList.add('hidden'));
                saveBtn.classList.add('hidden');
                toggleBtn.innerHTML = '<i class="fas fa-edit mr-2"></i>Edit';
                if (toggleBtn.classList.contains('text-rose-700')) {
                    toggleBtn.classList.replace('text-rose-700', 'text-blue-700');
                    toggleBtn.classList.replace('border-rose-200', 'border-blue-200');
                    toggleBtn.classList.replace('bg-rose-50', 'bg-blue-50');
                }
            }
        }

        async function saveBuyerEdit() {
            if (!currentBuyerId) return;
            const body = {
                businessName: document.getElementById('edit_businessName').value,
                phone: document.getElementById('edit_phone').value,
                email: document.getElementById('edit_email').value,
                address: document.getElementById('edit_address').value,
                bankDetails: {
                    holderName: document.getElementById('edit_bankHolder').value,
                    bankName: document.getElementById('edit_bankName').value,
                    accountNumber: document.getElementById('edit_accountNumber').value,
                    ifscCode: document.getElementById('edit_ifscCode').value
                }
            };
            try {
                const saveBtn = document.getElementById('saveEditBtn');
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
                const res = await fetch(\`\${API_BASE}/employee/admin/buyer/update/\${currentBuyerId}\`, {
                    method: 'PUT',
                    headers: { 'Authorization': \`Bearer \${AUTH_TOKEN}\`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (res.ok) {
                    showToast('Buyer profile updated successfully', 'success');
                    await fetchBuyers();
                    const updatedBuyer = allBuyers.find(x => x._id === currentBuyerId);
                    if (updatedBuyer) updateModalUI(updatedBuyer);
                } else showToast(data.error || 'Update failed', 'warning');
            } catch (e) { showToast('Network error: ' + e.message, 'warning'); }
            finally {
                const saveBtn = document.getElementById('saveEditBtn');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
            }
        }

        function closeBuyerProfile() {
            document.getElementById('buyerProfileModal').classList.add('hidden');
            currentBuyerId = null;
        }`;

// Clean whitespaces to match
function clean(str) { return str.replace(/\s+/g, ' ').trim(); }

if (clean(content).includes(clean(oldJs))) {
    // We'll use a more manual replacement to preserve formatting as much as possible
    // but the clean approach is better for matching
    content = content.split(oldJs).join(newJs);
} else {
    // Fallback search
    console.log("Could not find exact JS block, trying partial...");
    content = content.replace(/\/\/ ---- Buyer Profile Modal ----[\s\S]+?function closeBuyerProfile\(\) \{[\s\S]+?\}/, newJs);
}

// 2. Replace Modal HTML
const oldHtml = `    <!-- BUYER PROFILE MODAL -->
    <div id="buyerProfileModal"
        class="fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-lg"
        onclick="if(event.target===this)closeBuyerProfile()">
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-2 border-slate-200 animate-[slideUp_0.3s_ease-out]">
            <div class="px-6 py-5 border-b-2 border-slate-100 flex items-center justify-between">
                <h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
                    <i class="fas fa-building text-blue-600"></i> Buyer Profile
                </h2>
                <button onclick="closeBuyerProfile()"
                    class="h-9 w-9 rounded-xl border-2 border-slate-300 flex items-center justify-center hover:bg-slate-50">
                    <i class="fas fa-times text-slate-700"></i>
                </button>
            </div>
            <div class="px-6 py-5 space-y-4">
                <div class="flex items-center justify-between">
                    <h3 id="modalBuyerName" class="text-2xl font-black text-slate-900">—</h3>
                    <span id="modalBuyerStatus" class="text-sm font-black text-emerald-700">—</span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p class="text-[10px] text-slate-500 font-semibold mb-1">Phone</p>
                        <p id="modalBuyerPhone" class="font-black text-slate-900">—</p>
                    </div>
                    <div class="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p class="text-[10px] text-slate-500 font-semibold mb-1">Email</p>
                        <p id="modalBuyerEmail" class="font-black text-slate-900">—</p>
                    </div>
                    <div class="rounded-xl bg-slate-50 p-3 border border-slate-100 col-span-2">
                        <p class="text-[10px] text-slate-500 font-semibold mb-1">Address</p>
                        <p id="modalBuyerAddress" class="font-black text-slate-900">—</p>
                    </div>
                    <div class="col-span-2 mt-1" id="modalBuyerDocContainer">
                        <!-- Aadhaar/Doc button injected via JS -->
                    </div>
                </div>
                <div class="grid grid-cols-4 gap-2">
                    <div class="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                        <p class="text-[9px] text-blue-600 font-bold mb-1">Orders</p>
                        <p id="modalBuyerOrders" class="font-black text-blue-700">—</p>
                    </div>
                    <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                        <p class="text-[9px] text-emerald-600 font-bold mb-1">Qty</p>
                        <p id="modalBuyerQty" class="font-black text-emerald-700">—</p>
                    </div>
                    <div class="rounded-xl bg-sky-50 border border-sky-100 p-3 text-center">
                        <p class="text-[9px] text-sky-600 font-bold mb-1">Value</p>
                        <p id="modalBuyerValue" class="font-black text-sky-700">—</p>
                    </div>
                    <div class="rounded-xl bg-rose-50 border border-rose-100 p-3 text-center">
                        <p class="text-[9px] text-rose-600 font-bold mb-1">Pending</p>
                        <p id="modalBuyerOutstanding" class="font-black text-rose-700">—</p>
                    </div>
                </div>
            </div>
            <div class="px-6 py-4 border-t-2 border-slate-100 flex justify-end">
                <button onclick="closeBuyerProfile()"
                    class="inline-flex items-center rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 transition-all">Close</button>
            </div>
        </div>
    </div>`;

const newHtml = `    <!-- BUYER PROFILE MODAL -->
    <div id="buyerProfileModal"
        class="fixed inset-0 z-50 hidden flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-lg"
        onclick="if(event.target===this)closeBuyerProfile()">
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-2 border-slate-200 animate-[slideUp_0.3s_ease-out]">
            <div class="px-6 py-5 border-b-2 border-slate-100 flex items-center justify-between">
                <h2 class="text-xl font-black text-slate-900 flex items-center gap-2">
                    <i class="fas fa-building text-blue-600"></i> Buyer Profile
                </h2>
                <div class="flex items-center gap-2">
                    <button id="toggleEditBtn" onclick="toggleBuyerEdit()"
                        class="h-9 px-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-xs font-black text-blue-700 hover:bg-blue-100 transition-all">
                        <i class="fas fa-edit mr-2"></i>Edit
                    </button>
                    <button onclick="closeBuyerProfile()"
                        class="h-9 w-9 rounded-xl border-2 border-slate-300 flex items-center justify-center hover:bg-slate-50">
                        <i class="fas fa-times text-slate-700"></i>
                    </button>
                </div>
            </div>
            <div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scroll">
                <div class="flex items-center justify-between">
                    <div class="flex-1 mr-4">
                        <h3 id="view_businessName" class="text-2xl font-black text-slate-900">—</h3>
                        <input id="edit_businessName" type="text" class="hidden w-full text-xl font-black text-slate-900 border-b-2 border-blue-400 focus:outline-none" />
                    </div>
                    <span id="modalBuyerStatus" class="text-sm font-black text-emerald-700">—</span>
                </div>

                <!-- Basic Info -->
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p class="text-[10px] text-slate-500 font-semibold mb-1">Phone</p>
                        <span id="view_phone" class="font-black text-slate-900">—</span>
                        <input id="edit_phone" type="text" class="hidden w-full font-black text-slate-900 bg-transparent border-b border-blue-300 focus:outline-none" />
                    </div>
                    <div class="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p class="text-[10px] text-slate-500 font-semibold mb-1">Email</p>
                        <span id="view_email" class="font-black text-slate-900">—</span>
                        <input id="edit_email" type="text" class="hidden w-full font-black text-slate-900 bg-transparent border-b border-blue-300 focus:outline-none" />
                    </div>
                    <div class="rounded-xl bg-slate-50 p-3 border border-slate-100 col-span-2">
                        <p class="text-[10px] text-slate-500 font-semibold mb-1">Address</p>
                        <span id="view_address" class="font-black text-slate-900">—</span>
                        <input id="edit_address" type="text" class="hidden w-full font-black text-slate-900 bg-transparent border-b border-blue-300 focus:outline-none" />
                    </div>
                </div>

                <!-- Bank Info -->
                <div class="rounded-2xl border-2 border-slate-100 p-4 bg-slate-50/50">
                    <p class="text-[11px] uppercase tracking-wider text-slate-900 font-black mb-3 flex items-center gap-2">
                        <i class="fas fa-university text-blue-600"></i> Bank Information
                    </p>
                    <div class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <p class="text-[9px] text-slate-500 font-bold mb-0.5">Holder Name</p>
                                <span id="view_bankHolder" class="text-xs font-black text-slate-800">—</span>
                                <input id="edit_bankHolder" type="text" class="hidden w-full text-xs font-black text-slate-800 bg-transparent border-b border-blue-300 focus:outline-none" />
                            </div>
                            <div>
                                <p class="text-[9px] text-slate-500 font-bold mb-0.5">Bank Name</p>
                                <span id="view_bankName" class="text-xs font-black text-slate-800">—</span>
                                <input id="edit_bankName" type="text" class="hidden w-full text-xs font-black text-slate-800 bg-transparent border-b border-blue-300 focus:outline-none" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <p class="text-[9px] text-slate-500 font-bold mb-0.5" title="Account Number">A/C No</p>
                                <span id="view_accountNumber" class="text-xs font-black text-slate-800 uppercase">—</span>
                                <input id="edit_accountNumber" type="text" class="hidden w-full text-xs font-black text-slate-800 bg-transparent border-b border-blue-300 focus:outline-none" />
                            </div>
                            <div>
                                <p class="text-[9px] text-slate-500 font-bold mb-0.5">IFSC Code</p>
                                <span id="view_ifscCode" class="text-xs font-black text-slate-800 uppercase">—</span>
                                <input id="edit_ifscCode" type="text" class="hidden w-full text-xs font-black text-slate-800 bg-transparent border-b border-blue-300 focus:outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-4 gap-2">
                    <div class="rounded-xl bg-blue-50 border border-blue-100 p-2 text-center">
                        <p class="text-[8px] text-blue-600 font-bold mb-1">Orders</p>
                        <p id="modalBuyerOrders" class="text-xs font-black text-blue-700">—</p>
                    </div>
                    <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-2 text-center">
                        <p class="text-[8px] text-emerald-600 font-bold mb-1">Qty</p>
                        <p id="modalBuyerQty" class="text-xs font-black text-emerald-700">—</p>
                    </div>
                    <div class="rounded-xl bg-sky-50 border border-sky-100 p-2 text-center">
                        <p class="text-[8px] text-sky-600 font-bold mb-1">Value</p>
                        <p id="modalBuyerValue" class="text-xs font-black text-sky-700">—</p>
                    </div>
                    <div class="rounded-xl bg-rose-50 border border-rose-100 p-2 text-center">
                        <p class="text-[8px] text-rose-600 font-bold mb-1">Pending</p>
                        <p id="modalBuyerOutstanding" class="text-xs font-black text-rose-700">—</p>
                    </div>
                </div>

                <div id="modalBuyerDocContainer" class="pt-1">
                    <!-- Aadhaar/Doc button injected via JS -->
                </div>
            </div>
            <div class="px-6 py-4 border-t-2 border-slate-100 flex justify-between gap-3">
                <button onclick="closeBuyerProfile()"
                    class="flex-1 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 transition-all">Close</button>
                <button id="saveEditBtn" onclick="saveBuyerEdit()"
                    class="hidden flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-500/20 transition-all">
                    <i class="fas fa-save mr-2"></i>Save Changes
                </button>
            </div>
        </div>
    </div>`;

if (clean(content).includes(clean(oldHtml))) {
    content = content.replace(oldHtml, newHtml);
} else {
    console.log("Could not find exact HTML block, trying partial...");
    content = content.replace(/<!-- BUYER PROFILE MODAL -->[\s\S]+?<\/div>[\s\S]+?<\/div>[\s\S]+?<\/div>/, newHtml);
}

fs.writeFileSync(filePath, content);
console.log('SUCCESS');
