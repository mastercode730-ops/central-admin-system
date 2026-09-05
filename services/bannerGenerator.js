const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Theme color definitions based on category
const THEMES = {
  Cricket: {
    badge: 'CRICKET INSIDER',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    badgeBorder: '#10b981',
    badgeText: '#34d399',
    accent: '#10b981',
    accent2: '#06b6d4',
    bgStart: '#09151f',
    bgEnd: '#020617',
    glowColor: 'rgba(16, 185, 129, 0.25)'
  },
  Matka: {
    badge: 'MATKA LIVE UPDATES',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    badgeBorder: '#f59e0b',
    badgeText: '#fbbf24',
    accent: '#f59e0b',
    accent2: '#ef4444',
    bgStart: '#1a1005',
    bgEnd: '#0a0502',
    glowColor: 'rgba(245, 158, 11, 0.25)'
  },
  Satta: {
    badge: 'SATTA KING RESULTS',
    badgeBg: 'rgba(234, 179, 8, 0.2)',
    badgeBorder: '#eab308',
    badgeText: '#fde047',
    accent: '#eab308',
    accent2: '#f97316',
    bgStart: '#1c1303',
    bgEnd: '#0a0802',
    glowColor: 'rgba(234, 179, 8, 0.25)'
  },
  'Betting ID': {
    badge: 'VERIFIED ONLINE ID',
    badgeBg: 'rgba(99, 102, 241, 0.2)',
    badgeBorder: '#6366f1',
    badgeText: '#818cf8',
    accent: '#6366f1',
    accent2: '#ec4899',
    bgStart: '#0f1026',
    bgEnd: '#030712',
    glowColor: 'rgba(99, 102, 241, 0.3)'
  },
  General: {
    badge: 'FEATURED ARTICLE',
    badgeBg: 'rgba(59, 130, 246, 0.2)',
    badgeBorder: '#3b82f6',
    badgeText: '#60a5fa',
    accent: '#3b82f6',
    accent2: '#8b5cf6',
    bgStart: '#0f172a',
    bgEnd: '#020617',
    glowColor: 'rgba(59, 130, 246, 0.25)'
  }
};

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Generates an SEO 1200x630 branded blog banner image
 */
async function generateBlogBanner({ title, domain = 'official.com', category = 'General', filename = null }) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const theme = THEMES[category] || THEMES.General;

  // 1. Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgStart);
  bgGrad.addColorStop(0.6, '#080d1a');
  bgGrad.addColorStop(1, theme.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Radial Glow Circles
  // Top Right Glow
  const glow1 = ctx.createRadialGradient(width - 150, 150, 20, width - 150, 150, 450);
  glow1.addColorStop(0, theme.glowColor);
  glow1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // Bottom Left Glow
  const glow2 = ctx.createRadialGradient(150, height - 100, 20, 150, height - 100, 400);
  glow2.addColorStop(0, theme.glowColor);
  glow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // 3. Tech Grid Dots / Lines overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 4. Glowing Accent Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Top accent line
  const topAccentGrad = ctx.createLinearGradient(60, 30, width - 60, 30);
  topAccentGrad.addColorStop(0, theme.accent);
  topAccentGrad.addColorStop(0.5, theme.accent2);
  topAccentGrad.addColorStop(1, theme.accent);
  ctx.strokeStyle = topAccentGrad;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(80, 30);
  ctx.lineTo(400, 30);
  ctx.stroke();

  // 5. Header: Category Pill Badge (Top Left)
  const badgeX = 80;
  const badgeY = 75;
  ctx.fillStyle = theme.badgeBg;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, 240, 42, 21);
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw circle indicator inside badge
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(badgeX + 24, badgeY + 21, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.badgeText;
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(theme.badge, badgeX + 40, badgeY + 27);

  // 6. Header: Domain Badge (Top Right)
  const domainText = domain.toUpperCase();
  ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
  const domainWidth = ctx.measureText(domainText).width + 50;
  const domainX = width - 80 - domainWidth;
  const domainY = 75;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(domainX, domainY, domainWidth, 42, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(domainText, domainX + domainWidth / 2, domainY + 27);

  // 7. Blog Title (Auto-wrapped bold H1)
  ctx.textAlign = 'left';
  const maxTitleWidth = width - 180; // 1020px
  let fontSize = 48;
  ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;

  let lines = wrapText(ctx, title, maxTitleWidth);
  if (lines.length > 3) {
    fontSize = 38;
    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    lines = wrapText(ctx, title, maxTitleWidth);
  }
  if (lines.length > 4) {
    lines = lines.slice(0, 4);
    lines[3] += '...';
  }

  const lineHeight = fontSize * 1.25;
  const totalTextHeight = lines.length * lineHeight;
  const startY = 180 + (280 - totalTextHeight) / 2 + fontSize;

  lines.forEach((line, index) => {
    const yPos = startY + index * lineHeight;

    // Subtle drop shadow for text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = index === 0 ? '#ffffff' : '#e2e8f0';
    ctx.fillText(line, 80, yPos);
  });

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // 8. Footer Info Bar (Bottom)
  const footerY = height - 90;

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, footerY - 20);
  ctx.lineTo(width - 80, footerY - 20);
  ctx.stroke();

  // Bottom Left: Verified & Live Badge
  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  ctx.fillText(`${dateStr}   |   3 Min Read   |   Verified Official Guide`, 80, footerY + 12);

  // Bottom Right: CTA Pill
  const ctaText = 'READ FULL POST →';
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  const ctaWidth = ctx.measureText(ctaText).width + 40;
  const ctaX = width - 80 - ctaWidth;

  const ctaGrad = ctx.createLinearGradient(ctaX, footerY - 12, ctaX + ctaWidth, footerY + 24);
  ctaGrad.addColorStop(0, theme.accent);
  ctaGrad.addColorStop(1, theme.accent2);
  ctx.fillStyle = ctaGrad;

  ctx.beginPath();
  ctx.roundRect(ctaX, footerY - 12, ctaWidth, 36, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(ctaText, ctaX + ctaWidth / 2, footerY + 11);

  // Save to file
  const outFilename = filename || `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`;
  const outPath = path.join(UPLOADS_DIR, outFilename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);

  return {
    filename: outFilename,
    url: `/uploads/${outFilename}`,
    localPath: outPath,
    buffer
  };
}

module.exports = {
  generateBlogBanner,
  THEMES
};
