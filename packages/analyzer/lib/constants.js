/**
 * Shared analyzer constants — website types and element category selectors.
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

/** Pro crawl: category → { selectors, priority } */
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

/** Light crawl: category → selector[] (legacy shape) */
const LIGHT_ELEMENT_CATEGORIES = {
  NAVIGATION: ['nav', 'header', '[role="navigation"]', '[role="menubar"]', '.nav', '.menu', '.navbar'],
  FORMS: ['form', '[role="form"]'],
  INPUTS: ['input', 'textarea', 'select', '[contenteditable="true"]'],
  BUTTONS: ['button', '[role="button"]', 'input[type="submit"]', 'input[type="button"]', '.btn', '[class*="button"]'],
  LINKS: ['a[href]', '[role="link"]'],
  IMAGES: ['img', 'picture', '[role="img"]', 'svg'],
  MODALS: ['[role="dialog"]', '[role="alertdialog"]', '.modal', '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]'],
  TABLES: ['table', '[role="grid"]', '[role="table"]'],
  LISTS: ['ul', 'ol', '[role="list"]', '[role="listbox"]'],
  INTERACTIVE: ['[onclick]', '[data-action]', '[class*="click"]', '[class*="toggle"]', '[tabindex]'],
  MEDIA: ['video', 'audio', 'iframe[src*="youtube"]', 'iframe[src*="vimeo"]', '[class*="player"]'],
  SEARCH: ['input[type="search"]', 'input[name*="search"]', 'input[placeholder*="search"]', '[class*="search"]', '[role="searchbox"]'],
  CART: ['[class*="cart"]', '[data-cart]', '[href*="cart"]', '[class*="basket"]'],
  AUTH: ['[class*="login"]', '[class*="signin"]', '[class*="signup"]', '[class*="register"]', '[href*="login"]', '[href*="auth"]']
};

const ACTION_TYPES = {
  CLICK: 'click',
  INPUT: 'input',
  SELECT: 'select',
  NAVIGATE: 'navigate',
  VERIFY: 'verify',
  HOVER: 'hover',
  SCROLL: 'scroll',
  SUBMIT: 'submit',
  UPLOAD: 'upload'
};

const CRITICAL_FORM_PURPOSES = new Set([
  'login',
  'checkout',
  'registration',
  'payment'
]);

const ANTI_BOT_INDICATORS = [
  'captcha',
  'recaptcha',
  'cloudflare',
  'access denied',
  'blocked',
  'verify you are human',
  'please enable javascript'
];

module.exports = {
  WEBSITE_TYPES,
  ELEMENT_CATEGORIES,
  LIGHT_ELEMENT_CATEGORIES,
  ACTION_TYPES,
  CRITICAL_FORM_PURPOSES,
  ANTI_BOT_INDICATORS
};
