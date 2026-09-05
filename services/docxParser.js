const mammoth = require('mammoth');
const slugify = require('slugify');

/**
 * Parses a Word (.docx) buffer into clean structured Blog data
 */
async function parseDocx(fileBuffer, originalFilename = 'blog.docx') {
  // Custom style map to ensure headings convert to standard HTML tags
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => p.lead:fresh"
    ]
  };

  // Convert to HTML
  const { value: rawHtml, messages } = await mammoth.convertToHtml({ buffer: fileBuffer }, options);
  // Also extract raw text for excerpt and word count
  const { value: rawText } = await mammoth.extractRawText({ buffer: fileBuffer });

  // Clean HTML
  let contentHtml = rawHtml.trim();

  // Extract Title:
  // 1. Try to find first <h1> or <h2> tag
  let title = '';
  const h1Match = contentHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h2Match = contentHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);

  if (h1Match && h1Match[1].trim()) {
    title = h1Match[1].replace(/<[^>]*>/g, '').trim();
    // Remove the title from body if it's right at the start to avoid duplication
    contentHtml = contentHtml.replace(h1Match[0], '').trim();
  } else if (h2Match && h2Match[1].trim()) {
    title = h2Match[1].replace(/<[^>]*>/g, '').trim();
    contentHtml = contentHtml.replace(h2Match[0], '').trim();
  } else {
    // 2. Fallback: first non-empty line of text or filename
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      title = lines[0];
    } else {
      title = originalFilename.replace(/\.docx$/i, '').replace(/[-_]/g, ' ');
    }
  }

  // Generate clean slug
  const slug = slugify(title.substring(0, 80), {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  }) || 'blog-post-' + Date.now();

  // Extract excerpt / meta description (first ~160 chars of body text)
  const cleanBodyText = rawText
    .replace(title, '')
    .replace(/\s+/g, ' ')
    .trim();
  const metaDescription = cleanBodyText.substring(0, 160) + (cleanBodyText.length > 160 ? '...' : '');

  // Calculate read time
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    title,
    slug,
    contentHtml,
    excerpt: metaDescription,
    metaDescription,
    wordCount,
    readTimeMinutes,
    messages
  };
}

module.exports = {
  parseDocx
};
