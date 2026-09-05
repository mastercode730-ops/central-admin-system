/**
 * Central Multi-Site Universal Plug & Play Client SDK
 * ---------------------------------------------------
 * Add this 1 line to any website's <head> or <body>:
 * <script src="http://localhost:5000/client.js" data-site-id="YOUR_SITE_ID" async></script>
 */

(function () {
  // 1. Identify Site ID and API Host
  const currentScript = document.currentScript || document.querySelector('script[src*="client.js"]');
  const apiHost = currentScript ? new URL(currentScript.src).origin : 'http://localhost:5000';
  const siteId = (currentScript && currentScript.getAttribute('data-site-id')) || window.location.hostname.replace('www.', '');

  if (!siteId) {
    console.warn('[SiteConfig] No data-site-id provided and hostname undetermined.');
    return;
  }

  // 2. Fetch Central Config
  fetch(`${apiHost}/api/v1/config?siteId=${encodeURIComponent(siteId)}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) return;

      // Expose globally
      window.__SITE_CONFIG__ = data;

      // A. Dynamic Google Search Console Verification Tag
      if (data.gscCode) {
        let meta = document.querySelector('meta[name="google-site-verification"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'google-site-verification';
          document.head.appendChild(meta);
        }
        meta.content = data.gscCode;
      }

      // B. Update WhatsApp Links across the page
      if (data.whatsappUrl) {
        function updateWhatsAppLinks() {
          const links = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="api.whatsapp.com"], a[data-wa="true"], .whatsapp-link');
          links.forEach((a) => {
            a.href = data.whatsappUrl;
          });

          // Also update visible number text in elements marked with [data-wa-number]
          const numEls = document.querySelectorAll('[data-wa-number], .wa-phone-number');
          numEls.forEach((el) => {
            if (data.whatsappNumber) el.innerText = data.whatsappNumber;
          });
        }

        // Run immediately
        updateWhatsAppLinks();

        // Run on DOM load
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', updateWhatsAppLinks);
        }

        // MutationObserver to automatically catch dynamically rendered React / Next.js components
        const observer = new MutationObserver(() => {
          updateWhatsAppLinks();
        });

        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
      }

      // Trigger custom event in case custom React components want to listen
      window.dispatchEvent(new CustomEvent('siteConfigLoaded', { detail: data }));
    })
    .catch((err) => {
      console.error('[SiteConfig] Failed to fetch central configuration:', err);
    });
})();
