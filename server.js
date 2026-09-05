const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const db = require('./services/db');
const { generateBlogBanner, THEMES } = require('./services/bannerGenerator');
const { parseDocx } = require('./services/docxParser');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all client websites
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for public dashboard & uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Multer in-memory storage for docx uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ==========================================
// PUBLIC CLIENT API (For your 40-50 websites)
// ==========================================

/**
 * GET /api/v1/config?siteId=... (or ?domain=...)
 * Fetches site config: WhatsApp, GSC verification, etc.
 */
app.get('/api/v1/config', (req, res) => {
  const query = req.query.siteId || req.query.domain || req.query.id;
  if (!query) {
    return res.status(400).json({ error: 'Missing siteId or domain query parameter' });
  }

  const site = db.getSiteById(query);
  if (!site) {
    return res.status(404).json({ error: `Site "${query}" not found in central registry` });
  }

  // Construct ready-to-use WhatsApp redirect URL
  const cleanPhone = (site.whatsappNumber || '').replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(site.whatsappMessage || '');
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}${encodedMsg ? `?text=${encodedMsg}` : ''}` : '';

  // Cache-Control headers for ultra-fast CDN / Edge caching
  res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');

  return res.json({
    success: true,
    siteId: site.id,
    name: site.name,
    domain: site.domain,
    category: site.category,
    whatsappNumber: site.whatsappNumber,
    whatsappMessage: site.whatsappMessage,
    whatsappUrl,
    gscCode: site.gscCode || '',
    gscMetaTag: site.gscCode ? `<meta name="google-site-verification" content="${site.gscCode}" />` : '',
    status: site.status
  });
});

/**
 * GET /api/v1/blogs?siteId=...&category=...
 * Lists blogs for a specific website
 */
app.get('/api/v1/blogs', (req, res) => {
  const { siteId, category, page = 1, limit = 20 } = req.query;
  let blogs = db.getAllBlogs(siteId);

  if (category) {
    blogs = blogs.filter(b => b.category.toLowerCase() === category.toLowerCase());
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const total = blogs.length;
  const totalPages = Math.ceil(total / limitNum);
  const paginated = blogs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.set('Cache-Control', 'public, max-age=60, s-maxage=120');

  return res.json({
    success: true,
    siteId: siteId || 'ALL',
    total,
    page: pageNum,
    totalPages,
    blogs: paginated.map(b => ({
      id: b.id,
      siteId: b.siteId,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      featuredImage: b.featuredImage,
      category: b.category,
      publishedAt: b.publishedAt
    }))
  });
});

/**
 * GET /api/v1/blogs/:slug?siteId=...
 * Single blog post by slug
 */
app.get('/api/v1/blogs/:slug', (req, res) => {
  const { slug } = req.params;
  const { siteId } = req.query;

  const blog = db.getBlogBySlug(slug, siteId);
  if (!blog) {
    return res.status(404).json({ error: `Blog post "${slug}" not found` });
  }

  res.set('Cache-Control', 'public, max-age=120, s-maxage=300');

  return res.json({
    success: true,
    blog
  });
});

// ==========================================
// ADMIN DASHBOARD API
// ==========================================

// Get all sites with category counts
app.get('/api/v1/admin/sites', (req, res) => {
  const sites = db.getAllSites();
  const blogs = db.getAllBlogs();

  const enrichedSites = sites.map(site => ({
    ...site,
    blogCount: blogs.filter(b => b.siteId === site.id).length
  }));

  const categories = [...new Set(sites.map(s => s.category))];

  return res.json({
    success: true,
    totalSites: sites.length,
    totalBlogs: blogs.length,
    categories,
    sites: enrichedSites
  });
});

// Create new site
app.post('/api/v1/admin/sites', (req, res) => {
  try {
    const newSite = db.createSite(req.body);
    return res.status(201).json({ success: true, site: newSite });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Update single site
app.put('/api/v1/admin/sites/:id', (req, res) => {
  const updated = db.updateSite(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Site not found' });
  }
  return res.json({ success: true, site: updated });
});

// Delete site
app.delete('/api/v1/admin/sites/:id', (req, res) => {
  const deleted = db.deleteSite(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Site not found' });
  }
  return res.json({ success: true, message: 'Site removed successfully' });
});

// Bulk update WhatsApp Number
app.post('/api/v1/admin/bulk/whatsapp', (req, res) => {
  const { siteIds, whatsappNumber, whatsappMessage } = req.body;
  if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one website' });
  }
  if (!whatsappNumber) {
    return res.status(400).json({ error: 'WhatsApp number is required' });
  }

  const result = db.bulkUpdateWhatsApp(siteIds, whatsappNumber, whatsappMessage);
  return res.json({
    success: true,
    message: `WhatsApp number updated successfully on ${result.updatedCount} website(s)!`,
    updatedCount: result.updatedCount
  });
});

// Bulk update Google Search Console verification code
app.post('/api/v1/admin/bulk/gsc', (req, res) => {
  const { siteIds, gscCode } = req.body;
  if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one website' });
  }

  // If user pasted full <meta name="google-site-verification" content="..." />, extract content
  let cleanCode = (gscCode || '').trim();
  const metaMatch = cleanCode.match(/content=["']([^"']+)["']/i);
  if (metaMatch) {
    cleanCode = metaMatch[1];
  }

  const result = db.bulkUpdateGSC(siteIds, cleanCode);
  return res.json({
    success: true,
    message: `Google Search Console code updated on ${result.updatedCount} website(s)!`,
    updatedCount: result.updatedCount,
    cleanCode
  });
});

// Preview Word .docx file and Auto-Generate Dynamic Banner (Solution 1)
app.post('/api/v1/admin/blogs/preview-docx', upload.single('docxFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Word (.docx) file provided' });
    }

    const { category = 'General', sampleDomain = 'official.com' } = req.body;

    // Parse docx
    const parsed = await parseDocx(req.file.buffer, req.file.originalname);

    // Auto-generate banner (Solution 1)
    const banner = await generateBlogBanner({
      title: parsed.title,
      domain: sampleDomain,
      category: category
    });

    return res.json({
      success: true,
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.excerpt,
      wordCount: parsed.wordCount,
      readTimeMinutes: parsed.readTimeMinutes,
      contentHtml: parsed.contentHtml,
      featuredImage: banner.url,
      bannerInfo: {
        filename: banner.filename,
        url: banner.url
      }
    });
  } catch (err) {
    console.error('Error previewing docx:', err);
    return res.status(500).json({ error: 'Failed to parse Word document: ' + err.message });
  }
});

// Publish Blog to multiple websites
app.post('/api/v1/admin/blogs/publish', async (req, res) => {
  try {
    const { siteIds, title, slug, excerpt, contentHtml, featuredImage, category, metaTitle, metaDescription } = req.body;

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one target website' });
    }
    if (!title || !contentHtml) {
      return res.status(400).json({ error: 'Blog title and content are required' });
    }

    let finalFeaturedImage = featuredImage;

    // If no banner is supplied, auto-generate one on the fly
    if (!finalFeaturedImage) {
      const firstSite = db.getSiteById(siteIds[0]) || { domain: 'official.com', category: category || 'General' };
      const banner = await generateBlogBanner({
        title,
        domain: firstSite.domain,
        category: firstSite.category
      });
      finalFeaturedImage = banner.url;
    }

    const createdBlogs = db.bulkCreateBlogs(siteIds, {
      title,
      slug: slug || require('slugify')(title, { lower: true, strict: true }),
      excerpt: excerpt || '',
      contentHtml,
      featuredImage: finalFeaturedImage,
      category: category || 'General',
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt || ''
    });

    return res.json({
      success: true,
      message: `Blog successfully published to ${createdBlogs.length} website(s)!`,
      publishedCount: createdBlogs.length,
      featuredImage: finalFeaturedImage,
      blogs: createdBlogs
    });
  } catch (err) {
    console.error('Error publishing blog:', err);
    return res.status(500).json({ error: 'Failed to publish blog: ' + err.message });
  }
});

// Delete a blog
app.delete('/api/v1/admin/blogs/:id', (req, res) => {
  const deleted = db.deleteBlog(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Blog not found' });
  }
  return res.json({ success: true, message: 'Blog deleted successfully' });
});

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Central Multi-Site Admin Portal running on http://localhost:${PORT}`);
  console.log(`🌐 Public Config API: http://localhost:${PORT}/api/v1/config?siteId=matka1`);
  console.log(`📚 Public Blog API:   http://localhost:${PORT}/api/v1/blogs?siteId=matka1`);
  console.log(`=======================================================`);
});
