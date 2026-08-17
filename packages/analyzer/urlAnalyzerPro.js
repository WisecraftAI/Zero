/**
 * URL Analyzer Pro - Professional-Grade Website Analysis Agent
 * 
 * Enterprise-level website analysis for any domain:
 * - Retail Stores (Super Saravana Stores, local retail chains)
 * - E-commerce (Flipkart, Amazon, Myntra, etc.)
 * - Healthcare/Pharma (Mankind Pharma, Apollo, etc.)
 * - Banking/Finance
 * - Corporate Websites
 * - OTT/Streaming Platforms
 * - And more...
 * 
 * This agent intelligently adapts its analysis and test generation based on the
 * actual website type, not hardcoded assumptions.
 */

const { detectDomain, getDomainConfig, getSelectors } = require("@zero/locators/ecommerceSelectors");

// ============================================================================
// DOMAIN DETECTION - INTELLIGENT WEBSITE TYPE CLASSIFICATION
// ============================================================================

/**
 * Website types with their characteristics and testing priorities
 */
const WEBSITE_TYPES = {
  ECOMMERCE: {
    name: 'E-commerce Platform',
    indicators: ['cart', 'add to cart', 'buy now', 'checkout', 'product', 'price', 'shop', 'store'],
    urlPatterns: ['flipkart', 'amazon', 'myntra', 'ebay', 'walmart', 'etsy', 'shopify'],
    testPriorities: ['Search', 'Product Listing', 'Product Details', 'Add to Cart', 'Checkout', 'User Auth'],
    criticalFlows: ['Search to Purchase', 'Cart Management', 'Checkout Flow']
  },
  RETAIL_STORE: {
    name: 'Retail Store Website',
    indicators: ['branches', 'stores', 'locations', 'visit us', 'store locator', 'our stores', 'retail', 'showroom'],
    urlPatterns: ['saravana', 'reliance', 'dmart', 'bigbazaar', 'pantaloons'],
    testPriorities: ['Navigation', 'Store Locator', 'Product Categories', 'Contact Info', 'Branch Info'],
    criticalFlows: ['Store Discovery', 'Branch Information', 'Contact Flow']
  },
  HEALTHCARE_PHARMA: {
    name: 'Healthcare/Pharmaceutical',
    indicators: ['health', 'pharma', 'medicine', 'doctor', 'patient', 'adverse event', 'drug', 'prescription'],
    urlPatterns: ['pharma', 'apollo', 'netmeds', '1mg', 'practo', 'medplus', 'mankind'],
    testPriorities: ['Product Info', 'Contact Forms', 'Adverse Event Reporting', 'Doctor/Patient Portal'],
    criticalFlows: ['Information Access', 'Contact Submission', 'Adverse Event Reporting']
  },
  BANKING_FINANCE: {
    name: 'Banking/Finance Portal',
    indicators: ['banking', 'loan', 'account', 'transfer', 'payment', 'credit', 'debit', 'investment'],
    urlPatterns: ['bank', 'hdfc', 'icici', 'sbi', 'axis', 'paytm', 'phonepe', 'zerodha'],
    testPriorities: ['Login Security', 'Account Management', 'Transactions', 'Fund Transfer'],
    criticalFlows: ['Secure Login', 'Transaction Flow', 'Balance Check']
  },
  OTT_STREAMING: {
    name: 'OTT/Streaming Platform',
    indicators: ['watch', 'stream', 'play', 'episode', 'series', 'movie', 'subscribe', 'continue watching'],
    urlPatterns: ['netflix', 'hotstar', 'primevideo', 'youtube', 'zee5', 'sonyliv', 'aha', 'tvnz'],
    testPriorities: ['Content Discovery', 'Video Playback', 'User Profile', 'Subscription'],
    criticalFlows: ['Content Playback', 'Search & Discovery', 'User Authentication']
  },
  CORPORATE: {
    name: 'Corporate Website',
    indicators: ['about us', 'careers', 'investor', 'leadership', 'sustainability', 'csr', 'annual report'],
    urlPatterns: ['corp', 'group', 'holdings'],
    testPriorities: ['Navigation', 'Information Pages', 'Contact Forms', 'Career Portal'],
    criticalFlows: ['Information Discovery', 'Contact Submission', 'Career Application']
  },
  FOOD_DELIVERY: {
    name: 'Food Delivery Platform',
    indicators: ['restaurant', 'menu', 'order food', 'delivery', 'cuisine', 'dishes'],
    urlPatterns: ['swiggy', 'zomato', 'uber', 'doordash', 'dunzo'],
    testPriorities: ['Restaurant Search', 'Menu Browse', 'Cart', 'Checkout', 'Order Tracking'],
    criticalFlows: ['Restaurant Discovery', 'Order Placement', 'Payment']
  },
  TRAVEL_BOOKING: {
    name: 'Travel Booking Platform',
    indicators: ['flight', 'hotel', 'booking', 'travel', 'trip', 'destination', 'itinerary'],
    urlPatterns: ['makemytrip', 'goibibo', 'booking', 'airbnb', 'yatra', 'cleartrip'],
    testPriorities: ['Search', 'Booking Flow', 'Payment', 'Itinerary Management'],
    criticalFlows: ['Search to Book', 'Payment Flow', 'Booking Management']
  },
  EDUCATION: {
    name: 'Education Platform',
    indicators: ['course', 'learn', 'student', 'teacher', 'class', 'exam', 'certificate'],
    urlPatterns: ['coursera', 'udemy', 'byju', 'unacademy', 'edu'],
    testPriorities: ['Course Discovery', 'Enrollment', 'Content Access', 'Progress Tracking'],
    criticalFlows: ['Course Enrollment', 'Learning Flow', 'Assessment']
  },
  NEWS_MEDIA: {
    name: 'News/Media Website',
    indicators: ['news', 'article', 'breaking', 'headline', 'reporter', 'editorial'],
    urlPatterns: ['news', 'times', 'ndtv', 'bbc', 'cnn', 'hindu', 'indian'],
    testPriorities: ['Content Loading', 'Navigation', 'Search', 'Category Browse'],
    criticalFlows: ['Content Discovery', 'Article Reading', 'Search']
  },
  SOCIAL_MEDIA: {
    name: 'Social Media Platform',
    indicators: ['post', 'share', 'like', 'comment', 'follow', 'friend', 'profile', 'feed'],
    urlPatterns: ['facebook', 'instagram', 'twitter', 'linkedin', 'pinterest'],
    testPriorities: ['Authentication', 'Feed Loading', 'Posting', 'Interactions'],
    criticalFlows: ['Login', 'Content Posting', 'Social Interactions']
  },
  GENERIC: {
    name: 'Website',
    indicators: [],
    urlPatterns: [],
    testPriorities: ['Navigation', 'Content Display', 'Forms', 'Responsiveness'],
    criticalFlows: ['Navigation', 'Information Access', 'Contact']
  }
};

/**
 * Intelligently detect website type from URL and page content
 */
async function detectWebsiteType(page, url) {
  const result = {
    type: 'GENERIC',
    typeName: 'Website',
    confidence: 0,
    indicators: []
  };

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const pathname = new URL(url).pathname.toLowerCase();
    
    // First check URL patterns (highest confidence)
    for (const [type, config] of Object.entries(WEBSITE_TYPES)) {
      if (config.urlPatterns?.some(pattern => hostname.includes(pattern))) {
        result.type = type;
        result.typeName = config.name;
        result.confidence = 0.9;
        result.indicators.push(`URL pattern match: ${hostname}`);
        break;
      }
    }

    // If not matched by URL, analyze page content
    if (result.confidence < 0.5) {
      const pageText = await page.evaluate(() => {
        return document.body?.innerText?.toLowerCase() || '';
      }).catch(() => '');
      
      const pageTitle = await page.title().catch(() => '');
      const metaDescription = await page.$eval('meta[name="description"]', m => m.content?.toLowerCase()).catch(() => '');
      const combinedText = `${pageText} ${pageTitle} ${metaDescription}`.toLowerCase();

      // Score each website type based on indicators
      let bestScore = 0;
      let bestType = 'GENERIC';

      for (const [type, config] of Object.entries(WEBSITE_TYPES)) {
        if (!config.indicators.length) continue;
        
        let score = 0;
        const matchedIndicators = [];
        
        for (const indicator of config.indicators) {
          if (combinedText.includes(indicator)) {
            score++;
            matchedIndicators.push(indicator);
          }
        }
        
        const normalizedScore = score / config.indicators.length;
        
        if (normalizedScore > bestScore) {
          bestScore = normalizedScore;
          bestType = type;
          result.indicators = matchedIndicators;
        }
      }

      if (bestScore > 0.2) {
        result.type = bestType;
        result.typeName = WEBSITE_TYPES[bestType].name;
        result.confidence = Math.min(0.85, 0.3 + bestScore);
      }
    }

    // Special handling for retail stores
    if (hostname.includes('saravana') || hostname.includes('supersaravana')) {
      result.type = 'RETAIL_STORE';
      result.typeName = 'Retail Store (Super Saravana Stores)';
      result.confidence = 0.95;
      result.indicators = ['saravana stores brand'];
    }

    // Add testing priorities and critical flows
    const typeConfig = WEBSITE_TYPES[result.type];
    result.testPriorities = typeConfig.testPriorities;
    result.criticalFlows = typeConfig.criticalFlows;

  } catch (error) {
    console.error('Website type detection error:', error.message);
  }

  return result;
}

// ============================================================================
// ELEMENT ANALYSIS - COMPREHENSIVE ELEMENT DISCOVERY
// ============================================================================

/**
 * Element categories for comprehensive analysis
 */
const ELEMENT_CATEGORIES = {
  NAVIGATION: {
    selectors: ['nav', 'header', '[role="navigation"]', '[role="menubar"]', '.nav', '.menu', '.navbar', '[class*="nav"]'],
    priority: 'Critical'
  },
  HEADER: {
    selectors: ['header', '[role="banner"]', '.header', '[class*="header"]'],
    priority: 'High'
  },
  FOOTER: {
    selectors: ['footer', '[role="contentinfo"]', '.footer', '[class*="footer"]'],
    priority: 'Medium'
  },
  FORMS: {
    selectors: ['form', '[role="form"]'],
    priority: 'High'
  },
  INPUTS: {
    selectors: ['input:not([type="hidden"])', 'textarea', 'select', '[contenteditable="true"]'],
    priority: 'High'
  },
  BUTTONS: {
    selectors: ['button', '[role="button"]', 'input[type="submit"]', 'input[type="button"]', '.btn', '[class*="button"]', 'a[class*="btn"]'],
    priority: 'High'
  },
  LINKS: {
    selectors: ['a[href]:not([href^="#"]):not([href^="javascript"])'],
    priority: 'Medium'
  },
  IMAGES: {
    selectors: ['img[src]', 'picture', '[role="img"]', 'svg[class]', '[class*="image"]'],
    priority: 'Medium'
  },
  CARDS: {
    selectors: ['[class*="card"]', 'article', '.product', '[class*="product"]', '[class*="item"]'],
    priority: 'Medium'
  },
  MODALS: {
    selectors: ['[role="dialog"]', '[role="alertdialog"]', '.modal', '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]'],
    priority: 'Medium'
  },
  TABLES: {
    selectors: ['table', '[role="grid"]', '[role="table"]'],
    priority: 'Medium'
  },
  LISTS: {
    selectors: ['ul:not([role])', 'ol', '[role="list"]', '[role="listbox"]'],
    priority: 'Low'
  },
  INTERACTIVE: {
    selectors: ['[onclick]', '[data-action]', '[tabindex]:not([tabindex="-1"])', '[class*="click"]', '[class*="toggle"]'],
    priority: 'High'
  },
  MEDIA: {
    selectors: ['video', 'audio', 'iframe[src*="youtube"]', 'iframe[src*="vimeo"]', '[class*="player"]', '[class*="video"]'],
    priority: 'High'
  },
  SEARCH: {
    selectors: ['input[type="search"]', 'input[name*="search"]', 'input[placeholder*="search" i]', '[class*="search"]', '[role="searchbox"]', 'input[name="q"]'],
    priority: 'Critical'
  },
  CART: {
    selectors: ['[class*="cart"]', '[data-cart]', '[href*="cart"]', '[class*="basket"]', '[class*="bag"]'],
    priority: 'Critical'
  },
  AUTH: {
    selectors: ['[class*="login"]', '[class*="signin"]', '[class*="signup"]', '[class*="register"]', '[href*="login"]', '[href*="auth"]', '[href*="signin"]'],
    priority: 'High'
  },
  SLIDER: {
    selectors: ['[class*="slider"]', '[class*="carousel"]', '[class*="swiper"]', '[class*="slideshow"]', '.slick-slider'],
    priority: 'Medium'
  },
  GALLERY: {
    selectors: ['[class*="gallery"]', '[class*="lightbox"]', '[class*="grid"] img'],
    priority: 'Medium'
  },
  SOCIAL: {
    selectors: ['[href*="facebook"]', '[href*="twitter"]', '[href*="instagram"]', '[href*="linkedin"]', '[href*="youtube"]', '[class*="social"]'],
    priority: 'Low'
  },
  ACCORDION: {
    selectors: ['[class*="accordion"]', '[class*="collapse"]', '[class*="expand"]', 'details', 'summary'],
    priority: 'Medium'
  },
  TABS: {
    selectors: ['[role="tablist"]', '[class*="tab"]', '[data-toggle="tab"]'],
    priority: 'Medium'
  },
  BREADCRUMB: {
    selectors: ['[class*="breadcrumb"]', '[aria-label="breadcrumb"]', 'nav[class*="crumb"]'],
    priority: 'Low'
  }
};

/**
 * Deep element analyzer with intelligent selector generation
 */
async function analyzeElements(page, category, selectors) {
  const elements = [];
  
  for (const selector of selectors) {
    try {
      const found = await page.$$(selector);
      
      for (let i = 0; i < Math.min(found.length, 25); i++) {
        try {
          const info = await found[i].evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(node);
            
            // Skip hidden or off-screen elements
            if (rect.width === 0 || rect.height === 0) return null;
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return null;
            if (rect.top < -1000 || rect.left < -1000) return null;
            
            return {
              tagName: node.tagName.toLowerCase(),
              id: node.id || null,
              className: node.className?.toString?.()?.slice(0, 200) || '',
              text: node.textContent?.trim()?.slice(0, 150) || '',
              innerText: node.innerText?.trim()?.slice(0, 100) || '',
              placeholder: node.placeholder || null,
              name: node.name || null,
              type: node.type || null,
              href: node.href || null,
              src: node.src?.slice(0, 250) || null,
              alt: node.alt || null,
              ariaLabel: node.getAttribute('aria-label') || null,
              ariaRole: node.getAttribute('role') || null,
              dataTestId: node.getAttribute('data-testid') || node.getAttribute('data-test-id') || node.getAttribute('data-test') || null,
              value: node.value?.slice(0, 100) || null,
              required: node.required || false,
              disabled: node.disabled || false,
              position: { 
                x: Math.round(rect.x), 
                y: Math.round(rect.y), 
                width: Math.round(rect.width), 
                height: Math.round(rect.height) 
              },
              isAboveFold: rect.top < window.innerHeight,
              childCount: node.children.length,
              hasClickHandler: node.onclick !== null || node.hasAttribute('onclick'),
              tabIndex: node.tabIndex
            };
          });

          if (info) {
            info.category = category;
            info.originalSelector = selector;
            info.selector = generateSmartSelector(info);
            elements.push(info);
          }
        } catch (_) { /* skip failed element */ }
      }
    } catch (_) { /* skip failed selector */ }
  }

  // Deduplicate by selector
  const unique = elements.filter((el, i, arr) => 
    arr.findIndex(e => e.selector === el.selector || (e.id && e.id === el.id)) === i
  );

  return unique;
}

/**
 * Generate the most reliable CSS selector for automation
 */
function generateSmartSelector(elementInfo) {
  // Priority 1: data-testid (most reliable)
  if (elementInfo.dataTestId) {
    return `[data-testid="${elementInfo.dataTestId}"]`;
  }
  
  // Priority 2: Unique ID
  if (elementInfo.id && !elementInfo.id.match(/^\d/) && !elementInfo.id.includes('random')) {
    return `#${elementInfo.id}`;
  }
  
  // Priority 3: Aria-label (accessibility-friendly)
  if (elementInfo.ariaLabel && elementInfo.ariaLabel.length < 60) {
    return `[aria-label="${elementInfo.ariaLabel.replace(/"/g, '\\"')}"]`;
  }
  
  // Priority 4: Name attribute for form elements
  if (elementInfo.name && ['input', 'select', 'textarea'].includes(elementInfo.tagName)) {
    return `${elementInfo.tagName}[name="${elementInfo.name}"]`;
  }
  
  // Priority 5: Role + text for buttons/links
  if (elementInfo.ariaRole && elementInfo.innerText && elementInfo.innerText.length < 40) {
    return `[role="${elementInfo.ariaRole}"]:has-text("${elementInfo.innerText.slice(0, 30)}")`;
  }
  
  // Priority 6: Placeholder for inputs
  if (elementInfo.placeholder && elementInfo.placeholder.length < 50) {
    return `${elementInfo.tagName}[placeholder*="${elementInfo.placeholder.slice(0, 30)}"]`;
  }
  
  // Priority 7: Href for links
  if (elementInfo.href && elementInfo.tagName === 'a') {
    const path = new URL(elementInfo.href, 'http://dummy').pathname;
    if (path && path !== '/' && path.length < 60) {
      return `a[href*="${path}"]`;
    }
  }
  
  // Priority 8: Meaningful class names (filter out utility classes)
  if (elementInfo.className) {
    const meaningfulClasses = elementInfo.className
      .split(/\s+/)
      .filter(c => 
        c.length > 3 && 
        !c.match(/^[a-z]{1,2}\d+$/) && // Skip utility classes like p2, m4
        !c.match(/^\d/) &&
        !c.includes('active') &&
        !c.includes('hover') &&
        !c.includes('focus')
      )
      .slice(0, 2);
    
    if (meaningfulClasses.length) {
      return `${elementInfo.tagName}.${meaningfulClasses.join('.')}`;
    }
  }
  
  // Priority 9: Text content for buttons/links
  if (elementInfo.innerText && elementInfo.innerText.length > 2 && elementInfo.innerText.length < 35) {
    return `${elementInfo.tagName}:has-text("${elementInfo.innerText}")`;
  }
  
  // Fallback
  return elementInfo.originalSelector || elementInfo.tagName;
}

// ============================================================================
// PAGE STRUCTURE ANALYSIS
// ============================================================================

/**
 * Analyze complete page structure
 */
async function analyzePageStructure(page) {
  return page.evaluate(() => {
    const structure = {
      title: document.title,
      url: window.location.href,
      language: document.documentElement.lang || 'en',
      charset: document.characterSet,
      viewport: document.querySelector('meta[name="viewport"]')?.content,
      headings: [],
      sections: [],
      landmarks: [],
      mainContent: null,
      metaTags: {},
      performance: {}
    };

    // Collect all headings with hierarchy
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingElements.forEach((h, i) => {
      if (i < 40) {
        structure.headings.push({
          level: parseInt(h.tagName[1]),
          text: h.textContent?.trim()?.slice(0, 120) || '',
          id: h.id || null,
          isVisible: h.offsetParent !== null
        });
      }
    });

    // Collect landmark regions
    const landmarkRoles = ['main', 'banner', 'navigation', 'contentinfo', 'complementary', 'search', 'form', 'region'];
    document.querySelectorAll(`[role], main, nav, header, footer, aside, section[aria-label], section[aria-labelledby]`).forEach((el, i) => {
      if (i < 30) {
        const role = el.getAttribute('role') || el.tagName.toLowerCase();
        structure.landmarks.push({
          tag: el.tagName.toLowerCase(),
          role: role,
          ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'),
          id: el.id,
          hasContent: el.children.length > 0
        });
      }
    });

    // Get main content area
    const main = document.querySelector('main, [role="main"], #main, #content, .main-content, .content');
    if (main) {
      structure.mainContent = {
        tag: main.tagName.toLowerCase(),
        id: main.id,
        className: main.className?.toString?.()?.slice(0, 100),
        childCount: main.children.length
      };
    }

    // Collect important meta tags
    const metaSelectors = [
      'meta[name="description"]',
      'meta[name="keywords"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:image"]',
      'meta[name="robots"]'
    ];
    metaSelectors.forEach(sel => {
      const meta = document.querySelector(sel);
      if (meta) {
        const key = meta.getAttribute('name') || meta.getAttribute('property');
        structure.metaTags[key] = meta.content?.slice(0, 200);
      }
    });

    // Basic performance metrics
    if (window.performance) {
      const timing = performance.timing;
      if (timing.loadEventEnd) {
        structure.performance = {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          domInteractive: timing.domInteractive - timing.navigationStart
        };
      }
    }

    // Sections analysis
    document.querySelectorAll('section, [class*="section"], main > div').forEach((sec, i) => {
      if (i < 20) {
        const heading = sec.querySelector('h1, h2, h3');
        structure.sections.push({
          id: sec.id,
          className: sec.className?.toString?.()?.slice(0, 80),
          heading: heading?.textContent?.trim()?.slice(0, 60) || null,
          childCount: sec.children.length,
          hasImages: sec.querySelectorAll('img').length > 0,
          hasVideos: sec.querySelectorAll('video, iframe').length > 0
        });
      }
    });

    return structure;
  });
}

/**
 * Analyze forms in deep detail
 */
async function analyzeFormsDeep(page) {
  return page.evaluate(() => {
    const forms = [];
    
    document.querySelectorAll('form').forEach((form, i) => {
      if (i >= 15) return;

      const fields = [];
      form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((field, j) => {
        if (j >= 30) return;
        
        // Find associated label
        let label = null;
        if (field.id) {
          label = document.querySelector(`label[for="${field.id}"]`)?.textContent?.trim();
        }
        if (!label && field.labels?.length) {
          label = field.labels[0]?.textContent?.trim();
        }
        if (!label) {
          // Check for wrapper label
          const wrapper = field.closest('label');
          if (wrapper) {
            label = wrapper.textContent?.replace(field.value || '', '')?.trim();
          }
        }

        fields.push({
          tagName: field.tagName.toLowerCase(),
          type: field.type || 'text',
          name: field.name || null,
          id: field.id || null,
          placeholder: field.placeholder || null,
          required: field.required || field.getAttribute('aria-required') === 'true',
          pattern: field.pattern || null,
          minLength: field.minLength > 0 ? field.minLength : null,
          maxLength: field.maxLength > 0 && field.maxLength < 10000 ? field.maxLength : null,
          min: field.min || null,
          max: field.max || null,
          label: label?.slice(0, 80),
          ariaLabel: field.getAttribute('aria-label'),
          autocomplete: field.autocomplete || null,
          options: field.tagName === 'SELECT' ? Array.from(field.options).slice(0, 10).map(o => o.text) : null
        });
      });

      // Find submit button
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      
      // Detect form purpose
      const formPurpose = detectFormPurpose(fields, form);
      
      forms.push({
        id: form.id || `form-${i}`,
        name: form.name || null,
        action: form.action || window.location.href,
        method: (form.method || 'GET').toUpperCase(),
        enctype: form.enctype || null,
        className: form.className?.toString?.()?.slice(0, 100),
        fieldCount: fields.length,
        fields,
        submitButton: submitBtn ? {
          text: (submitBtn.textContent?.trim() || submitBtn.value || 'Submit').slice(0, 50),
          type: submitBtn.type,
          disabled: submitBtn.disabled,
          className: submitBtn.className?.toString?.()?.slice(0, 80)
        } : null,
        hasFileUpload: fields.some(f => f.type === 'file'),
        hasPassword: fields.some(f => f.type === 'password'),
        hasEmail: fields.some(f => f.type === 'email'),
        purpose: formPurpose.purpose,
        purposeConfidence: formPurpose.confidence
      });
    });

    function detectFormPurpose(fields, form) {
      const fieldData = fields.map(f => 
        `${f.name || ''} ${f.placeholder || ''} ${f.label || ''} ${f.type || ''}`
      ).join(' ').toLowerCase();
      
      const formClasses = (form.className?.toString() || '').toLowerCase();
      const formId = (form.id || '').toLowerCase();
      const combined = `${fieldData} ${formClasses} ${formId}`;

      // Priority checks
      if (combined.includes('login') || combined.includes('signin') || 
          (fields.some(f => f.type === 'password') && fields.some(f => f.type === 'email' || f.name?.includes('user')))) {
        return { purpose: 'login', confidence: 0.9 };
      }
      
      if (combined.includes('register') || combined.includes('signup') || combined.includes('create account') ||
          (fields.some(f => f.type === 'password') && fields.some(f => f.name?.includes('confirm')))) {
        return { purpose: 'registration', confidence: 0.9 };
      }
      
      if (combined.includes('search') || combined.includes('query') || 
          fields.length === 1 && fields[0].type === 'search') {
        return { purpose: 'search', confidence: 0.95 };
      }
      
      if (combined.includes('contact') || combined.includes('message') || combined.includes('enquiry') || combined.includes('inquiry')) {
        return { purpose: 'contact', confidence: 0.85 };
      }
      
      if (combined.includes('newsletter') || combined.includes('subscribe') || 
          (fields.length <= 2 && fields.some(f => f.type === 'email') && !fields.some(f => f.type === 'password'))) {
        return { purpose: 'newsletter', confidence: 0.8 };
      }
      
      if (combined.includes('checkout') || combined.includes('payment') || combined.includes('billing')) {
        return { purpose: 'checkout', confidence: 0.9 };
      }
      
      if (combined.includes('shipping') || combined.includes('delivery') || combined.includes('address')) {
        return { purpose: 'shipping', confidence: 0.85 };
      }
      
      if (combined.includes('review') || combined.includes('rating') || combined.includes('feedback')) {
        return { purpose: 'feedback', confidence: 0.8 };
      }

      return { purpose: 'generic', confidence: 0.5 };
    }

    return forms;
  });
}

// ============================================================================
// USER FLOW DETECTION - INTELLIGENT JOURNEY MAPPING
// ============================================================================

/**
 * Detect user flows based on website type and discovered elements
 */
function detectUserFlows(websiteType, elements, forms, pageStructure) {
  const flows = [];
  const typeConfig = WEBSITE_TYPES[websiteType.type];
  
  // Helper to check if elements exist
  const hasCategory = (cat) => elements.filter(e => e.category === cat).length > 0;
  const getElements = (cat) => elements.filter(e => e.category === cat);

  // ======== COMMON FLOWS FOR ALL WEBSITES ========
  
  // Navigation Flow (always important)
  if (hasCategory('NAVIGATION') || hasCategory('HEADER')) {
    flows.push({
      name: 'Site Navigation',
      priority: 'Critical',
      description: 'Verify main navigation menu functionality',
      steps: [
        { action: 'navigate', target: 'Homepage', description: 'Load the homepage' },
        { action: 'verify', target: 'Header/Navigation', description: 'Verify header and navigation menu are visible' },
        { action: 'verify', target: 'Logo', description: 'Verify site logo is displayed and clickable' },
        { action: 'interact', target: 'Menu Items', description: 'Click on each main navigation link' },
        { action: 'verify', target: 'Page Load', description: 'Verify each page loads correctly without errors' }
      ],
      assertions: [
        'Navigation menu is visible on all pages',
        'All menu links are functional',
        'Pages load within acceptable time (<3s)',
        'Logo links back to homepage'
      ],
      elements: getElements('NAVIGATION').slice(0, 5).map(e => e.selector)
    });
  }

  // Footer Verification
  if (hasCategory('FOOTER')) {
    flows.push({
      name: 'Footer Verification',
      priority: 'Medium',
      description: 'Verify footer content and links',
      steps: [
        { action: 'scroll', target: 'Footer', description: 'Scroll to page footer' },
        { action: 'verify', target: 'Footer Content', description: 'Verify footer is visible' },
        { action: 'verify', target: 'Footer Links', description: 'Verify important links are present (About, Contact, Privacy, Terms)' },
        { action: 'interact', target: 'Footer Links', description: 'Click and verify footer links work' }
      ],
      assertions: [
        'Footer is visible at bottom of page',
        'Contact information is present',
        'Social media links are functional',
        'Legal links (Privacy, Terms) are accessible'
      ]
    });
  }

  // ======== WEBSITE TYPE SPECIFIC FLOWS ========

  switch (websiteType.type) {
    case 'RETAIL_STORE':
      // Store Locator Flow
      flows.push({
        name: 'Store/Branch Locator',
        priority: 'Critical',
        description: 'Verify users can find store locations and branch information',
        steps: [
          { action: 'navigate', target: 'Branches/Locations page', description: 'Navigate to store locations section' },
          { action: 'verify', target: 'Branch List', description: 'Verify list of store branches is displayed' },
          { action: 'interact', target: 'Branch Details', description: 'Click on a branch to view details' },
          { action: 'verify', target: 'Address/Contact', description: 'Verify address and contact information is shown' },
          { action: 'verify', target: 'Map/Directions', description: 'Verify map or directions link is available' }
        ],
        assertions: [
          'All branch locations are listed',
          'Each branch shows complete address',
          'Contact numbers are displayed correctly',
          'Branch timings/hours are visible',
          'Get directions functionality works'
        ]
      });

      // Product Categories Flow
      flows.push({
        name: 'Product Categories Browse',
        priority: 'High',
        description: 'Verify product category navigation and display',
        steps: [
          { action: 'navigate', target: 'Categories Section', description: 'Navigate to product categories' },
          { action: 'verify', target: 'Category List', description: 'Verify all categories are displayed' },
          { action: 'interact', target: 'Category', description: 'Click on a product category' },
          { action: 'verify', target: 'Products/Content', description: 'Verify category page loads with relevant content' }
        ],
        assertions: [
          'All product categories are visible',
          'Category images/icons load correctly',
          'Category pages show relevant products',
          'Navigation breadcrumbs work correctly'
        ]
      });
      break;

    case 'ECOMMERCE':
      // Search Flow
      if (hasCategory('SEARCH')) {
        flows.push({
          name: 'Product Search',
          priority: 'Critical',
          description: 'Verify product search functionality',
          steps: [
            { action: 'interact', target: 'Search Box', description: 'Click on search input' },
            { action: 'input', target: 'Search Query', description: 'Enter product search term' },
            { action: 'submit', target: 'Search', description: 'Submit search (Enter or click button)' },
            { action: 'verify', target: 'Results', description: 'Verify search results are displayed' },
            { action: 'verify', target: 'Result Count', description: 'Verify result count is shown' }
          ],
          assertions: [
            'Search box accepts input',
            'Search suggestions appear (if applicable)',
            'Results show relevant products',
            'No results message shown for invalid search'
          ],
          elements: getElements('SEARCH').slice(0, 3).map(e => e.selector)
        });
      }

      // Add to Cart Flow
      if (hasCategory('CART')) {
        flows.push({
          name: 'Add to Cart',
          priority: 'Critical',
          description: 'Verify add to cart functionality',
          steps: [
            { action: 'navigate', target: 'Product Page', description: 'Navigate to a product page' },
            { action: 'verify', target: 'Product Details', description: 'Verify product title, price, and image' },
            { action: 'interact', target: 'Add to Cart', description: 'Click Add to Cart button' },
            { action: 'verify', target: 'Confirmation', description: 'Verify cart update confirmation' },
            { action: 'navigate', target: 'Cart Page', description: 'Go to shopping cart' },
            { action: 'verify', target: 'Cart Contents', description: 'Verify product is in cart with correct details' }
          ],
          assertions: [
            'Add to Cart button is clickable',
            'Cart icon shows updated count',
            'Cart page shows correct product',
            'Price is calculated correctly'
          ],
          elements: getElements('CART').slice(0, 3).map(e => e.selector)
        });
      }
      break;

    case 'HEALTHCARE_PHARMA':
      // Product Information Flow
      flows.push({
        name: 'Product/Medicine Information',
        priority: 'Critical',
        description: 'Verify product information accessibility',
        steps: [
          { action: 'navigate', target: 'Products Section', description: 'Navigate to products/brands section' },
          { action: 'interact', target: 'Product Category', description: 'Select a product category' },
          { action: 'verify', target: 'Product List', description: 'Verify products are listed' },
          { action: 'interact', target: 'Product', description: 'Click on a product' },
          { action: 'verify', target: 'Product Details', description: 'Verify product details, composition, usage information' }
        ],
        assertions: [
          'Product categories are clearly organized',
          'Product information is accurate and complete',
          'Usage instructions are present',
          'Warnings and precautions are displayed'
        ]
      });

      // Contact/Adverse Event Flow
      const contactForms = forms.filter(f => f.purpose === 'contact');
      if (contactForms.length > 0 || hasCategory('AUTH')) {
        flows.push({
          name: 'Contact/Adverse Event Reporting',
          priority: 'Critical',
          description: 'Verify contact form and adverse event reporting functionality',
          steps: [
            { action: 'navigate', target: 'Contact Page', description: 'Navigate to contact/report section' },
            { action: 'verify', target: 'Contact Form', description: 'Verify contact form is displayed' },
            { action: 'input', target: 'Form Fields', description: 'Fill in all required fields' },
            { action: 'submit', target: 'Form', description: 'Submit the form' },
            { action: 'verify', target: 'Confirmation', description: 'Verify submission confirmation' }
          ],
          assertions: [
            'Contact form is accessible',
            'All required fields are clearly marked',
            'Form validation works correctly',
            'Confirmation message is shown after submission'
          ]
        });
      }
      break;

    case 'OTT_STREAMING':
      // Content Discovery Flow
      flows.push({
        name: 'Content Discovery',
        priority: 'Critical',
        description: 'Verify content discovery and browsing',
        steps: [
          { action: 'navigate', target: 'Homepage', description: 'Load homepage' },
          { action: 'verify', target: 'Content Rails', description: 'Verify content carousels/rails are displayed' },
          { action: 'interact', target: 'Content Item', description: 'Click on a content tile' },
          { action: 'verify', target: 'Details Page', description: 'Verify content details page loads' },
          { action: 'verify', target: 'Play Button', description: 'Verify play button is available' }
        ],
        assertions: [
          'Content thumbnails load correctly',
          'Content metadata is displayed',
          'Play/Watch button is visible',
          'Content ratings are shown'
        ]
      });

      // Playback Flow
      if (hasCategory('MEDIA')) {
        flows.push({
          name: 'Video Playback',
          priority: 'Critical',
          description: 'Verify video playback functionality',
          steps: [
            { action: 'navigate', target: 'Content', description: 'Navigate to playable content' },
            { action: 'interact', target: 'Play Button', description: 'Click play button' },
            { action: 'verify', target: 'Video Player', description: 'Verify video player loads' },
            { action: 'verify', target: 'Controls', description: 'Verify playback controls (play/pause, seek, volume)' }
          ],
          assertions: [
            'Video starts playing',
            'Playback controls are functional',
            'Video quality is acceptable',
            'No buffering issues'
          ],
          elements: getElements('MEDIA').slice(0, 3).map(e => e.selector)
        });
      }
      break;

    case 'BANKING_FINANCE':
      // Secure Login Flow
      flows.push({
        name: 'Secure Login',
        priority: 'Critical',
        description: 'Verify secure authentication process',
        steps: [
          { action: 'navigate', target: 'Login Page', description: 'Navigate to login page' },
          { action: 'verify', target: 'HTTPS', description: 'Verify secure connection (HTTPS)' },
          { action: 'input', target: 'Credentials', description: 'Enter username and password' },
          { action: 'submit', target: 'Login', description: 'Submit login form' },
          { action: 'verify', target: 'Dashboard', description: 'Verify successful login and dashboard access' }
        ],
        assertions: [
          'Login page uses HTTPS',
          'Password field masks input',
          'Invalid credentials show error',
          'Session timeout works correctly'
        ]
      });
      break;
  }

  // ======== FORM-BASED FLOWS ========
  
  // Contact Form Flow
  const contactForms = forms.filter(f => f.purpose === 'contact');
  if (contactForms.length > 0) {
    flows.push({
      name: 'Contact Form Submission',
      priority: 'High',
      description: 'Verify contact form functionality',
      steps: [
        { action: 'navigate', target: 'Contact Page', description: 'Navigate to contact page' },
        { action: 'verify', target: 'Form', description: 'Verify contact form is displayed' },
        { action: 'input', target: 'Name Field', description: 'Enter name' },
        { action: 'input', target: 'Email Field', description: 'Enter email address' },
        { action: 'input', target: 'Message Field', description: 'Enter message' },
        { action: 'submit', target: 'Form', description: 'Submit contact form' },
        { action: 'verify', target: 'Confirmation', description: 'Verify success message' }
      ],
      assertions: [
        'All form fields accept input',
        'Email validation works',
        'Required field validation works',
        'Success message is displayed'
      ],
      formId: contactForms[0].id
    });
  }

  // Login Form Flow
  const loginForms = forms.filter(f => f.purpose === 'login');
  if (loginForms.length > 0 || hasCategory('AUTH')) {
    flows.push({
      name: 'User Authentication',
      priority: 'Critical',
      description: 'Verify login functionality',
      steps: [
        { action: 'navigate', target: 'Login Page', description: 'Navigate to login page' },
        { action: 'verify', target: 'Login Form', description: 'Verify login form is displayed' },
        { action: 'input', target: 'Email/Username', description: 'Enter valid email or username' },
        { action: 'input', target: 'Password', description: 'Enter valid password' },
        { action: 'submit', target: 'Login', description: 'Click login button' },
        { action: 'verify', target: 'Success', description: 'Verify successful login' }
      ],
      assertions: [
        'Login form accepts credentials',
        'Error message for invalid credentials',
        'Password field is masked',
        'Successful login redirects to dashboard/home'
      ]
    });
  }

  // Search Flow (generic)
  if (hasCategory('SEARCH') && !flows.some(f => f.name.includes('Search'))) {
    flows.push({
      name: 'Site Search',
      priority: 'High',
      description: 'Verify search functionality',
      steps: [
        { action: 'interact', target: 'Search Box', description: 'Click on search input' },
        { action: 'input', target: 'Search Query', description: 'Enter search term' },
        { action: 'submit', target: 'Search', description: 'Submit search' },
        { action: 'verify', target: 'Results', description: 'Verify search results are displayed' }
      ],
      assertions: [
        'Search box is functional',
        'Results are relevant to query',
        'No results message for empty results'
      ],
      elements: getElements('SEARCH').slice(0, 3).map(e => e.selector)
    });
  }

  // Media Content Flow (if media detected)
  if (hasCategory('MEDIA') && !flows.some(f => f.name.includes('Video'))) {
    flows.push({
      name: 'Media Content Playback',
      priority: 'Medium',
      description: 'Verify media content loads and plays',
      steps: [
        { action: 'navigate', target: 'Page with Media', description: 'Navigate to page with video/audio' },
        { action: 'verify', target: 'Media Element', description: 'Verify media element is visible' },
        { action: 'interact', target: 'Play Button', description: 'Click play button' },
        { action: 'verify', target: 'Playback', description: 'Verify media starts playing' }
      ],
      assertions: [
        'Media element loads correctly',
        'Play controls are functional',
        'Media plays without errors'
      ],
      elements: getElements('MEDIA').slice(0, 3).map(e => e.selector)
    });
  }

  return flows;
}

// ============================================================================
// TEST CASE GENERATION - PROFESSIONAL GRADE
// ============================================================================

/**
 * Generate comprehensive test cases from analysis
 */
function generateTestCases(analysisResult) {
  const { websiteType, pageStructure, elements, forms, userFlows, observations } = analysisResult;
  const testCases = [];
  let tcId = 1;

  const siteTitle = pageStructure?.title || 'Website';
  const siteName = websiteType?.typeName || 'Website';
  const url = analysisResult.url;

  // Helper to create test case ID
  const makeId = (prefix) => `TC-${prefix}-${String(tcId++).padStart(3, '0')}`;

  // ======== USER FLOW TEST CASES ========
  userFlows.forEach((flow, i) => {
    testCases.push({
      id: makeId('FLOW'),
      module: flow.name.split(' ')[0],
      category: 'User Flow',
      scenario: flow.name,
      title: `${siteName}: ${flow.name}`,
      description: flow.description,
      type: 'End-to-End',
      priority: flow.priority,
      preconditions: [
        'Browser is open and configured',
        'Network connection is stable',
        url ? `Website ${url} is accessible` : 'Target website is accessible',
        'Test data is prepared'
      ],
      testData: 'Standard test data as per flow requirements',
      steps: flow.steps.map((step, j) => ({
        stepNumber: j + 1,
        action: step.action,
        target: step.target,
        description: step.description,
        expectedBehavior: getExpectedBehavior(step.action, step.target)
      })),
      expectedResults: flow.assertions,
      postconditions: getPostconditions(flow.name),
      automatable: true,
      traceability: `Generated from URL Analysis - User Flow Detection`,
      relatedElements: flow.elements || []
    });
  });

  // ======== FUNCTIONAL REQUIREMENT TEST CASES ========
  
  // Navigation Tests
  const navElements = elements.filter(e => e.category === 'NAVIGATION' || e.category === 'HEADER');
  if (navElements.length > 0) {
    testCases.push({
      id: makeId('NAV'),
      module: 'Navigation',
      category: 'Functional',
      scenario: 'Navigation Menu Functionality',
      title: `${siteName}: Verify Navigation Menu`,
      description: 'Verify all navigation menu items are visible and functional',
      type: 'Functional',
      priority: 'Critical',
      preconditions: ['Website homepage is loaded'],
      testData: 'N/A',
      steps: [
        { stepNumber: 1, action: 'Navigate', description: `Open ${url}`, expectedBehavior: 'Page loads successfully' },
        { stepNumber: 2, action: 'Verify', description: 'Verify navigation menu is visible', expectedBehavior: 'Navigation menu is displayed' },
        { stepNumber: 3, action: 'Verify', description: 'Verify logo is displayed', expectedBehavior: 'Logo is visible and clickable' },
        { stepNumber: 4, action: 'Click', description: 'Click each navigation menu item', expectedBehavior: 'Each link navigates to correct page' },
        { stepNumber: 5, action: 'Verify', description: 'Verify active state indication', expectedBehavior: 'Current page is highlighted in navigation' }
      ],
      expectedResults: [
        'Navigation menu is visible on load',
        'All navigation links are functional',
        'Pages load without errors',
        'Active page is indicated in menu'
      ],
      automatable: true,
      traceability: `Navigation elements detected: ${navElements.length}`,
      relatedElements: navElements.slice(0, 5).map(e => e.selector)
    });
  }

  // Form Test Cases
  forms.forEach((form, i) => {
    if (form.fields.length === 0) return;

    const formName = form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1);
    const priority = ['login', 'checkout', 'registration', 'payment'].includes(form.purpose) ? 'Critical' : 'High';

    // Positive Test Case
    testCases.push({
      id: makeId('FORM'),
      module: 'Forms',
      category: 'Functional',
      scenario: `${formName} Form - Valid Data Submission`,
      title: `${siteName}: ${formName} Form Positive Test`,
      description: `Verify ${form.purpose} form accepts valid data and submits successfully`,
      type: 'Positive',
      priority: priority,
      preconditions: [
        `Navigate to page containing ${form.purpose} form`,
        'Form is visible and enabled'
      ],
      testData: form.fields.map(f => ({
        field: f.name || f.placeholder || f.type,
        value: getTestDataForField(f),
        validation: f.required ? 'Required' : 'Optional'
      })),
      steps: [
        { stepNumber: 1, action: 'Navigate', description: `Navigate to ${form.purpose} form`, expectedBehavior: 'Form is displayed' },
        ...form.fields.slice(0, 8).map((f, j) => ({
          stepNumber: j + 2,
          action: 'Input',
          description: `Enter valid data in ${f.label || f.name || f.placeholder || f.type} field`,
          expectedBehavior: 'Field accepts input'
        })),
        { stepNumber: form.fields.length + 2, action: 'Click', description: `Click ${form.submitButton?.text || 'Submit'} button`, expectedBehavior: 'Form is submitted' },
        { stepNumber: form.fields.length + 3, action: 'Verify', description: 'Verify success message/action', expectedBehavior: 'Success confirmation is shown' }
      ],
      expectedResults: [
        'All form fields accept valid input',
        'Form submits without errors',
        'Success message/redirect occurs',
        'Data is processed correctly'
      ],
      automatable: true,
      traceability: `Form detected: ${form.id} (Purpose: ${form.purpose})`,
      relatedElements: [`#${form.id}`, form.submitButton?.text ? `button:has-text("${form.submitButton.text}")` : 'button[type="submit"]']
    });

    // Negative Test Case - Required Field Validation
    if (form.fields.some(f => f.required)) {
      testCases.push({
        id: makeId('FORM'),
        module: 'Forms',
        category: 'Validation',
        scenario: `${formName} Form - Required Field Validation`,
        title: `${siteName}: ${formName} Form Validation Test`,
        description: `Verify ${form.purpose} form shows validation errors for missing required fields`,
        type: 'Negative',
        priority: 'High',
        preconditions: [`Navigate to page containing ${form.purpose} form`],
        testData: 'Empty/blank values for required fields',
        steps: [
          { stepNumber: 1, action: 'Navigate', description: `Navigate to ${form.purpose} form`, expectedBehavior: 'Form is displayed' },
          { stepNumber: 2, action: 'Skip', description: 'Leave all required fields empty', expectedBehavior: 'Fields remain empty' },
          { stepNumber: 3, action: 'Click', description: `Click ${form.submitButton?.text || 'Submit'} button`, expectedBehavior: 'Form validation triggers' },
          { stepNumber: 4, action: 'Verify', description: 'Verify validation error messages', expectedBehavior: 'Error messages are displayed' }
        ],
        expectedResults: [
          'Form does not submit with empty required fields',
          'Validation error messages are displayed',
          'Error messages are clear and helpful',
          'Required fields are highlighted'
        ],
        automatable: true,
        traceability: `Form validation test: ${form.id}`
      });
    }
  });

  // ======== UI/VISUAL TEST CASES ========
  
  // Page Structure Test
  testCases.push({
    id: makeId('UI'),
    module: 'UI',
    category: 'Visual',
    scenario: 'Page Structure and Layout',
    title: `${siteName}: Page Structure Verification`,
    description: 'Verify page structure, headings, and layout',
    type: 'UI',
    priority: 'Medium',
    preconditions: ['Homepage is loaded'],
    testData: 'N/A',
    steps: [
      { stepNumber: 1, action: 'Navigate', description: `Open ${url}`, expectedBehavior: 'Page loads' },
      { stepNumber: 2, action: 'Verify', description: `Verify page title is "${pageStructure?.title || 'displayed'}"`, expectedBehavior: 'Title matches expected' },
      { stepNumber: 3, action: 'Verify', description: 'Verify heading hierarchy (H1, H2, H3...)', expectedBehavior: 'Headings follow logical hierarchy' },
      { stepNumber: 4, action: 'Verify', description: 'Verify main content area is visible', expectedBehavior: 'Content is displayed' },
      { stepNumber: 5, action: 'Verify', description: 'Verify footer is present', expectedBehavior: 'Footer is visible' }
    ],
    expectedResults: [
      `Page title is "${pageStructure?.title}"`,
      'Heading structure is semantically correct',
      'Main content area is properly laid out',
      'Footer contains expected information'
    ],
    automatable: true,
    traceability: 'Page structure analysis'
  });

  // Image Loading Test
  const imageElements = elements.filter(e => e.category === 'IMAGES');
  if (imageElements.length > 0) {
    testCases.push({
      id: makeId('UI'),
      module: 'UI',
      category: 'Visual',
      scenario: 'Image Loading and Display',
      title: `${siteName}: Image Loading Test`,
      description: 'Verify all images load correctly without broken links',
      type: 'UI',
      priority: 'Medium',
      preconditions: ['Homepage is loaded', 'Network connection is stable'],
      testData: 'N/A',
      steps: [
        { stepNumber: 1, action: 'Navigate', description: `Open ${url}`, expectedBehavior: 'Page loads' },
        { stepNumber: 2, action: 'Wait', description: 'Wait for all images to load', expectedBehavior: 'Images begin loading' },
        { stepNumber: 3, action: 'Verify', description: 'Verify no broken images (404)', expectedBehavior: 'All images load successfully' },
        { stepNumber: 4, action: 'Verify', description: 'Verify images have alt text', expectedBehavior: 'Images have descriptive alt text' }
      ],
      expectedResults: [
        'All images load without errors',
        'No broken image placeholders',
        'Images have appropriate alt text',
        'Images are properly sized'
      ],
      automatable: true,
      traceability: `Images detected: ${imageElements.length}`,
      relatedElements: imageElements.slice(0, 5).map(e => e.selector)
    });
  }

  // ======== RESPONSIVE TEST CASES ========
  testCases.push({
    id: makeId('RESP'),
    module: 'Responsive',
    category: 'Cross-Browser',
    scenario: 'Responsive Design Verification',
    title: `${siteName}: Responsive Layout Test`,
    description: 'Verify website displays correctly on different screen sizes',
    type: 'Responsive',
    priority: 'High',
    preconditions: ['Website is accessible'],
    testData: 'Screen sizes: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)',
    steps: [
      { stepNumber: 1, action: 'Set Viewport', description: 'Set viewport to Desktop (1920x1080)', expectedBehavior: 'Viewport is set' },
      { stepNumber: 2, action: 'Verify', description: 'Verify desktop layout displays correctly', expectedBehavior: 'Full desktop layout shown' },
      { stepNumber: 3, action: 'Set Viewport', description: 'Set viewport to Tablet (768x1024)', expectedBehavior: 'Viewport is resized' },
      { stepNumber: 4, action: 'Verify', description: 'Verify tablet layout displays correctly', expectedBehavior: 'Tablet-optimized layout shown' },
      { stepNumber: 5, action: 'Set Viewport', description: 'Set viewport to Mobile (375x667)', expectedBehavior: 'Viewport is resized' },
      { stepNumber: 6, action: 'Verify', description: 'Verify mobile layout displays correctly', expectedBehavior: 'Mobile-optimized layout shown' },
      { stepNumber: 7, action: 'Verify', description: 'Verify hamburger menu appears on mobile', expectedBehavior: 'Mobile navigation is accessible' }
    ],
    expectedResults: [
      'Desktop layout shows full navigation',
      'Tablet layout adjusts appropriately',
      'Mobile layout shows hamburger menu',
      'No horizontal scroll on any viewport',
      'All content is accessible on all viewports'
    ],
    automatable: true,
    traceability: 'Responsive design test'
  });

  // ======== ACCESSIBILITY TEST CASES ========
  testCases.push({
    id: makeId('A11Y'),
    module: 'Accessibility',
    category: 'Accessibility',
    scenario: 'Basic Accessibility Compliance',
    title: `${siteName}: Accessibility Test`,
    description: 'Verify basic accessibility requirements are met',
    type: 'Accessibility',
    priority: 'High',
    preconditions: ['Homepage is loaded'],
    testData: 'N/A',
    steps: [
      { stepNumber: 1, action: 'Verify', description: 'Verify page has lang attribute', expectedBehavior: 'Language is declared' },
      { stepNumber: 2, action: 'Verify', description: 'Verify images have alt attributes', expectedBehavior: 'Alt text is present' },
      { stepNumber: 3, action: 'Verify', description: 'Verify form labels are associated', expectedBehavior: 'Labels are properly linked' },
      { stepNumber: 4, action: 'Test', description: 'Test keyboard navigation (Tab through page)', expectedBehavior: 'All interactive elements are reachable' },
      { stepNumber: 5, action: 'Verify', description: 'Verify focus indicators are visible', expectedBehavior: 'Focus state is clearly visible' },
      { stepNumber: 6, action: 'Verify', description: 'Verify color contrast is sufficient', expectedBehavior: 'Text is readable' }
    ],
    expectedResults: [
      'Page declares language attribute',
      'All images have meaningful alt text',
      'Form controls have associated labels',
      'All interactive elements are keyboard accessible',
      'Focus indicators are visible',
      'Color contrast meets WCAG guidelines'
    ],
    automatable: true,
    traceability: 'WCAG 2.1 basic compliance'
  });

  // ======== PERFORMANCE TEST CASES ========
  testCases.push({
    id: makeId('PERF'),
    module: 'Performance',
    category: 'Performance',
    scenario: 'Page Load Performance',
    title: `${siteName}: Performance Test`,
    description: 'Verify page load time and performance metrics',
    type: 'Performance',
    priority: 'High',
    preconditions: ['Network connection is stable', 'Browser cache is cleared'],
    testData: 'N/A',
    steps: [
      { stepNumber: 1, action: 'Clear', description: 'Clear browser cache', expectedBehavior: 'Cache is cleared' },
      { stepNumber: 2, action: 'Navigate', description: `Load ${url}`, expectedBehavior: 'Page begins loading' },
      { stepNumber: 3, action: 'Measure', description: 'Measure Time to First Byte (TTFB)', expectedBehavior: 'TTFB < 600ms' },
      { stepNumber: 4, action: 'Measure', description: 'Measure First Contentful Paint (FCP)', expectedBehavior: 'FCP < 1.8s' },
      { stepNumber: 5, action: 'Measure', description: 'Measure Largest Contentful Paint (LCP)', expectedBehavior: 'LCP < 2.5s' },
      { stepNumber: 6, action: 'Measure', description: 'Measure Cumulative Layout Shift (CLS)', expectedBehavior: 'CLS < 0.1' }
    ],
    expectedResults: [
      'Page load time < 3 seconds',
      'Time to First Byte < 600ms',
      'First Contentful Paint < 1.8s',
      'Largest Contentful Paint < 2.5s',
      'Cumulative Layout Shift < 0.1'
    ],
    automatable: true,
    traceability: 'Core Web Vitals metrics'
  });

  // ======== WEBSITE TYPE SPECIFIC TEST CASES ========
  
  switch (websiteType?.type) {
    case 'RETAIL_STORE':
      // Branch Information Test
      testCases.push({
        id: makeId('BUS'),
        module: 'Business',
        category: 'Functional',
        scenario: 'Branch/Store Information',
        title: `${siteName}: Store Branch Information Test`,
        description: 'Verify store branch information is accurate and complete',
        type: 'Functional',
        priority: 'Critical',
        preconditions: ['Website is accessible'],
        testData: 'Known branch locations',
        steps: [
          { stepNumber: 1, action: 'Navigate', description: 'Navigate to branches/stores section', expectedBehavior: 'Branch section loads' },
          { stepNumber: 2, action: 'Verify', description: 'Verify all branches are listed', expectedBehavior: 'Complete branch list shown' },
          { stepNumber: 3, action: 'Verify', description: 'Verify each branch has address', expectedBehavior: 'Addresses are displayed' },
          { stepNumber: 4, action: 'Verify', description: 'Verify contact numbers are present', expectedBehavior: 'Phone numbers shown' },
          { stepNumber: 5, action: 'Verify', description: 'Verify store timings are displayed', expectedBehavior: 'Operating hours shown' },
          { stepNumber: 6, action: 'Click', description: 'Click Get Directions (if available)', expectedBehavior: 'Maps/directions open' }
        ],
        expectedResults: [
          'All store branches are listed',
          'Each branch has complete address',
          'Contact information is accurate',
          'Store timings are displayed',
          'Directions functionality works'
        ],
        automatable: true,
        traceability: 'Retail store business requirement'
      });
      break;

    case 'ECOMMERCE':
      // Product Display Test
      testCases.push({
        id: makeId('BUS'),
        module: 'Business',
        category: 'Functional',
        scenario: 'Product Catalog Display',
        title: `${siteName}: Product Catalog Test`,
        description: 'Verify product catalog displays correctly with all details',
        type: 'Functional',
        priority: 'Critical',
        preconditions: ['Product catalog is accessible'],
        testData: 'Sample product categories',
        steps: [
          { stepNumber: 1, action: 'Navigate', description: 'Navigate to product listing page', expectedBehavior: 'Products are displayed' },
          { stepNumber: 2, action: 'Verify', description: 'Verify product images load', expectedBehavior: 'Images are visible' },
          { stepNumber: 3, action: 'Verify', description: 'Verify product titles are displayed', expectedBehavior: 'Titles are shown' },
          { stepNumber: 4, action: 'Verify', description: 'Verify prices are displayed', expectedBehavior: 'Prices are visible' },
          { stepNumber: 5, action: 'Click', description: 'Click on a product', expectedBehavior: 'Product detail page opens' },
          { stepNumber: 6, action: 'Verify', description: 'Verify Add to Cart button', expectedBehavior: 'Add to Cart is enabled' }
        ],
        expectedResults: [
          'Product grid displays correctly',
          'All product images load',
          'Prices are clearly shown',
          'Product details page works',
          'Add to Cart is functional'
        ],
        automatable: true,
        traceability: 'E-commerce product display requirement'
      });
      break;

    case 'HEALTHCARE_PHARMA':
      // Adverse Event Reporting Test
      testCases.push({
        id: makeId('BUS'),
        module: 'Business',
        category: 'Compliance',
        scenario: 'Adverse Event Reporting Access',
        title: `${siteName}: Adverse Event Reporting Test`,
        description: 'Verify adverse event reporting functionality is accessible (regulatory requirement)',
        type: 'Compliance',
        priority: 'Critical',
        preconditions: ['Website is accessible'],
        testData: 'N/A',
        steps: [
          { stepNumber: 1, action: 'Navigate', description: 'Navigate to adverse event reporting', expectedBehavior: 'Reporting page loads' },
          { stepNumber: 2, action: 'Verify', description: 'Verify reporting form is available', expectedBehavior: 'Form is displayed' },
          { stepNumber: 3, action: 'Verify', description: 'Verify contact information is displayed', expectedBehavior: 'Contact details shown' },
          { stepNumber: 4, action: 'Verify', description: 'Verify submission mechanism works', expectedBehavior: 'Form can be submitted' }
        ],
        expectedResults: [
          'Adverse event reporting is accessible',
          'Reporting form/contact is available',
          'Instructions are clear',
          'Submission mechanism works'
        ],
        automatable: true,
        traceability: 'Pharmaceutical regulatory requirement'
      });
      break;
  }

  // Add BRD-based test cases
  const brdTestCases = generateBRDTestCases(analysisResult);
  testCases.push(...brdTestCases);

  return testCases;
}

/**
 * Generate test cases based on BRD functional requirements
 */
function generateBRDTestCases(analysisResult) {
  const testCases = [];
  const brd = analysisResult.brd;
  
  if (!brd || !brd.functionalRequirements) return testCases;

  let tcId = 100;
  
  brd.functionalRequirements.slice(0, 10).forEach((req, i) => {
    testCases.push({
      id: `TC-BRD-${String(tcId++).padStart(3, '0')}`,
      module: 'Requirements',
      category: 'BRD Verification',
      scenario: `Verify ${req.feature}`,
      title: `${analysisResult.websiteType?.typeName}: ${req.feature} Verification`,
      description: req.description,
      type: req.type || 'Functional',
      priority: req.priority,
      preconditions: ['Website is accessible', 'Required test data is available'],
      testData: 'As per requirement',
      steps: req.acceptanceCriteria?.map((ac, j) => ({
        stepNumber: j + 1,
        action: 'Verify',
        description: `Verify - ${ac}`,
        expectedBehavior: ac
      })) || [
        { stepNumber: 1, action: 'Verify', description: `Verify ${req.feature} is functional`, expectedBehavior: 'Feature works correctly' }
      ],
      expectedResults: req.acceptanceCriteria || [`${req.feature} works as expected`],
      automatable: req.testable !== false,
      traceability: `BRD Requirement: ${req.id} - ${req.description}`
    });
  });

  return testCases;
}

/**
 * Helper: Get expected behavior based on action type
 */
function getExpectedBehavior(action, target) {
  const behaviors = {
    navigate: `${target} page loads successfully`,
    verify: `${target} is visible and correct`,
    interact: `${target} responds to interaction`,
    input: `${target} accepts input`,
    click: `${target} is clicked and responds`,
    submit: `Form/action is submitted`,
    scroll: `Page scrolls to ${target}`,
    wait: `System waits for ${target}`
  };
  return behaviors[action] || `${action} completes successfully`;
}

/**
 * Helper: Get postconditions for flow
 */
function getPostconditions(flowName) {
  const postConditions = {
    'Site Navigation': ['User has verified navigation functionality'],
    'Product Search': ['Search results are displayed or no results message is shown'],
    'Add to Cart': ['Product is in cart', 'Cart count is updated'],
    'User Authentication': ['User is logged in or error message is shown'],
    'Contact Form Submission': ['Form is submitted or validation errors shown'],
    default: ['Test flow completed']
  };
  
  return postConditions[flowName] || postConditions.default;
}

/**
 * Helper: Get test data for form field
 */
function getTestDataForField(field) {
  const testData = {
    email: 'test@example.com',
    password: 'Test@1234',
    tel: '9876543210',
    phone: '9876543210',
    number: '12345',
    text: 'Test Data',
    name: 'Test User',
    url: 'https://example.com'
  };
  
  if (field.type === 'email') return testData.email;
  if (field.type === 'password') return testData.password;
  if (field.type === 'tel' || field.name?.includes('phone') || field.name?.includes('mobile')) return testData.tel;
  if (field.type === 'number') return testData.number;
  if (field.type === 'url') return testData.url;
  if (field.name?.includes('name') || field.placeholder?.toLowerCase().includes('name')) return testData.name;
  
  return 'Valid test data';
}

// ============================================================================
// BRD GENERATION - ENTERPRISE GRADE
// ============================================================================

/**
 * Generate comprehensive BRD from analysis
 */
function generateBRD(analysisResult) {
  const { websiteType, pageStructure, elements, forms, userFlows, url, observations, warnings } = analysisResult;
  
  const siteName = pageStructure?.title || 'Target Website';
  const siteType = websiteType?.typeName || 'Website';

  return {
    documentInfo: {
      title: `Business Requirements Document - ${siteName}`,
      version: '1.0',
      generatedAt: new Date().toISOString(),
      source: 'URL Analyzer Pro Agent',
      websiteUrl: url,
      websiteType: siteType
    },
    
    executiveSummary: {
      overview: `This document outlines the business and testing requirements for ${siteName} (${siteType}). The URL Analyzer Pro Agent has conducted comprehensive analysis and identified key features, user flows, and testing requirements.`,
      websiteType: siteType,
      analysisScope: [
        `Website URL: ${url}`,
        `Type: ${siteType}`,
        `Pages Analyzed: ${analysisResult.pagesAnalyzed || 1}`,
        `Features Identified: ${elements ? new Set(elements.map(e => e.category)).size : 0}`,
        `User Flows Detected: ${userFlows?.length || 0}`,
        `Forms Found: ${forms?.length || 0}`
      ],
      keyFindings: generateKeyFindings(analysisResult),
      objectives: [
        'Validate all core functionalities work as expected',
        'Ensure UI elements are interactive and accessible',
        'Verify user flows complete without errors',
        'Confirm form submissions and validations work correctly',
        'Assess performance and responsiveness'
      ]
    },

    projectScope: {
      inScope: generateInScopeItems(analysisResult),
      outOfScope: [
        'Backend API testing (unless exposed via UI)',
        'Database testing',
        'Load and stress testing',
        'Mobile native application testing',
        'Third-party integrations testing (unless visible in UI)'
      ],
      assumptions: [
        'Test environment is stable and accessible',
        'Test data is available for all scenarios',
        'User credentials for authentication tests are provided',
        'Network connectivity is stable during testing'
      ],
      constraints: [
        'Testing limited to web UI interactions',
        ...(analysisResult.antiBot ? ['Anti-bot protection may block some automated tests'] : []),
        'Dynamic content may require adaptive selectors'
      ]
    },

    functionalRequirements: generateFunctionalRequirements(analysisResult),
    
    nonFunctionalRequirements: [
      { id: 'NFR-001', category: 'Performance', description: 'Page load time should be under 3 seconds on standard broadband', priority: 'High' },
      { id: 'NFR-002', category: 'Accessibility', description: 'Website should be accessible via keyboard navigation', priority: 'High' },
      { id: 'NFR-003', category: 'Compatibility', description: 'Website should work on Chrome, Firefox, Safari, Edge (latest 2 versions)', priority: 'High' },
      { id: 'NFR-004', category: 'Security', description: 'All pages should be served over HTTPS', priority: 'Critical' },
      { id: 'NFR-005', category: 'Usability', description: 'Error messages should be clear, helpful, and actionable', priority: 'Medium' },
      { id: 'NFR-006', category: 'Responsive', description: 'Website should be responsive from 320px to 2560px width', priority: 'High' },
      { id: 'NFR-007', category: 'SEO', description: 'Pages should have proper meta tags and heading structure', priority: 'Medium' }
    ],

    testStrategy: {
      approach: 'Risk-based testing with priority on critical user flows and business functions',
      testLevels: [
        { level: 'Smoke Testing', description: 'Verify basic functionality and page loads', priority: 'Critical' },
        { level: 'Functional Testing', description: 'Test all features and user flows', priority: 'Critical' },
        { level: 'Regression Testing', description: 'Ensure changes don\'t break existing functionality', priority: 'High' },
        { level: 'UI/Visual Testing', description: 'Verify visual appearance and layout', priority: 'Medium' },
        { level: 'Accessibility Testing', description: 'WCAG 2.1 compliance verification', priority: 'High' },
        { level: 'Performance Testing', description: 'Page load and Core Web Vitals', priority: 'High' }
      ],
      testTypes: websiteType?.testPriorities?.map(p => ({
        type: p,
        priority: websiteType.criticalFlows?.some(f => f.includes(p)) ? 'Critical' : 'High'
      })) || [
        { type: 'Navigation Testing', priority: 'Critical' },
        { type: 'Form Testing', priority: 'High' },
        { type: 'Content Testing', priority: 'Medium' }
      ],
      entryExitCriteria: {
        entry: [
          'Test environment is available and stable',
          'Test cases are reviewed and approved',
          'Test data is prepared',
          'Tools and access are configured'
        ],
        exit: [
          'All critical and high priority tests executed',
          'No critical or high severity defects open',
          'Test coverage meets minimum 80% requirement',
          'Test summary report is prepared'
        ]
      }
    },

    riskAssessment: generateRiskAssessment(analysisResult),
    
    userFlows: userFlows?.map((flow, i) => ({
      id: `UF-${String(i + 1).padStart(3, '0')}`,
      name: flow.name,
      priority: flow.priority,
      description: flow.description,
      steps: flow.steps,
      assertions: flow.assertions,
      coverage: 'Included in test suite'
    })) || [],

    elementInventory: {
      summary: generateElementSummary(elements),
      byCategory: elements ? Object.entries(
        elements.reduce((acc, el) => {
          acc[el.category] = acc[el.category] || [];
          acc[el.category].push({ selector: el.selector, text: el.text?.slice(0, 50) });
          return acc;
        }, {})
      ).map(([category, els]) => ({
        category,
        count: els.length,
        samples: els.slice(0, 5)
      })) : []
    },

    formInventory: forms?.map((form, i) => ({
      id: form.id,
      purpose: form.purpose,
      fields: form.fieldCount,
      requiredFields: form.fields.filter(f => f.required).length,
      hasValidation: form.fields.some(f => f.required || f.pattern),
      submitButton: form.submitButton?.text
    })) || [],

    observations: observations || [],
    warnings: warnings || []
  };
}

/**
 * Generate key findings for executive summary
 */
function generateKeyFindings(analysisResult) {
  const findings = [];
  const { websiteType, elements, forms, userFlows, pageStructure } = analysisResult;

  findings.push(`Website Type: ${websiteType?.typeName || 'Generic Website'}`);
  
  if (elements) {
    const interactiveCount = elements.filter(e => e.category === 'BUTTONS' || e.category === 'INTERACTIVE' || e.category === 'LINKS').length;
    findings.push(`Interactive Elements: ${interactiveCount} elements detected`);
  }

  if (forms?.length > 0) {
    const formTypes = [...new Set(forms.map(f => f.purpose))].join(', ');
    findings.push(`Forms Found: ${forms.length} (${formTypes})`);
  }

  if (userFlows?.length > 0) {
    const criticalFlows = userFlows.filter(f => f.priority === 'Critical').length;
    findings.push(`User Flows: ${userFlows.length} identified (${criticalFlows} critical)`);
  }

  if (pageStructure?.headings?.length > 0) {
    const h1Count = pageStructure.headings.filter(h => h.level === 1).length;
    findings.push(`Page Structure: ${pageStructure.headings.length} headings (${h1Count} H1)`);
  }

  if (analysisResult.antiBot) {
    findings.push('Security: Anti-bot protection detected');
  }

  return findings;
}

/**
 * Generate in-scope items
 */
function generateInScopeItems(analysisResult) {
  const items = [];
  const { websiteType, userFlows, forms, elements } = analysisResult;

  // Add website-type specific items
  if (websiteType?.testPriorities) {
    websiteType.testPriorities.forEach(priority => {
      items.push(`${priority}: Functional verification and testing`);
    });
  }

  // Add flow-based items
  userFlows?.forEach(flow => {
    items.push(`${flow.name}: End-to-end flow testing`);
  });

  // Add form-based items
  const uniqueFormTypes = [...new Set(forms?.map(f => f.purpose) || [])];
  uniqueFormTypes.forEach(type => {
    if (type !== 'generic') {
      items.push(`${type.charAt(0).toUpperCase() + type.slice(1)} Form: Validation and submission testing`);
    }
  });

  // Add element-based items
  if (elements?.some(e => e.category === 'MEDIA')) {
    items.push('Media Content: Playback and control testing');
  }
  if (elements?.some(e => e.category === 'SEARCH')) {
    items.push('Search Functionality: Query and results testing');
  }
  if (elements?.some(e => e.category === 'CART')) {
    items.push('Shopping Cart: Add, remove, and checkout testing');
  }

  // Default items
  items.push('UI/Visual: Layout and display verification');
  items.push('Responsive: Mobile and tablet compatibility');
  items.push('Accessibility: Basic WCAG compliance');
  items.push('Performance: Page load and Core Web Vitals');

  return items;
}

/**
 * Generate functional requirements
 */
function generateFunctionalRequirements(analysisResult) {
  const requirements = [];
  let reqId = 1;
  const { websiteType, userFlows, forms, elements, pageStructure } = analysisResult;

  // Requirements from user flows
  userFlows?.forEach(flow => {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: flow.name,
      type: 'User Flow',
      priority: flow.priority,
      description: flow.description || `Users shall be able to complete the ${flow.name}`,
      acceptanceCriteria: flow.assertions || flow.steps.filter(s => s.action === 'verify').map(s => s.description),
      testable: true,
      steps: flow.steps
    });
  });

  // Requirements from forms
  forms?.forEach(form => {
    if (form.purpose !== 'generic' && form.fields.length > 0) {
      const formName = form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1);
      requirements.push({
        id: `FR-${String(reqId++).padStart(3, '0')}`,
        feature: `${formName} Form`,
        type: 'Form',
        priority: ['login', 'checkout', 'registration', 'payment'].includes(form.purpose) ? 'Critical' : 'High',
        description: `The ${form.purpose} form shall accept valid input and process submissions correctly`,
        acceptanceCriteria: [
          'All required fields are clearly marked',
          'Validation errors are displayed for invalid input',
          'Form submits successfully with valid data',
          'Appropriate feedback is shown after submission'
        ],
        testable: true,
        formFields: form.fields.map(f => f.name || f.label || f.type)
      });
    }
  });

  // Requirements from detected elements
  const elementCategories = elements ? [...new Set(elements.map(e => e.category))] : [];
  
  if (elementCategories.includes('NAVIGATION')) {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Navigation System',
      type: 'Navigation',
      priority: 'Critical',
      description: 'The website shall provide a functional navigation system',
      acceptanceCriteria: [
        'Navigation menu is visible on all pages',
        'All navigation links are functional',
        'Current page is indicated in navigation',
        'Logo links to homepage'
      ],
      testable: true
    });
  }

  if (elementCategories.includes('SEARCH')) {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Search Functionality',
      type: 'Search',
      priority: 'High',
      description: 'The website shall provide search functionality',
      acceptanceCriteria: [
        'Search box accepts text input',
        'Search results are relevant to query',
        'No results message shown for empty results',
        'Search suggestions appear (if implemented)'
      ],
      testable: true
    });
  }

  if (elementCategories.includes('MEDIA')) {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Media Content',
      type: 'Media',
      priority: 'Medium',
      description: 'Media content shall load and play correctly',
      acceptanceCriteria: [
        'Media elements load without errors',
        'Playback controls are functional',
        'Media plays without buffering issues'
      ],
      testable: true
    });
  }

  // Website-type specific requirements
  if (websiteType?.type === 'RETAIL_STORE') {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Store Branch Information',
      type: 'Business',
      priority: 'Critical',
      description: 'The website shall display accurate store/branch information',
      acceptanceCriteria: [
        'All store branches are listed',
        'Branch addresses are complete and accurate',
        'Contact information is displayed',
        'Store timings are shown',
        'Directions/map functionality works'
      ],
      testable: true
    });
  }

  if (websiteType?.type === 'ECOMMERCE') {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Product Catalog',
      type: 'Business',
      priority: 'Critical',
      description: 'The website shall display products with complete information',
      acceptanceCriteria: [
        'Products are displayed with images',
        'Product titles are visible',
        'Prices are clearly shown',
        'Product details are accessible',
        'Add to cart functionality works'
      ],
      testable: true
    });
  }

  return requirements;
}

/**
 * Generate risk assessment
 */
function generateRiskAssessment(analysisResult) {
  const risks = [];
  let riskId = 1;

  if (analysisResult.antiBot) {
    risks.push({
      id: `RISK-${String(riskId++).padStart(3, '0')}`,
      category: 'Technical',
      description: 'Anti-bot protection detected - automated tests may be blocked',
      probability: 'High',
      impact: 'Critical',
      mitigation: 'Use headed browser mode, add realistic delays, implement retry logic, consider manual testing for protected areas'
    });
  }

  if (analysisResult.forms?.some(f => f.purpose === 'login')) {
    risks.push({
      id: `RISK-${String(riskId++).padStart(3, '0')}`,
      category: 'Data',
      description: 'Authentication required for some features',
      probability: 'High',
      impact: 'High',
      mitigation: 'Ensure test credentials are available, valid, and not subject to rate limiting'
    });
  }

  if (analysisResult.dynamicContent) {
    risks.push({
      id: `RISK-${String(riskId++).padStart(3, '0')}`,
      category: 'Technical',
      description: 'Dynamic content framework detected - selectors may change',
      probability: 'Medium',
      impact: 'Medium',
      mitigation: 'Use data-testid selectors when available, implement robust locator strategies'
    });
  }

  // Standard risks
  risks.push({
    id: `RISK-${String(riskId++).padStart(3, '0')}`,
    category: 'Environment',
    description: 'Network instability may cause test failures',
    probability: 'Low',
    impact: 'Medium',
    mitigation: 'Implement proper timeouts and retry mechanisms, use stable test environment'
  });

  risks.push({
    id: `RISK-${String(riskId++).padStart(3, '0')}`,
    category: 'Content',
    description: 'Dynamic content may change between test runs',
    probability: 'Medium',
    impact: 'Low',
    mitigation: 'Use flexible assertions, avoid hardcoded content validation where possible'
  });

  return risks;
}

/**
 * Generate element summary
 */
function generateElementSummary(elements) {
  if (!elements || elements.length === 0) {
    return { total: 0, byCategory: {} };
  }

  const byCategory = {};
  elements.forEach(el => {
    byCategory[el.category] = (byCategory[el.category] || 0) + 1;
  });

  return {
    total: elements.length,
    byCategory,
    interactive: elements.filter(e => e.category === 'BUTTONS' || e.category === 'INTERACTIVE' || e.category === 'LINKS').length,
    forms: elements.filter(e => e.category === 'FORMS' || e.category === 'INPUTS').length,
    navigation: elements.filter(e => e.category === 'NAVIGATION' || e.category === 'HEADER' || e.category === 'FOOTER').length
  };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Main URL Analyzer Pro function
 */
async function analyzeUrlPro(page, url, options = {}) {
  const startTime = Date.now();
  
  const result = {
    url,
    analyzedAt: new Date().toISOString(),
    source: 'URL Analyzer Pro',
    version: '2.0',
    websiteType: null,
    pageStructure: null,
    elements: [],
    forms: [],
    userFlows: [],
    brd: null,
    testCases: [],
    observations: [],
    warnings: [],
    pagesAnalyzed: 1,
    analysisTime: 0,
    antiBot: false,
    dynamicContent: false
  };

  try {
    // Navigate to URL
    console.log(`[URL Analyzer Pro] Analyzing: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000); // Wait for dynamic content

    // Detect website type
    result.websiteType = await detectWebsiteType(page, url);
    console.log(`[URL Analyzer Pro] Detected type: ${result.websiteType.typeName} (${Math.round(result.websiteType.confidence * 100)}% confidence)`);

    result.observations.push({
      type: 'info',
      category: 'Detection',
      message: `Website identified as: ${result.websiteType.typeName}`,
      confidence: result.websiteType.confidence,
      indicators: result.websiteType.indicators
    });

    // Check for anti-bot protection
    const pageContent = await page.content();
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const blockedIndicators = ['captcha', 'recaptcha', 'cloudflare', 'access denied', 'blocked', 'verify you are human', 'please enable javascript'];
    result.antiBot = blockedIndicators.some(ind => (pageContent + bodyText).toLowerCase().includes(ind));

    if (result.antiBot) {
      result.warnings.push('Anti-bot protection detected. Some automated tests may fail. Consider using headed browser mode.');
      result.observations.push({
        type: 'warning',
        category: 'Security',
        message: 'Anti-bot protection detected on website'
      });
    }

    // Analyze page structure
    result.pageStructure = await analyzePageStructure(page);

    // Analyze all element categories
    const allElements = [];
    for (const [category, config] of Object.entries(ELEMENT_CATEGORIES)) {
      const categoryElements = await analyzeElements(page, category, config.selectors);
      allElements.push(...categoryElements);
      
      if (categoryElements.length > 0) {
        result.observations.push({
          type: 'info',
          category: category,
          message: `Found ${categoryElements.length} ${category.toLowerCase()} elements`,
          count: categoryElements.length,
          priority: config.priority,
          samples: categoryElements.slice(0, 3).map(e => e.selector)
        });
      }
    }
    result.elements = allElements;

    // Analyze forms
    result.forms = await analyzeFormsDeep(page);
    
    if (result.forms.length > 0) {
      result.observations.push({
        type: 'info',
        category: 'Forms',
        message: `Found ${result.forms.length} forms: ${result.forms.map(f => f.purpose).join(', ')}`,
        forms: result.forms.map(f => ({ id: f.id, purpose: f.purpose, fields: f.fieldCount }))
      });
    }

    // Check for dynamic content frameworks
    result.dynamicContent = await page.evaluate(() => {
      return document.querySelectorAll('[data-react-root], [ng-app], [data-v-], #__next, #root, [data-reactroot]').length > 0;
    });

    if (result.dynamicContent) {
      result.observations.push({
        type: 'info',
        category: 'Technical',
        message: 'Dynamic content framework detected (React/Angular/Vue/Next.js)',
        recommendation: 'Use data-testid selectors for more stable automation'
      });
    }

    // Detect user flows
    result.userFlows = detectUserFlows(result.websiteType, result.elements, result.forms, result.pageStructure);

    if (result.userFlows.length > 0) {
      result.observations.push({
        type: 'info',
        category: 'Flows',
        message: `Detected ${result.userFlows.length} user flows`,
        flows: result.userFlows.map(f => ({ name: f.name, priority: f.priority }))
      });
    }

    // Generate BRD
    result.brd = generateBRD(result);

    // Generate test cases
    result.testCases = generateTestCases(result);

    // Calculate analysis time
    result.analysisTime = Date.now() - startTime;

    // Add summary observation
    result.observations.unshift({
      type: 'summary',
      category: 'Analysis Complete',
      message: `Website analysis completed in ${result.analysisTime}ms`,
      stats: {
        websiteType: result.websiteType.typeName,
        elementsFound: result.elements.length,
        formsFound: result.forms.length,
        userFlowsDetected: result.userFlows.length,
        testCasesGenerated: result.testCases.length,
        brdRequirements: result.brd?.functionalRequirements?.length || 0
      }
    });

    console.log(`[URL Analyzer Pro] Analysis complete: ${result.elements.length} elements, ${result.userFlows.length} flows, ${result.testCases.length} test cases`);

  } catch (error) {
    console.error(`[URL Analyzer Pro] Error: ${error.message}`);
    result.error = error.message;
    result.warnings.push(`Analysis error: ${error.message}`);
  }

  return result;
}

/**
 * Format analysis for BA Agent consumption
 */
function formatForBAAgent(analysisResult) {
  return {
    summary: `Analyzed ${analysisResult.url}. Found ${analysisResult.elements?.length || 0} elements, ${analysisResult.forms?.length || 0} forms, ${analysisResult.userFlows?.length || 0} user flows.`,
    
    websiteInfo: {
      type: analysisResult.websiteType?.typeName || 'Website',
      typeConfidence: analysisResult.websiteType?.confidence || 0,
      title: analysisResult.pageStructure?.title,
      url: analysisResult.url
    },
    
    keyFunctionalities: analysisResult.brd?.functionalRequirements?.slice(0, 10).map(req => ({
      name: req.feature,
      priority: req.priority,
      testable: req.testable
    })) || [],
    
    userJourneys: analysisResult.userFlows?.map(f => f.name) || [],
    
    criticalPaths: analysisResult.userFlows?.filter(f => f.priority === 'Critical').map(f => f.name) || [],
    
    riskAreas: analysisResult.brd?.riskAssessment?.map(r => r.description) || [],
    
    formAnalysis: analysisResult.forms?.map(f => ({
      purpose: f.purpose,
      fieldCount: f.fieldCount,
      hasValidation: f.fields.some(field => field.required)
    })) || [],
    
    navigationStructure: {
      menuItems: analysisResult.elements?.filter(e => e.category === 'NAVIGATION').length || 0,
      pageHierarchy: analysisResult.pageStructure?.headings?.map(h => `H${h.level}: ${h.text}`).slice(0, 15) || []
    },
    
    testingRecommendations: [
      ...(analysisResult.antiBot ? ['Use headed browser mode due to anti-bot protection'] : []),
      ...(analysisResult.dynamicContent ? ['Use data-testid selectors for stable automation'] : []),
      ...(analysisResult.websiteType?.testPriorities?.slice(0, 3).map(p => `Prioritize: ${p} testing`) || [])
    ],
    
    autoGeneratedTestCases: analysisResult.testCases || [],
    
    brdDocument: analysisResult.brd,
    
    observations: analysisResult.observations,
    warnings: analysisResult.warnings
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  analyzeUrlPro,
  formatForBAAgent,
  detectWebsiteType,
  generateTestCases,
  generateBRD,
  WEBSITE_TYPES,
  ELEMENT_CATEGORIES
};
