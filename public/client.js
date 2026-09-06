/**
 * Central Multi-Site Universal Plug & Play Client SDK
 * ---------------------------------------------------
 * Automatically intercepts all WhatsApp redirections and Google Search Console tags.
 */

(function () {
  // 1. Identify Site ID, Hostname, and API Host
  const currentScript = document.currentScript || document.querySelector('script[src*="client.js"]');
  const apiHost = currentScript ? new URL(currentScript.src).origin : 'https://central-admin-system.onrender.com';
  const siteId = (currentScript && currentScript.getAttribute('data-site-id')) || window.location.hostname.replace(/^www\./, '');
  const currentHostname = window.location.hostname.replace(/^www\./, '');

  if (!siteId && !currentHostname) {
    console.warn('[SiteConfig] No site identifier found.');
    return;
  }

  // 2. Fetch Central Config (Try siteId first, fallback to hostname)
  const fetchUrl = `${apiHost}/api/v1/config?siteId=${encodeURIComponent(siteId)}&domain=${encodeURIComponent(currentHostname)}`;

  fetch(fetchUrl)
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        console.warn('[SiteConfig] Config not found for', siteId, data);
        return;
      }

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
        const newWaUrl = data.whatsappUrl;

        function updateWhatsAppLinks() {
          const links = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="api.whatsapp.com"], a[data-wa="true"], .whatsapp-link');
          links.forEach((a) => {
            a.href = newWaUrl;
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

        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
          });
        }

        // Global Click Interceptor (Catches React synthetic clicks, delayed renders, or inline handlers)
        document.addEventListener('click', function (e) {
          const targetLink = e.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="api.whatsapp.com"], [data-wa="true"]');
          if (targetLink) {
            e.preventDefault();
            e.stopPropagation();
            window.open(newWaUrl, targetLink.target || '_blank');
          }
        }, true);

        // Window.open Interceptor for JS-based redirects
        const originalWindowOpen = window.open;
        window.open = function (url, target, features) {
          if (typeof url === 'string' && (url.includes('wa.me') || url.includes('whatsapp.com') || url.includes('api.whatsapp.com'))) {
            return originalWindowOpen.call(window, newWaUrl, target, features);
          }
          return originalWindowOpen.apply(window, arguments);
        };
      }

      // Trigger custom event
      window.dispatchEvent(new CustomEvent('siteConfigLoaded', { detail: data }));
    })
    .catch((err) => {
      console.error('[SiteConfig] Failed to fetch central configuration:', err);
    });
})();
