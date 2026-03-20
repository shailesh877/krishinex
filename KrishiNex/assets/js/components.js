
// =========================================
// KrishiNex – Shared Components
// =========================================

const SOCIAL = {
  linkedin:  'https://www.linkedin.com/company/krishinex/',
  twitter:   'https://x.com/krishinex',
  facebook:  'https://www.facebook.com/profile.php?id=61585989807566',
  instagram: 'https://www.instagram.com/krishinex?igsh=MnVpNHp3YWdmYnFy',
  youtube:   'https://www.youtube.com/@KrishiNex',
};

function getActivePage() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  return path;
}

function renderNavbar() {
  const page = getActivePage();
  const isHome      = page === 'index.html'       || page === '';
  const isAbout     = page === 'about.html';
  const isAdvertise = page === 'advertise.html';
  const isCollaborate= page === 'collaborate.html';
  const isContact   = page === 'contact.html';

  const linkClass = (active) =>
    active
      ? 'nav-link text-sm font-semibold text-primary border-b-2 border-primary pb-0.5'
      : 'nav-link text-sm font-medium text-gray-700 hover:text-primary transition-colors';

  const html = `
  <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">

        <!-- Logo -->
        <a href="index.html" class="flex items-center gap-2.5">
          <img src="assets/images/logo.png" alt="KrishiNex Logo"
               class="h-12 w-12 rounded-full object-cover shadow-sm border border-gray-100" />
          <div class="leading-tight">
            <div>
              <span class="font-poppins font-bold text-xl" style="color:#2e7d32">Krishi</span><span class="font-poppins font-bold text-xl" style="color:#1565c0">Nex</span>
            </div>
            <p class="text-[10px] text-gray-500 -mt-0.5 font-medium">Knexis Technologies Pvt. Ltd.</p>
          </div>
        </a>

        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center gap-7">
          <a href="index.html"     class="${linkClass(isHome)}">Home</a>
          <a href="about.html"     class="${linkClass(isAbout)}">About Us</a>

          <!-- Dropdown -->
          <div class="relative dropdown-parent group">
            <button class="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary transition-colors py-1">
              Grow Your Business
              <svg class="w-3.5 h-3.5 mt-0.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="dropdown-menu absolute top-full left-1/2 -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 mt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-gray-100 rotate-45"></div>
              <a href="advertise.html" class="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors rounded-lg mx-1 group/item">
                <div class="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0 group-hover/item:bg-green-200 transition-colors">
                  <svg class="w-4 h-4 text-green-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-800">Advertise With Us</p>
                  <p class="text-xs text-gray-500">Reach progressive farmers</p>
                </div>
              </a>
              <a href="collaborate.html" class="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors rounded-lg mx-1 group/item">
                <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 group-hover/item:bg-blue-200 transition-colors">
                  <svg class="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-800">Collaborate With Us</p>
                  <p class="text-xs text-gray-500">Become a KSP Partner</p>
                </div>
              </a>
            </div>
          </div>

          <a href="contact.html" class="${linkClass(isContact)}">Contact Us</a>
          <a href="https://admin.krishinex.com/ksp_login.html" class="nav-link text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
            <i class="fas fa-lock text-[10px]"></i> KSP Login
          </a>

          <a href="collaborate.html"
             class="bg-gradient-to-r from-[#2e7d32] to-[#1565c0] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all">
            Become KSP Partner
          </a>
        </div>

        <!-- Hamburger -->
        <button id="navHamburger" class="md:hidden p-2 text-gray-600 focus:outline-none" aria-label="Menu">
          <svg id="iconBars" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
          <svg id="iconX" class="w-6 h-6 hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div id="mobileNav" class="md:hidden hidden bg-white border-t border-gray-100 pb-4">
      <div class="px-4 pt-3 space-y-1">
        <a href="index.html"      class="block px-3 py-2.5 rounded-xl text-sm ${isHome ? 'text-primary font-semibold bg-green-50' : 'text-gray-700 hover:bg-gray-50'}">Home</a>
        <a href="about.html"      class="block px-3 py-2.5 rounded-xl text-sm ${isAbout ? 'text-primary font-semibold bg-green-50' : 'text-gray-700 hover:bg-gray-50'}">About Us</a>
        <p class="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grow Your Business</p>
        <a href="advertise.html"  class="block px-3 py-2.5 pl-6 rounded-xl text-sm ${isAdvertise ? 'text-primary font-semibold bg-green-50' : 'text-gray-700 hover:bg-gray-50'}">→ Advertise With Us</a>
        <a href="collaborate.html" class="block px-3 py-2.5 pl-6 rounded-xl text-sm ${isCollaborate ? 'text-primary font-semibold bg-green-50' : 'text-gray-700 hover:bg-gray-50'}">→ Collaborate With Us</a>
        <a href="contact.html"    class="block px-3 py-2.5 rounded-xl text-sm ${isContact ? 'text-primary font-semibold bg-green-50' : 'text-gray-700 hover:bg-gray-50'}">Contact Us</a>
        <a href="https://admin.krishinex.com/ksp_login.html" class="block px-3 py-2.5 rounded-xl text-sm text-blue-600 font-semibold hover:bg-blue-50">KSP Login</a>
        <a href="collaborate.html" class="block mt-2 text-center bg-gradient-to-r from-[#2e7d32] to-[#1565c0] text-white text-sm font-bold px-4 py-3 rounded-xl shadow">Become KSP Partner</a>
      </div>
    </div>
  </nav>`;

  document.getElementById('navbar-root').innerHTML = html;

  // Hamburger toggle
  const btn = document.getElementById('navHamburger');
  const menu = document.getElementById('mobileNav');
  const bars = document.getElementById('iconBars');
  const x    = document.getElementById('iconX');
  btn.addEventListener('click', () => {
    const open = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden', open);
    bars.classList.toggle('hidden', !open);
    x.classList.toggle('hidden', open);
  });
}

function renderFooter() {
  const html = `
  <footer class="bg-gray-950 text-gray-400 pt-16 pb-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

        <!-- Brand -->
        <div class="lg:col-span-1">
          <a href="index.html" class="inline-flex items-center gap-2.5 mb-5">
            <img src="assets/images/logo.png" alt="KrishiNex" class="h-12 w-12 rounded-full object-cover border border-gray-700" />
            <div class="leading-tight">
              <div><span class="font-poppins font-bold text-xl text-green-400">Krishi</span><span class="font-poppins font-bold text-xl text-blue-400">Nex</span></div>
              <p class="text-[10px] text-gray-500 -mt-0.5">Knexis Technologies Pvt. Ltd.</p>
            </div>
          </a>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">
            Empowering every Indian farmer with smart agri-finance, technology, and rural services through the KSP ecosystem.
          </p>
          <!-- Social Icons -->
          <div class="flex gap-2.5">
            <a href="${SOCIAL.linkedin}"  target="_blank" rel="noopener" aria-label="LinkedIn"
               class="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[#0077b5] transition-colors">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="${SOCIAL.twitter}"   target="_blank" rel="noopener" aria-label="Twitter/X"
               class="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-black transition-colors">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="${SOCIAL.facebook}"  target="_blank" rel="noopener" aria-label="Facebook"
               class="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[#1877F2] transition-colors">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="${SOCIAL.instagram}" target="_blank" rel="noopener" aria-label="Instagram"
               class="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gradient-to-br hover:from-[#f09433] hover:via-[#e6683c] hover:to-[#dc2743] transition-colors">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="${SOCIAL.youtube}"   target="_blank" rel="noopener" aria-label="YouTube"
               class="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[#FF0000] transition-colors">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="text-white font-semibold text-sm uppercase tracking-wider mb-5">Quick Links</h4>
          <ul class="space-y-3">
            <li><a href="index.html"       class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">Home</a></li>
            <li><a href="about.html"       class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">About Us</a></li>
            <li><a href="advertise.html"   class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">Advertise With Us</a></li>
            <li><a href="collaborate.html" class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">Collaborate With Us</a></li>
            <li><a href="contact.html"     class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">Contact Us</a></li>
            <li><a href="https://admin.krishinex.com/ksp_login.html" class="text-sm text-blue-400 hover:text-blue-300 transition-colors hover:translate-x-1 inline-block font-bold">KSP Login</a></li>
          </ul>
        </div>

        <!-- Legal -->
        <div>
          <h4 class="text-white font-semibold text-sm uppercase tracking-wider mb-5">Legal</h4>
          <ul class="space-y-3">
            <li><a href="terms.html"          class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">Terms &amp; Conditions</a></li>
            <li><a href="privacy_policy.html" class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">Privacy Policy</a></li>
            <li><a href="refund_policy.html"  class="text-sm hover:text-green-400 transition-colors hover:translate-x-1 inline-block">Return &amp; Refund Policy</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="text-white font-semibold text-sm uppercase tracking-wider mb-5">Reach Us</h4>
          <ul class="space-y-4">
            <li class="flex items-start gap-3">
              <div class="w-8 h-8 bg-green-900/50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </div>
              <a href="tel:+917289978002" class="text-sm hover:text-green-400 transition-colors pt-1">+91-72899 78002</a>
            </li>
            <li class="flex items-start gap-3">
              <div class="w-8 h-8 bg-green-900/50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <a href="mailto:help@krishinex.com" class="text-sm hover:text-green-400 transition-colors pt-1">help@krishinex.com</a>
            </li>
            <li class="flex items-start gap-3">
              <div class="w-8 h-8 bg-green-900/50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <span class="text-sm pt-1">Samastipur, Bihar – 848101, India</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-xs text-gray-600 text-center sm:text-left">
          © 2026 KrishiNex (Knexis Technologies Pvt. Ltd.). All rights reserved.
        </p>
        <p class="text-xs text-gray-600 text-center sm:text-right">
          Designed &amp; Developed by <a href="https://pasiware.com/" target="_blank" rel="noopener" class="font-semibold text-gray-400 hover:text-white transition-colors">Pasiware Technologies (P) Ltd</a>
        </p>
      </div>
    </div>
  </footer>`;

  document.getElementById('footer-root').innerHTML = html;
}

// Auto-render on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
});
