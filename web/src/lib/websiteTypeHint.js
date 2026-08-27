/**
 * Fast hostname heuristic for the New Run form (preview only).
 * Runtime detection uses @zero/analyzer Web Analyzer during the pipeline.
 */
export function detectWebsiteTypeFromUrl(url) {
  const normalized = normalizeTargetUrl(url);
  if (!normalized) return null;
  try {
    const hostname = new URL(normalized).hostname.toLowerCase();

    if (hostname.includes('supersaravanastores') || hostname.includes('saravana')) {
      return 'Retail Store';
    }
    if (hostname.includes('flipkart')) return 'E-commerce (Flipkart)';
    if (hostname.includes('amazon')) return 'E-commerce (Amazon)';
    if (hostname.includes('myntra') || hostname.includes('ajio') || hostname.includes('nykaa')) {
      return 'E-commerce Platform';
    }
    if (hostname.includes('shop') || hostname.includes('store') || hostname.includes('cart')) {
      return 'E-commerce Platform';
    }

    if (hostname.includes('pharma') || hostname.includes('mankind') || hostname.includes('1mg')) {
      return 'Healthcare / Pharma';
    }
    if (hostname.includes('health') || hostname.includes('medical') || hostname.includes('hospital')) {
      return 'Healthcare Website';
    }

    if (hostname.includes('netflix') || hostname.includes('hotstar') || hostname.includes('primevideo')) {
      return 'OTT Streaming';
    }
    if (hostname.includes('youtube') || hostname.includes('vimeo') || hostname.includes('spotify')) {
      return 'Streaming / Media';
    }
    if (hostname.includes('aha') || hostname.includes('zee5') || hostname.includes('tvnz') || hostname.includes('quickplay')) {
      return 'OTT / Video Platform';
    }

    if (hostname.includes('bank') || hostname.includes('hdfc') || hostname.includes('icici') || hostname.includes('paytm')) {
      return 'Banking / Finance';
    }
    if (hostname.includes('swiggy') || hostname.includes('zomato') || hostname.includes('doordash')) {
      return 'Food Delivery';
    }
    if (hostname.includes('makemytrip') || hostname.includes('booking') || hostname.includes('airline')) {
      return 'Travel / Booking';
    }
    if (hostname.includes('coursera') || hostname.includes('udemy') || hostname.includes('.edu')) {
      return 'Education Platform';
    }
    if (hostname.includes('.gov') || hostname.includes('govt')) {
      return 'Government Portal';
    }
    if (hostname.includes('news') || hostname.includes('times') || hostname.includes('bbc')) {
      return 'News / Media';
    }
    if (
      hostname.includes('corp') ||
      hostname.includes('enterprise') ||
      hostname.includes('saas') ||
      hostname.includes('cloud') ||
      hostname.includes('platform')
    ) {
      return 'Corporate / SaaS Website';
    }

    return 'Website (auto-detect on crawl)';
  } catch {
    return null;
  }
}

/**
 * Prefix https:// when omitted and reject non-http(s) values.
 * Returns a fully-qualified URL, or '' if the input is empty/invalid.
 */
export function normalizeTargetUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed || /\s/.test(trimmed)) return '';

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  if (!hasScheme && /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '';

  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) return '';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    const isIp = /^\d+(\.\d+){3}$/.test(hostname);
    if (!isLocal && !isIp && !hostname.includes('.')) return '';
    return parsed.href;
  } catch {
    return '';
  }
}
