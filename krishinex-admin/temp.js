
    const AUTH_TOKEN = localStorage.getItem('employeeToken');

    /**
     * Helper to fix absolute URLs that might have incorrect IP/Port
     * by replacing the host part with the one from API_BASE.
     */
    function fixImageUrl(url) {
      if (!url || url === 'undefined' || url === 'null' || url === 'none') return '';
      const imgHost = window.IMAGE_BASE || 'https://demo.ranx24.com';
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          const targetHost = new URL(imgHost).host;
          return url.replace(/^(https?:\/\/)[^\/]+/, `$1${targetHost}`);
        } catch (e) {
          return url;
        }
      }
      const cleanPath = url.startsWith('/') ? url : '/' + url;
      return `${imgHost.replace(/\/+$/, '')}${cleanPath.replace(/\\/g, '/')}`;
    }

    let currentRequestId = null;
    let currentProfileUserId = null;
    let selectedBuyerId = null;
    let allFarmers = [];
    let allCropRequests = [];
    let allBuyerPartners = [];
    let assignments = JSON.parse(localStorage.getItem('krishinex-assignments') || '{}');

    // --- Sidebar Logic ---
    function toggleSidebar(force) {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('mobile-backdrop');
      const hamburger = document.getElementById('hamburger');
      const isOpen = !sidebar.classList.contains('-translate-x-full');
      if (force === false || (isOpen && force === undefined)) {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
        hamburger?.setAttribute('aria-pressed', 'false');
      } else {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
        hamburger?.setAttribute('aria-pressed', 'true');
      }
    }

    function openAssignModal(orderId) {
      closeUserProfile(); // Prevent modal conflict
      const req = allCropRequests.find(r => r._id === orderId);
      if (!req) { showToast('Request not found', 'warning'); return; }

      currentRequestId = orderId;
      selectedBuyerId = null;

      document.getElementById('modalFarmerName').textContent = req.farmerName || 'Unknown';
      document.getElementById('modalLocation').textContent = req.location || 'N/A';
      document.getElementById('modalCrop').textContent = req.crop || '---';
      document.getElementById('modalQuantity').textContent = req.quantity || '0';
      const rateTxt = document.getElementById('modalRate');
      rateTxt.textContent = req.pricePerQuintal > 0 ? `â‚¹${req.pricePerQuintal}/Q` : 'â€”';
      document.getElementById('modalEditPrice').value = req.pricePerQuintal || '';

      document.getElementById('modalDistance').textContent = Math.floor(Math.random() * 15) + 5;

      const buyerInfo = document.getElementById('selectedBuyerInfo');
      const assignBtn = document.getElementById('assignBtn');
      const buyerMatchSection = document.getElementById('buyerMatchSection');

      if (req.status !== 'pending' && req.assignedBuyer) {
        // Already Assigned Header Info
        document.getElementById('selectedBuyerName').textContent = `${req.assignedBuyer.name} (${req.assignedBuyer.location || 'N/A'})`;
        buyerInfo.classList.remove('hidden');
        assignBtn.disabled = true;
        assignBtn.innerHTML = `<i class="fas fa-check-double mr-2"></i> Already Assigned`;
        // SHOW buyerMatchSection even if assigned to ALLOW RE-ASSIGNMENT
        buyerMatchSection.classList.remove('hidden');
        populateBuyerList();
      } else {
        // New assignment
        buyerInfo.classList.add('hidden');
        buyerMatchSection.classList.remove('hidden');
        assignBtn.disabled = true;
        assignBtn.innerHTML = `<i class="fas fa-link mr-2"></i> Assign Buyer`;
        populateBuyerList();
      }

      document.getElementById('assignModal').classList.remove('hidden');
    }

    function closeAssignModal() {
      document.getElementById('assignModal').classList.add('hidden');
    }

    let currentDetailFarmerId = null;

    function openCropDetailsModal(orderId) {
      closeUserProfile(); // Prevent modal conflict
      closeAssignModal();
      const req = allCropRequests.find(r => r._id === orderId);
      if (!req) { showToast('Request not found', 'warning'); return; }

      currentDetailFarmerId = req.farmerId;

      // ID & Metadata
      const shortId = req._id ? req._id.toString().substring(req._id.length - 6).toUpperCase() : 'N/A';
      document.getElementById('detailRequestId').textContent = `#${shortId} (${req._id})`;

      const sourceBadge = document.getElementById('detailSourceBadge');
      sourceBadge.textContent = req.source === 'sell-request' ? 'Direct Sell' : 'Assigned Order';
      sourceBadge.className = req.source === 'sell-request'
        ? 'mt-1 inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'mt-1 inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase bg-sky-50 text-sky-700 border border-sky-200';

      // Date
      const dateStr = req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
      document.getElementById('detailCreatedDate').textContent = dateStr;

      // Payment Mode
      document.getElementById('detailPaymentMode').textContent = req.payment || 'COD';

      // Status Badge
      const statusBadge = document.getElementById('detailStatusBadge');
      statusBadge.textContent = req.status;
      statusBadge.className = 'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase border-2';
      if (req.status === 'pending') {
        statusBadge.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-700');
      } else if (req.status === 'accepted' || req.status === 'in-progress') {
        statusBadge.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
      } else if (req.status === 'completed') {
        statusBadge.classList.add('bg-sky-50', 'border-sky-200', 'text-sky-700');
      } else if (req.status === 'cancelled') {
        statusBadge.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
      } else {
        statusBadge.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-600');
      }

      // Farmer Info
      document.getElementById('detailFarmerNameSpan').textContent = req.farmerName || 'Unknown';
      document.getElementById('detailFarmerPhone').textContent = req.farmerPhone || 'N/A';
      document.getElementById('detailLocation').textContent = req.location || 'N/A';

      // Crop Info
      document.getElementById('detailCropName').textContent = req.crop || '---';
      document.getElementById('detailVariety').textContent = req.variety || 'â€”';
      document.getElementById('detailQuantity').textContent = req.quantity || 'â€”';
      document.getElementById('detailMoisture').textContent = req.moisture ? `${req.moisture}%` : 'â€”';
      document.getElementById('detailBagCount').textContent = req.bagCount || 'â€”';

      // Pricing & Transaction details
      document.getElementById('detailExpectedPrice').textContent = req.expectedPrice || 'â€”';

      const agreedPrice = req.pricePerQuintal > 0 ? req.pricePerQuintal : (req.adminPrice || 0);
      document.getElementById('detailAgreedPrice').textContent = agreedPrice > 0 ? `â‚¹${agreedPrice}/Q` : 'â€”';

      // Calculate Gross, Commission, and Payout
      let qtyInQuintals = 0;
      const qtyStr = req.quantity || '';
      const matchQuintal = qtyStr.match(/\(([\d.]+)\s*Quintal/i) || qtyStr.match(/([\d.]+)\s*Q/i) || qtyStr.match(/([\d.]+)\s*Quintals/i);
      if (matchQuintal) {
        qtyInQuintals = parseFloat(matchQuintal[1]) || 0;
      } else {
        const matchKg = qtyStr.match(/([\d.]+)\s*KG/i);
        if (matchKg) {
          qtyInQuintals = (parseFloat(matchKg[1]) || 0) / 100;
        } else {
          qtyInQuintals = parseFloat(qtyStr) || 0;
        }
      }
      const grossAmount = req.amount || (agreedPrice * qtyInQuintals) || 0;
      document.getElementById('detailGrossAmount').textContent = grossAmount > 0 ? `â‚¹${grossAmount.toLocaleString('en-IN')}` : 'â€”';

      const commRate = req.commissionRate || 0;
      document.getElementById('detailCommissionLabel').textContent = `Commission (${commRate}%)`;
      const commAmount = req.commission || Math.round((grossAmount * commRate) / 100);
      document.getElementById('detailCommissionAmount').textContent = commAmount > 0 ? `â‚¹${commAmount.toLocaleString('en-IN')}` : 'â‚¹0';

      const netPayout = req.farmerAmount || (grossAmount - commAmount);
      document.getElementById('detailFarmerPayout').textContent = netPayout > 0 ? `â‚¹${netPayout.toLocaleString('en-IN')}` : 'â€”';

      // Assigned Buyer Card
      const buyerEmpty = document.getElementById('detailBuyerInfoEmpty');
      const buyerBody = document.getElementById('detailBuyerInfoBody');
      if (req.assignedBuyer) {
        buyerEmpty.classList.add('hidden');
        buyerBody.classList.remove('hidden');
        document.getElementById('detailBuyerName').textContent = req.assignedBuyer.name || 'Unknown';
        document.getElementById('detailBuyerPhone').textContent = req.assignedBuyer.phone || 'N/A';
      } else {
        buyerEmpty.classList.remove('hidden');
        buyerBody.classList.add('hidden');
      }

      // Description / Notes
      let displayNote = req.note || 'No notes provided by farmer.';
      if (displayNote.toLowerCase() === 'na' || displayNote.trim() === '') {
        displayNote = 'No notes provided by farmer.';
      }
      document.getElementById('detailNotes').textContent = displayNote;

      // Photo Gallery
      const photoCard = document.getElementById('detailPhotosCard');
      const photoList = document.getElementById('detailPhotosList');
      photoList.innerHTML = '';
      const images = (req.images && req.images.length > 0) ? req.images : (req.imageUrl ? [req.imageUrl] : []);
      if (images.length === 0) {
        photoCard.classList.add('hidden');
      } else {
        photoCard.classList.remove('hidden');
        images.forEach((img, idx) => {
          const fixed = fixImageUrl(img);
          const galleryJson = JSON.stringify(images.map(i => fixImageUrl(i))).replace(/"/g, '&quot;');
          const btn = document.createElement('button');
          btn.className = 'relative h-16 w-16 rounded-xl bg-slate-100 hover:scale-105 border-2 border-slate-200 flex items-center justify-center transition-all overflow-hidden shadow-sm';
          btn.onclick = () => viewPhoto(fixed, JSON.parse(galleryJson.replace(/&quot;/g, '"')), idx);
          btn.innerHTML = `
              <img src="${fixed}" class="h-full w-full object-cover" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden')">
              <i class="fas fa-image text-slate-400 text-lg hidden"></i>
            `;
          photoList.appendChild(btn);
        });
      }

      // Cancel Reason
      const cancelReasonArea = document.getElementById('detailCancelReasonArea');
      if (req.status === 'cancelled' && req.cancelReason) {
        cancelReasonArea.classList.remove('hidden');
        document.getElementById('detailCancelReason').textContent = req.cancelReason;
      } else {
        cancelReasonArea.classList.add('hidden');
      }

      // Footer Action Button
      const assignActionBtn = document.getElementById('detailAssignActionBtn');
      if (req.status === 'pending') {
        assignActionBtn.classList.remove('hidden');
        assignActionBtn.onclick = () => {
          closeCropDetailsModal();
          openAssignModal(orderId);
        };
      } else {
        assignActionBtn.classList.add('hidden');
      }

      document.getElementById('cropDetailsModal').classList.remove('hidden');
    }

    function closeCropDetailsModal() {
      document.getElementById('cropDetailsModal').classList.add('hidden');
    }

    function viewFarmerFromDetails() {
      if (currentDetailFarmerId) {
        closeCropDetailsModal();
        viewUserProfileV360(currentDetailFarmerId);
      }
    }



    function viewUserProfileV360(farmerId) {
      closeAssignModal(); // Prevent modal conflict
      if (!farmerId || farmerId === 'null' || farmerId === 'undefined') {
        showToast('User profile not found in cache', 'warning');
        return;
      }

      currentProfileUserId = farmerId;

      if (!allFarmers || allFarmers.length === 0) {
        showToast('Farmers list not loaded yet. Please wait.', 'info');
        return;
      }

      const farmer = allFarmers.find(f => f._id === farmerId);
      if (!farmer) {
        showToast('Loading full profile...', 'info');
        // Fallback: search by phone if ID fails (if phone is unique)
        console.warn('Farmer not found for ID in cache:', farmerId);
        return;
      }

      // Clear previous modal state
      document.getElementById('p-photo').innerHTML = '';

      // Populate Header Info (Inputs)
      document.getElementById('profileNameInput').value = farmer.name || '';
      document.getElementById('profileId').textContent = `Farmer ID: ${farmer._id}`;

      // Profile Photo
      const photoDiv = document.getElementById('p-photo');
      if (farmer.profilePhotoUrl) {
        const fixedUrl = fixImageUrl(farmer.profilePhotoUrl);
        photoDiv.innerHTML = `<img src="${fixedUrl}" class="h-full w-full object-cover" />`;
      } else {
        photoDiv.innerHTML = `<i class="fas fa-user text-emerald-600 text-5xl"></i>`;
      }

      // Status Badge
      const statusBadge = document.getElementById('profileStatusBadge');
      if (farmer.status === 'approved') {
        statusBadge.innerHTML = `<span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 border border-emerald-200"><i class="fas fa-circle-check mr-1 text-[8px]"></i> Active / Verified</span>`;
      } else if (farmer.status === 'blocked') {
        statusBadge.innerHTML = `<span class="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-700 border border-rose-200"><i class="fas fa-ban mr-1 text-[8px]"></i> Blocked</span>`;
      } else {
        statusBadge.innerHTML = `<span class="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700 border border-amber-200"><i class="fas fa-clock mr-1 text-[8px]"></i> Pending Approval</span>`;
      }

      // Contact & Misc (Inputs)
      document.getElementById('profileMobileInput').value = farmer.phone || '';
      document.getElementById('profileEmailInput').value = farmer.email || '';
      document.getElementById('profileLocationInput').value = farmer.location || '';

      document.getElementById('profileWallet').textContent = `â‚¹${(farmer.walletBalance || 0).toLocaleString()}`;
      document.getElementById('profileWalletId').textContent = farmer.walletNumber || 'NONE';

      // Reset wallet action fields
      document.getElementById('walletActionAmount').value = '';
      document.getElementById('walletActionNote').value = '';
      setWalletTxType('Credit');

      // Fetch Full History
      fetchUserFullHistory(farmerId);


      document.getElementById('profileTotalOrders').textContent = farmer.totalOrders || 0;

      // Render Farmer KYC Document Cards Grid
      const fixDocUrl = (u) => {
        if (!u || typeof u !== 'string') return null;
        const clean = u.trim();
        if (!clean || clean === 'undefined' || clean === 'null' || clean === 'none' || clean.includes('undefined')) return null;
        return fixImageUrl(clean);
      };

      const docs = [
        {
          key: 'aadhaarFront',
          title: 'Aadhaar Card (Front)',
          icon: 'fas fa-id-card text-emerald-600',
          number: farmer.aadhaarNumber ? `Aadhaar: ${farmer.aadhaarNumber}` : 'Not Provided',
          url: fixDocUrl(farmer.aadhaarDocUrl || farmer.aadhaarFrontUrl || farmer.aadhaarFront)
        },
        {
          key: 'aadhaarBack',
          title: 'Aadhaar Card (Back)',
          icon: 'fas fa-id-card text-emerald-600',
          number: farmer.aadhaarNumber ? `Aadhaar: ${farmer.aadhaarNumber}` : 'Not Provided',
          url: fixDocUrl(farmer.aadhaarBackDocUrl || farmer.aadhaarBackUrl || farmer.aadhaarBack)
        },
        {
          key: 'panCard',
          title: 'PAN Card / ID Proof',
          icon: 'fas fa-address-card text-sky-600',
          number: farmer.panNumber ? `PAN: ${farmer.panNumber}` : 'Not Provided',
          url: fixDocUrl(farmer.panDocUrl || farmer.panCardUrl || farmer.panDoc)
        }
      ];

      const grid = document.getElementById('farmerKycDocsGrid');
      if (grid) {
        grid.innerHTML = docs.map(d => {
          const hasUrl = !!d.url;
          return `
            <div class="bg-slate-50/50 rounded-2xl border-2 border-slate-200 p-4 flex flex-col justify-between shadow-sm hover:border-emerald-400 transition-all">
              <div>
                <div class="flex justify-between items-start mb-3">
                  <div class="flex items-center gap-2.5">
                    <div class="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-base shrink-0 shadow-sm border border-slate-100">
                      <i class="${d.icon}"></i>
                    </div>
                    <div>
                      <h4 class="text-xs font-black text-slate-900">${d.title}</h4>
                      <p class="text-[10px] text-slate-500 font-semibold truncate max-w-[130px]">${d.number}</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${hasUrl ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}">
                    ${hasUrl ? '<i class="fas fa-check-circle mr-1"></i> Uploaded' : '<i class="fas fa-times-circle mr-1"></i> Missing'}
                  </span>
                </div>

                ${hasUrl ? `
                  <div class="h-32 w-full rounded-xl bg-slate-900 overflow-hidden border border-slate-200 relative group mb-3 cursor-pointer shadow-inner" onclick="openDocViewer('${d.title}', '${d.url}', '${d.key}')">
                    <img src="${d.url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'h-full w-full bg-slate-900 flex flex-col items-center justify-center text-slate-300 p-2 text-center\\'><i class=\\'fas fa-file-excel text-2xl mb-1 text-emerald-400\\'></i><span class=\\'text-[10px] font-bold text-slate-200\\'>File Unavailable</span></div>';">
                    <div class="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 backdrop-blur-[2px]">
                      <i class="fas fa-search-plus text-lg text-emerald-400"></i>
                      <span>View Full Screen</span>
                    </div>
                  </div>
                ` : `
                  <div class="h-32 w-full rounded-xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 mb-3">
                    <i class="fas fa-file-circle-xmark text-2xl mb-1 text-slate-300"></i>
                    <span class="text-[10px] font-bold text-slate-500">Not Uploaded</span>
                  </div>
                `}
              </div>

              <div class="flex gap-2 pt-2 border-t border-slate-200">
                ${hasUrl ? `
                  <button type="button" onclick="openDocViewer('${d.title}', '${d.url}', '${d.key}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer">
                    <i class="fas fa-eye"></i> View
                  </button>
                  <button type="button" onclick="rejectPartnerDocument('${farmer._id}', '${d.key}', '${d.title}')" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black rounded-xl border border-rose-200 flex items-center justify-center transition-all cursor-pointer" title="Reject Document for Re-upload">
                    <i class="fas fa-trash-alt mr-1"></i> Reject
                  </button>
                ` : `
                  <button disabled class="w-full bg-slate-100 text-slate-400 text-[10px] font-bold py-2 rounded-xl cursor-not-allowed">
                    No Document Attached
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      }

      // Bank Details (Inputs)
      const bank = farmer.bankDetails || {};
      document.getElementById('bankHolderInput').value = bank.holderName || '';
      document.getElementById('bankNameInput').value = bank.bankName || '';
      document.getElementById('bankAccInput').value = bank.accountNumber || '';
      document.getElementById('bankIfscInput').value = bank.ifscCode || '';

      // Credit Limit

      const available = (farmer.creditLimit || 0) - (farmer.creditUsed || 0);
      document.getElementById('profileAvailableCredit').textContent = `â‚¹${available.toLocaleString()}`;
      document.getElementById('modalCreditLimitInput').value = farmer.creditLimit || 0;

      document.getElementById('profileCardNumber').textContent = farmer.cardNumber || 'NOT GENERATED';
      const inputDiv = document.getElementById('manualCardInputDiv');
      const generateBtn = document.getElementById('generateCardBtn');
      currentProfileUserId = farmerId;

      const hasCard = !!farmer.cardNumber;
      if (inputDiv) inputDiv.classList.remove('hidden');
      if (document.getElementById('manualCardNumber')) {
        document.getElementById('manualCardNumber').value = '';
        document.getElementById('manualCardNumber').placeholder = hasCard ? 'Enter new 16-digit number' : 'Enter 16-digit card number';
      }

      const btnHtml = hasCard
        ? '<i class="fas fa-sync-alt mr-2"></i> Regenerate Card Number'
        : '<i class="fas fa-credit-card mr-2"></i> Generate Card Number';

      if (generateBtn) {
        generateBtn.classList.remove('hidden');
        generateBtn.innerHTML = btnHtml;
      }

      const cardSecGenerateBtn = document.getElementById('cardSecGenerateBtn');
      if (cardSecGenerateBtn) {
        cardSecGenerateBtn.classList.remove('hidden');
        cardSecGenerateBtn.innerHTML = btnHtml;
      }

      document.getElementById('userProfileModalV360').classList.remove('hidden');
    }

    async function generateUserCard() {
      if (!currentProfileUserId) return;
      const manualNum = document.getElementById('manualCardNumber').value.trim();
      const msg = manualNum ? `Save custom card number: ${manualNum}?` : 'Generate a unique random card number for this user?';
      if (!confirm(msg)) return;

      try {
        const res = await fetch(`${API_BASE}/employee/admin/generate-card/${currentProfileUserId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cardNumber: manualNum })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Card number assigned: ' + data.cardNumber, 'success');
          // Update local state and UI
          const farmer = allFarmers.find(f => f._id === currentProfileUserId);
          if (farmer) farmer.cardNumber = data.cardNumber;
          document.getElementById('profileCardNumber').textContent = data.cardNumber;
          document.getElementById('generateCardBtn').classList.add('hidden');
          fetchFarmers(); // Refresh table
        } else {
          showToast(data.error || 'Failed to assign card', 'warning');
        }
      } catch (e) {
        showToast('Network error', 'warning');
      }
    }

    function closeUserProfile() {
      document.getElementById('userProfileModalV360').classList.add('hidden');
    }

    async function blockUser(userId, userName) {
      if (!confirm(`Block ${userName}?`)) return;
      try {
        const res = await fetch(`${API_BASE}/employee/admin/block/${userId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast(`${userName} blocked`, 'info');
          fetchFarmers();
        } else {
          showToast(data.error || 'Access Denied: You are not eligible for this action', 'warning');
        }
      } catch (e) {
        showToast('Network error', 'warning');
      }
    }

    function activateWallet(userId) {
      showToast('Wallet activation request sent', 'success');
      setTimeout(() => location.reload(), 1500);
    }

    let currentGallery = [];
    let currentGalleryIndex = 0;

    function viewPhoto(url, gallery = [], index = 0) {
      currentGallery = gallery;
      currentGalleryIndex = index;

      const img = document.getElementById('photoModalImg');
      const nav = document.getElementById('galleryNav');
      const counter = document.getElementById('photoCounterLabel');

      img.src = url;

      if (gallery.length > 1) {
        nav.classList.remove('hidden');
        counter.classList.remove('hidden');
        updateGalleryUI();
      } else {
        nav.classList.add('hidden');
        counter.classList.add('hidden');
      }

      document.getElementById('photoModal').classList.remove('hidden');
    }

    function updateGalleryUI() {
      const img = document.getElementById('photoModalImg');
      const counter = document.getElementById('photoCounterLabel');
      img.src = currentGallery[currentGalleryIndex];
      counter.textContent = `IMAGE ${currentGalleryIndex + 1} / ${currentGallery.length}`;
    }

    function nextPhoto() {
      if (!currentGallery.length) return;
      currentGalleryIndex = (currentGalleryIndex + 1) % currentGallery.length;
      updateGalleryUI();
    }

    function prevPhoto() {
      if (!currentGallery.length) return;
      currentGalleryIndex = (currentGalleryIndex - 1 + currentGallery.length) % currentGallery.length;
      updateGalleryUI();
    }

    function closePhotoModal() {
      document.getElementById('photoModal').classList.add('hidden');
    }

    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      const toastMessage = document.getElementById('toastMessage');

      let bgColor = 'bg-white';
      let borderColor = 'border-slate-300';
      let textColor = 'text-slate-900';

      if (type === 'success') {
        bgColor = 'bg-gradient-to-r from-emerald-50 to-emerald-100';
        borderColor = 'border-emerald-300';
        textColor = 'text-emerald-900';
      } else if (type === 'warning') {
        bgColor = 'bg-gradient-to-r from-amber-50 to-amber-100';
        borderColor = 'border-amber-300';
        textColor = 'text-amber-900';
      } else if (type === 'info') {
        bgColor = 'bg-gradient-to-r from-sky-50 to-sky-100';
        borderColor = 'border-sky-300';
        textColor = 'text-sky-900';
      }

      toast.className = `fixed bottom-6 right-6 z-[99999] rounded-2xl border-2 px-6 py-4 shadow-2xl animate-[slideInRight_0.3s_ease-out] ${bgColor} ${borderColor}`;
      toastMessage.className = `text-sm font-bold ${textColor}`;
      toastMessage.textContent = message;
    function filterCropRequests() {
      fetchCropRequests(1, false);
    }

    function filterUsers() {
      fetchFarmers(1, false);
    }

    function exportCropRequests() {
      if (!allCropRequests.length) { showToast('No data to export', 'warning'); return; }
      const cropVal = document.getElementById('cropFilter')?.value || 'all';
      const statusVal = document.getElementById('cropStatusFilter')?.value || 'all';
      const rows = allCropRequests.filter(r =>
        (cropVal === 'all' || r.crop === cropVal) &&
        (statusVal === 'all' || r.status === statusVal)
      );
      const headers = ['Farmer', 'Phone', 'Location', 'Crop', 'Quantity (Q)', 'Rate (â‚¹/Q)', 'Status', 'Assigned Buyer', 'Date'];
      const csvRows = [headers.join(',')];
      rows.forEach(r => {
        csvRows.push([
          `"${r.farmerName}"`, r.farmerPhone, `"${r.location}"`, r.crop, r.quantity, r.pricePerQuintal,
          r.status, r.assignedBuyer ? `"${r.assignedBuyer.name}"` : '',
          new Date(r.createdAt).toLocaleDateString('en-GB')
        ].join(','));
      });
      downloadCSV(csvRows.join('\n'), 'crop_sell_requests.csv');
    }

    function exportFarmers() {
      if (!allFarmers.length) { showToast('No data to export', 'warning'); return; }
      const headers = ['Name', 'Phone', 'Email', 'Location', 'KYC Status', 'Status', 'Total Orders', 'Joined'];
      const csvRows = [headers.join(',')];
      allFarmers.forEach(f => {
        csvRows.push([
          `"${f.name}"`, f.phone, f.email, `"${f.location}"`,
          f.kycStatus, f.status, f.totalOrders,
          new Date(f.joinedAt).toLocaleDateString('en-GB')
        ].join(','));
      });
      downloadCSV(csvRows.join('\n'), 'farmers_list.csv');
    }

    function downloadCSV(content, filename) {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${filename}`, 'success');
    }



    let farmersPage = 1;
    let farmersHasMore = true;
    let farmersLoading = false;

    function appendFarmersRows(newItems) {
      const tbody = document.getElementById('usersTableBody');
      if (!tbody || !newItems || newItems.length === 0) return;
      const fragment = document.createDocumentFragment();
      newItems.forEach((farmer) => {
        const htmlStr = createFarmerRow(farmer);
        const temp = document.createElement('tbody');
        temp.innerHTML = htmlStr.trim();
        while (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
        }
      });
      tbody.appendChild(fragment);
    }

    async function fetchFarmers(page = 1, isAppend = false) {
      if (farmersLoading) return;
      farmersLoading = true;

      if (!isAppend) {
        farmersPage = 1;
        farmersHasMore = true;
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-semibold"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading farmers...</td></tr>`;
        }
      }

      const startDate = document.getElementById('globalStartDate')?.value || '';
      const endDate = document.getElementById('globalEndDate')?.value || '';
      const search = document.getElementById('userSearchInput')?.value || '';
      const status = document.getElementById('userStatusFilter')?.value || 'all';

      try {
        const res = await fetch(`${API_BASE}/employee/admin/farmers?startDate=${startDate}&endDate=${endDate}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page=${page}&limit=25`, {
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        const data = await res.json();
        if (res.ok) {
          let list = [];
          if (data && Array.isArray(data.data)) {
            list = data.data;
            farmersHasMore = data.hasMore;
            if (document.getElementById('stat-totalFarmers')) {
              document.getElementById('stat-totalFarmers').textContent = (data.total || 0).toLocaleString();
            }
          } else if (Array.isArray(data)) {
            list = data;
            farmersHasMore = false;
            if (document.getElementById('stat-totalFarmers')) {
              document.getElementById('stat-totalFarmers').textContent = data.length.toLocaleString();
            }
          }

          if (isAppend) {
            allFarmers = [...allFarmers, ...list];
            appendFarmersRows(list);
          } else {
            allFarmers = list;
            renderFarmersTable(allFarmers);
          }
        } else {
          console.error('Failed to load farmers:', data.error);
        }
      } catch (err) {
        console.error('Error loading farmers:', err);
      } finally {
        farmersLoading = false;
      }
    }

    function createFarmerRow(farmer) {
      const statusBadge = farmer.status === 'approved'
        ? `<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200"><i class="fas fa-circle-check mr-1 text-[8px]"></i> Active</span>`
        : farmer.status === 'blocked'
          ? `<span class="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 border border-rose-200"><i class="fas fa-ban mr-1 text-[8px]"></i> Blocked</span>`
          : `<span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-200"><i class="fas fa-clock mr-1 text-[8px]"></i> Pending</span>`;

      const kycBadge = farmer.kycStatus === 'verified'
        ? `<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200"><i class="fas fa-check-circle mr-1 text-[8px]"></i> Verified</span>`
        : `<span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-200"><i class="fas fa-clock mr-1 text-[8px]"></i> Pending</span>`;

      const isValidDoc = (u) => u && typeof u === 'string' && u.trim() !== '' && u !== 'undefined' && u !== 'null' && u !== 'none' && !u.includes('undefined');
      const hasDocs = isValidDoc(farmer.aadhaarDocUrl) || isValidDoc(farmer.aadhaarBackDocUrl) || isValidDoc(farmer.panDocUrl) || isValidDoc(farmer.profilePhotoUrl);

      const canManageUsers = (typeof window.hasPermission === 'function') ? window.hasPermission('users') : true;
      const actionBtn = !canManageUsers ? '' : (farmer.status === 'approved'
        ? `<button data-module="users" onclick="blockUser('${farmer._id}', '${farmer.name}')" class="w-full justify-center inline-flex items-center rounded-lg border-2 border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700 font-bold hover:bg-rose-100 transition-all"><i class="fas fa-ban mr-1"></i> Block</button>`
        : farmer.status === 'blocked'
          ? `<button data-module="users" onclick="unblockUser('${farmer._id}', '${farmer.name}')" class="w-full justify-center inline-flex items-center rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700 font-bold hover:bg-emerald-100 transition-all"><i class="fas fa-check mr-1"></i> Unblock</button>`
          : hasDocs
            ? `<button data-module="users" onclick="approveUser('${farmer._id}', '${farmer.name}')" class="w-full justify-center inline-flex items-center rounded-lg border-2 border-sky-200 bg-sky-50 px-2 py-1 text-[10px] text-sky-700 font-bold hover:bg-sky-100 transition-all"><i class="fas fa-check mr-1"></i> Approve</button>`
            : `<span class="w-full justify-center inline-flex items-center rounded-lg bg-slate-100 text-slate-400 px-1.5 py-1 text-[9px] font-bold border border-slate-200" title="Cannot approve: No KYC documents uploaded"><i class="fas fa-lock mr-1"></i> Doc Missing</span>`);

      return `<tr onclick="if(!event.target.closest('button')) viewUserProfileV360('${farmer._id}')" class="hover:bg-emerald-50/20 transition-colors border-b border-slate-100 user-row cursor-pointer" data-name="${(farmer.name || '').toLowerCase()}" data-phone="${(farmer.phone || '').toString().toLowerCase()}" data-location="${(farmer.location || '').toLowerCase()}" data-status="${farmer.status || 'pending'}">
        <td class="px-3 py-2.5">
          <div onclick="event.stopPropagation(); viewUserProfileV360('${farmer._id}')" 
            class="font-bold text-slate-900 cursor-pointer hover:text-emerald-600 hover:underline flex items-center gap-1.5 group/fn text-xs">
            ${farmer.name}
            <i class="fas fa-id-badge text-[10px] text-emerald-500 opacity-0 group-hover/fn:opacity-100 transition-opacity"></i>
          </div>
          <div class="text-[10px] text-slate-500">${new Date(farmer.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </td>
        <td class="px-3 py-2.5">
          <div class="font-semibold text-slate-900 text-xs">${farmer.phone}</div>
          <div class="text-[10px] text-slate-500 truncate max-w-[120px]">${farmer.email || 'No email'}</div>
        </td>
        <td class="px-3 py-2.5">
          <div class="font-semibold text-slate-900 text-xs truncate max-w-[150px]" title="${farmer.location || 'N/A'}">${farmer.location || 'N/A'}</div>
        </td>
        <td class="px-3 py-2.5">
          <div class="font-bold text-slate-900 text-xs">â‚¹${(farmer.walletBalance || 0).toLocaleString()}</div>
          <div class="text-[9px] text-slate-500 font-mono uppercase">${farmer.walletNumber || 'No ID'}</div>
        </td>
        <td class="px-3 py-2.5">
          <div class="font-black text-sky-700 text-xs">â‚¹${((farmer.creditLimit || 0) - (farmer.creditUsed || 0)).toLocaleString()}</div>
          <div class="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
              Limit: â‚¹${(farmer.creditLimit || 0).toLocaleString()} | Used: â‚¹${(farmer.creditUsed || 0).toLocaleString()}
          </div>
        </td>
        <td class="px-2 py-2.5">${kycBadge}</td>
        <td class="px-2 py-2.5">${statusBadge}</td>
        <td class="px-3 py-2.5 text-right">
          <div class="flex flex-col items-end gap-1 w-24 ml-auto">
            <button onclick="event.stopPropagation(); viewUserProfileV360('${farmer._id}')"
              class="w-full justify-center inline-flex items-center rounded-lg border-2 border-slate-200 px-2 py-1 text-[10px] text-slate-700 font-bold hover:bg-slate-50 transition-all group-hover:border-emerald-300">
              <i class="fas fa-eye mr-1 text-emerald-600"></i> View
            </button>
            ${actionBtn}
          </div>
        </td>
      </tr>`;
    }

    function renderFarmersTable(farmers) {
      window.progressiveRenderTable('usersTableBody', farmers, createFarmerRow, {
        chunkSize: 20,
        emptyHtml: '<tr><td colspan="8" class="text-center py-8 text-slate-400 font-semibold">No farmers registered yet.</td></tr>'
      });
    }

    async function approveUser(userId, name) {
      if (!confirm(`Approve farmer ${name}?`)) return;
      try {
        const res = await fetch(`${API_BASE}/employee/admin/approve/${userId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast(`${name} approved successfully`, 'success');
          fetchFarmers();
        } else {
          showToast(data.error || 'Access Denied: You are not eligible for this action', 'warning');
        }
      } catch (e) { showToast('Network error', 'warning'); }
    }

    async function updateCreditLimit() {
      if (!currentProfileUserId) return;
      const newLimit = document.getElementById('modalCreditLimitInput').value;
      if (!confirm(`Update seasonal credit limit to â‚¹${newLimit}?`)) return;

      try {
        const res = await fetch(`${API_BASE}/user/admin/credit/${currentProfileUserId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ creditLimit: parseFloat(newLimit) })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast(`Credit limit updated successfully`, 'success');
          // Update local state and UI
          const farmer = allFarmers.find(f => f._id === currentProfileUserId);
          if (farmer) farmer.creditLimit = parseFloat(newLimit);
          fetchFarmers(); // Refresh table
        } else {
          showToast(data.error || 'Access Denied: You are not eligible for this action', 'warning');
        }
      } catch (e) {
        showToast('Network error', 'warning');
      }
    }

    async function unblockUser(userId, name) {
      if (!confirm(`Unblock farmer ${name}?`)) return;
      try {
        const res = await fetch(`${API_BASE}/employee/admin/unblock/${userId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast(`${name} unblocked`, 'success');
          fetchFarmers();
        } else {
          showToast(data.error || 'Access Denied: You are not eligible for this action', 'warning');
        }
      } catch (e) { showToast('Network error', 'warning'); }
    }

    async function updateFarmerProfile() {
      if (!currentProfileUserId) return;

      const payload = {
        name: document.getElementById('profileNameInput').value.trim(),
        phone: document.getElementById('profileMobileInput').value.trim(),
        email: document.getElementById('profileEmailInput').value.trim(),
        address: document.getElementById('profileLocationInput').value.trim(),
        bankDetails: {
          holderName: document.getElementById('bankHolderInput').value.trim(),
          bankName: document.getElementById('bankNameInput').value.trim(),
          accountNumber: document.getElementById('bankAccInput').value.trim(),
          ifscCode: document.getElementById('bankIfscInput').value.trim()
        }
      };

      if (!payload.name || !payload.phone) {
        showToast('Name and Phone are required', 'warning');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/user/admin/profile/${currentProfileUserId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast('Farmer profile updated successfully', 'success');
          fetchFarmers(); // Refresh table
          // Update local cache to reflect changes in current modal view if needed
          const farmer = allFarmers.find(f => f._id === currentProfileUserId);
          if (farmer) Object.assign(farmer, payload);
        } else {
          const data = await res.json();
          showToast(data.error || 'Failed to update profile', 'warning');
        }
      } catch (e) {
        showToast('Network error', 'warning');
      }
    }

    async function fetchStats(startDate = document.getElementById('globalStartDate')?.value || '', endDate = document.getElementById('globalEndDate')?.value || '') {
      try {
        const res = await fetch(`${API_BASE}/employee/admin/farmers/stats?startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        if (res.ok) {
          const s = await res.json();
          document.getElementById('stat-totalFarmers').textContent = s.totalFarmers;
          document.getElementById('stat-walletActive').textContent = s.activeFarmers;
          document.getElementById('stat-walletInactive').textContent = s.pendingFarmers;
          document.getElementById('stat-newRequests').textContent = s.newRequests;
          document.getElementById('stat-assigned').textContent = s.assigned;
          document.getElementById('stat-completed').textContent = s.completed;
          if (document.getElementById('stat-approvedWalletAmt') && s.approvedWalletAmt !== undefined) {
            document.getElementById('stat-approvedWalletAmt').textContent = 'â‚¹' + Math.round(s.approvedWalletAmt).toLocaleString('en-IN');
          }
          if (document.getElementById('stat-pendingWalletAmt') && s.pendingWalletAmt !== undefined) {
            document.getElementById('stat-pendingWalletAmt').textContent = 'â‚¹' + Math.round(s.pendingWalletAmt).toLocaleString('en-IN');
          }
        }
      } catch (e) { console.warn('Stats fetch failed, using fallback counts from farmers list'); }
    }

    function updateCropKpiCards(list) {
      const data = list || allCropRequests || [];
      const newCount = data.filter(r => r.status === 'pending').length;
      const assignedCount = data.filter(r => r.status === 'accepted' || r.status === 'in-progress').length;
      const completedCount = data.filter(r => r.status === 'completed').length;

      const elNew = document.getElementById('stat-newRequests');
      const elAssigned = document.getElementById('stat-assigned');
      const elCompleted = document.getElementById('stat-completed');

      if (elNew) elNew.textContent = newCount;
      if (elAssigned) elAssigned.textContent = assignedCount;
      if (elCompleted) elCompleted.textContent = completedCount;
    }

    function updateCropFilterDropdown(requests) {
      const select = document.getElementById('cropFilter');
      if (!select || !requests) return;
      const currentVal = select.value;
      const crops = Array.from(new Set(requests.map(r => r.crop).filter(Boolean))).sort();
      if (crops.length > 0) {
        select.innerHTML = '<option value="all">All Crops</option>' + crops.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
      }
    }

    let cropRequestsPage = 1;
    let cropRequestsHasMore = true;
    let cropRequestsLoading = false;

    function appendCropRequestRows(newItems) {
      const tbody = document.getElementById('cropRequestsTbody');
      if (!tbody || !newItems || newItems.length === 0) return;
      const fragment = document.createDocumentFragment();
      newItems.forEach((req) => {
        const htmlStr = createCropRequestRow(req);
        const temp = document.createElement('tbody');
        temp.innerHTML = htmlStr.trim();
        while (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
        }
      });
      tbody.appendChild(fragment);
    }

    async function fetchCropRequests(page = 1, isAppend = false) {
      if (cropRequestsLoading) return;
      cropRequestsLoading = true;

      if (!isAppend) {
        cropRequestsPage = 1;
        cropRequestsHasMore = true;
        const tbody = document.getElementById('cropRequestsTbody');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="8" class="text-center py-20"><div class="animate-pulse flex flex-col items-center"><div class="h-12 w-12 bg-slate-100 rounded-full mb-4"></div><div class="h-2 w-32 bg-slate-100 rounded"></div></div></td></tr>`;
        }
      }

      const startDate = document.getElementById('globalStartDate')?.value || '';
      const endDate = document.getElementById('globalEndDate')?.value || '';
      const search = document.getElementById('cropSearchInput')?.value || '';
      const status = document.getElementById('cropStatusFilter')?.value || 'all';
      const crop = document.getElementById('cropFilter')?.value || 'all';

      try {
        const res = await fetch(`${API_BASE}/employee/admin/crop-requests?startDate=${startDate}&endDate=${endDate}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&crop=${encodeURIComponent(crop)}&page=${page}&limit=25`, {
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        if (res.ok) {
          const data = await res.json();
          let list = [];
          if (data && Array.isArray(data.data)) {
            list = data.data;
            cropRequestsHasMore = data.hasMore;
          } else if (Array.isArray(data)) {
            list = data;
            cropRequestsHasMore = false;
          }

          if (isAppend) {
            allCropRequests = [...allCropRequests, ...list];
            appendCropRequestRows(list);
          } else {
            allCropRequests = list;
            renderCropRequests(allCropRequests, true);
          }

          updateCropFilterDropdown(allCropRequests);
        }
      } catch (e) {
        console.error('Crop requests fetch error:', e);
      } finally {
        cropRequestsLoading = false;
      }
    }

    function createCropRequestRow(req) {
      const statusBadge = req.status === 'pending'
        ? `<span class="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700 border-2 border-amber-200"><i class="fas fa-circle-dot mr-1 text-[8px]"></i> New</span>`
        : req.status === 'accepted' || req.status === 'in-progress'
          ? `<div><span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700 border-2 border-emerald-200"><i class="fas fa-check-circle mr-1 text-[8px]"></i> Assigned</span>${req.assignedBuyer ? `<div class="text-[10px] text-slate-500 mt-1 font-semibold italic">Buyer: ${req.assignedBuyer.name}</div>` : ''}</div>`
          : req.status === 'completed'
            ? `<span class="inline-flex items-center rounded-full bg-sky-50 px-3 py-1.5 text-[10px] font-black text-sky-700 border-2 border-sky-200"><i class="fas fa-check-double mr-1 text-[8px]"></i> Completed</span>`
            : req.status === 'cancelled'
              ? `<div><span class="inline-flex items-center rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-black text-rose-700 border-2 border-rose-200"><i class="fas fa-times-circle mr-1 text-[8px]"></i> Cancelled</span>${req.cancelReason ? `<div class="text-[9px] text-rose-500 mt-1 font-bold italic max-w-[140px]">Reason: ${req.cancelReason}</div>` : ''}</div>`
              : `<span class="inline-flex items-center rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600 border-2 border-slate-200">${req.status}</span>`;

      const actionBtn = req.status === 'pending'
        ? `<button onclick="openAssignModal('${req._id}')" class="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:from-emerald-600 hover:to-emerald-700 px-4 py-2 text-[11px] font-black transition-all"><i class="fas fa-link mr-1.5"></i> Assign</button>`
        : `<button onclick="openCropDetailsModal('${req._id}')" class="inline-flex items-center rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-4 py-2 text-[11px] font-black transition-all"><i class="fas fa-eye mr-1.5"></i> View</button>`;
      const images = (req.images && req.images.length > 0) ? req.images : (req.imageUrl ? [req.imageUrl] : []);
      const photoBtn = images.length > 0
        ? `<div class="flex gap-1 flex-wrap max-w-[100px]">` +
        images.map((img, idx) => {
          const fixed = fixImageUrl(img);
          const galleryJson = JSON.stringify(images.map(i => fixImageUrl(i))).replace(/"/g, '&quot;');
          return `<button onclick="viewPhoto('${fixed}', ${galleryJson}, ${idx})" class="relative h-7 w-7 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-all overflow-hidden">
                <img src="${fixed}" class="h-full w-full object-cover" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden')">
                <i class="fas fa-image text-slate-400 text-[10px] hidden"></i>
              </button>`;
        }).join('') +
        `</div>`
        : `<span class="text-slate-400 text-xs italic">â€”</span>`;

      const shortId = req._id ? req._id.toString().substring(req._id.length - 6).toUpperCase() : 'N/A';
      return `<tr class="hover:bg-emerald-50/20 transition-colors border-b border-slate-100">
          <td class="px-5 py-4">
            <button onclick="openCropDetailsModal('${req._id}')" class="font-black text-emerald-600 hover:text-emerald-700 text-[10px] tracking-widest bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-all cursor-pointer">#${shortId}</button>
          </td>
          <td class="px-5 py-4">
            <div onclick="event.stopPropagation(); viewUserProfileV360('${req.farmerId}')" class="font-bold text-slate-900 cursor-pointer hover:text-emerald-600 hover:underline flex items-center gap-1.5 group/fn">
              ${req.farmerName}
              <i class="fas fa-id-badge text-[10px] text-emerald-500 opacity-0 group-hover/fn:opacity-100 transition-opacity"></i>
            </div>
            <div class="text-[10px] text-slate-500">${req.farmerPhone}</div>
          </td>
          <td class="px-5 py-4"><div class="font-semibold text-slate-900">${req.location}</div></td>
          <td class="px-5 py-4"><div class="font-bold text-slate-900">${req.crop}</div><div class="text-[10px] text-slate-600">${req.quantity}</div></td>
          <td class="px-5 py-4"><div class="font-black text-emerald-700">${req.pricePerQuintal > 0 ? 'â‚¹' + req.pricePerQuintal + '/Q' : 'â€”'}</div></td>
          <td class="px-5 py-4"><div class="text-[10px] text-slate-700 max-w-[180px] truncate">${req.note || req.variety || 'â€”'}</div></td>
          <td class="px-5 py-4">${photoBtn}</td>
          <td class="px-5 py-4">${statusBadge}</td>
          <td class="px-5 py-4 text-right">${actionBtn}</td>
        </tr>`;
    }

    function renderCropRequests(requests, shouldUpdateCards = true) {
      if (shouldUpdateCards && Array.isArray(requests)) {
        updateCropKpiCards(requests);
      }
      window.progressiveRenderTable('cropRequestsTbody', requests, createCropRequestRow, {
        chunkSize: 25,
        emptyHtml: '<tr><td colspan="9" class="text-center py-8 text-slate-400 font-semibold italic">No crop sell requests yet.</td></tr>'
      });
    }

    async function populateBuyerList() {
      const list = document.getElementById('buyerMatchList');
      list.innerHTML = `<p class="text-sm text-slate-400 text-center py-4 italic">Loading buyers...</p>`;
      try {
        if (allBuyerPartners.length === 0) {
          const res = await fetch(`${API_BASE}/employee/admin/buyer-partners`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
          });
          if (res.ok) allBuyerPartners = await res.json();
        }
        if (allBuyerPartners.length === 0) {
          list.innerHTML = `<p class="text-sm text-slate-500 text-center py-4 italic">No approved buyer partners found.</p>`;
          return;
        }
        list.innerHTML = '';
        allBuyerPartners.forEach((buyer, i) => {
          const card = document.createElement('div');
          card.className = 'rounded-xl border-2 border-slate-200 bg-white p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer';
          card.dataset.buyerId = buyer._id;
          card.innerHTML = `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <input type="radio" name="selectedBuyer" value="${buyer._id}" class="h-4 w-4 accent-emerald-600" />
                  <div>
                    <p class="text-sm font-black text-slate-900">${buyer.name}</p>
                    <p class="text-[10px] text-slate-500 font-semibold">${buyer.location} â€¢ ${buyer.phone}</p>
                  </div>
                </div>
                ${i === 0 ? '<span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[9px] font-black text-emerald-700 border border-emerald-300"><i class="fas fa-star mr-1"></i> TOP</span>' : ''}
              </div>
            `;
          const assignBtn = document.getElementById('assignBtn');
          card.addEventListener('click', () => {
            document.querySelectorAll('#buyerMatchList > div').forEach(el => el.classList.remove('border-emerald-300', 'bg-emerald-50'));
            card.classList.add('border-emerald-300', 'bg-emerald-50');
            card.querySelector('input[type="radio"]').checked = true;
            selectedBuyerId = buyer._id;

            const currentReq = allCropRequests.find(r => r._id === currentRequestId);
            const isReassign = currentReq && currentReq.assignedBuyer && currentReq.buyerId !== buyer._id;

            document.getElementById('selectedBuyerName').textContent = `${buyer.name} (${buyer.location})`;
            document.getElementById('selectedBuyerInfo').classList.remove('hidden');
            assignBtn.disabled = false;
            assignBtn.innerHTML = isReassign
              ? `<i class="fas fa-sync-alt mr-2"></i> Re-assign Buyer`
              : `<i class="fas fa-link mr-2"></i> Assign Buyer`;
          });
          list.appendChild(card);
        });
      } catch (e) {
        list.innerHTML = `<p class="text-red-500 text-sm text-center py-4">Failed to load buyers.</p>`;
      }
    }

    async function assignBuyer() {
      if (!selectedBuyerId || !currentRequestId) {
        showToast('Please select a buyer first', 'warning');
        return;
      }
      try {
        const newPrice = document.getElementById('modalEditPrice').value;
        const res = await fetch(`${API_BASE}/employee/admin/crop-requests/${currentRequestId}/assign`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerId: selectedBuyerId, newPrice: parseFloat(newPrice) })
        });
        if (res.ok) {
          showToast('Buyer assigned successfully!', 'success');
          closeAssignModal();
          fetchCropRequests();
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to assign', 'warning');
        }
      } catch (e) {
        showToast('Network error', 'warning');
      }
    }

    async function updateRequestPrice() {
      if (!currentRequestId) {
        showToast('No request selected', 'warning');
        return;
      }
      const newPrice = document.getElementById('modalEditPrice').value;
      if (!newPrice) {
        showToast('Please enter a valid price', 'warning');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/employee/admin/crop-requests/${currentRequestId}/update-price`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newPrice: parseFloat(newPrice) })
        });

        if (res.ok) {
          showToast('Price updated successfully!', 'success');
          fetchCropRequests(); // Refresh table
          fetchStats(); // Update totals if needed
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update price', 'warning');
        }
      } catch (e) {
        showToast('Network error', 'warning');
      }
    }

    function selectBuyer(el) { el.click(); }

    // Global Date Filter Handlers
    function formatLocalDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function setGlobalDatePreset(preset) {
      document.querySelectorAll('.global-preset-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-emerald-700', 'shadow-sm');
        btn.classList.add('text-slate-600');
      });
      const activeBtn = document.getElementById(`btn-preset-${preset}`);
      if (activeBtn) {
        activeBtn.classList.remove('text-slate-600');
        activeBtn.classList.add('bg-white', 'text-emerald-700', 'shadow-sm');
      }

      const today = new Date();
      let startDateStr = '';
      let endDateStr = '';
      let label = 'All Time';

      if (preset === 'today') {
        const start = formatLocalDate(today);
        startDateStr = start;
        endDateStr = start;
        label = 'Today';
      } else if (preset === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const yest = formatLocalDate(yesterday);
        startDateStr = yest;
        endDateStr = yest;
        label = 'Yesterday';
      } else if (preset === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startDateStr = formatLocalDate(startOfMonth);
        endDateStr = formatLocalDate(today);
        label = 'This Month';
      } else if (preset === 'all') {
        startDateStr = '';
        endDateStr = '';
        label = 'All Time';
      }

      document.getElementById('globalStartDate').value = startDateStr;
      document.getElementById('globalEndDate').value = endDateStr;

      applyGlobalFilter(startDateStr, endDateStr, label);
    }

    function onGlobalDateChange() {
      document.querySelectorAll('.global-preset-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-emerald-700', 'shadow-sm');
        btn.classList.add('text-slate-600');
      });

      const start = document.getElementById('globalStartDate').value;
      const end = document.getElementById('globalEndDate').value;

      let label = 'Selected Period';
      if (!start && !end) label = 'All Time';

      applyGlobalFilter(start, end, label);
    }

    function applyGlobalFilter(startDate, endDate, label) {
      fetchStats(startDate, endDate);
      fetchFarmers(startDate, endDate);
      fetchCropRequests(startDate, endDate);
    }

    function getInitialTabFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'farmersDb' || tabParam === 'farmer' || window.location.hash === '#farmersDb') {
        return 'farmersDb';
      }
      if (tabParam === 'cropSell' || tabParam === 'crop' || window.location.hash === '#cropSell') {
        return 'cropSell';
      }
      return localStorage.getItem('users_managment_active_tab') || 'cropSell';
    }

    function switchSectionTab(tabName) {
      const cropSection = document.getElementById('sectionCropRequests');
      const farmersSection = document.getElementById('sectionFarmersDb');
      const kpiFarmerSection = document.getElementById('kpiFarmerSection');
      const kpiCropSection = document.getElementById('kpiCropSection');
      const btnCrop = document.getElementById('tabBtnCropSell');
      const btnFarmers = document.getElementById('tabBtnFarmersDb');
      const activeLabel = document.getElementById('activeViewLabel');
      const sublinkFarmer = document.getElementById('sublinkFarmer');
      const sublinkCrop = document.getElementById('sublinkCropSell');

      if (!cropSection || !farmersSection) return;

      const activeClasses = ['bg-gradient-to-r', 'from-emerald-600', 'to-teal-600', 'text-white', 'shadow-lg', 'shadow-emerald-600/30', 'scale-[1.02]'];
      const inactiveClasses = ['text-slate-600', 'hover:text-emerald-700', 'hover:bg-emerald-50/70'];

      const subActiveClasses = ['bg-emerald-100/90', 'text-emerald-800', 'font-black', 'shadow-sm'];
      const subInactiveClasses = ['text-slate-600', 'font-bold', 'hover:text-emerald-700', 'hover:bg-emerald-50/70'];

      if (tabName === 'cropSell') {
        if (kpiCropSection) kpiCropSection.classList.remove('hidden');
        if (kpiFarmerSection) kpiFarmerSection.classList.add('hidden');

        cropSection.classList.remove('hidden');
        cropSection.classList.remove('animate-tab-switch');
        void cropSection.offsetWidth; // trigger reflow for animation restart
        cropSection.classList.add('animate-tab-switch');

        farmersSection.classList.add('hidden');
        farmersSection.classList.remove('animate-tab-switch');

        if (btnCrop) {
          btnCrop.classList.add(...activeClasses);
          btnCrop.classList.remove(...inactiveClasses);
        }
        if (btnFarmers) {
          btnFarmers.classList.remove(...activeClasses);
          btnFarmers.classList.add(...inactiveClasses);
        }

        if (sublinkCrop) {
          sublinkCrop.classList.add(...subActiveClasses);
          sublinkCrop.classList.remove(...subInactiveClasses);
        }
        if (sublinkFarmer) {
          sublinkFarmer.classList.remove(...subActiveClasses);
          sublinkFarmer.classList.add(...subInactiveClasses);
        }

        if (activeLabel) activeLabel.textContent = 'Crop Sell Requests View';
        localStorage.setItem('users_managment_active_tab', 'cropSell');
      } else {
        if (kpiFarmerSection) kpiFarmerSection.classList.remove('hidden');
        if (kpiCropSection) kpiCropSection.classList.add('hidden');

        farmersSection.classList.remove('hidden');
        farmersSection.classList.remove('animate-tab-switch');
        void farmersSection.offsetWidth; // trigger reflow for animation restart
        farmersSection.classList.add('animate-tab-switch');

        cropSection.classList.add('hidden');
        cropSection.classList.remove('animate-tab-switch');

        if (btnFarmers) {
          btnFarmers.classList.add(...activeClasses);
          btnFarmers.classList.remove(...inactiveClasses);
        }
        if (btnCrop) {
          btnCrop.classList.remove(...activeClasses);
          btnCrop.classList.add(...inactiveClasses);
        }

        if (sublinkFarmer) {
          sublinkFarmer.classList.add(...subActiveClasses);
          sublinkFarmer.classList.remove(...subInactiveClasses);
        }
        if (sublinkCrop) {
          sublinkCrop.classList.remove(...subActiveClasses);
          sublinkCrop.classList.add(...subInactiveClasses);
        }

        if (activeLabel) activeLabel.textContent = 'Farmers Database View';
        localStorage.setItem('users_managment_active_tab', 'farmersDb');
      }
    }

    window.addEventListener('DOMContentLoaded', function () {
      document.getElementById('mobile-backdrop')?.addEventListener('click', () => toggleSidebar(false));
      setGlobalDatePreset('all');

      const initialTab = getInitialTabFromUrl();
      switchSectionTab(initialTab);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', function (e) {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      // Press 'Escape' to close modals
      if (e.key === 'Escape') {
        closeAssignModal();
        closeUserProfile();
        closePhotoModal();
        closeCropDetailsModal();
      }

      // Press 'Ctrl+K' to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('userSearchInput')?.focus();
      }
    });

    // Auto-save assignments every 30 seconds
    let currentWalletTxType = 'Credit';

    function setWalletTxType(type) {
      currentWalletTxType = type;
      const creditBtn = document.getElementById('type-credit');
      const debitBtn = document.getElementById('type-debit');
      const processBtn = document.getElementById('processWalletBtn');

      if (type === 'Credit') {
        creditBtn.classList.replace('bg-slate-100', 'bg-emerald-600');
        creditBtn.classList.replace('text-slate-600', 'text-white');
        debitBtn.classList.replace('bg-rose-600', 'bg-slate-100');
        debitBtn.classList.replace('text-white', 'text-slate-600');
        processBtn.classList.replace('bg-rose-600', 'bg-emerald-600');
      } else {
        debitBtn.classList.replace('bg-slate-100', 'bg-rose-600');
        debitBtn.classList.replace('text-slate-600', 'text-white');
        creditBtn.classList.replace('bg-emerald-600', 'bg-slate-100');
        creditBtn.classList.replace('text-white', 'text-slate-600');
        processBtn.classList.replace('bg-emerald-600', 'bg-rose-600');
      }
    }

    async function processWalletAction() {
      const amount = document.getElementById('walletActionAmount').value;
      const note = document.getElementById('walletActionNote').value;

      if (!amount || amount <= 0) return showToast('Invalid amount', 'error');
      if (!confirm(`Confirm ${currentWalletTxType} of â‚¹${amount}?`)) return;

      const btn = document.getElementById('processWalletBtn');
      try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i>';

        const res = await fetch(`${window.API_BASE}/employee/admin/user/wallet-recharge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('employeeToken')}`
          },
          body: JSON.stringify({
            userId: currentProfileUserId,
            amount: Number(amount),
            type: currentWalletTxType,
            note: note
          })
        });


        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        showToast(`${currentWalletTxType} successful!`, 'success');
        document.getElementById('profileWallet').textContent = `â‚¹${data.newBalance.toLocaleString()}`;
        document.getElementById('walletActionAmount').value = '';
        document.getElementById('walletActionNote').value = '';

        fetchFarmers(); // Refresh list in background
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Process';
      }
    }

    let userHistoryData = null;

    async function fetchUserFullHistory(userId) {
      const container = document.getElementById('history-content');
      container.innerHTML = `<div class="flex items-center justify-center py-12"><i class="fas fa-spinner animate-spin text-emerald-500 text-2xl"></i></div>`;

      try {
        const res = await fetch(`${window.API_BASE}/employee/admin/user-full-history/${userId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('employeeToken')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch history');
        userHistoryData = await res.json();
        switchHistoryTab('bookings'); // Default tab
      } catch (e) {
        container.innerHTML = `<p class="text-xs text-rose-500 font-bold text-center py-12 bg-rose-50 rounded-2xl border-2 border-dashed border-rose-100">${e.message}</p>`;
      }
    }

    function switchHistoryTab(tab) {
      const tabs = ['bookings', 'crops', 'transactions', 'shop'];
      tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (t === tab) {
          btn.className = "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all bg-emerald-600 text-white shadow-md";
        } else {
          btn.className = "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all bg-white text-slate-500 border border-slate-200";
        }
      });

      renderHistoryContent(tab);
    }

    function renderHistoryContent(tab) {
      const container = document.getElementById('history-content');
      if (!userHistoryData) return;

      let html = '';
      if (tab === 'bookings') {
        const data = userHistoryData.bookings || [];
        if (data.length === 0) html = `<p class="text-xs text-slate-400 italic text-center py-12">No bookings found.</p>`;
        else {
          html = `<div class="space-y-3">` + data.map(b => `
              <div class="bg-white rounded-2xl border-2 border-slate-50 p-4 flex items-center justify-between shadow-sm hover:border-emerald-100 transition-all">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <i class="fas fa-tractor"></i>
                  </div>
                  <div>
                    <p class="text-xs font-black text-slate-900">${b.machine?.name || 'Equipment'}</p>
                    <p class="text-[10px] text-slate-400 font-bold">${new Date(b.fromDate).toLocaleDateString()} - ${new Date(b.toDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xs font-black text-emerald-700">â‚¹${(b.totalAmount || 0).toLocaleString()}</p>
                  <span class="text-[9px] font-black uppercase tracking-widest ${b.status === 'Completed' ? 'text-emerald-500' : 'text-amber-500'}">${b.status}</span>
                </div>
              </div>
            `).join('') + `</div>`;
        }
      } else if (tab === 'crops') {
        const data = userHistoryData.cropSales || [];
        if (data.length === 0) html = `<p class="text-xs text-slate-400 italic text-center py-12">No crop sales found.</p>`;
        else {
          html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">` + data.map(r => `
              <div class="bg-white rounded-2xl border-2 border-slate-50 p-4 shadow-sm hover:border-emerald-100 transition-all">
                <div class="flex justify-between items-start mb-2">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider">${r.crop}</span>
                  <span class="text-[9px] text-slate-400 font-bold">${new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between items-end">
                  <div>
                    <p class="text-xs font-black text-slate-900">${r.quantity} Q</p>
                    <p class="text-[10px] text-slate-500 font-semibold">${r.location}</p>
                  </div>
                  <span class="text-[9px] font-black uppercase ${r.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}">${r.status}</span>
                </div>
              </div>
            `).join('') + `</div>`;
        }
      } else if (tab === 'transactions') {
        const data = userHistoryData.transactions || [];
        if (data.length === 0) html = `<p class="text-xs text-slate-400 italic text-center py-12">No transactions found.</p>`;
        else {
          html = `<div class="space-y-2">` + data.map(t => `
              <div class="bg-white rounded-xl border-2 border-slate-50 p-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-lg ${t.type === 'Credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center text-xs">
                    <i class="fas ${t.type === 'Credit' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                  </div>
                  <div>
                    <p class="text-[11px] font-black text-slate-900">${t.note || 'Wallet Transaction'}</p>
                    <p class="text-[9px] text-slate-400 font-bold">${new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xs font-black ${t.type === 'Credit' ? 'text-emerald-600' : 'text-rose-600'}">${t.type === 'Credit' ? '+' : '-'}â‚¹${(t.amount || 0).toLocaleString()}</p>
                  <p class="text-[8px] text-slate-400 font-mono uppercase">${t.transactionId}</p>
                </div>
              </div>
            `).join('') + `</div>`;
        }
      } else if (tab === 'shop') {
        const data = userHistoryData.shopOrders || [];
        if (data.length === 0) html = `<p class="text-xs text-slate-400 italic text-center py-12">No shop orders found.</p>`;
        else {
          html = `<div class="space-y-3">` + data.map(o => `
              <div class="bg-white rounded-2xl border-2 border-slate-50 p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                    <i class="fas fa-shopping-bag"></i>
                  </div>
                  <div>
                    <p class="text-xs font-black text-slate-900">Order #${o.orderId || o._id.substring(18).toUpperCase()}</p>
                    <p class="text-[10px] text-slate-400 font-bold">${o.items?.length || 0} Items â€¢ â‚¹${(o.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div class="text-right">
                  <span class="px-2 py-1 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600">${o.status}</span>
                  <p class="text-[9px] text-slate-400 mt-1">${new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            `).join('') + `</div>`;
        }
      }

      container.innerHTML = html;
    }

    let currentDocKeyForViewer = null;

    function openDocViewer(title, url, docKey) {
      if (!url) return showToast('Document URL not available', 'warning');
      currentDocKeyForViewer = docKey || null;
      document.getElementById('docViewerTitle').textContent = title || 'Document Preview';
      document.getElementById('docViewerDownloadBtn').href = url;

      const img = document.getElementById('docViewerImage');
      const errState = document.getElementById('docViewerErrorState');

      if (img && errState) {
        img.classList.remove('hidden');
        errState.classList.add('hidden');
        img.src = url;
      }

      const rejectBtn = document.getElementById('docViewerRejectBtn');
      if (rejectBtn) {
        if (docKey && currentUserV360Id) {
          rejectBtn.onclick = () => rejectPartnerDocument(currentUserV360Id, docKey, title);
          rejectBtn.classList.remove('hidden');
        } else {
          rejectBtn.classList.add('hidden');
        }
      }

      const modal = document.getElementById('docViewerModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }

    function handleDocViewerImageError(img) {
      if (!img) return;
      img.classList.add('hidden');
      const errState = document.getElementById('docViewerErrorState');
      if (errState) {
        errState.classList.remove('hidden');
      }
    }

    function closeDocViewer() {
      const modal = document.getElementById('docViewerModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    async function rejectPartnerDocument(userId, docKey, docTitle) {
      if (!confirm(`Are you sure you want to REJECT "${docTitle}"?\n\nThis will clear the document and allow the farmer to re-upload it.`)) {
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/employee/admin/user/${userId}/reject-doc`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` },
          body: JSON.stringify({ docKey })
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || 'Document rejected successfully', 'success');
          closeDocViewer();
          viewUserProfileV360(userId);
          fetchFarmers();
        } else {
          showToast(data.error || 'Failed to reject document', 'warning');
        }
      } catch (e) {
        showToast('Network error: ' + e.message, 'warning');
      }
    }

    // Backend Pagination Infinite Scroll Handler
    window.addEventListener('DOMContentLoaded', () => {
      // Attach Scroll Listener for Farmers Table
      const usersTbody = document.getElementById('usersTableBody');
      const farmersContainer = usersTbody ? usersTbody.closest('.overflow-auto, .overflow-y-auto, div[style*="max-height"]') : null;
      if (farmersContainer) {
        farmersContainer.addEventListener('scroll', () => {
          if (farmersHasMore && !farmersLoading) {
            if (farmersContainer.scrollTop + farmersContainer.clientHeight >= farmersContainer.scrollHeight - 150) {
              farmersPage++;
              fetchFarmers(farmersPage, true);
            }
          }
        }, { passive: true });
      }

      // Attach Scroll Listener for Crop Requests Table
      const cropTbody = document.getElementById('cropRequestsTbody');
      const cropContainer = cropTbody ? cropTbody.closest('.overflow-auto, .overflow-y-auto, div[style*="max-height"]') : null;
      if (cropContainer) {
        cropContainer.addEventListener('scroll', () => {
          if (cropRequestsHasMore && !cropRequestsLoading) {
            if (cropContainer.scrollTop + cropContainer.clientHeight >= cropContainer.scrollHeight - 150) {
              cropRequestsPage++;
              fetchCropRequests(cropRequestsPage, true);
            }
          }
        }, { passive: true });
      }
    });
