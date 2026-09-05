# 🚀 1-Time Website Integration Guide

Connect any of your React, Next.js, or static HTML websites to the **Central Multi-Site Control Hub** so WhatsApp numbers, Google Search Console codes, and Blog posts update dynamically without redeployments.

---

## 1. Next.js (App Router / SSR)

### A. Dynamic Google Search Console & Metadata
In `app/layout.js`:

```javascript
// app/layout.js
const CENTRAL_API_URL = "http://localhost:5000/api/v1/config?siteId=betting-king"; // Replace with your siteId or domain

export async function generateMetadata() {
  try {
    const res = await fetch(CENTRAL_API_URL, {
      next: { revalidate: 60 } // Automatically revalidates every 60 seconds (zero downtime)
    });
    const config = await res.json();

    return {
      title: "Satta King Fast Result 2026",
      description: "Live results and monthly chart",
      verification: {
        google: config.gscCode || undefined, // Dynamic GSC verification!
      }
    };
  } catch (err) {
    return { title: "Satta King Fast Result 2026" };
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### B. Dynamic WhatsApp Link
In your buttons, floating actions, or navigation:

```javascript
// Fetch site config in Server Component or use SWR/useEffect in Client Component
const res = await fetch("http://localhost:5000/api/v1/config?siteId=betting-king");
const config = await res.json();

// Render link:
<a href={config.whatsappUrl} target="_blank" rel="noreferrer">
  Chat on WhatsApp ({config.whatsappNumber})
</a>
```

### C. Dynamic Blog Page (`app/blogs/page.js`)
```javascript
// app/blogs/page.js
export default async function BlogListPage() {
  const res = await fetch("http://localhost:5000/api/v1/blogs?siteId=betting-king", {
    next: { revalidate: 60 }
  });
  const data = await res.json();

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Latest Articles & Updates</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.blogs.map(blog => (
          <a key={blog.id} href={`/blogs/${blog.slug}`} className="border rounded-xl p-4 block hover:shadow-lg">
            <img src={`http://localhost:5000${blog.featuredImage}`} alt={blog.title} className="rounded-lg mb-3 w-full h-48 object-cover" />
            <h2 className="text-lg font-bold">{blog.title}</h2>
            <p className="text-sm text-gray-500 mt-2">{blog.excerpt}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

---

## 2. React / Vite (Client-Side)

### A. Reusable Hook (`src/hooks/useSiteConfig.js`)
```javascript
// src/hooks/useSiteConfig.js
import { useState, useEffect } from 'react';

const API_BASE = "http://localhost:5000/api/v1";

export function useSiteConfig(siteId = 'matka1') {
  const [config, setConfig] = useState({
    whatsappUrl: 'https://wa.me/918360750829',
    whatsappNumber: '918360750829',
    gscCode: ''
  });

  useEffect(() => {
    fetch(`${API_BASE}/config?siteId=${siteId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConfig(data);
          // Apply Google Search Console meta tag dynamically
          if (data.gscCode) {
            let meta = document.querySelector('meta[name="google-site-verification"]');
            if (!meta) {
              meta = document.createElement('meta');
              meta.name = 'google-site-verification';
              document.head.appendChild(meta);
            }
            meta.content = data.gscCode;
          }
        }
      })
      .catch(console.error);
  }, [siteId]);

  return config;
}
```

### B. In any Component (e.g. `FloatingActions.jsx` or `Footer.jsx`):
```jsx
import { useSiteConfig } from '../hooks/useSiteConfig';

export function FloatingActions() {
  const config = useSiteConfig('matka1');

  return (
    <a href={config.whatsappUrl} target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 ...">
      WhatsApp Support
    </a>
  );
}
```
