/**
 * Central Multi-Site Plug & Play Blog Widget
 * -------------------------------------------
 * Simply drop this into any page (e.g. /blog.html or /blogs):
 * <div id="central-blog-container"></div>
 * <script src="http://localhost:5000/blog-widget.js" data-site-id="YOUR_SITE_ID"></script>
 */

(function () {
  const currentScript = document.currentScript || document.querySelector('script[src*="blog-widget.js"]');
  const apiHost = currentScript ? new URL(currentScript.src).origin : 'http://localhost:5000';
  const siteId = (currentScript && currentScript.getAttribute('data-site-id')) || window.location.hostname.replace('www.', '');

  const container = document.getElementById('central-blog-container') || document.body;

  // Insert styles
  const style = document.createElement('style');
  style.textContent = `
    .cb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; padding: 20px 0; font-family: system-ui, -apple-system, sans-serif; }
    .cb-card { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; color: #f8fafc; text-decoration: none; display: flex; flex-direction: column; }
    .cb-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.5); border-color: rgba(59,130,246,0.4); }
    .cb-img { width: 100%; height: 180px; object-fit: cover; background: #1e293b; }
    .cb-body { padding: 18px; display: flex; flex-direction: column; flex: 1; }
    .cb-cat { display: inline-block; font-size: 11px; font-weight: 700; color: #38bdf8; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.2); padding: 2px 8px; rounded: 6px; border-radius: 6px; margin-bottom: 8px; width: fit-content; text-transform: uppercase; }
    .cb-title { font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.4; margin: 0 0 8px 0; }
    .cb-excerpt { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px 0; flex: 1; }
    .cb-footer { font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; }
    .cb-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .cb-modal { background: #0b1120; border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; color: #e2e8f0; padding: 28px; position: relative; font-family: system-ui, -apple-system, sans-serif; }
    .cb-close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .cb-close:hover { background: rgba(255,255,255,0.2); }
    .cb-article-body h2 { font-size: 20px; font-weight: 700; color: #fff; margin-top: 24px; margin-bottom: 12px; }
    .cb-article-body h3 { font-size: 17px; font-weight: 600; color: #38bdf8; margin-top: 18px; margin-bottom: 8px; }
    .cb-article-body p { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 14px; }
    .cb-article-body ul, .cb-article-body ol { margin: 12px 0 16px 20px; color: #cbd5e1; font-size: 14px; }
    .cb-article-body li { margin-bottom: 6px; }
  `;
  document.head.appendChild(style);

  fetch(`${apiHost}/api/v1/blogs?siteId=${encodeURIComponent(siteId)}&limit=20`)
    .then(r => r.json())
    .then(data => {
      if (!data.success || !data.blogs.length) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; color: #64748b; font-family: sans-serif;">No articles published yet.</div>`;
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'cb-grid';

      data.blogs.forEach(blog => {
        const card = document.createElement('div');
        card.className = 'cb-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <img src="${apiHost}${blog.featuredImage}" class="cb-img" alt="${blog.title}" onerror="this.style.display='none'">
          <div class="cb-body">
            <span class="cb-cat">${blog.category || 'Updates'}</span>
            <h3 class="cb-title">${blog.title}</h3>
            <p class="cb-excerpt">${blog.excerpt}</p>
            <div class="cb-footer">
              <span>📅 ${new Date(blog.publishedAt).toLocaleDateString()}</span>
              <span style="color:#38bdf8; font-weight:600;">Read Article →</span>
            </div>
          </div>
        `;
        card.onclick = () => openBlogModal(blog.slug);
        grid.appendChild(card);
      });

      container.innerHTML = '';
      container.appendChild(grid);
    })
    .catch(err => {
      console.error('[BlogWidget] Failed to load blogs:', err);
    });

  function openBlogModal(slug) {
    fetch(`${apiHost}/api/v1/blogs/${slug}?siteId=${encodeURIComponent(siteId)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        const blog = d.blog;

        const modalBg = document.createElement('div');
        modalBg.className = 'cb-modal-bg';
        modalBg.innerHTML = `
          <div class="cb-modal">
            <button class="cb-close" onclick="this.closest('.cb-modal-bg').remove()">✕</button>
            <img src="${apiHost}${blog.featuredImage}" style="width:100%; max-height:300px; object-fit:cover; border-radius:12px; margin-bottom:20px;">
            <span class="cb-cat">${blog.category || 'Article'}</span>
            <h1 style="font-size:24px; font-weight:800; color:#fff; line-height:1.3; margin:10px 0 16px 0;">${blog.title}</h1>
            <div style="font-size:12px; color:#64748b; margin-bottom:24px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
              Published on ${new Date(blog.publishedAt).toLocaleDateString()} • 100% Official Guide
            </div>
            <div class="cb-article-body">
              ${blog.contentHtml}
            </div>
          </div>
        `;
        modalBg.onclick = (e) => {
          if (e.target === modalBg) modalBg.remove();
        };
        document.body.appendChild(modalBg);
      });
  }
})();
