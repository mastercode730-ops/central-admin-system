const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SITES_FILE = path.join(DATA_DIR, 'sites.json');
const BLOGS_FILE = path.join(DATA_DIR, 'blogs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default seed sites (empty by default)
const DEFAULT_SITES = [];

function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

class Database {
  constructor() {
    this.sites = readJsonFile(SITES_FILE, DEFAULT_SITES);
    this.blogs = readJsonFile(BLOGS_FILE, []);
  }

  // SITES
  getAllSites() {
    return this.sites;
  }

  getSiteById(idOrDomain) {
    if (!idOrDomain) return null;
    const clean = idOrDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').trim();
    
    // 1. Exact match by id or cleaned domain
    const exact = this.sites.find(s => {
      const sId = (s.id || '').toLowerCase().trim();
      const sDomain = (s.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').trim();
      return sId === clean || sDomain === clean;
    });
    if (exact) return exact;

    // 2. Fuzzy match (e.g. matka1 <-> matka-satta-online <-> matkasatta.online)
    return this.sites.find(s => {
      const sId = (s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sDomain = (s.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[^a-z0-9]/g, '');
      const cleanRaw = clean.replace(/[^a-z0-9]/g, '');
      return sId === cleanRaw || sDomain === cleanRaw || sDomain.includes(cleanRaw) || cleanRaw.includes(sDomain);
    }) || null;
  }

  createSite(siteData) {
    const id = siteData.id || siteData.domain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const existing = this.getSiteById(id);
    if (existing) {
      throw new Error(`Site with ID/Domain "${id}" already exists`);
    }

    const newSite = {
      id,
      name: siteData.name || id,
      domain: siteData.domain || '',
      category: siteData.category || 'General',
      whatsappNumber: siteData.whatsappNumber || '',
      whatsappMessage: siteData.whatsappMessage || '',
      gscCode: siteData.gscCode || '',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.sites.push(newSite);
    writeJsonFile(SITES_FILE, this.sites);
    return newSite;
  }

  updateSite(id, updates) {
    const idx = this.sites.findIndex(s => s.id === id);
    if (idx === -1) return null;

    this.sites[idx] = {
      ...this.sites[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    writeJsonFile(SITES_FILE, this.sites);
    return this.sites[idx];
  }

  bulkUpdateWhatsApp(siteIds, whatsappNumber, whatsappMessage) {
    let updatedCount = 0;
    this.sites = this.sites.map(site => {
      if (siteIds.includes(site.id) || siteIds.includes('ALL')) {
        updatedCount++;
        return {
          ...site,
          whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : site.whatsappNumber,
          whatsappMessage: whatsappMessage !== undefined ? whatsappMessage : site.whatsappMessage,
          updatedAt: new Date().toISOString()
        };
      }
      return site;
    });

    writeJsonFile(SITES_FILE, this.sites);
    return { success: true, updatedCount };
  }

  bulkUpdateGSC(siteIds, gscCode) {
    let updatedCount = 0;
    this.sites = this.sites.map(site => {
      if (siteIds.includes(site.id) || siteIds.includes('ALL')) {
        updatedCount++;
        return {
          ...site,
          gscCode: gscCode !== undefined ? gscCode.trim() : site.gscCode,
          updatedAt: new Date().toISOString()
        };
      }
      return site;
    });

    writeJsonFile(SITES_FILE, this.sites);
    return { success: true, updatedCount };
  }

  deleteSite(id) {
    const initialLen = this.sites.length;
    this.sites = this.sites.filter(s => s.id !== id);
    if (this.sites.length !== initialLen) {
      writeJsonFile(SITES_FILE, this.sites);
      return true;
    }
    return false;
  }

  // BLOGS
  getAllBlogs(siteId = null) {
    if (!siteId || siteId === 'ALL') {
      return this.blogs;
    }
    const query = siteId.toLowerCase();
    return this.blogs.filter(b => b.siteId.toLowerCase() === query);
  }

  getBlogBySlug(slug, siteId = null) {
    const slugQuery = slug.toLowerCase();
    if (siteId) {
      const siteQuery = siteId.toLowerCase();
      return this.blogs.find(b => b.slug.toLowerCase() === slugQuery && b.siteId.toLowerCase() === siteQuery) || null;
    }
    return this.blogs.find(b => b.slug.toLowerCase() === slugQuery) || null;
  }

  createBlog(blogData) {
    const id = 'blog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newBlog = {
      id,
      siteId: blogData.siteId,
      title: blogData.title,
      slug: blogData.slug,
      excerpt: blogData.excerpt || '',
      contentHtml: blogData.contentHtml,
      featuredImage: blogData.featuredImage || '',
      category: blogData.category || 'General',
      metaTitle: blogData.metaTitle || blogData.title,
      metaDescription: blogData.metaDescription || blogData.excerpt || '',
      status: 'published',
      publishedAt: new Date().toISOString()
    };

    // Remove existing if duplicate slug on same site
    this.blogs = this.blogs.filter(b => !(b.siteId === newBlog.siteId && b.slug === newBlog.slug));
    this.blogs.unshift(newBlog);
    writeJsonFile(BLOGS_FILE, this.blogs);
    return newBlog;
  }

  bulkCreateBlogs(siteIds, blogPayload) {
    const created = [];
    for (const siteId of siteIds) {
      const blog = this.createBlog({
        ...blogPayload,
        siteId
      });
      created.push(blog);
    }
    return created;
  }

  deleteBlog(id) {
    const initialLen = this.blogs.length;
    this.blogs = this.blogs.filter(b => b.id !== id);
    if (this.blogs.length !== initialLen) {
      writeJsonFile(BLOGS_FILE, this.blogs);
      return true;
    }
    return false;
  }
}

module.exports = new Database();
