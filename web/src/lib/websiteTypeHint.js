/**
 * Fast hostname heuristic for the New Run form (preview only).
 * Runtime detection uses @zero/analyzer Web Analyzer during the pipeline.
 */
export function detectWebsiteTypeFromUrl(url) {
  if (!url || !String(url).trim()) return null;
  try {
    const hostname = new URL(url.trim()).hostname.toLowerCase();

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

export function normalizeTargetUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
