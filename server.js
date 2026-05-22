require("dotenv").config();

const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const { Pool } = require("pg");
const compression = require("compression");
const cors = require("cors");

// Professional plugins
const logger = require("./lib/logger");
const apiKeyManager = require("./lib/apiKeyManager");
const swaggerSpec = require("./lib/swagger");
const { 
  rateLimiters, 
  securityHeaders, 
  corsOptions, 
  requestId,
  cacheMiddleware,
  invalidateCache
} = require("./lib/middleware");

// Swagger UI (conditionally load)
let swaggerUi;
try {
  swaggerUi = require("swagger-ui-express");
} catch (e) {
  logger.warn("swagger-ui-express not installed, API docs disabled");
}

// Lazy-load Playwright to prevent cold-start serverless crash
const chromium = {
  launch: (options) => {
    const { chromium: pChromium } = require("playwright");
    return pChromium.launch(options);
  }
};
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const dbHelpers = require("./lib/db");
const encryption = require("./lib/encryption");
const elementLogger = require("./lib/elementLogger");
const locatorRegistry = require("./lib/locatorRegistry");
const scriptBuilder = require("./lib/scriptBuilder");
const javaSeleniumBuilder = require("./lib/javaSeleniumBuilder");
const { detectDomain, getSelectors, getDomainConfig } = require("./lib/ecommerceSelectors");
const urlAnalyzerPro = require("./lib/urlAnalyzerPro");
const urlAnalyzer = require("./lib/urlAnalyzer"); // Legacy fallback

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, "public");
const publicAssetsDir = path.join(publicDir, "assets");

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(compression());
app.use(requestId);

// Request logging
app.use(logger.requestLogger);

// Rate limiting (apply before routes)
app.use("/api/", rateLimiters.general);

// Swagger API documentation
if (swaggerUi) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "ZER0 API Documentation"
  }));
  logger.info("API documentation available at /api-docs");
}

app.use(express.json({ limit: "1mb" }));
app.use("/assets", express.static(publicAssetsDir, { immutable: true, maxAge: "1y" }));
app.use(express.static(publicDir));

const artifactsRoot = process.env.VERCEL
  ? path.join("/tmp", "artifacts")
  : path.join(__dirname, "artifacts");

// Ensure artifactsRoot exists on Vercel
if (process.env.VERCEL) {
  const fsSync = require("fs");
  if (!fsSync.existsSync(artifactsRoot)) {
    fsSync.mkdirSync(artifactsRoot, { recursive: true });
  }
}

app.use("/artifacts", express.static(artifactsRoot));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

const runs = new Map();
const memoryProviderKeys = new Map(); // composite key "userEmail:provider" -> { provider, encrypted_key, last_4, created_at, updated_at }
const memoryAgentSettings = new Map(); // composite key "userEmail:agent" -> { agent, provider, model, prompt, updated_at }
const runSecrets = new Map();
const stageKeys = ["webAnalyzer", "ba", "manualQa", "automationQa", "execution", "accessibility", "performance", "security", "manager", "delivery"];
const optionalStageKeys = ["accessibility", "performance"];
const selectorMemory = new Map();

// In-memory recording sessions (sessionId -> { ottUrl, events[], createdAt })
const recordingSessions = new Map();
const recordingsById = new Map(); // recordingId -> { sessionId, ottUrl, events, createdAt }
const endedSessionToRecordingId = new Map(); // sessionId -> recordingId (so /record page can poll)
let recordingIdCounter = 0;

let dbPool = null;
let dbEnabled = false;

const appProfiles = {
  gray: {
    name: "Gray OTT",
    modules: ["Home", "Trending", "Originals", "Live", "Player", "Account"],
    journeys: ["Landing rail drill-down", "Login gate handling", "Playback control verification"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[data-testid*='nav']"],
      continueCta: ["button:has-text('Continue')", "button:has-text('Watch')", "a:has-text('Continue')"],
      loginCta: ["button:has-text('Login')", "button:has-text('Sign in')", "a:has-text('Login')"],
      loginUserField: ["input[type='email']", "input[name*='email']", "input[name*='user']", "input[type='text']"],
      loginPasswordField: ["input[type='password']"],
      loginSubmit: ["button[type='submit']", "button:has-text('Login')", "button:has-text('Sign in')"],
      contentCard: ["[data-testid*='card'] a", "article a", "a[href*='/show']", "a[href*='/movie']"],
      playCta: ["button:has-text('Play')", "button:has-text('Watch now')", "button[aria-label*='Play']"],
      pauseCta: ["button[aria-label*='Pause']", "button:has-text('Pause')"],
      seekBar: ["[role='slider']", "[aria-label*='Seek']", "[data-testid*='progress']"]
    }
  },
  tvnz: {
    name: "TVNZ+",
    modules: ["Home", "Live TV", "Shows", "Movies", "Categories", "Player", "My List", "Account"],
    journeys: ["Landing to featured rail", "Auth gate to logged-in state", "Show page to episode playback", "Live stream launch and controls"],
    selectorCandidates: {
      primaryNav: ["nav", "header [role='navigation']", "[data-testid*='nav']"],
      continueCta: ["button:has-text('Continue')", "button:has-text('Watch now')", "button:has-text('PLAY MOVIE')", "a:has-text('Continue')"],
      loginCta: ["button:has-text('Sign in')", "a:has-text('Sign in')", "button:has-text('Log in')"],
      loginUserField: ["input[type='email']", "input[name*='email']", "input[name*='username']", "input[type='text']"],
      loginPasswordField: ["input[type='password']"],
      loginSubmit: ["button[type='submit']", "button:has-text('Sign in')", "button:has-text('Continue')"],
      contentCard: ["[data-testid*='tile'] a", "article a", "a[href*='/shows']", "a[href*='/movies']", "a[href*='/movie']"],
      playCta: ["button:has-text('Play')", "button:has-text('PLAY MOVIE')", "button:has-text('Watch now')", "button[aria-label*='Play']"],
      pauseCta: ["button[aria-label*='Pause']", "button:has-text('Pause')"],
      seekBar: ["[role='slider']", "[aria-label*='Seek']", "[data-testid*='timeline']"]
    }
  },
  aha: {
    name: "Aha OTT",
    modules: ["Home", "Telugu", "Tamil", "Movies", "Shows", "Player", "My Account"],
    journeys: ["Home rail to details", "Continue/Subscribe gate handling", "Playback controls and language track checks"],
    selectorCandidates: {
      primaryNav: ["nav", "[data-testid*='header']", "header"],
      continueCta: ["button:has-text('Continue')", "button:has-text('Continue Watching')", "button:has-text('Subscribe')"],
      loginCta: ["button:has-text('Login')", "button:has-text('Sign in')", "a:has-text('Login')"],
      loginUserField: ["input[type='email']", "input[name*='email']", "input[name*='user']", "input[type='text']"],
      loginPasswordField: ["input[type='password']"],
      loginSubmit: ["button[type='submit']", "button:has-text('Login')", "button:has-text('Sign in')"],
      contentCard: ["[data-testid*='card'] a", "article a", "a[href*='/movie']", "a[href*='/show']"],
      playCta: ["button:has-text('Watch Now')", "button:has-text('Play')", "button[aria-label*='Play']"],
      pauseCta: ["button[aria-label*='Pause']", "button:has-text('Pause')"],
      seekBar: ["[role='slider']", "[aria-label*='Seek']", "[data-testid*='progress']"]
    }
  },
  hotstar: {
    name: "Hotstar-like OTT",
    modules: ["Home", "Sports", "Movies", "Shows", "Player", "My Space"],
    journeys: ["Anonymous browse to detail", "Continue CTA to authenticated area", "Start playback and controls"],
    selectorCandidates: {
      primaryNav: ["[data-testid*='nav']", "nav", "header nav"],
      continueCta: ["button:has-text('Continue')", "button:has-text('Continue Watching')"],
      loginCta: ["button:has-text('Log in')", "a:has-text('Log in')"],
      loginUserField: ["input[type='email']", "input[name*='email']", "input[name*='user']", "input[type='text']"],
      loginPasswordField: ["input[type='password']"],
      loginSubmit: ["button[type='submit']", "button:has-text('Log in')", "button:has-text('Sign in')"],
      contentCard: ["[data-testid*='card']", "article a", "a[href*='/movies']", "a[href*='/shows']"],
      playCta: ["button:has-text('Play')", "button[aria-label*='Play']", "[data-testid*='play']"],
      pauseCta: ["button[aria-label*='Pause']", "button:has-text('Pause')"],
      seekBar: ["[role='slider']", "[aria-label*='Seek']", "[data-testid*='seek']"]
    }
  },
  primevideo: {
    name: "PrimeVideo-like OTT",
    modules: ["Home", "Store", "Channels", "Live TV", "Player", "Profiles"],
    journeys: ["Landing hero to detail page", "Sign-in wall handling", "Playback and timeline interaction"],
    selectorCandidates: {
      primaryNav: ["nav", "[role='navigation']", "header"],
      continueCta: ["button:has-text('Continue')", "button:has-text('Next')"],
      loginCta: ["a:has-text('Sign in')", "button:has-text('Sign in')"],
      loginUserField: ["input[type='email']", "input[name*='email']", "input[name*='user']", "input[type='text']"],
      loginPasswordField: ["input[type='password']"],
      loginSubmit: ["button[type='submit']", "button:has-text('Sign in')", "button:has-text('Continue')"],
      contentCard: ["article a", "a[href*='/detail']", "[data-testid*='tile'] a"],
      playCta: ["button:has-text('Play')", "button[aria-label*='Play']"],
      pauseCta: ["button[aria-label*='Pause']", "button:has-text('Pause')"],
      seekBar: ["[role='slider']", "input[type='range']"]
    }
  },
  default: {
    name: "Generic OTT",
    modules: ["Home", "Discovery", "Details", "Player", "Profile", "Settings"],
    journeys: ["Open landing and verify shell", "Move to first content detail", "Attempt playback and controls"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[data-testid*='nav']", "[role='navigation']"],
      continueCta: ["button:has-text('Continue')", "a:has-text('Continue')"],
      loginCta: ["button:has-text('Sign in')", "button:has-text('Log in')", "a:has-text('Sign in')"],
      loginUserField: ["input[type='email']", "input[name*='email']", "input[name*='user']", "input[type='text']"],
      loginPasswordField: ["input[type='password']"],
      loginSubmit: ["button[type='submit']", "button:has-text('Sign in')", "button:has-text('Log in')"],
      contentCard: ["article a", "[data-testid*='card']", "[class*='card'] a", "main a"],
      playCta: ["button:has-text('Play')", "button[aria-label*='Play']", "[data-testid*='play']"],
      pauseCta: ["button[aria-label*='Pause']", "button:has-text('Pause')"],
      seekBar: ["[role='slider']", "[aria-label*='Seek']", "input[type='range']"]
    }
  },
  // ============== DOMAIN-SPECIFIC PROFILES (NON-OTT) ==============
  retail_store: {
    name: "Retail Store",
    modules: ["Home", "Branches", "Categories", "Products", "About", "Contact"],
    journeys: ["Browse store locations", "Explore product categories", "Find contact information", "Navigate to branch details"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']", "[class*='menu']"],
      branchList: ["[class*='branch']", "[class*='location']", "[class*='store']", "a[href*='branch']"],
      categoryList: ["[class*='category']", "[class*='product']", "a[href*='category']"],
      contactInfo: ["a[href^='tel:']", "a[href^='mailto:']", "[class*='contact']"],
      footer: ["footer", "[class*='footer']"]
    }
  },
  ecommerce: {
    name: "E-commerce Platform",
    modules: ["Home", "Search", "Categories", "Product", "Cart", "Checkout", "Account"],
    journeys: ["Search for product", "Browse categories", "Add to cart", "Complete checkout", "User authentication"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      searchBox: ["input[type='search']", "input[name*='search']", "input[placeholder*='search' i]"],
      searchSubmit: ["button[type='submit']", "[class*='search'] button"],
      productCard: ["[class*='product']", "article", "[data-product]"],
      addToCart: ["button:has-text('Add to Cart')", "button:has-text('Add to Bag')", "[class*='add-to-cart']"],
      cartIcon: ["[class*='cart']", "a[href*='cart']"],
      loginCta: ["button:has-text('Login')", "a:has-text('Sign in')"]
    }
  },
  healthcare: {
    name: "Healthcare/Pharmaceutical",
    modules: ["Home", "Products", "About", "Contact", "Careers", "Investor Relations"],
    journeys: ["Browse products", "Find contact information", "Access career portal", "Report adverse event"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      productList: ["[class*='product']", "[class*='brand']", "a[href*='product']"],
      contactForm: ["form", "[class*='contact']"],
      adverseEvent: ["a[href*='adverse']", "a:has-text('Report')"],
      footer: ["footer", "[class*='footer']"]
    }
  },
  corporate: {
    name: "Corporate Website",
    modules: ["Home", "About", "Services", "Products", "Careers", "Contact", "Investor Relations"],
    journeys: ["Navigate main sections", "Access company information", "Find contact details", "Explore careers"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      aboutSection: ["a[href*='about']", "[class*='about']"],
      careersSection: ["a[href*='career']", "[class*='career']"],
      contactForm: ["form", "[class*='contact']"],
      footer: ["footer", "[class*='footer']"]
    }
  },
  banking: {
    name: "Banking/Finance Portal",
    modules: ["Home", "Login", "Accounts", "Transfers", "Payments", "Settings"],
    journeys: ["Secure login", "View account balance", "Transfer funds", "Pay bills"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      loginForm: ["form[class*='login']", "[class*='login']"],
      loginCta: ["button:has-text('Login')", "a:has-text('Login')"],
      accountInfo: ["[class*='account']", "[class*='balance']"],
      footer: ["footer", "[class*='footer']"]
    }
  },
  food_delivery: {
    name: "Food Delivery Platform",
    modules: ["Home", "Search", "Restaurants", "Menu", "Cart", "Checkout", "Orders"],
    journeys: ["Search restaurants", "Browse menu", "Add to cart", "Complete order", "Track order"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      searchBox: ["input[type='search']", "input[placeholder*='search' i]"],
      restaurantCard: ["[class*='restaurant']", "article", "[data-restaurant]"],
      menuItem: ["[class*='menu-item']", "[class*='dish']"],
      cartIcon: ["[class*='cart']", "a[href*='cart']"]
    }
  },
  travel: {
    name: "Travel Booking Platform",
    modules: ["Home", "Search", "Flights", "Hotels", "Packages", "Booking", "Account"],
    journeys: ["Search flights", "Search hotels", "Complete booking", "Manage booking"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      searchForm: ["form", "[class*='search']"],
      flightCard: ["[class*='flight']", "[class*='result']"],
      hotelCard: ["[class*='hotel']", "[class*='property']"],
      bookNow: ["button:has-text('Book')", "a:has-text('Book')"]
    }
  },
  education: {
    name: "Education Platform",
    modules: ["Home", "Courses", "Categories", "Learning", "Profile", "Certificates"],
    journeys: ["Browse courses", "Enroll in course", "Access learning content", "Track progress"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      courseCard: ["[class*='course']", "article", "[data-course]"],
      enrollButton: ["button:has-text('Enroll')", "a:has-text('Start')"],
      videoPlayer: ["video", "[class*='player']"]
    }
  },
  news_media: {
    name: "News/Media Website",
    modules: ["Home", "Categories", "Articles", "Videos", "Search", "Subscribe"],
    journeys: ["Browse headlines", "Read article", "Watch video", "Search content"],
    selectorCandidates: {
      primaryNav: ["nav", "header", "[role='navigation']"],
      articleCard: ["article", "[class*='article']", "[class*='story']"],
      searchBox: ["input[type='search']", "input[placeholder*='search' i]"],
      videoPlayer: ["video", "[class*='player']"]
    }
  }
};

const profileScenarioCatalog = {
  tvnz: [
    { module: "Authentication", scenario: "Default Splash Screen Playback", expected: "Video plays for 3-6 seconds then transitions to Login/Profile", priority: "High", type: "Sanity" },
    { module: "Authentication", scenario: "OTP Login / Sign Up", expected: "User authenticates with 6-digit OTP", priority: "High", type: "Sanity" },
    { module: "Profiles", scenario: "Profile Creation & Switching", expected: "Up to 5 profiles supported with switch behavior", priority: "High", type: "Sanity" },
    { module: "Profiles", scenario: "Kids/Preschool Experience", expected: "Age-safe content and simplified menu shown", priority: "High", type: "Sanity" },
    { module: "Discovery", scenario: "Search Results", expected: "2+ char search returns relevant shows/movies/sport/news", priority: "High", type: "Sanity" },
    { module: "Content Details", scenario: "Show/Movie Details Page", expected: "Metadata, Add to My List, Play CTA shown", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Basic VOD Control", expected: "Play/Pause/Scrub with smooth interaction", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Resume / Continue Watching", expected: "Resume from saved position in Continue Watching rail", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Skip Intro / Recap", expected: "Skip CTA appears and jumps to marked segment end", priority: "Medium", type: "Sanity" },
    { module: "EPG / Channels", scenario: "Full EPG Navigation", expected: "Week schedule and channel metadata are available", priority: "High", type: "Sanity" },
    { module: "Live Event", scenario: "Watch from Start + Jump to Live", expected: "DVR controls support watch-from-start and jump-to-live", priority: "High", type: "Sanity" },
    { module: "Ads", scenario: "SSAI VOD Ads", expected: "Ad pod plays and FF/scrub disabled during ads", priority: "High", type: "Sanity" },
    { module: "Payments", scenario: "Paid Content Access", expected: "Padlock shown and Buy Now redirects to payment journey", priority: "High", type: "Sanity" },
    { module: "Device Features", scenario: "Chromecast + PiP", expected: "Cast discovery and PiP activation works", priority: "Medium", type: "Sanity" },
    { module: "Recommendations", scenario: "Personalized Belts", expected: "Recommended For / Because You Watched / Trending belts are visible", priority: "Medium", type: "Sanity" },
    { module: "Maintenance", scenario: "Forced App Update", expected: "Old versions see forced update blocking screen", priority: "High", type: "Sanity" }
  ],
  aha: [
    { module: "Authentication", scenario: "Login and profile entry", expected: "User reaches logged-in home experience", priority: "High", type: "Sanity" },
    { module: "Discovery", scenario: "Home rails and category navigation", expected: "Home, language rails, and detail drill-down function", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Play/Pause/Seek", expected: "Playback controls remain stable", priority: "High", type: "Sanity" },
    { module: "Personalization", scenario: "My List behavior", expected: "Add/remove content reflects in My List", priority: "Medium", type: "Sanity" }
  ],
  gray: [
    { module: "Authentication", scenario: "Login gate handling", expected: "User progresses through auth gate", priority: "High", type: "Sanity" },
    { module: "Navigation", scenario: "Home to detail drill-down", expected: "Card open and details metadata are visible", priority: "High", type: "Sanity" },
    { module: "Playback", scenario: "Playback control checks", expected: "Play/Pause/Seek interactions work", priority: "High", type: "Sanity" }
  ],
  // ============== DOMAIN-SPECIFIC SCENARIO CATALOGS ==============
  retail_store: [
    { module: "Navigation", scenario: "Main menu navigation", expected: "All menu items are clickable and navigate correctly", priority: "Critical", type: "Sanity" },
    { module: "Branches", scenario: "Store branch listing", expected: "All store branches are displayed with addresses", priority: "Critical", type: "Sanity" },
    { module: "Branches", scenario: "Branch details and contact", expected: "Contact information and store hours are visible", priority: "High", type: "Functional" },
    { module: "Categories", scenario: "Product category browsing", expected: "Product categories are navigable and show items", priority: "High", type: "Functional" },
    { module: "Contact", scenario: "Contact information access", expected: "Phone, email, and address are accessible", priority: "High", type: "Functional" },
    { module: "UI", scenario: "Image and media loading", expected: "All images load without errors", priority: "Medium", type: "UI" },
    { module: "Footer", scenario: "Footer links verification", expected: "Footer links navigate to correct pages", priority: "Medium", type: "Sanity" }
  ],
  ecommerce: [
    { module: "Search", scenario: "Product search functionality", expected: "Search returns relevant products", priority: "Critical", type: "Sanity" },
    { module: "Products", scenario: "Product listing page", expected: "Products display with image, price, and title", priority: "Critical", type: "Sanity" },
    { module: "Products", scenario: "Product details page", expected: "Product details show complete information", priority: "High", type: "Functional" },
    { module: "Cart", scenario: "Add to cart functionality", expected: "Product is added to cart, count updates", priority: "Critical", type: "Sanity" },
    { module: "Cart", scenario: "Cart management", expected: "Items can be updated and removed", priority: "High", type: "Functional" },
    { module: "Authentication", scenario: "User login", expected: "User can log in with valid credentials", priority: "High", type: "Functional" },
    { module: "Checkout", scenario: "Checkout flow", expected: "User can complete checkout process", priority: "Critical", type: "E2E" }
  ],
  healthcare: [
    { module: "Navigation", scenario: "Main navigation verification", expected: "All sections are accessible", priority: "Critical", type: "Sanity" },
    { module: "Products", scenario: "Product information access", expected: "Product details are accurate and complete", priority: "High", type: "Functional" },
    { module: "Contact", scenario: "Contact form submission", expected: "Form accepts input and confirms submission", priority: "High", type: "Functional" },
    { module: "Compliance", scenario: "Adverse event reporting access", expected: "Adverse event reporting is accessible", priority: "Critical", type: "Compliance" },
    { module: "About", scenario: "Company information pages", expected: "About, careers, and investor pages load", priority: "Medium", type: "Functional" }
  ],
  corporate: [
    { module: "Navigation", scenario: "Main navigation verification", expected: "All sections are accessible", priority: "Critical", type: "Sanity" },
    { module: "About", scenario: "Company information pages", expected: "About, leadership, and history pages load", priority: "High", type: "Functional" },
    { module: "Contact", scenario: "Contact form submission", expected: "Form accepts input and confirms submission", priority: "High", type: "Functional" },
    { module: "Careers", scenario: "Career portal access", expected: "Job listings are viewable", priority: "Medium", type: "Functional" }
  ],
  banking: [
    { module: "Security", scenario: "HTTPS verification", expected: "All pages use HTTPS", priority: "Critical", type: "Security" },
    { module: "Authentication", scenario: "Secure login", expected: "Login accepts credentials securely", priority: "Critical", type: "Security" },
    { module: "Navigation", scenario: "Main navigation verification", expected: "All sections are accessible", priority: "High", type: "Sanity" },
    { module: "Forms", scenario: "Form validation", expected: "Forms validate input correctly", priority: "High", type: "Functional" }
  ],
  food_delivery: [
    { module: "Search", scenario: "Restaurant search", expected: "Search returns relevant restaurants", priority: "Critical", type: "Sanity" },
    { module: "Browse", scenario: "Restaurant listing", expected: "Restaurants display with ratings and info", priority: "High", type: "Functional" },
    { module: "Menu", scenario: "Menu browsing", expected: "Menu items are viewable with prices", priority: "High", type: "Functional" },
    { module: "Cart", scenario: "Add items to cart", expected: "Items are added and cart updates", priority: "Critical", type: "Sanity" }
  ],
  travel: [
    { module: "Search", scenario: "Flight/hotel search", expected: "Search returns relevant results", priority: "Critical", type: "Sanity" },
    { module: "Results", scenario: "Search results display", expected: "Results show prices and details", priority: "High", type: "Functional" },
    { module: "Booking", scenario: "Booking flow", expected: "User can proceed through booking", priority: "Critical", type: "E2E" }
  ],
  education: [
    { module: "Courses", scenario: "Course catalog browsing", expected: "Courses are listed and searchable", priority: "Critical", type: "Sanity" },
    { module: "Enrollment", scenario: "Course enrollment", expected: "User can enroll in a course", priority: "High", type: "Functional" },
    { module: "Learning", scenario: "Content access", expected: "Learning content is accessible", priority: "High", type: "Functional" }
  ],
  news_media: [
    { module: "Navigation", scenario: "Category navigation", expected: "All news categories are accessible", priority: "Critical", type: "Sanity" },
    { module: "Content", scenario: "Article loading", expected: "Articles load with full content", priority: "High", type: "Functional" },
    { module: "Search", scenario: "Content search", expected: "Search returns relevant articles", priority: "High", type: "Functional" }
  ],
  default: [
    { module: "Navigation", scenario: "Main navigation verification", expected: "All menu items are clickable and navigate correctly", priority: "Critical", type: "Sanity" },
    { module: "UI", scenario: "Page loading and display", expected: "Page loads completely without errors", priority: "High", type: "Sanity" },
    { module: "Forms", scenario: "Form functionality", expected: "Forms accept input and provide feedback", priority: "High", type: "Functional" },
    { module: "Links", scenario: "Link verification", expected: "All links navigate to valid pages", priority: "Medium", type: "Sanity" }
  ]
};

function maskLogin(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 2) return "**";
  return `${text.slice(0, 2)}***`;
}

function setRunSecret(runId, secret) {
  if (!secret || (!secret.username && !secret.password)) {
    runSecrets.delete(runId);
    return;
  }
  runSecrets.set(runId, secret);
}

function getRunSecret(runId) {
  return runSecrets.get(runId) || { username: "", password: "" };
}

// Database disabled by user request
function databaseConfigured() { return false; }
async function initDatabase() { return; }

async function persistRun(run) {
  runs.set(run.id, run);

  try {
    const runPath = path.join(run.runDir, "run.json");
    await fs.mkdir(run.runDir, { recursive: true });

    // Exclude large temporary file buffers/contents from the persisted JSON to save disk/temp space
    const storageRun = {
      ...run,
      input: {
        ...run.input,
        tcFileBuffer: undefined
      }
    };
    await fs.writeFile(runPath, JSON.stringify(storageRun, null, 2), "utf8");
  } catch (e) {
    console.error(`Failed to write run.json for ${run.id}:`, e.message);
  }
}

async function persistAssets(run) {
  if (!dbEnabled || !dbPool || !run.artifacts.automationBundle) return;

  const script = run.artifacts.automationBundle.generatedPlaywrightScript || "";
  const javaScript = run.artifacts.automationBundle.generatedSeleniumJava || "";
  const manualTc = JSON.stringify(run.artifacts.manualTestCases || {}, null, 2);
  const manager = JSON.stringify(run.artifacts.managerReport || {}, null, 2);

  await dbPool.query("DELETE FROM qa_assets WHERE run_id = $1", [run.id]);
  const values = [
    run.id, "manual_test_cases", "manual_test_cases.json", manualTc,
    run.id, "automation_script", "generated.spec.ts", script,
    run.id, "manager_report", "manager_report.json", manager
  ];
  if (javaScript) {
    await dbPool.query(
      `INSERT INTO qa_assets (run_id, asset_type, asset_name, content_text)
       VALUES ($1,$2,$3,$4),($1,$5,$6,$7),($1,$8,$9,$10),($1,$11,$12,$13)`,
      [...values, run.id, "automation_script_java", "generated.java", javaScript]
    );
  } else {
    await dbPool.query(
      `INSERT INTO qa_assets (run_id, asset_type, asset_name, content_text)
       VALUES ($1,$2,$3,$4),($1,$5,$6,$7),($1,$8,$9,$10)`,
      values
    );
  }
}

function toRunShape(row) {
  const input = row.input_json || {};
  return {
    id: row.id,
    runDir: path.join(artifactsRoot, row.id),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    input,
    status: row.status,
    stages: row.stages_json,
    artifacts: {
      requirements: row.requirements_json,
      manualTestCases: row.manual_tc_json,
      automationBundle: row.automation_bundle_json,
      executionReport: row.execution_report_json,
      managerReport: row.manager_report_json,
      deliveryReport: row.delivery_report_json || null,
      recording: input.recording || null,
      cmsSignalReport: row.cms_signal_json || null
    },
    picture: buildArchitecturePictureSvg()
  };
}

async function getRun(id) {
  if (runs.has(id)) return runs.get(id);

  try {
    const runPath = path.join(artifactsRoot, id, "run.json");
    const data = await fs.readFile(runPath, "utf8");
    const run = JSON.parse(data);

    // Dynamic patch of runDir in case of absolute path mapping changes across deployment environments
    run.runDir = path.join(artifactsRoot, id);

    runs.set(id, run);
    return run;
  } catch (e) {
    return null;
  }
}

function createRun(input) {
  const id = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const now = new Date().toISOString();

  // Check if we need Web Analyzer (no test document provided)
  const needsWebAnalyzer = !input.tcFileBuffer && !input.tcFileContent && (!input.notes || input.notes.trim().length < 50);

  // Base stages - conditionally include web analyzer
  const stages = {};
  
  if (needsWebAnalyzer) {
    stages.webAnalyzer = { label: "Web Analyzer Agent", status: "pending", startedAt: null, finishedAt: null };
  }

  stages.ba = { label: "BA Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.manualQa = { label: "Manual QA Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.automationQa = { label: "Automation QA Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.execution = { label: "Execution Service", status: "pending", startedAt: null, finishedAt: null };

  // Optional agents - only add if enabled in input
  if (input.enableAccessibility) {
    stages.accessibility = { label: "Accessibility Agent", status: "pending", startedAt: null, finishedAt: null };
  }
  if (input.enablePerformance) {
    stages.performance = { label: "Performance Agent", status: "pending", startedAt: null, finishedAt: null };
  }
  if (input.enableSecurity) {
    stages.security = { label: "Security Agent", status: "pending", startedAt: null, finishedAt: null };
  }

  // Final stages - always included
  stages.manager = { label: "Manager Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.delivery = { label: "Delivery Manager Agent", status: "pending", startedAt: null, finishedAt: null };

  const artifacts = {
    webAnalysis: null,
    requirements: null,
    manualTestCases: null,
    automationBundle: null,
    executionReport: null,
    managerReport: null,
    deliveryReport: null
  };

  // Add optional artifact slots if enabled
  if (input.enableAccessibility) {
    artifacts.accessibilityReport = null;
  }
  if (input.enablePerformance) {
    artifacts.performanceReport = null;
  }
  if (input.enableSecurity) {
    artifacts.securityReport = null;
  }

  const run = {
    id,
    runDir: path.join(artifactsRoot, id),
    createdAt: now,
    updatedAt: now,
    input,
    status: "queued",
    stages,
    artifacts,
    picture: buildArchitecturePictureSvg()
  };
  runs.set(id, run);
  return run;
}

function setStage(run, key, status) {
  const stage = run.stages[key];
  if (!stage) return;
  const now = new Date().toISOString();
  stage.status = status;
  if (status === "running") stage.startedAt = now;
  if (status === "done" || status === "failed") stage.finishedAt = now;
  run.updatedAt = now;
}

function safeList(text) {
  return (text || "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function hostFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function inferProfile(ottUrl, requestedProfile) {
  const allowed = new Set(["gray", "tvnz", "aha", "hotstar", "primevideo", "default"]);
  if (requestedProfile && allowed.has(requestedProfile)) return requestedProfile;
  const host = hostFromUrl(ottUrl);
  if (host.includes("gray")) return "gray";
  if (host.includes("tvnz")) return "tvnz";
  if (host.includes("aha") || host.includes("aha.video") || host.includes("ahatv")) return "aha";
  if (host.includes("hotstar")) return "hotstar";
  if (host.includes("primevideo") || host.includes("amazon")) return "primevideo";
  return "default";
}

function parseTcFile(raw) {
  const lines = safeList(raw);
  const parsed = [];
  for (const line of lines) {
    if (/^tc[-\s_]?\d+/i.test(line)) {
      parsed.push(line);
      continue;
    }
    if (line.length > 18) parsed.push(line);
  }
  return parsed.slice(0, 20);
}

function looksBinary(buffer) {
  if (!buffer || !buffer.length) return false;
  let suspicious = 0;
  const scanLen = Math.min(buffer.length, 512);
  for (let i = 0; i < scanLen; i += 1) {
    const b = buffer[i];
    if (b === 0) return true;
    if (b < 9 || (b > 13 && b < 32)) suspicious += 1;
  }
  return suspicious > 20;
}

function normalizeCaseLine(line) {
  const cleaned = String(line || "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 12) return null;
  if (/^pk\u0003\u0004|^PK\u0003\u0004/.test(cleaned)) return null;
  return cleaned;
}

function extractCasesFromRows(rows = []) {
  const out = [];
  for (const row of rows) {
    const cells = Array.isArray(row) ? row : [row];
    const line = normalizeCaseLine(cells.filter(Boolean).join(" | "));
    if (!line) continue;
    out.push(line);
    if (out.length >= 40) break;
  }
  return out;
}

function parseCsvLine(line, delim) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && (c === delim || c === "\t")) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function extractStructuredCsvCases(buffer) {
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], structured: [] };

  const firstLine = lines[0];
  const useTab = firstLine.includes("\t") && (firstLine.match(/\t/g) || []).length >= 2;
  const delim = useTab ? "\t" : ",";

  const header = parseCsvLine(lines[0], delim).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const featureIdx = header.findIndex((h) => h.includes("feature"));
  const scenarioIdx = header.findIndex((h) => h.includes("scenario"));
  const expectedIdx = header.findIndex((h) => h.includes("expected") || h.includes("expected result"));

  if (featureIdx === -1 && scenarioIdx === -1 && expectedIdx === -1) {
    return { rows: [], structured: [] };
  }

  const rows = [];
  const structured = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i], delim).map((c) => c.replace(/^["']|["']$/g, "").trim());
    const feature = featureIdx >= 0 ? (cols[featureIdx] || "") : "General";
    const scenario = scenarioIdx >= 0 ? (cols[scenarioIdx] || "") : "Scenario";
    const expected = expectedIdx >= 0 ? (cols[expectedIdx] || "") : "Expected behavior";
    if (!feature && !scenario && !expected) continue;
    rows.push(`${feature} | ${scenario} | ${expected}`);
    structured.push({ feature, scenario, expectedResult: expected });
  }
  return { rows, structured };
}

function extractUploadedCases(input) {
  const warnings = [];
  const fileName = input.tcFileName || "";
  const ext = path.extname(fileName).toLowerCase();
  const buf = input.tcFileBuffer;

  if (!fileName || !buf) {
    return { cases: parseTcFile(input.tcFileContent || ""), warnings };
  }

  try {
    if (ext === ".xlsx" || ext === ".xls") {
      const workbook = XLSX.read(buf, { type: "buffer" });
      const rows = [];
      workbook.SheetNames.forEach((name) => {
        const ws = workbook.Sheets[name];
        const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        rows.push(...jsonRows);
      });
      return { cases: extractCasesFromRows(rows), warnings };
    }

    if (ext === ".csv") {
      const parsed = extractStructuredCsvCases(buf);
      if (parsed.rows.length) return { cases: parsed.rows, structured: parsed.structured, warnings };
      const text = buf.toString("utf8");
      const rows = text.split(/\r?\n/).map((line) => line.split(","));
      return { cases: extractCasesFromRows(rows), structured: [], warnings };
    }

    if (looksBinary(buf)) {
      warnings.push("Uploaded file appears binary and could not be parsed. Use .xlsx/.csv/.txt/.md/.json.");
      return { cases: [], warnings };
    }

    return { cases: parseTcFile(buf.toString("utf8")), warnings };
  } catch (error) {
    warnings.push(`Failed to parse uploaded test-case file: ${error.message}`);
    return { cases: [], warnings };
  }
}

function consolidateRequirements(input) {
  const assertions = safeList(input.assertions);
  const notes = safeList(input.notes);
  const extraction = extractUploadedCases(input);
  const uploadedCases = extraction.cases;
  const testCaseRowsStructured = extraction.structured || [];

  // Check for URL Analysis insights
  const hasUrlAnalysis = input._webAnalysisInsights || input._brdDocument;
  const brdDocument = input._brdDocument || null;
  const urlAnalysisInsights = input._webAnalysisInsights || {};
  const suggestedRequirements = input._suggestedRequirements || [];
  const suggestedTestAreas = input._suggestedTestAreas || [];
  const autoGeneratedTestCases = input._autoGeneratedTestCases || [];
  const userFlows = input._userFlows || [];
  const observations = input._observations || [];

  // Determine the actual website type from URL analysis
  const detectedWebsiteType = urlAnalysisInsights.websiteType || urlAnalysisInsights.siteType || null;
  const websiteTypeConfidence = urlAnalysisInsights.websiteTypeConfidence || 0;
  
  // Map detected website type to profile key
  let profileKey = 'default';
  if (detectedWebsiteType && websiteTypeConfidence >= 0.5) {
    if (detectedWebsiteType.toLowerCase().includes('retail')) profileKey = 'retail_store';
    else if (detectedWebsiteType.toLowerCase().includes('e-commerce') || detectedWebsiteType.toLowerCase().includes('ecommerce')) profileKey = 'ecommerce';
    else if (detectedWebsiteType.toLowerCase().includes('healthcare') || detectedWebsiteType.toLowerCase().includes('pharma')) profileKey = 'healthcare';
    else if (detectedWebsiteType.toLowerCase().includes('corporate')) profileKey = 'corporate';
    else if (detectedWebsiteType.toLowerCase().includes('bank') || detectedWebsiteType.toLowerCase().includes('finance')) profileKey = 'banking';
    else if (detectedWebsiteType.toLowerCase().includes('food') || detectedWebsiteType.toLowerCase().includes('delivery')) profileKey = 'food_delivery';
    else if (detectedWebsiteType.toLowerCase().includes('travel') || detectedWebsiteType.toLowerCase().includes('booking')) profileKey = 'travel';
    else if (detectedWebsiteType.toLowerCase().includes('education') || detectedWebsiteType.toLowerCase().includes('learning')) profileKey = 'education';
    else if (detectedWebsiteType.toLowerCase().includes('news') || detectedWebsiteType.toLowerCase().includes('media')) profileKey = 'news_media';
    else if (detectedWebsiteType.toLowerCase().includes('ott') || detectedWebsiteType.toLowerCase().includes('streaming')) {
      // Check for specific OTT platforms
      profileKey = inferProfile(input.ottUrl, input.channelProfile);
    }
  } else {
    // Fallback to OTT profile inference for backward compatibility
    profileKey = inferProfile(input.ottUrl, input.channelProfile);
  }
  
  const profile = appProfiles[profileKey] || appProfiles.default;
  const effectiveProfileName = detectedWebsiteType || profile.name;

  const sourceMode = input.figmaUrl
    ? "figma-plus-user-input"
    : uploadedCases.length
      ? (testCaseRowsStructured.length ? "csv-test-cases-only" : "uploaded-test-cases-plus-user-input")
      : hasUrlAnalysis
        ? "url-analysis-auto-generated"
        : "user-input-only";

  // Generate domain-appropriate requirement statements
  let requirementStatements = [];
  
  if (profileKey === 'retail_store') {
    requirementStatements = [
      "All store branch locations must be displayed with complete address and contact information.",
      "Store operating hours must be clearly visible for each branch.",
      "Product categories must be navigable and display relevant items.",
      "Contact information must be accessible from all pages.",
      "Navigation menu must provide clear access to all main sections.",
      "Images and media must load correctly across all pages."
    ];
  } else if (profileKey === 'ecommerce') {
    requirementStatements = [
      "Product search must return relevant results within 3 seconds.",
      "Product listing pages must display price, image, and availability.",
      "Add to Cart functionality must update cart count immediately.",
      "Cart must persist items across page navigation.",
      "Checkout flow must be completable without errors.",
      "User authentication must work for login and registration."
    ];
  } else if (profileKey === 'healthcare') {
    requirementStatements = [
      "Product information must be accurate and accessible.",
      "Contact forms must accept user input and confirm submission.",
      "Adverse event reporting mechanism must be accessible.",
      "Company information must be available and accurate.",
      "Navigation must provide access to all product and corporate sections."
    ];
  } else if (profileKey === 'banking') {
    requirementStatements = [
      "Login must be secure with proper credential handling.",
      "All pages must be served over HTTPS.",
      "Session management must handle timeout appropriately.",
      "Account information must display accurately.",
      "Transaction forms must validate input properly."
    ];
  } else {
    // Default/OTT requirements
    requirementStatements = [
      "Application shell must render with primary navigation and discoverable entry points.",
      "Content must be accessible through navigation and search.",
      "Forms must accept user input and provide feedback.",
      "Images and media must load correctly.",
      "All interactive elements must respond to user actions."
    ];
  }

  // Add suggested requirements from URL Analysis
  if (suggestedRequirements.length > 0) {
    requirementStatements = [
      ...requirementStatements,
      ...suggestedRequirements.slice(0, 10)
    ];
  }

  // Add requirements from BRD document
  if (brdDocument && brdDocument.functionalRequirements) {
    const brdReqs = brdDocument.functionalRequirements
      .filter(r => r.testable)
      .slice(0, 10)
      .map(r => `${r.id}: ${r.description}`);
    requirementStatements = [...requirementStatements, ...brdReqs];
  }

  // Get user journeys from URL analysis or profile
  let enhancedJourneys = [...(profile.journeys || [])];
  if (urlAnalysisInsights.userJourneys && urlAnalysisInsights.userJourneys.length > 0) {
    enhancedJourneys = urlAnalysisInsights.userJourneys; // Prefer URL analysis journeys
  }
  if (userFlows.length > 0) {
    const flowNames = userFlows.map(f => f.name);
    enhancedJourneys = [...new Set([...flowNames, ...enhancedJourneys])];
  }

  // Determine target domain and audience from URL analysis
  const targetDomain = detectedWebsiteType || profileKey.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  let audience = "Website visitors";
  if (profileKey === 'ecommerce') audience = "Online shoppers";
  else if (profileKey === 'retail_store') audience = "Retail customers";
  else if (profileKey === 'healthcare') audience = "Patients and healthcare professionals";
  else if (profileKey === 'banking') audience = "Banking customers";
  else if (profileKey === 'food_delivery') audience = "Food ordering customers";
  else if (profileKey === 'travel') audience = "Travelers";
  else if (profileKey === 'education') audience = "Students and learners";
  else if (profileKey === 'news_media') audience = "Readers and viewers";
  else if (profileKey.includes('ott') || profile.name.includes('OTT')) audience = "Streaming users";

  return {
    metadata: {
      ottUrl: input.ottUrl,
      figmaUrl: input.figmaUrl || null,
      profileKey,
      profile: effectiveProfileName,
      websiteType: detectedWebsiteType,
      websiteTypeConfidence,
      generatedAt: new Date().toISOString(),
      source: hasUrlAnalysis ? "BA Agent + URL Analyzer Pro" : "BA Agent",
      sourceMode,
      sourceCaseCount: uploadedCases.length,
      hasUrlAnalysis,
      autoGeneratedTestCaseCount: autoGeneratedTestCases.length
    },
    testCaseRowsStructured,
    channelContext: {
      hostname: hostFromUrl(input.ottUrl),
      targetDomain,
      audience,
      releaseIntent: "Regression + user critical paths",
      loginCredentialsProvided: Boolean(input.login && input.login.enabled)
    },
    modules: profile.modules,
    userJourneys: enhancedJourneys,
    requirementStatements: [...new Set(requirementStatements)],
    qualityStandard: {
      mode: "pro",
      manualCaseTemplate: ["id", "module", "scenario", "priority", "preconditions", "steps", "expectedResult", "type"]
    },
    assertionInputs: assertions,
    testCaseSeedFromUpload: uploadedCases,
    ingestionWarnings: extraction.warnings,
    userNotes: notes,
    assumptions: [
      "Given URL is a valid pre-prod or prod-like environment.",
      "If figma is unavailable, uploaded test case file is accepted as baseline behavior reference.",
      "No credential secrets are provided in this tool; login walls may remain partial in automation.",
      ...(hasUrlAnalysis ? ["URL Analysis provides comprehensive element discovery for test coverage."] : [])
    ],
    risks: [
      "Dynamic content rails can shift selectors between runs.",
      "Regional variants may alter CTA labels.",
      "Login gates may require OTP/captcha not automatable in generic flow.",
      ...(observations.filter(o => o.type === 'warning').map(o => o.message) || [])
    ],
    // URL Analysis enhanced data
    urlAnalysis: hasUrlAnalysis ? {
      insights: urlAnalysisInsights,
      suggestedTestAreas,
      suggestedRequirements,
      autoGeneratedTestCases,
      userFlows,
      observations: observations.filter(o => o.type !== 'warning'),
      brdDocument
    } : null
  };
}

function generateManualCases(requirements) {
  const profile = requirements.metadata.profile;
  const profileKey = requirements.metadata.profileKey || "default";
  const uploadedSeeds = requirements.testCaseSeedFromUpload || [];
  const assertions = requirements.assertionInputs || [];
  const journeys = requirements.userJourneys || [];

  const baseCatalog = profileScenarioCatalog[profileKey] || [];
  const testCases = baseCatalog.map((item, index) => ({
    id: `TC-${String(profileKey).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
    module: item.module,
    scenario: item.scenario,
    title: `${profile}: ${item.module} - ${item.scenario}`,
    type: item.type,
    priority: item.priority,
    preconditions: "Environment is stable, user/profile prerequisites are met, and content is available",
    testData: "Use sanctioned QA account and deterministic content fixtures",
    steps: [
      `Navigate to ${item.module} workflow entry point`,
      `Execute scenario: ${item.scenario}`,
      "Capture evidence and compare with expected behavior"
    ],
    expectedResult: item.expected,
    traceability: "Mapped from BA requirement + channel sanity catalog"
  }));

  journeys.forEach((journey, i) => {
    testCases.push({
      id: `TC-${String(profileKey).toUpperCase()}-J${String(i + 1).padStart(3, "0")}`,
      module: "Journey",
      scenario: journey,
      title: `${profile}: Journey - ${journey}`,
      type: "Regression",
      priority: "Medium",
      preconditions: "Entry route is reachable and backend services are healthy",
      testData: "Default seeded content",
      steps: ["Open journey start point", "Traverse journey end-to-end", "Capture deviations with screenshot evidence"],
      expectedResult: "Journey completes and user-facing behavior remains stable",
      traceability: "Mapped from BA userJourneys"
    });
  });

  uploadedSeeds.forEach((seed, i) => {
    testCases.push({
      id: `TC-${String(profileKey).toUpperCase()}-UPL-${String(i + 1).padStart(3, "0")}`,
      module: "Uploaded Baseline",
      scenario: seed.slice(0, 80),
      title: `${profile}: Uploaded baseline case ${i + 1}`,
      type: "Baseline",
      priority: "High",
      preconditions: "Uploaded baseline is approved for this release",
      testData: "Input taken from uploaded suite",
      steps: [
        `Execute baseline statement: ${seed.slice(0, 140)}`,
        "Collect pass/fail evidence",
        "Record exact mismatch if observed"
      ],
      expectedResult: "Behavior aligns with uploaded baseline",
      traceability: "Mapped from uploaded test case"
    });
  });

  assertions.forEach((assertion, i) => {
    testCases.push({
      id: `TC-${String(profileKey).toUpperCase()}-AS-${String(i + 1).padStart(3, "0")}`,
      module: "Assertion",
      scenario: assertion.slice(0, 80),
      title: `${profile}: Assertion Validation ${i + 1}`,
      type: "Assertion",
      priority: "High",
      preconditions: "Target page and element are reachable",
      testData: "Assertion string provided by end user",
      steps: ["Navigate to relevant state", `Validate assertion: ${assertion}`, "Capture proof in report"],
      expectedResult: `Assertion holds true: ${assertion}`,
      traceability: "Mapped from user assertion input"
    });
  });

  const structuredRate = testCases.length
    ? Math.round((testCases.filter((tc) => tc.module && tc.scenario && tc.steps && tc.steps.length >= 3).length / testCases.length) * 100)
    : 0;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Manual QA Agent",
      profile,
      professionalMode: true,
      qualityGate: {
        structureRate: `${structuredRate}%`,
        minAcceptedStructureRate: "90%"
      }
    },
    testCases
  };
}

function generateCasesFromUploadedOnly(requirements) {
  const profile = requirements.metadata.profile;
  const profileKey = requirements.metadata.profileKey || "default";
  const structured = requirements.testCaseRowsStructured || [];
  const uploadedSeeds = requirements.testCaseSeedFromUpload || [];

  const source = structured.length ? structured : uploadedSeeds.map((seed) => {
    const parts = String(seed).split("|").map((p) => p.trim());
    return { feature: parts[0] || "General", scenario: parts[1] || "Scenario", expectedResult: parts[2] || "Expected" };
  });

  const testCases = source.map((row, i) => {
    const feature = row.feature || "General";
    const scenario = row.scenario || `Scenario ${i + 1}`;
    const expected = row.expectedResult || "Expected behavior from uploaded test case";
    return {
      id: `TC-CSV-${String(i + 1).padStart(3, "0")}`,
      module: feature,
      scenario,
      title: `${feature}: ${scenario}`,
      type: "CSV",
      priority: "High",
      preconditions: "OTT URL loaded; preconditions as per test case",
      testData: "Uploaded CSV (Feature, Scenario, Expected Result)",
      steps: [
        `Navigate to relevant area for: ${feature}`,
        `Execute: ${scenario}`,
        `Verify: ${expected.slice(0, 120)}${expected.length > 120 ? "…" : ""}`
      ],
      expectedResult: expected,
      traceability: "Uploaded CSV"
    };
  });

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "CSV (Feature, Scenario, Expected Result)",
      profile,
      professionalMode: true,
      mode: "uploaded_tc_only",
      totalCases: testCases.length
    },
    testCases
  };
}

/**
 * Generate test cases from URL Analysis results
 * Uses the auto-generated test cases from the URL Analyzer agent
 */
function generateCasesFromUrlAnalysis(webAnalysis, requirements) {
  const profile = requirements.metadata?.profile || webAnalysis.siteOverview?.title || "Website";
  const autoTestCases = webAnalysis.autoGeneratedTestCases || [];
  const userFlows = webAnalysis.userFlows || [];
  const brd = webAnalysis.brdDocument || {};
  
  // Combine auto-generated test cases with flow-based test cases
  const testCases = [];
  
  // Add auto-generated test cases from URL Analyzer
  autoTestCases.forEach((tc, i) => {
    testCases.push({
      id: tc.id || `TC-AUTO-${String(i + 1).padStart(3, '0')}`,
      module: tc.module || 'Auto-Discovered',
      scenario: tc.scenario || tc.title,
      title: tc.title || `${profile}: Auto-discovered test ${i + 1}`,
      type: tc.type || 'Auto',
      priority: tc.priority || 'High',
      preconditions: tc.preconditions || 'Website is accessible, browser is ready',
      testData: tc.testData || 'Standard test data',
      steps: Array.isArray(tc.steps) ? tc.steps : [tc.steps || 'Execute test scenario'],
      expectedResult: tc.expectedResult || 'Test passes without errors',
      traceability: tc.traceability || 'Generated by URL Analyzer Agent'
    });
  });

  // Add test cases from BRD functional requirements if not already covered
  if (brd.functionalRequirements) {
    const existingScenarios = new Set(testCases.map(tc => tc.scenario?.toLowerCase()));
    
    brd.functionalRequirements.forEach((req, i) => {
      if (req.testable && !existingScenarios.has(req.feature?.toLowerCase())) {
        testCases.push({
          id: `TC-BRD-${String(i + 1).padStart(3, '0')}`,
          module: req.feature || 'BRD Requirement',
          scenario: `Verify ${req.feature || 'Requirement'}`,
          title: `${profile}: ${req.feature} - BRD Verification`,
          type: 'BRD',
          priority: req.priority || 'High',
          preconditions: 'As specified in BRD document',
          testData: 'As per requirement specification',
          steps: req.acceptanceCriteria ? req.acceptanceCriteria.map((ac, j) => `Step ${j + 1}: Verify - ${ac}`) : [`Verify: ${req.description}`],
          expectedResult: req.acceptanceCriteria ? req.acceptanceCriteria.join('; ') : req.description,
          traceability: `BRD Requirement: ${req.id}`
        });
      }
    });
  }

  // Add test cases for discovered features not yet covered
  if (webAnalysis.features) {
    const coveredFeatures = new Set(testCases.map(tc => tc.module?.toLowerCase()));
    
    webAnalysis.features.forEach((feature, i) => {
      if (!coveredFeatures.has(feature.name?.toLowerCase())) {
        testCases.push({
          id: `TC-FEAT-${String(i + 1).padStart(3, '0')}`,
          module: feature.name,
          scenario: `Verify ${feature.name} functionality`,
          title: `${profile}: ${feature.name} - Feature Verification`,
          type: feature.type === 'core' ? 'Sanity' : 'Functional',
          priority: feature.type === 'core' ? 'Critical' : feature.priority || 'High',
          preconditions: 'Feature is accessible on the website',
          testData: 'Standard test data',
          steps: [
            `Navigate to ${feature.name} area`,
            `Verify ${feature.name} is visible`,
            `Interact with ${feature.name}`,
            `Verify expected behavior: ${feature.description || 'Feature works as expected'}`
          ],
          expectedResult: feature.description || `${feature.name} functions correctly`,
          traceability: 'Generated from URL Analysis - Feature Discovery'
        });
      }
    });
  }

  // Calculate quality metrics
  const structuredRate = testCases.length
    ? Math.round((testCases.filter(tc => tc.module && tc.scenario && tc.steps && tc.steps.length >= 2).length / testCases.length) * 100)
    : 0;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "URL Analyzer Agent",
      profile,
      professionalMode: true,
      mode: "url_analysis",
      totalCases: testCases.length,
      qualityGate: {
        structureRate: `${structuredRate}%`,
        minAcceptedStructureRate: "80%"
      },
      analysisStats: {
        autoGeneratedCount: autoTestCases.length,
        brdRequirementCount: brd.functionalRequirements?.length || 0,
        featureCount: webAnalysis.features?.length || 0,
        userFlowCount: userFlows.length
      }
    },
    testCases,
    brdDocument: brd,
    observations: webAnalysis.observations || [],
    warnings: webAnalysis.warnings || []
  };
}

/**
 * Generate test cases from manually entered test cases (from UI form)
 */
function generateCasesFromManualInput(manualTestCases, requirements) {
  const profile = requirements.metadata?.profile || "Website";
  
  const testCases = manualTestCases
    .filter(tc => tc.feature || tc.scenario || tc.expectedResult)
    .map((tc, i) => {
      const feature = tc.feature?.trim() || "General";
      const scenario = tc.scenario?.trim() || `Manual Test ${i + 1}`;
      const expectedResult = tc.expectedResult?.trim() || "Expected behavior as per test case";
      
      return {
        id: `TC-MANUAL-${String(i + 1).padStart(3, '0')}`,
        module: feature,
        scenario,
        title: `${feature}: ${scenario}`,
        type: 'Manual',
        priority: 'High',
        preconditions: 'Website is accessible, test environment is ready',
        testData: 'As specified in the test case',
        steps: [
          `Navigate to relevant area for: ${feature}`,
          `Execute: ${scenario}`,
          `Verify: ${expectedResult.slice(0, 120)}${expectedResult.length > 120 ? '…' : ''}`
        ],
        expectedResult,
        traceability: 'Manually entered test case'
      };
    });

  // Calculate quality metrics
  const structuredRate = testCases.length
    ? Math.round((testCases.filter(tc => tc.module && tc.scenario && tc.expectedResult).length / testCases.length) * 100)
    : 0;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Manual Entry",
      profile,
      professionalMode: true,
      mode: "manual_tc_only",
      totalCases: testCases.length,
      qualityGate: {
        structureRate: `${structuredRate}%`,
        minAcceptedStructureRate: "80%"
      }
    },
    testCases
  };
}

function mergeSelectorCandidates(host, profileSelectors) {
  const learned = selectorMemory.get(host) || {};
  const merged = {};
  for (const [key, list] of Object.entries(profileSelectors)) {
    const memo = learned[key] || [];
    merged[key] = [...memo, ...list].filter((v, i, arr) => arr.indexOf(v) === i);
  }
  return merged;
}

async function generateAutomationBundle(input, manualCases, requirements) {
  const host = hostFromUrl(input.ottUrl);
  const profileKey = inferProfile(input.ottUrl, input.channelProfile);
  const profileSelectors = appProfiles[profileKey].selectorCandidates;
  const memorySelectors = selectorMemory.get(host) || {};
  const selectors = await locatorRegistry.getMergedSelectors(dbPool, host, profileSelectors, memorySelectors);
  const useCsvScript = input.executionMode === "uploaded_tc_only" && manualCases.testCases && manualCases.testCases.length > 0;
  const script = useCsvScript
    ? scriptBuilder.buildPlaywrightSpecFromTestCases(input.ottUrl, manualCases, selectors)
    : scriptBuilder.buildPlaywrightSpec(input.ottUrl, selectors, { testName: "channel flow regression" });

  const projectName = (input.projectId || requirements?.metadata?.profile || "OTT").toString();
  const locatorsByKey = Object.fromEntries(Object.entries(selectors).map(([k, v]) => [k, (v || []).map((s) => (typeof s === "string" ? { selectorValue: s, selectorType: "css" } : s))]));
  const generatedSeleniumJava = javaSeleniumBuilder.buildSeleniumJavaClass(projectName, manualCases.testCases || [], locatorsByKey, input.ottUrl);

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Automation QA Agent",
      scriptingLanguage: "Java",
      framework: "Selenium (Java); Playwright (runtime)",
      profile: requirements.metadata.profile,
      strategy: "adaptive-locator-candidates+db-registry"
    },
    mappedManualCaseIds: manualCases.testCases.map((tc) => tc.id),
    selectorCandidates: selectors,
    assertionFormatGuide: [
      "selector:.class-or-[data-testid='id']",
      "text:Exact or partial visible text"
    ],
    generatedScriptSnippet: [
      "await page.goto(ottUrl)",
      "await clickFirstAvailable(continueCta || loginCta)",
      "await clickFirstAvailable(contentCard)",
      "await clickFirstAvailable(playCta)",
      "await expectFirstAvailable(pauseCta, seekBar)"
    ],
    generatedPlaywrightScript: script,
    generatedSeleniumJava
  };
}

async function findXPathForSelector(page, selector) {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) return null;

    function idx(node) {
      let i = 1;
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (sibling.nodeName === node.nodeName) i += 1;
        sibling = sibling.previousElementSibling;
      }
      return i;
    }

    const pathParts = [];
    let node = target;
    while (node && node.nodeType === 1) {
      if (node.id) {
        pathParts.unshift(`//*[@id=\"${node.id}\"]`);
        break;
      }
      pathParts.unshift(`${node.nodeName.toLowerCase()}[${idx(node)}]`);
      node = node.parentElement;
    }

    return pathParts[0].startsWith("//*[@id") ? pathParts.join("/") : `/${pathParts.join("/")}`;
  }, selector);
}

const ELEMENT_WAIT_MS = 8000;

async function firstVisibleLocator(page, selectorCandidates = [], texts = []) {
  for (const selector of selectorCandidates) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.isVisible({ timeout: ELEMENT_WAIT_MS })) {
        return { locator: loc, strategy: `selector:${selector}` };
      }
    } catch {
      // ignore invalid candidate
    }
  }

  for (const text of texts) {
    const loc = page.getByText(text, { exact: false }).first();
    try {
      if (await loc.isVisible({ timeout: ELEMENT_WAIT_MS })) {
        return { locator: loc, strategy: `text:${text}` };
      }
    } catch {
      // not visible
    }
  }
  return null;
}

async function screenshotForCase(page, run, testId, status, attempt) {
  const fileName = `${testId}-${status}-attempt-${attempt}.png`;
  const absolutePath = path.join(run.runDir, fileName);
  await page.screenshot({ path: absolutePath, fullPage: false });
  return `/artifacts/${run.id}/${fileName}`;
}

async function performLoginIfRequired(page, selectorCandidates, secret, trace) {
  if (!secret || !secret.username || !secret.password) {
    trace.push("login:credentials-not-provided");
    return;
  }

  const loginCta = await firstVisibleLocator(page, selectorCandidates.loginCta || [], ["Login", "Log in", "Sign in"]);
  if (loginCta) {
    await loginCta.locator.click({ timeout: 7000 });
    trace.push(`login-cta:${loginCta.strategy}`);
    await page.waitForTimeout(1500);
  }

  const userField = await firstVisibleLocator(page, selectorCandidates.loginUserField || [], []);
  const passField = await firstVisibleLocator(page, selectorCandidates.loginPasswordField || [], []);
  if (!userField || !passField) {
    trace.push("login:form-not-found");
    throw new Error("Login enabled but login form not found (email/password fields missing). Check selectors or page state.");
  }

  await userField.locator.fill(secret.username);
  await passField.locator.fill(secret.password);
  trace.push(`login-fields:${userField.strategy}|${passField.strategy}`);

  const submit = await firstVisibleLocator(page, selectorCandidates.loginSubmit || [], ["Sign in", "Login", "Continue"]);
  if (submit) {
    await submit.locator.click({ timeout: 7000 });
    trace.push(`login-submit:${submit.strategy}`);
  } else {
    await passField.locator.press("Enter");
    trace.push("login-submit:keyboard-enter");
  }

  await page.waitForTimeout(2000);
}

function assertionChecks(assertionsText) {
  return safeList(assertionsText).map((point, i) => ({
    id: `AUTO-AS-${String(i + 1).padStart(3, "0")}`,
    title: `Assertion validation ${i + 1}`,
    point
  }));
}

function saveLearnedSelector(host, key, strategy) {
  if (!strategy || !strategy.startsWith("selector:")) return;
  const selector = strategy.replace("selector:", "").trim();
  if (!selector) return;
  const current = selectorMemory.get(host) || {};
  const list = current[key] || [];
  if (!list.includes(selector)) list.unshift(selector);
  current[key] = list.slice(0, 6);
  selectorMemory.set(host, current);
  if (dbEnabled && dbPool) {
    dbHelpers.upsertLocator(dbPool, {
      host,
      elementKey: key,
      selectorType: "css",
      selectorValue: selector,
      xpath: null,
      role: null,
      label: null,
      runId: null
    }).catch(() => { });
  }
}

async function generateExecutionReport(run, rerunFailedOnly = false) {
  const host = hostFromUrl(run.input.ottUrl);
  const selectorCandidates = run.artifacts.automationBundle.selectorCandidates || {};
  const loginSecret = getRunSecret(run.id);
  const previous = run.artifacts.executionReport;
  const failedSet = rerunFailedOnly && previous
    ? new Set(previous.tests.filter((t) => t.status === "failed").map((t) => t.id))
    : null;

  // Detect website type from URL analysis
  const webAnalysis = run.artifacts.webAnalysis || {};
  const websiteType = webAnalysis.metadata?.domain || 'generic';
  const websiteTypeName = webAnalysis.metadata?.websiteType || 'Website';
  const autoGeneratedTestCases = webAnalysis.autoGeneratedTestCases || [];
  const userFlows = webAnalysis.userFlows || [];
  
  console.log(`[Execution] Website type: ${websiteTypeName} (${websiteType})`);
  console.log(`[Execution] Auto-generated test cases: ${autoGeneratedTestCases.length}`);
  console.log(`[Execution] User flows: ${userFlows.length}`);

  // Build domain-specific tests from auto-generated test cases
  function buildDomainSpecificTests() {
    // If we have auto-generated test cases from URL analysis, use those
    if (autoGeneratedTestCases.length > 0) {
      return autoGeneratedTestCases.slice(0, 10).map((tc, idx) => ({
        id: tc.id || `AUTO-${String(idx + 1).padStart(3, "0")}`,
        title: tc.scenario || tc.title || `Test Case ${idx + 1}`,
        execute: async (page, trace) => {
          // Navigate to URL if first test
          if (idx === 0) {
            await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
            await page.waitForLoadState("domcontentloaded");
            await page.waitForTimeout(2000);
          }
          
          const body = page.locator("body");
          await body.waitFor({ state: "visible", timeout: 15000 });
          
          // Execute based on test case module/type
          const module = (tc.module || "").toLowerCase();
          const scenario = (tc.scenario || "").toLowerCase();
          const type = (tc.type || "").toLowerCase();
          
          // Navigation tests
          if (module.includes("nav") || scenario.includes("navigation") || scenario.includes("menu")) {
            const nav = page.locator("nav, [role='navigation'], header nav, .navbar, .nav-menu").first();
            if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("nav:verified");
              // Try clicking a nav item
              const navItems = page.locator("nav a, header a, .nav-link, .nav-item a").first();
              if (await navItems.isVisible({ timeout: 3000 }).catch(() => false)) {
                trace.push("nav-items:found");
              }
            } else {
              trace.push("nav:body-visible-only");
            }
            return;
          }
          
          // Footer tests
          if (module.includes("footer") || scenario.includes("footer")) {
            const footer = page.locator("footer, [role='contentinfo'], .footer").first();
            if (await footer.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("footer:verified");
            } else {
              // Scroll to bottom to find footer
              await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
              await page.waitForTimeout(1000);
              if (await footer.isVisible({ timeout: 5000 }).catch(() => false)) {
                trace.push("footer:found-after-scroll");
              } else {
                trace.push("footer:not-visible");
              }
            }
            return;
          }
          
          // Store/Branch locator tests (retail)
          if (scenario.includes("store") || scenario.includes("branch") || scenario.includes("location")) {
            const storeLinks = page.locator("a:has-text('store'), a:has-text('branch'), a:has-text('location'), a:has-text('find us')").first();
            if (await storeLinks.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("store-locator:found");
            } else {
              trace.push("store-locator:checking-page-content");
            }
            return;
          }
          
          // Product/Category tests
          if (scenario.includes("product") || scenario.includes("categor")) {
            const products = page.locator(".product, .category, [class*='product'], [class*='category'], .item-card").first();
            if (await products.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("products:found");
            } else {
              trace.push("products:checking-links");
              const productLinks = page.locator("a:has-text('product'), a:has-text('shop'), a:has-text('categor')").first();
              if (await productLinks.isVisible({ timeout: 3000 }).catch(() => false)) {
                trace.push("product-links:found");
              }
            }
            return;
          }
          
          // Contact tests
          if (scenario.includes("contact") || module.includes("contact")) {
            const contactInfo = page.locator("a[href*='tel:'], a[href*='mailto:'], .contact, [class*='contact']").first();
            if (await contactInfo.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("contact:found");
            } else {
              trace.push("contact:checking-footer");
            }
            return;
          }
          
          // Media/Image tests
          if (scenario.includes("media") || scenario.includes("image") || scenario.includes("video")) {
            const media = page.locator("img, video, [class*='media'], [class*='gallery']").first();
            if (await media.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("media:found");
            } else {
              trace.push("media:none-visible");
            }
            return;
          }
          
          // Search tests
          if (scenario.includes("search")) {
            const searchInput = page.locator("input[type='search'], input[name*='search'], input[placeholder*='search'], .search-input").first();
            if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("search:found");
            } else {
              trace.push("search:not-visible");
            }
            return;
          }
          
          // Form tests
          if (scenario.includes("form") || module.includes("form")) {
            const forms = page.locator("form, [role='form']").first();
            if (await forms.isVisible({ timeout: 5000 }).catch(() => false)) {
              trace.push("form:found");
            } else {
              trace.push("form:not-visible");
            }
            return;
          }
          
          // Default: verify page loaded
          const visible = await body.isVisible();
          if (!visible) throw new Error("Page did not load properly");
          trace.push(`generic-test:${tc.module || 'page'}:verified`);
        }
      }));
    }
    
    // Fallback: build tests from user flows
    if (userFlows.length > 0) {
      return userFlows.slice(0, 8).map((flow, idx) => ({
        id: `FLOW-${String(idx + 1).padStart(3, "0")}`,
        title: flow.name || `User Flow ${idx + 1}`,
        execute: async (page, trace) => {
          if (idx === 0) {
            await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
            await page.waitForLoadState("domcontentloaded");
            await page.waitForTimeout(2000);
          }
          const body = page.locator("body");
          await body.waitFor({ state: "visible", timeout: 15000 });
          trace.push(`flow:${flow.name}:page-loaded`);
        }
      }));
    }
    
    // Ultimate fallback: basic page verification
    return [{
      id: "AUTO-001",
      title: `Verify ${websiteTypeName} loads correctly`,
      execute: async (page, trace) => {
        await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(2000);
        const body = page.locator("body");
        await body.waitFor({ state: "visible", timeout: 15000 });
        const visible = await body.isVisible();
        if (!visible) throw new Error("Page did not load: body not visible.");
        trace.push("page:loaded");
      }
    }];
  }

  // Use domain-specific tests instead of hardcoded OTT tests
  const baseTests = buildDomainSpecificTests();

  // Legacy OTT-specific tests (kept for backward compatibility with OTT platforms)
  const ottTests = [
    {
      id: "AUTO-001",
      title: "Reach OTT app shell",
      execute: async (page, trace) => {
        await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(2000);
        const body = page.locator("body");
        await body.waitFor({ state: "visible", timeout: 15000 });
        const visible = await body.isVisible();
        if (!visible) throw new Error("OTT app shell did not load: body not visible.");
        const nav = await firstVisibleLocator(page, selectorCandidates.primaryNav || [], ["Home", "Movies", "TV"]);
        if (nav) trace.push(`shell-locator:${nav.strategy}`);
        else trace.push("shell:body-only");
      }
    },
    {
      id: "AUTO-001A",
      title: "Perform login when credentials are provided",
      execute: async (page, trace) => {
        await performLoginIfRequired(page, selectorCandidates, loginSecret, trace);
      }
    },
    {
      id: "AUTO-002",
      title: "Progress from continue/sign-in gate",
      execute: async (page, trace) => {
        const candidate = await firstVisibleLocator(
          page,
          [...(selectorCandidates.continueCta || []), ...(selectorCandidates.loginCta || [])],
          ["Continue", "Continue Watching", "Sign in", "Log in"]
        );
        if (!candidate) {
          trace.push("gate:not-present");
          const loginProvided = loginSecret && loginSecret.username && loginSecret.password;
          if (!loginProvided) {
            throw new Error("No continue/sign-in gate found. When not logged in, expected a gate (Continue, Sign in, etc.). Check selectors or page state.");
          }
          return;
        }
        await candidate.locator.click({ timeout: 8000 });
        trace.push(`gate-clicked:${candidate.strategy}`);
        await page.waitForTimeout(1500);
      }
    },
    {
      id: "AUTO-003",
      title: "Open a content detail surface",
      execute: async (page, trace) => {
        const card = await firstVisibleLocator(page, selectorCandidates.contentCard || [], ["Watch now", "Details", "Episode"]);
        if (!card) throw new Error("No content card/tile found for progression. Navigate to home first.");
        await card.locator.click({ timeout: 9000 });
        trace.push(`content-open:${card.strategy}`);
        await page.waitForTimeout(2000);
      }
    },
    {
      id: "AUTO-004",
      title: "Trigger playback",
      execute: async (page, trace) => {
        const play = await firstVisibleLocator(page, selectorCandidates.playCta || [], ["Play", "Watch", "Resume", "Watch now"]);
        if (!play) throw new Error("Play CTA not found on current surface. Open a content detail first.");
        await play.locator.click({ timeout: 9000 });
        trace.push(`play-click:${play.strategy}`);
        await page.waitForTimeout(2000);
      }
    },
    {
      id: "AUTO-005",
      title: "Validate playback controls",
      execute: async (page, trace) => {
        const pause = await firstVisibleLocator(page, selectorCandidates.pauseCta || [], ["Pause"]);
        const seek = await firstVisibleLocator(page, selectorCandidates.seekBar || [], ["Seek", "Timeline"]);
        if (!pause && !seek) throw new Error("Pause/seek controls not visible after playback trigger.");
        if (pause) trace.push(`pause-found:${pause.strategy}`);
        if (seek) trace.push(`seek-found:${seek.strategy}`);
      }
    }
  ];

  const ottUrlForAssertions = run.input.ottUrl;
  const assertionTests = assertionChecks(run.input.assertions).map((entry) => ({
    id: entry.id,
    title: entry.title,
    execute: async (page, trace) => {
      await page.goto(ottUrlForAssertions, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);
      const raw = String(entry.point).trim();
      if (raw.toLowerCase().startsWith("selector:")) {
        const selector = raw.split(":").slice(1).join(":").trim();
        if (!selector) throw new Error("Assertion selector was empty");
        const isXpath = selector.startsWith("//") || selector.startsWith("(");
        const loc = isXpath ? page.locator("xpath=" + selector).first() : page.locator(selector).first();
        await loc.waitFor({ state: "visible", timeout: 10000 });
        const visible = await loc.isVisible();
        if (!visible) throw new Error(`Assertion failed: selector "${selector}" not visible`);
        trace.push(`assert-selector:${selector}`);
        return;
      }
      const textToFind = raw.toLowerCase().startsWith("text:")
        ? raw.split(":").slice(1).join(":").trim()
        : raw;
      if (!textToFind) throw new Error("Assertion text was empty");
      const loc = page.getByText(textToFind, { exact: false }).first();
      await loc.waitFor({ state: "visible", timeout: 10000 });
      const visible = await loc.isVisible();
      if (!visible) throw new Error(`Assertion failed: text "${textToFind}" not visible on page`);
      trace.push(`assert-text:${textToFind}`);
    }
  }));

  const ottUrl = run.input.ottUrl;
  const useMinimalExecution = process.env.EXECUTION_MODE !== "full";

  // Sequential execution state - maintains page state across test cases
  let pageInitialized = false;
  let executionContext = { searchTerm: null, selectedProduct: null, cartCount: 0 };

  // Extract search term from scenario text (e.g., "Enter iPhone 15" -> "iPhone 15")
  function extractSearchTerm(text) {
    const patterns = [
      /(?:search|enter|type|input)[\s]+(?:for\s+)?["']?([^"'\n]+?)["']?\s+(?:in|into|on)/i,
      /(?:search|enter|type|input)[\s]+["']?([^"'\n]+?)["']?\s*$/i,
      /(?:search|enter|type)[\s]+(?:for\s+)?["']?([a-zA-Z0-9\s]+\d+[a-zA-Z0-9\s]*)["']?/i,
      /["']([^"']+)["']/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 1) {
        return match[1].trim();
      }
    }
    // Try to extract product names like "iPhone 15"
    const productMatch = text.match(/\b(iphone\s*\d+|galaxy\s*s\d+|pixel\s*\d+|macbook|ipad|airpods)/i);
    if (productMatch) return productMatch[1];
    return null;
  }

  // Parse action type from scenario
  function parseAction(scenario, expectedResult) {
    const text = `${scenario} ${expectedResult}`.toLowerCase();

    if (text.includes("navigate") || text.includes("homepage") || text.includes("loads")) {
      if (text.includes("cart page") || text.includes("click on cart") || text.includes("open cart")) return "open_cart";
      if (text.includes("product") && text.includes("page")) return "verify_product_page";
      return "navigate";
    }
    if (text.includes("enter") && (text.includes("search") || text.includes("box"))) return "search_enter";
    if (text.includes("click") && text.includes("search")) return "search_click";
    if (text.includes("search") && (text.includes("result") || text.includes("display"))) return "verify_search_results";
    if (text.includes("click") && (text.includes("first") || text.includes("product")) && !text.includes("cart")) return "click_product";
    if (text.includes("verify") && text.includes("product") && (text.includes("title") || text.includes("name") || text.includes("contains"))) return "verify_product_title";
    
    // Price verification - distinguish between product page and cart
    if (text.includes("verify") && text.includes("price")) {
      if (text.includes("cart") || text.includes("in cart")) return "verify_cart_price";
      if (text.includes("update") || text.includes("change")) return "verify_cart_price";
      return "verify_price";
    }
    
    // Image verification - distinguish between product page and cart
    if (text.includes("verify") && text.includes("image")) {
      if (text.includes("cart") || text.includes("in cart")) return "verify_cart_image";
      return "verify_product_image";
    }
    
    // Button verifications
    if ((text.includes("add to cart") || text.includes("add-to-cart")) && (text.includes("button") || text.includes("present") || text.includes("visible"))) {
      if (text.includes("click")) return "click_add_to_cart";
      return "verify_add_to_cart_button";
    }
    if ((text.includes("buy now") || text.includes("buynow")) && (text.includes("button") || text.includes("present") || text.includes("visible"))) return "verify_buy_now_button";
    if ((text.includes("place order") || text.includes("placeorder")) && (text.includes("button") || text.includes("present") || text.includes("visible"))) return "verify_place_order";
    if ((text.includes("remove") || text.includes("delete")) && (text.includes("option") || text.includes("button") || text.includes("available") || text.includes("visible"))) return "verify_remove_option";
    
    if (text.includes("click") && text.includes("add to cart")) return "click_add_to_cart";
    if (text.includes("added") && text.includes("cart") && text.includes("confirm")) return "verify_added_confirmation";
    if (text.includes("cart") && (text.includes("count") || text.includes("increases") || text.includes("badge"))) return "verify_cart_count";
    if ((text.includes("click") && text.includes("cart")) || text.includes("open cart")) return "open_cart";
    
    // Cart item verification
    if (text.includes("verify") && (text.includes("in cart") || text.includes("is in cart"))) {
      if (text.includes("image")) return "verify_cart_image";
      if (text.includes("price")) return "verify_cart_price";
      return "verify_item_in_cart";
    }
    
    if (text.includes("quantity")) {
      if (text.includes("increase") || text.includes("decrease") || text.includes("change")) return "verify_quantity";
      return "verify_quantity";
    }
    if (text.includes("checkout") || text.includes("proceed")) return "verify_checkout";
    if (text.includes("search") && text.includes("bar")) return "verify_search_bar";
    if (text.includes("verify") || text.includes("display") || text.includes("visible") || text.includes("present")) return "verify_element";
    return "generic";
  }

  function buildUploadedTcExecutionTests() {
    const list = (run.artifacts.manualTestCases && run.artifacts.manualTestCases.testCases) || [];

    return list.map((tc, index) => {
      const scenario = tc.scenario || tc.title || "";
      const expected = tc.expectedResult || "";
      const text = `${tc.module || ""} ${scenario} ${expected}`.toLowerCase();
      const action = parseAction(scenario, expected);
      const searchTerm = extractSearchTerm(scenario) || extractSearchTerm(expected);

      return {
        id: `EXEC-${tc.id}`,
        title: tc.title || scenario,
        tcIndex: index,
        action,
        searchTerm,
        execute: async (page, trace) => {
          // Initialize page only once for the first test case
          if (!pageInitialized) {
            trace.push("seq:initializing-page");
            await page.goto(ottUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
            await page.waitForLoadState("domcontentloaded").catch(() => { });
            await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
            await page.waitForTimeout(2000);

            // Anti-bot / Captcha / Blocked page detection
            const pageContent = await page.content();
            const pageTitle = await page.title();
            const bodyText = await page.locator("body").textContent().catch(() => "");
            
            const blockedIndicators = [
              // Captcha/bot detection
              "captcha",
              "recaptcha",
              "hcaptcha",
              "challenge-running",
              "cf-browser-verification",
              "cloudflare",
              "ddos-guard",
              // Access denied messages
              "user validation required",
              "access denied",
              "blocked",
              "forbidden",
              "not allowed",
              "please verify",
              "human verification",
              "bot detection",
              "automated access",
              "security check",
              "prove you're human",
              "suspicious activity",
              // Rate limiting
              "too many requests",
              "rate limit",
              "try again later"
            ];
            
            const contentLower = (pageContent + " " + pageTitle + " " + bodyText).toLowerCase();
            const isBlocked = blockedIndicators.some(indicator => contentLower.includes(indicator));
            
            if (isBlocked) {
              trace.push("error:page-blocked-anti-bot");
              throw new Error("Page blocked by anti-bot protection, captcha, or access restriction. Cannot run automated tests on this website.");
            }

            // Verify page has meaningful content (not just error page)
            const hasMinimalContent = bodyText.length > 100;
            const hasValidStructure = await page.$("nav, header, main, footer, [role='main'], [role='navigation']").catch(() => null);
            
            if (!hasMinimalContent && !hasValidStructure) {
              trace.push("error:invalid-page-content");
              throw new Error("Page did not load properly - missing expected content structure");
            }
            
            trace.push("validation:page-content-valid");

            // Dismiss common popups/modals (especially Flipkart login popup)
            const domain = detectDomain(ottUrl);
            if (domain === 'flipkart') {
              // Flipkart login popup dismissal
              const popupDismissSelectors = [
                "button._2KpZ6l._2doB4z",  // Close button on login popup
                "button[class*='_2KpZ6l'][class*='_2doB4z']",
                "button._2AkmmA._29YdH8",
                "span._30XB9F",  // X close icon
                "button:has-text('✕')",
                "[class*='close']",
                "[aria-label='Close']",
                "button._2AkmmA"
              ];
              for (const sel of popupDismissSelectors) {
                try {
                  const closeBtn = page.locator(sel).first();
                  if (await closeBtn.isVisible({ timeout: 2000 })) {
                    await closeBtn.click();
                    trace.push(`popup:dismissed:${sel}`);
                    await page.waitForTimeout(500);
                    break;
                  }
                } catch { }
              }
              // Also try pressing Escape key to dismiss any modal
              await page.keyboard.press('Escape').catch(() => {});
              await page.waitForTimeout(500);
            }

            // Generic popup/cookie consent dismissal
            const genericDismissSelectors = [
              "button:has-text('Accept')",
              "button:has-text('Got it')",
              "button:has-text('Close')",
              "[class*='cookie'] button",
              "[class*='consent'] button",
              "[class*='modal'] [class*='close']"
            ];
            for (const sel of genericDismissSelectors) {
              try {
                const btn = page.locator(sel).first();
                if (await btn.isVisible({ timeout: 1000 })) {
                  await btn.click().catch(() => {});
                  trace.push(`generic-popup:dismissed:${sel}`);
                  break;
                }
              } catch { }
            }

            pageInitialized = true;
            trace.push("seq:page-ready");
          }

          // If using minimal execution mode, just verify page is loaded
          if (useMinimalExecution && action === "generic") {
            const body = page.locator("body");
            await body.waitFor({ state: "visible", timeout: 10000 });
            trace.push("minimal:page-visible");
            return;
          }

          // Execute based on parsed action type
          switch (action) {
            case "navigate": {
              // Already navigated, verify page loaded
              const body = page.locator("body");
              await body.waitFor({ state: "visible", timeout: 10000 });
              trace.push("action:navigate-verified");
              break;
            }

            case "verify_search_bar": {
              // Domain-aware selector lookup
              const searchSelectors = getSelectors(ottUrl, 'search', 'input');
              let found = false;
              for (const sel of searchSelectors) {
                try {
                  const loc = page.locator(sel).first();
                  if (await loc.isVisible({ timeout: 3000 })) {
                    found = true;
                    trace.push(`action:search-bar-found:${sel}`);
                    break;
                  }
                } catch { }
              }
              if (!found) throw new Error("Search bar not visible");
              break;
            }

            case "search_enter": {
              const term = searchTerm || executionContext.searchTerm || "iPhone 15";
              executionContext.searchTerm = term;

              // Domain-aware selector lookup
              const searchSelectors = getSelectors(ottUrl, 'search', 'input');
              const domainConfig = getDomainConfig(ottUrl);
              trace.push(`domain:detected:${domainConfig.domain}:${domainConfig.name}`);

              let searchBox = null;
              for (const sel of searchSelectors) {
                try {
                  const loc = page.locator(sel).first();
                  if (await loc.isVisible({ timeout: 3000 })) {
                    searchBox = loc;
                    trace.push(`action:search-input-found:${sel}`);
                    break;
                  }
                } catch { }
              }

              if (!searchBox) throw new Error("Search input not found");
              
              // Try to dismiss any remaining popups before clicking
              await page.keyboard.press('Escape').catch(() => {});
              await page.waitForTimeout(300);
              
              // Try normal click first, then force click if needed
              try {
                await searchBox.click({ timeout: 5000 });
              } catch (clickErr) {
                trace.push("action:search-click-failed-trying-force");
                // Force click if normal click fails (element might be covered)
                await searchBox.click({ force: true, timeout: 5000 }).catch(async () => {
                  // Last resort: click via JavaScript
                  await searchBox.evaluate(el => el.click());
                  trace.push("action:search-clicked-via-js");
                });
              }
              
              await searchBox.fill(term);
              await page.waitForTimeout(500);
              trace.push(`action:entered-search:${term}`);
              break;
            }

            case "search_click": {
              // Domain-aware selector lookup
              const submitSelectors = getSelectors(ottUrl, 'search', 'submit');

              let submitted = false;
              for (const sel of submitSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 2000 })) {
                    await btn.click();
                    submitted = true;
                    trace.push(`action:search-submitted:${sel}`);
                    break;
                  }
                } catch { }
              }

              if (!submitted) {
                // Try pressing Enter
                await page.keyboard.press("Enter");
                trace.push("action:search-submitted-enter");
              }

              await page.waitForLoadState("domcontentloaded").catch(() => { });
              await page.waitForTimeout(2000);
              break;
            }

            case "verify_search_results": {
              await page.waitForTimeout(1500);
              const term = executionContext.searchTerm || "iPhone";

              // Domain-aware selector lookup for search results
              const resultSelectors = getSelectors(ottUrl, 'results', 'container');

              let found = false;
              for (const sel of resultSelectors) {
                try {
                  const results = page.locator(sel);
                  const count = await results.count();
                  if (count > 0) {
                    found = true;
                    trace.push(`action:search-results-found:${count}-items`);
                    break;
                  }
                } catch { }
              }

              if (!found) {
                // Try text-based verification
                const hasText = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
                if (hasText) {
                  found = true;
                  trace.push("action:search-term-visible");
                }
              }

              if (!found) throw new Error(`Search results for "${term}" not displayed`);
              break;
            }

            case "click_product": {
              await page.waitForTimeout(1000);

              // Domain-aware selector lookup for product links
              const productSelectors = getSelectors(ottUrl, 'results', 'productCard');

              let clicked = false;
              for (const sel of productSelectors) {
                try {
                  const products = page.locator(sel);
                  const first = products.first();
                  if (await first.isVisible({ timeout: 3000 })) {
                    const title = await first.textContent().catch(() => "");
                    executionContext.selectedProduct = title.trim();
                    
                    // Try normal click, then force click if needed
                    try {
                      await first.click({ timeout: 5000 });
                    } catch {
                      await first.click({ force: true, timeout: 5000 }).catch(async () => {
                        await first.evaluate(el => el.click());
                      });
                    }
                    
                    clicked = true;
                    trace.push(`action:product-clicked:${title.slice(0, 50)}`);
                    break;
                  }
                } catch { }
              }

              if (!clicked) throw new Error("Could not click on product");
              await page.waitForLoadState("domcontentloaded").catch(() => { });
              await page.waitForTimeout(2000);
              break;
            }

            case "verify_product_page":
            case "verify_product_title": {
              await page.waitForTimeout(1000);
              const term = executionContext.searchTerm || "iPhone";

              // Domain-aware selector lookup for product title
              const titleSelectors = getSelectors(ottUrl, 'productPage', 'title');

              let found = false;
              for (const sel of titleSelectors) {
                try {
                  const title = page.locator(sel).first();
                  if (await title.isVisible({ timeout: 5000 })) {
                    const text = await title.textContent();
                    found = true;
                    trace.push(`action:product-title-visible:${text.slice(0, 50)}`);
                    break;
                  }
                } catch { }
              }

              if (!found) {
                const hasText = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false);
                if (hasText) {
                  found = true;
                  trace.push("action:product-term-visible");
                }
              }

              if (!found) throw new Error("Product title not visible");
              break;
            }

            case "verify_price": {
              // Domain-aware selector lookup for price
              const priceSelectors = getSelectors(ottUrl, 'productPage', 'price');
              const domain = detectDomain(ottUrl);

              let found = false;
              for (const sel of priceSelectors) {
                try {
                  const price = page.locator(sel).first();
                  if (await price.isVisible({ timeout: 3000 })) {
                    const text = await price.textContent().catch(() => '');
                    if (text && (text.includes('₹') || text.includes('$') || /\d/.test(text))) {
                      found = true;
                      trace.push(`action:price-visible:${sel}:${text.slice(0,20)}`);
                      break;
                    }
                  }
                } catch { }
              }

              if (!found) {
                // Try currency-specific patterns (₹ for India, $ for US)
                const currencyPatterns = [
                  /₹[\s]*[\d,]+/,  // Indian Rupee
                  /Rs\.?[\s]*[\d,]+/i,  // Rs. format
                  /\$[\d,]+\.?\d*/,  // US Dollar
                  /[\d,]+\.\d{2}/  // Generic price format
                ];
                for (const pattern of currencyPatterns) {
                  const priceText = await page.getByText(pattern).first().isVisible({ timeout: 2000 }).catch(() => false);
                  if (priceText) {
                    found = true;
                    trace.push(`action:price-text-visible:${pattern.toString().slice(0,20)}`);
                    break;
                  }
                }
              }

              if (!found) throw new Error("Price not visible");
              break;
            }

            case "verify_add_to_cart_button": {
              // Domain-aware selector lookup for add to cart button
              const cartBtnSelectors = getSelectors(ottUrl, 'productPage', 'addToCart');

              let found = false;
              for (const sel of cartBtnSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:add-to-cart-btn-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              // Fallback: look for button with cart-related text
              if (!found) {
                const textBtns = [
                  page.getByRole('button', { name: /add.*cart/i }),
                  page.locator('button').filter({ hasText: /add.*cart/i }),
                  page.locator('[class*="cart"] button'),
                  page.locator('button[class*="cart"]')
                ];
                for (const btn of textBtns) {
                  try {
                    if (await btn.first().isVisible({ timeout: 2000 })) {
                      found = true;
                      trace.push("action:add-to-cart-btn-text-fallback");
                      break;
                    }
                  } catch { }
                }
              }

              if (!found) throw new Error("Add to Cart button not visible");
              break;
            }

            case "verify_buy_now_button": {
              // Domain-aware selector lookup for buy now button
              const buyNowSelectors = getSelectors(ottUrl, 'productPage', 'buyNow');

              let found = false;
              for (const sel of buyNowSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:buy-now-btn-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              // Fallback: look for button with buy-related text
              if (!found) {
                const textBtns = [
                  page.getByRole('button', { name: /buy.*now/i }),
                  page.locator('button').filter({ hasText: /buy.*now/i })
                ];
                for (const btn of textBtns) {
                  try {
                    if (await btn.first().isVisible({ timeout: 2000 })) {
                      found = true;
                      trace.push("action:buy-now-btn-text-fallback");
                      break;
                    }
                  } catch { }
                }
              }

              if (!found) throw new Error("BUY NOW button not visible");
              break;
            }

            case "verify_product_image":
            case "verify_image": {
              // Domain-aware selector lookup for product images
              const imageSelectors = getSelectors(ottUrl, 'productPage', 'image');

              let found = false;
              for (const sel of imageSelectors) {
                try {
                  const img = page.locator(sel).first();
                  if (await img.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:product-image-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              // Fallback: any significant image on page
              if (!found) {
                const imgs = page.locator('img[src*="http"]').filter({ has: page.locator('[width]') });
                const count = await imgs.count().catch(() => 0);
                if (count > 0) {
                  const firstVisible = await imgs.first().isVisible({ timeout: 2000 }).catch(() => false);
                  if (firstVisible) {
                    found = true;
                    trace.push("action:product-image-fallback");
                  }
                }
              }

              if (!found) throw new Error("Product images not visible");
              break;
            }

            case "click_add_to_cart": {
              // Domain-aware selector lookup for add to cart button
              const cartBtnSelectors = getSelectors(ottUrl, 'productPage', 'addToCart');

              let clicked = false;
              for (const sel of cartBtnSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 5000 })) {
                    // Try normal click, then force click if needed
                    try {
                      await btn.click({ timeout: 5000 });
                    } catch {
                      await btn.click({ force: true, timeout: 5000 }).catch(async () => {
                        await btn.evaluate(el => el.click());
                      });
                    }
                    clicked = true;
                    executionContext.cartCount++;
                    trace.push(`action:add-to-cart-clicked:${sel}`);
                    break;
                  }
                } catch { }
              }

              // Fallback: try text-based button click
              if (!clicked) {
                const textBtns = [
                  page.getByRole('button', { name: /add.*cart/i }),
                  page.locator('button').filter({ hasText: /add.*cart/i })
                ];
                for (const btn of textBtns) {
                  try {
                    if (await btn.first().isVisible({ timeout: 2000 })) {
                      await btn.first().click({ force: true });
                      clicked = true;
                      executionContext.cartCount++;
                      trace.push("action:add-to-cart-clicked-text-fallback");
                      break;
                    }
                  } catch { }
                }
              }

              if (!clicked) throw new Error("Could not click Add to Cart");
              await page.waitForTimeout(2000);
              break;
            }

            case "verify_added_confirmation": {
              await page.waitForTimeout(1500);

              // Domain-aware selector lookup for cart confirmation
              const confirmSelectors = getSelectors(ottUrl, 'confirmation', 'added');

              let found = false;
              for (const sel of confirmSelectors) {
                try {
                  const confirm = page.locator(sel).first();
                  if (await confirm.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:add-confirm-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              if (!found) {
                const hasText = await page.getByText(/added|cart|proceed/i).first().isVisible({ timeout: 3000 }).catch(() => false);
                if (hasText) {
                  found = true;
                  trace.push("action:add-confirm-text");
                }
              }

              if (!found) throw new Error("Add to cart confirmation not visible");
              break;
            }

            case "verify_cart_count": {
              // Domain-aware selector lookup for cart count
              const countSelectors = getSelectors(ottUrl, 'cart', 'count');

              let found = false;
              for (const sel of countSelectors) {
                try {
                  const count = page.locator(sel).first();
                  if (await count.isVisible({ timeout: 5000 })) {
                    const value = await count.textContent();
                    found = true;
                    trace.push(`action:cart-count-visible:${value}`);
                    break;
                  }
                } catch { }
              }

              if (!found) trace.push("action:cart-count-not-visible-continuing");
              break;
            }

            case "open_cart": {
              // Domain-aware selector lookup for cart icon
              const cartSelectors = getSelectors(ottUrl, 'cart', 'icon');

              let clicked = false;
              for (const sel of cartSelectors) {
                try {
                  const cart = page.locator(sel).first();
                  if (await cart.isVisible({ timeout: 5000 })) {
                    await cart.click();
                    clicked = true;
                    trace.push(`action:cart-opened:${sel}`);
                    break;
                  }
                } catch { }
              }

              if (!clicked) {
                await page.goto(ottUrl.replace(/\/$/, "") + "/cart", { waitUntil: "domcontentloaded" });
                trace.push("action:cart-navigated-directly");
              }

              await page.waitForLoadState("domcontentloaded").catch(() => { });
              await page.waitForTimeout(2000);
              break;
            }

            case "verify_item_in_cart": 
            case "verify_cart_item":
            case "verify_product_in_cart": {
              await page.waitForTimeout(1500);
              const term = executionContext.searchTerm || "iPhone";
              const domain = detectDomain(ottUrl);

              // Domain-aware selector lookup for cart items
              const cartItemSelectors = getSelectors(ottUrl, 'cart', 'itemTitle');
              const cartContainerSelectors = getSelectors(ottUrl, 'cart', 'itemContainer');

              let found = false;
              
              // First try container selectors
              for (const sel of cartContainerSelectors) {
                try {
                  const items = page.locator(sel);
                  const count = await items.count();
                  if (count > 0) {
                    found = true;
                    trace.push(`action:cart-container-found:${count}-items:${sel}`);
                    break;
                  }
                } catch { }
              }

              // Then try item title selectors
              if (!found) {
                for (const sel of cartItemSelectors) {
                  try {
                    const items = page.locator(sel);
                    const count = await items.count();
                    if (count > 0) {
                      found = true;
                      trace.push(`action:cart-item-found:${count}-items:${sel}`);
                      break;
                    }
                  } catch { }
                }
              }

              // Fallback: search for product text
              if (!found) {
                const hasText = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
                if (hasText) {
                  found = true;
                  trace.push("action:cart-item-text-visible");
                }
              }

              // Flipkart-specific: check for cart item by looking at the page content
              if (!found && domain === 'flipkart') {
                const pageContent = await page.content();
                if (pageContent.toLowerCase().includes(term.toLowerCase())) {
                  found = true;
                  trace.push("action:cart-item-in-page-content");
                }
              }

              if (!found) throw new Error("Product title not visible");
              break;
            }

            case "verify_cart_image":
            case "verify_product_image_in_cart": {
              await page.waitForTimeout(1000);
              
              // Look for any product images in cart
              const cartImageSelectors = [
                ...getSelectors(ottUrl, 'cart', 'itemContainer'),
                'img[src*="product"]',
                'img[src*="rukmi"]',  // Flipkart CDN
                '.cart-item img',
                '[class*="cart"] img'
              ];

              let found = false;
              for (const sel of cartImageSelectors) {
                try {
                  const img = page.locator(`${sel} img, ${sel}`).first();
                  if (await img.isVisible({ timeout: 3000 })) {
                    found = true;
                    trace.push(`action:cart-image-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              if (!found) {
                // Fallback: any image in cart area
                const imgs = page.locator('img').filter({ hasNot: page.locator('[class*="logo"]') });
                const count = await imgs.count().catch(() => 0);
                if (count > 2) {
                  found = true;
                  trace.push("action:cart-images-fallback");
                }
              }

              if (!found) throw new Error(`Product "iPhone 15" not found in cart`);
              break;
            }

            case "verify_cart_price":
            case "verify_price_in_cart": {
              await page.waitForTimeout(1000);
              
              const cartPriceSelectors = getSelectors(ottUrl, 'cart', 'itemPrice');

              let found = false;
              for (const sel of cartPriceSelectors) {
                try {
                  const price = page.locator(sel).first();
                  if (await price.isVisible({ timeout: 3000 })) {
                    const text = await price.textContent().catch(() => '');
                    if (text && /[\d₹$]/.test(text)) {
                      found = true;
                      trace.push(`action:cart-price-visible:${sel}`);
                      break;
                    }
                  }
                } catch { }
              }

              // Fallback: look for price patterns
              if (!found) {
                const pricePatterns = [/₹[\s]*[\d,]+/, /Rs\.?[\s]*[\d,]+/i, /\$[\d,]+/];
                for (const pattern of pricePatterns) {
                  const hasPrice = await page.getByText(pattern).first().isVisible({ timeout: 2000 }).catch(() => false);
                  if (hasPrice) {
                    found = true;
                    trace.push("action:cart-price-text-fallback");
                    break;
                  }
                }
              }

              if (!found) throw new Error("Price not visible");
              break;
            }

            case "verify_place_order":
            case "verify_place_order_button": {
              await page.waitForTimeout(1000);
              
              const placeOrderSelectors = getSelectors(ottUrl, 'cart', 'placeOrder');

              let found = false;
              for (const sel of placeOrderSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:place-order-btn-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              // Fallback: text-based search
              if (!found) {
                const textBtns = [
                  page.getByRole('button', { name: /place.*order|checkout|proceed/i }),
                  page.locator('button').filter({ hasText: /place.*order|checkout|proceed/i })
                ];
                for (const btn of textBtns) {
                  try {
                    if (await btn.first().isVisible({ timeout: 2000 })) {
                      found = true;
                      trace.push("action:place-order-text-fallback");
                      break;
                    }
                  } catch { }
                }
              }

              if (!found) throw new Error("PLACE ORDER button not visible");
              break;
            }

            case "verify_remove_option":
            case "verify_remove_button": {
              await page.waitForTimeout(1000);
              
              const removeSelectors = getSelectors(ottUrl, 'cart', 'remove');

              let found = false;
              for (const sel of removeSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:remove-btn-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              // Fallback: text-based search
              if (!found) {
                const removeText = await page.getByText(/remove|delete/i).first().isVisible({ timeout: 3000 }).catch(() => false);
                if (removeText) {
                  found = true;
                  trace.push("action:remove-text-fallback");
                }
              }

              if (!found) throw new Error("Remove option not visible");
              break;
            }

            case "verify_quantity": {
              // Domain-aware selector lookup for quantity
              const qtySelectors = getSelectors(ottUrl, 'cart', 'quantity');

              let found = false;
              for (const sel of qtySelectors) {
                try {
                  const qty = page.locator(sel).first();
                  if (await qty.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:quantity-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              if (!found) trace.push("action:quantity-not-found-continuing");
              break;
            }

            case "verify_checkout": {
              // Domain-aware selector lookup for checkout button
              const checkoutSelectors = getSelectors(ottUrl, 'cart', 'placeOrder');

              let found = false;
              for (const sel of checkoutSelectors) {
                try {
                  const btn = page.locator(sel).first();
                  if (await btn.isVisible({ timeout: 5000 })) {
                    found = true;
                    trace.push(`action:checkout-btn-visible:${sel}`);
                    break;
                  }
                } catch { }
              }

              if (!found) {
                const hasText = await page.getByText(/proceed|checkout/i).first().isVisible({ timeout: 3000 }).catch(() => false);
                if (hasText) {
                  found = true;
                  trace.push("action:checkout-text-visible");
                }
              }

              if (!found) throw new Error("Proceed to checkout not visible");
              break;
            }

            case "verify_element":
            default: {
              // Generic verification - look for key text from expected result
              const searchTerms = expected.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 3);
              let found = false;

              for (const term of searchTerms) {
                const hasText = await page.getByText(term, { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false);
                if (hasText) {
                  found = true;
                  trace.push(`action:verified-text:${term}`);
                  break;
                }
              }

              if (!found && searchTerms.length === 0) {
                // Just verify page is visible
                const body = page.locator("body");
                await body.waitFor({ state: "visible", timeout: 10000 });
                trace.push("action:page-visible-generic");
              } else if (!found) {
                throw new Error(`Expected content not visible: ${expected.slice(0, 50)}`);
              }
              break;
            }
          }
        }
      };
    });
  }

  const uploadedMode = run.input.executionMode === "uploaded_tc_only";
  const selectedSuite = uploadedMode ? buildUploadedTcExecutionTests() : [...baseTests, ...assertionTests];
  const allTests = selectedSuite.filter((t) => !failedSet || failedSet.has(t.id));

  if (!allTests.length) {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "Execution Service",
        mode: "rerun-failed"
      },
      totals: { total: 0, passed: 0, failed: 0, passRate: "0%" },
      tests: [],
      locatorAnalysis: [],
      note: "No failed checks found to rerun"
    };
  }

  await fs.mkdir(run.runDir, { recursive: true });

  let browser;
  const tests = [];
  const locatorAnalysis = [];

  try {
    const headless = !(run.input.runHeaded || process.env.RUN_HEADED === "true");
    browser = await chromium.launch({
      headless,
      slowMo: headless ? 0 : 300,
      args: headless ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] : []
    });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
    const page = await context.newPage();

    // For CSV upload mode (e-commerce flows), skip OTT-specific locator analysis
    // to avoid unnecessary page reloads
    if (!uploadedMode && Object.keys(selectorCandidates).length > 0) {
      // Navigate once for locator analysis
      await page.goto(run.input.ottUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

      for (const [key, candidates] of Object.entries(selectorCandidates)) {
        let status = "not-found";
        let usedSelector = null;
        let xpath = null;

        for (const selector of candidates) {
          try {
            const loc = page.locator(selector).first();
            if (await loc.isVisible({ timeout: 3000 })) {
              status = "mapped";
              usedSelector = selector;
              xpath = await findXPathForSelector(page, selector);
              saveLearnedSelector(host, key, `selector:${selector}`);
              break;
            }
          } catch {
            status = "analysis-error";
          }
        }

        locatorAnalysis.push({
          key,
          testedCandidates: candidates,
          usedSelector,
          xpath,
          status
        });
      }
    }

    // Reset page state for test execution (sequential mode handles its own navigation)
    pageInitialized = false;

    for (const testDef of allTests) {
      let retries = 0;
      let passed = false;
      let skipped = false;
      let skipReason = null;
      let error = null;
      let screenshot = null;
      let trace = [];
      const start = Date.now();

      while (retries <= 1 && !passed) {
        try {
          const execResult = await testDef.execute(page, trace);
          if (execResult && execResult.skip) {
            skipped = true;
            skipReason = execResult.reason || "Scenario skipped";
            screenshot = await screenshotForCase(page, run, testDef.id, "skipped", retries + 1);
            break;
          }
          screenshot = await screenshotForCase(page, run, testDef.id, "passed", retries + 1);
          passed = true;
        } catch (err) {
          error = err.message;
          screenshot = await screenshotForCase(page, run, testDef.id, "failed", retries + 1);
          retries += 1;
          if (retries <= 1) {
            await page.waitForTimeout(2000);
          }
        }
      }

      tests.push({
        id: testDef.id,
        title: testDef.title,
        status: skipped ? "skipped" : (passed ? "passed" : "failed"),
        retries,
        durationMs: Date.now() - start,
        error: skipped ? skipReason : (passed ? null : error),
        trace,
        screenshot
      });
    }

    await context.close();
  } catch (error) {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "Execution Service",
        mode: rerunFailedOnly ? "rerun-failed" : "full"
      },
      totals: { total: allTests.length, passed: 0, failed: allTests.length, passRate: "0%" },
      tests: allTests.map((t) => ({
        id: t.id,
        title: t.title,
        status: "failed",
        retries: 0,
        durationMs: 0,
        error: `Runtime setup failure: ${error.message}`,
        trace: [],
        screenshot: null
      })),
      locatorAnalysis,
      infraError: "Run 'npx playwright install chromium' if browser binary is missing"
    };
  } finally {
    if (browser) await browser.close();
  }

  const passed = tests.filter((t) => t.status === "passed").length;
  const skipped = tests.filter((t) => t.status === "skipped").length;
  const failed = tests.filter((t) => t.status === "failed").length;
  const executable = tests.length - skipped;

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Execution Service",
      mode: useMinimalExecution ? "minimal" : (rerunFailedOnly ? "rerun-failed" : "full")
    },
    totals: {
      total: tests.length,
      passed,
      failed,
      skipped,
      passRate: executable ? `${Math.round((passed / executable) * 100)}%` : "0%"
    },
    tests,
    locatorAnalysis
  };
}

// ========== OPTIONAL AGENTS ==========

/**
 * Web Analyzer Agent - Comprehensive website analysis when no test document is provided
 * Uses the urlAnalyzerPro module for professional-grade analysis:
 * - Intelligent website type detection (E-commerce, Retail, Healthcare, OTT, Corporate, etc.)
 * - BRD (Business Requirements Document) generation
 * - Domain-specific test cases automatically generated
 * - Detailed observations for BA and other agents
 */
async function generateWebAnalysis(run) {
  const ottUrl = run.input.ottUrl;
  const headless = !(run.input.runHeaded || process.env.RUN_HEADED === "true");

  let browser = null;

  try {
    browser = await chromium.launch({ headless, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    // Use the PRO URL Analyzer for comprehensive professional analysis
    const analysisResult = await urlAnalyzerPro.analyzeUrlPro(page, ottUrl, { headless });

    await browser.close();
    browser = null;

    // Format observations for BA Agent using Pro format
    const baObservations = urlAnalyzerPro.formatForBAAgent(analysisResult);

    // Extract data for backward compatibility
    const websiteType = analysisResult.websiteType || { typeName: 'Website', type: 'GENERIC' };
    const domain = websiteType.type?.toLowerCase() || 'generic';
    const discoveredFeatures = baObservations.keyFunctionalities || [];
    const discoveredForms = analysisResult.forms || [];

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "URL Analyzer Pro Agent",
        url: ottUrl,
        domain: domain,
        websiteType: websiteType.typeName,
        websiteTypeConfidence: websiteType.confidence,
        siteName: analysisResult.pageStructure?.title || 'Website',
        analysisDepth: 'professional',
        duration: analysisResult.analysisTime || 0
      },
      siteOverview: {
        title: analysisResult.pageStructure?.title || "Analysis Complete",
        description: analysisResult.pageStructure?.metaTags?.description || "",
        type: websiteType.typeName,
        url: ottUrl,
        pagesDiscovered: analysisResult.pagesAnalyzed || 1
      },
      discoveredPages: [],
      features: discoveredFeatures.map(f => ({
        name: f.name,
        type: 'core',
        description: f.name,
        priority: f.priority,
        testable: f.testable !== false
      })),
      forms: discoveredForms.map(f => ({
        id: f.id,
        purpose: f.purpose,
        fieldCount: f.fieldCount,
        fields: f.fields
      })),
      ctas: analysisResult.elements?.filter(e => e.category === 'BUTTONS')?.slice(0, 20) || [],
      siteStructure: {
        navigation: analysisResult.elements?.filter(e => e.category === 'NAVIGATION') || [],
        footer: analysisResult.elements?.filter(e => e.category === 'FOOTER') || [],
        headers: analysisResult.pageStructure?.headings || []
      },
      sections: analysisResult.pageStructure?.sections || [],
      
      // Comprehensive analysis results
      allElements: (() => {
        const grouped = {};
        (analysisResult.elements || []).forEach(el => {
          if (!grouped[el.category]) grouped[el.category] = [];
          grouped[el.category].push(el);
        });
        return grouped;
      })(),
      pageStructure: analysisResult.pageStructure || {},
      userFlows: analysisResult.userFlows || [],
      selectors: {},
      observations: analysisResult.observations || [],
      warnings: analysisResult.warnings || [],
      
      // BRD Document
      brdDocument: analysisResult.brd || null,
      
      // Auto-generated test cases from analysis
      autoGeneratedTestCases: analysisResult.testCases || [],
      
      // BA Agent insights
      baInsights: {
        summary: baObservations.summary,
        websiteType: websiteType.typeName,
        websiteTypeConfidence: websiteType.confidence,
        keyFunctionalities: baObservations.keyFunctionalities || [],
        userJourneys: baObservations.userJourneys || [],
        criticalPaths: baObservations.criticalPaths || [],
        riskAreas: baObservations.riskAreas || [],
        formAnalysis: baObservations.formAnalysis || [],
        navigationStructure: baObservations.navigationStructure || {},
        testingRecommendations: baObservations.testingRecommendations || []
      },
      
      // Suggested test areas based on website type
      suggestedTestAreas: (() => {
        const areas = [];
        
        // Add type-specific test areas
        if (websiteType.type === 'RETAIL_STORE') {
          areas.push({ area: "Store Locations", priority: "Critical", tests: ["Branch listing", "Address accuracy", "Contact information", "Store timings", "Directions"] });
          areas.push({ area: "Product Categories", priority: "High", tests: ["Category navigation", "Category pages", "Product display"] });
        }
        
        if (websiteType.type === 'ECOMMERCE') {
          areas.push({ area: "Search Functionality", priority: "Critical", tests: ["Search with keywords", "Search results", "Filters", "Sorting"] });
          areas.push({ area: "Cart Operations", priority: "Critical", tests: ["Add to cart", "Update quantity", "Remove item", "Cart total"] });
          areas.push({ area: "Product Display", priority: "Critical", tests: ["Product listing", "Product details", "Images", "Pricing"] });
        }
        
        if (websiteType.type === 'HEALTHCARE_PHARMA') {
          areas.push({ area: "Product Information", priority: "Critical", tests: ["Product details", "Composition", "Usage", "Warnings"] });
          areas.push({ area: "Adverse Event Reporting", priority: "Critical", tests: ["Form accessibility", "Submission", "Confirmation"] });
        }
        
        if (websiteType.type === 'OTT_STREAMING') {
          areas.push({ area: "Content Discovery", priority: "Critical", tests: ["Content browse", "Search", "Categories", "Recommendations"] });
          areas.push({ area: "Video Playback", priority: "Critical", tests: ["Play button", "Controls", "Quality", "Buffering"] });
        }
        
        // Common test areas for all types
        if (analysisResult.forms?.length > 0) {
          areas.push({ area: "Form Validation", priority: "High", tests: ["Required fields", "Input validation", "Error messages", "Submission"] });
        }
        
        areas.push({ area: "Navigation", priority: "High", tests: ["Menu items", "Page transitions", "Logo link", "Footer links"] });
        areas.push({ area: "UI/Visual", priority: "Medium", tests: ["Page layout", "Images", "Responsive design", "Accessibility"] });
        areas.push({ area: "Performance", priority: "High", tests: ["Page load", "Core Web Vitals", "Image optimization"] });
        
        return areas;
      })(),
      
      suggestedRequirements: analysisResult.brd?.functionalRequirements?.map(r => 
        `${r.id}: ${r.description}`
      ) || []
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[Web Analyzer Pro] Error:', err.message);
    return {
      metadata: { 
        generatedAt: new Date().toISOString(), 
        source: "URL Analyzer Pro Agent", 
        url: ottUrl,
        error: true
      },
      siteOverview: { title: "Analysis Failed", description: "", type: "Unknown", pagesDiscovered: 0 },
      error: err.message,
      baInsights: { 
        summary: `Web analysis failed: ${err.message}. Manual BRD input recommended.`,
        keyFunctionalities: [],
        userJourneys: [],
        criticalPaths: [],
        riskAreas: [`Analysis error: ${err.message}`],
        testingRecommendations: ['Manual analysis recommended due to analysis error']
      },
      autoGeneratedTestCases: [],
      suggestedTestAreas: [
        { area: "Navigation", priority: "High", tests: ["Menu navigation", "Page transitions"] },
        { area: "Forms", priority: "High", tests: ["Form validation", "Submission"] },
        { area: "UI Elements", priority: "Medium", tests: ["Button interactions", "Links", "Images"] }
      ],
      suggestedRequirements: []
    };
  }
}

/**
 * Security Testing Agent - Performs basic security checks on the website
 */
async function generateSecurityReport(run) {
  const ottUrl = run.input.ottUrl;
  const headless = !(run.input.runHeaded || process.env.RUN_HEADED === "true");

  let browser = null;
  const vulnerabilities = [];
  const checks = [];
  const recommendations = [];

  try {
    browser = await chromium.launch({ headless, args: ["--no-sandbox"] });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture security headers from response
    let securityHeaders = {};
    page.on("response", (response) => {
      if (response.url() === ottUrl || response.url() === ottUrl + '/') {
        const headers = response.headers();
        securityHeaders = {
          contentSecurityPolicy: headers['content-security-policy'] || null,
          xFrameOptions: headers['x-frame-options'] || null,
          xContentTypeOptions: headers['x-content-type-options'] || null,
          strictTransportSecurity: headers['strict-transport-security'] || null,
          xXssProtection: headers['x-xss-protection'] || null,
          referrerPolicy: headers['referrer-policy'] || null
        };
      }
    });

    await page.goto(ottUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check 1: HTTPS usage
    const isHttps = ottUrl.startsWith('https://');
    checks.push({
      name: "HTTPS Enabled",
      status: isHttps ? "pass" : "fail",
      severity: isHttps ? "none" : "critical",
      description: isHttps ? "Site uses HTTPS" : "Site does not use HTTPS - data transmitted insecurely"
    });
    if (!isHttps) {
      vulnerabilities.push({ type: "critical", name: "Missing HTTPS", description: "Site not using HTTPS encryption" });
      recommendations.push("Enable HTTPS with a valid SSL certificate");
    }

    // Check 2: Content Security Policy
    checks.push({
      name: "Content Security Policy",
      status: securityHeaders.contentSecurityPolicy ? "pass" : "warning",
      severity: securityHeaders.contentSecurityPolicy ? "none" : "medium",
      description: securityHeaders.contentSecurityPolicy ? "CSP header present" : "No CSP header - vulnerable to XSS"
    });
    if (!securityHeaders.contentSecurityPolicy) {
      vulnerabilities.push({ type: "medium", name: "Missing CSP", description: "No Content-Security-Policy header" });
      recommendations.push("Implement Content-Security-Policy header to prevent XSS attacks");
    }

    // Check 3: X-Frame-Options
    checks.push({
      name: "Clickjacking Protection",
      status: securityHeaders.xFrameOptions ? "pass" : "warning",
      severity: securityHeaders.xFrameOptions ? "none" : "medium",
      description: securityHeaders.xFrameOptions ? `X-Frame-Options: ${securityHeaders.xFrameOptions}` : "No X-Frame-Options header"
    });
    if (!securityHeaders.xFrameOptions) {
      vulnerabilities.push({ type: "medium", name: "Missing X-Frame-Options", description: "Site may be vulnerable to clickjacking" });
      recommendations.push("Add X-Frame-Options header (DENY or SAMEORIGIN)");
    }

    // Check 4: X-Content-Type-Options
    checks.push({
      name: "MIME Type Sniffing Protection",
      status: securityHeaders.xContentTypeOptions ? "pass" : "warning",
      severity: securityHeaders.xContentTypeOptions ? "none" : "low",
      description: securityHeaders.xContentTypeOptions ? "X-Content-Type-Options: nosniff" : "No X-Content-Type-Options header"
    });

    // Check 5: HSTS
    checks.push({
      name: "HTTP Strict Transport Security",
      status: securityHeaders.strictTransportSecurity ? "pass" : "warning",
      severity: securityHeaders.strictTransportSecurity ? "none" : "medium",
      description: securityHeaders.strictTransportSecurity ? "HSTS enabled" : "No HSTS header"
    });
    if (!securityHeaders.strictTransportSecurity && isHttps) {
      recommendations.push("Enable HSTS to enforce HTTPS usage");
    }

    // Check 6: Password fields
    const passwordFields = await page.$$eval('input[type="password"]', fields =>
      fields.map(f => ({
        name: f.name || f.id || "unnamed",
        autocomplete: f.autocomplete,
        hasLabel: !!f.labels?.length
      }))
    );
    const insecurePasswords = passwordFields.filter(f => f.autocomplete === 'on');
    checks.push({
      name: "Password Field Security",
      status: insecurePasswords.length === 0 ? "pass" : "warning",
      severity: insecurePasswords.length === 0 ? "none" : "low",
      description: `${passwordFields.length} password field(s) found, ${insecurePasswords.length} with autocomplete enabled`
    });

    // Check 7: External scripts
    const externalScripts = await page.$$eval('script[src]', scripts =>
      scripts.filter(s => !s.src.includes(window.location.hostname))
        .map(s => ({ src: s.src.slice(0, 100), integrity: s.integrity || null }))
    );
    const scriptsWithoutIntegrity = externalScripts.filter(s => !s.integrity);
    checks.push({
      name: "Subresource Integrity",
      status: scriptsWithoutIntegrity.length === 0 ? "pass" : "info",
      severity: scriptsWithoutIntegrity.length === 0 ? "none" : "low",
      description: `${externalScripts.length} external scripts, ${scriptsWithoutIntegrity.length} without SRI`
    });

    // Check 8: Form actions
    const forms = await page.$$eval('form', forms =>
      forms.map(f => ({
        action: f.action || "same page",
        method: f.method || "GET",
        isHttps: f.action?.startsWith('https://') || !f.action || f.action.startsWith('/')
      }))
    );
    const insecureForms = forms.filter(f => !f.isHttps);
    checks.push({
      name: "Secure Form Submissions",
      status: insecureForms.length === 0 ? "pass" : "fail",
      severity: insecureForms.length === 0 ? "none" : "high",
      description: `${forms.length} form(s), ${insecureForms.length} with insecure action URLs`
    });
    if (insecureForms.length > 0) {
      vulnerabilities.push({ type: "high", name: "Insecure Form Action", description: "Form submits data over HTTP" });
    }

    // Check 9: Cookie security
    const cookies = await context.cookies();
    const insecureCookies = cookies.filter(c => !c.secure || !c.httpOnly);
    checks.push({
      name: "Cookie Security",
      status: insecureCookies.length === 0 ? "pass" : "warning",
      severity: insecureCookies.length === 0 ? "none" : "medium",
      description: `${cookies.length} cookie(s), ${insecureCookies.length} without Secure/HttpOnly flags`
    });

    // Check 10: Sensitive data exposure
    const pageContent = await page.content();
    const sensitivePatterns = [
      { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, name: "API Key" },
      { pattern: /password\s*[:=]\s*["'][^"']+["']/gi, name: "Hardcoded Password" },
      { pattern: /secret\s*[:=]\s*["'][^"']+["']/gi, name: "Secret Key" }
    ];
    const exposedSecrets = sensitivePatterns.filter(p => p.pattern.test(pageContent));
    checks.push({
      name: "Sensitive Data Exposure",
      status: exposedSecrets.length === 0 ? "pass" : "fail",
      severity: exposedSecrets.length === 0 ? "none" : "critical",
      description: exposedSecrets.length === 0 ? "No exposed secrets detected" : `Potential ${exposedSecrets.map(s => s.name).join(', ')} exposure`
    });
    if (exposedSecrets.length > 0) {
      vulnerabilities.push({ type: "critical", name: "Sensitive Data Exposure", description: "Potential secrets found in page source" });
    }

    await browser.close();
    browser = null;

    // Calculate security score
    const passedChecks = checks.filter(c => c.status === "pass").length;
    const criticalIssues = vulnerabilities.filter(v => v.type === "critical").length;
    const highIssues = vulnerabilities.filter(v => v.type === "high").length;
    const score = Math.max(0, 100 - (criticalIssues * 25) - (highIssues * 15) - ((checks.length - passedChecks) * 5));

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "Security Agent",
        url: ottUrl
      },
      summary: {
        score,
        verdict: score >= 80 ? "Good" : score >= 60 ? "Acceptable" : score >= 40 ? "Needs Improvement" : "Critical",
        checksRun: checks.length,
        passed: passedChecks,
        failed: checks.filter(c => c.status === "fail").length,
        warnings: checks.filter(c => c.status === "warning").length
      },
      securityHeaders,
      checks,
      vulnerabilities,
      recommendations: [...new Set(recommendations)],
      complianceNotes: [
        isHttps ? "HTTPS compliance: Met" : "HTTPS compliance: Not Met",
        securityHeaders.contentSecurityPolicy ? "CSP compliance: Met" : "CSP compliance: Not Met"
      ]
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return {
      metadata: { generatedAt: new Date().toISOString(), source: "Security Agent", url: ottUrl },
      summary: { score: 0, verdict: "Error", checksRun: 0, passed: 0, failed: 1, warnings: 0 },
      checks: [],
      vulnerabilities: [{ type: "error", name: "Agent Error", description: err.message }],
      recommendations: ["Fix agent execution error and retry"]
    };
  }
}

async function generateAccessibilityReport(run) {
  const ottUrl = run.input.ottUrl;
  const headless = !(run.input.runHeaded || process.env.RUN_HEADED === "true");

  let browser = null;
  const issues = [];
  const checks = [];

  try {
    browser = await chromium.launch({ headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(ottUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check 1: Images without alt text
    const imagesWithoutAlt = await page.$$eval("img:not([alt]), img[alt='']", (imgs) =>
      imgs.slice(0, 20).map(img => ({ src: img.src?.slice(0, 100), issue: "Missing alt text" }))
    );
    if (imagesWithoutAlt.length > 0) {
      issues.push({ type: "error", category: "Images", message: `${imagesWithoutAlt.length} images missing alt text`, details: imagesWithoutAlt.slice(0, 5) });
    }
    checks.push({ name: "Alt text on images", status: imagesWithoutAlt.length === 0 ? "pass" : "fail", count: imagesWithoutAlt.length });

    // Check 2: Form inputs without labels
    const inputsWithoutLabels = await page.$$eval("input:not([aria-label]):not([aria-labelledby]):not([id])", (inputs) => inputs.length);
    checks.push({ name: "Form input labels", status: inputsWithoutLabels === 0 ? "pass" : "warn", count: inputsWithoutLabels });
    if (inputsWithoutLabels > 0) {
      issues.push({ type: "warning", category: "Forms", message: `${inputsWithoutLabels} inputs may lack proper labels` });
    }

    // Check 3: Buttons without accessible names
    const buttonsWithoutNames = await page.$$eval("button:not([aria-label]):empty, button:not([aria-label]):not(:has(*))", (btns) => btns.length);
    checks.push({ name: "Button accessible names", status: buttonsWithoutNames === 0 ? "pass" : "fail", count: buttonsWithoutNames });
    if (buttonsWithoutNames > 0) {
      issues.push({ type: "error", category: "Buttons", message: `${buttonsWithoutNames} buttons without accessible names` });
    }

    // Check 4: Links without text
    const emptyLinks = await page.$$eval("a:not([aria-label]):empty, a:not([aria-label]):not(:has(*))", (links) => links.length);
    checks.push({ name: "Link text", status: emptyLinks === 0 ? "pass" : "warn", count: emptyLinks });
    if (emptyLinks > 0) {
      issues.push({ type: "warning", category: "Links", message: `${emptyLinks} links without descriptive text` });
    }

    // Check 5: Heading hierarchy
    const headings = await page.$$eval("h1, h2, h3, h4, h5, h6", (hs) => hs.map(h => h.tagName));
    const h1Count = headings.filter(h => h === "H1").length;
    checks.push({ name: "Single H1 heading", status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn", count: h1Count });
    if (h1Count !== 1) {
      issues.push({ type: h1Count === 0 ? "error" : "warning", category: "Headings", message: h1Count === 0 ? "No H1 heading found" : `Multiple H1 headings found (${h1Count})` });
    }

    // Check 6: ARIA landmarks
    const landmarks = await page.$$eval("[role='main'], [role='navigation'], [role='banner'], main, nav, header", (els) => els.length);
    checks.push({ name: "ARIA landmarks", status: landmarks >= 2 ? "pass" : "warn", count: landmarks });
    if (landmarks < 2) {
      issues.push({ type: "warning", category: "Structure", message: "Limited ARIA landmarks detected" });
    }

    // Check 7: Color contrast (basic check - text elements)
    const smallText = await page.$$eval("p, span, a, button, label", (els) => els.length);
    checks.push({ name: "Text elements found", status: "info", count: smallText });

    // Check 8: Focus indicators
    const focusableElements = await page.$$eval("a, button, input, select, textarea, [tabindex]", (els) => els.length);
    checks.push({ name: "Focusable elements", status: focusableElements > 0 ? "pass" : "warn", count: focusableElements });

    await browser.close();
    browser = null;

    const errorCount = issues.filter(i => i.type === "error").length;
    const warningCount = issues.filter(i => i.type === "warning").length;
    const passCount = checks.filter(c => c.status === "pass").length;

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "Accessibility Agent",
        url: ottUrl
      },
      summary: {
        score: Math.max(0, 100 - (errorCount * 15) - (warningCount * 5)),
        verdict: errorCount === 0 ? (warningCount <= 2 ? "Good" : "Acceptable") : "Needs Improvement",
        checksRun: checks.length,
        passed: passCount,
        errors: errorCount,
        warnings: warningCount
      },
      checks,
      issues,
      recommendations: [
        errorCount > 0 ? "Fix all images missing alt text for screen readers" : null,
        buttonsWithoutNames > 0 ? "Add aria-label to icon-only buttons" : null,
        h1Count !== 1 ? "Ensure exactly one H1 heading per page" : null,
        landmarks < 2 ? "Add ARIA landmarks (main, nav, header) for navigation" : null
      ].filter(Boolean)
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => { });
    return {
      metadata: { generatedAt: new Date().toISOString(), source: "Accessibility Agent", url: ottUrl },
      summary: { score: 0, verdict: "Error", checksRun: 0, passed: 0, errors: 1, warnings: 0 },
      checks: [],
      issues: [{ type: "error", category: "Agent", message: `Accessibility check failed: ${err.message}` }],
      recommendations: ["Fix agent execution error and retry"]
    };
  }
}

async function generatePerformanceReport(run) {
  const ottUrl = run.input.ottUrl;
  const headless = !(run.input.runHeaded || process.env.RUN_HEADED === "true");

  let browser = null;

  try {
    browser = await chromium.launch({ headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable request tracking
    const requests = [];
    const resourceTypes = { document: 0, script: 0, stylesheet: 0, image: 0, font: 0, xhr: 0, fetch: 0, other: 0 };
    let totalBytes = 0;

    page.on("response", async (response) => {
      try {
        const type = response.request().resourceType();
        resourceTypes[type] = (resourceTypes[type] || 0) + 1;
        const headers = response.headers();
        const contentLength = parseInt(headers["content-length"] || "0", 10);
        totalBytes += contentLength;
        requests.push({ url: response.url().slice(0, 100), status: response.status(), type, size: contentLength });
      } catch (_) { }
    });

    const startTime = Date.now();
    await page.goto(ottUrl, { waitUntil: "load", timeout: 60000 });
    const loadTime = Date.now() - startTime;

    // Wait for network to settle
    await page.waitForTimeout(2000);

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perf = window.performance;
      const timing = perf.timing || {};
      const navigation = perf.getEntriesByType?.("navigation")?.[0] || {};

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime || timing.domContentLoadedEventEnd - timing.navigationStart || 0,
        domInteractive: navigation.domInteractive - navigation.startTime || timing.domInteractive - timing.navigationStart || 0,
        loadComplete: navigation.loadEventEnd - navigation.startTime || timing.loadEventEnd - timing.navigationStart || 0,
        firstPaint: perf.getEntriesByType?.("paint")?.find(p => p.name === "first-paint")?.startTime || 0,
        firstContentfulPaint: perf.getEntriesByType?.("paint")?.find(p => p.name === "first-contentful-paint")?.startTime || 0,
        resourceCount: perf.getEntriesByType?.("resource")?.length || 0
      };
    });

    // DOM size check
    const domStats = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*").length;
      const maxDepth = (function getMaxDepth(el, depth = 0) {
        if (!el.children.length) return depth;
        return Math.max(...Array.from(el.children).map(c => getMaxDepth(c, depth + 1)));
      })(document.body);
      return { elementCount: allElements, maxDepth };
    });

    await browser.close();
    browser = null;

    // Scoring
    const metrics = [];
    const issues = [];

    // Load time scoring
    const loadTimeScore = loadTime < 3000 ? "good" : loadTime < 6000 ? "moderate" : "poor";
    metrics.push({ name: "Page Load Time", value: `${(loadTime / 1000).toFixed(2)}s`, score: loadTimeScore });
    if (loadTime > 5000) issues.push({ type: "error", message: `Slow page load: ${(loadTime / 1000).toFixed(2)}s (target: <3s)` });

    // FCP scoring
    const fcp = performanceMetrics.firstContentfulPaint;
    const fcpScore = fcp < 1800 ? "good" : fcp < 3000 ? "moderate" : "poor";
    metrics.push({ name: "First Contentful Paint (FCP)", value: `${(fcp / 1000).toFixed(2)}s`, score: fcpScore });
    if (fcp > 2500) issues.push({ type: "warning", message: `Slow FCP: ${(fcp / 1000).toFixed(2)}s (target: <1.8s)` });

    // DOM size scoring
    const domScore = domStats.elementCount < 1500 ? "good" : domStats.elementCount < 3000 ? "moderate" : "poor";
    metrics.push({ name: "DOM Elements", value: domStats.elementCount.toString(), score: domScore });
    if (domStats.elementCount > 2000) issues.push({ type: "warning", message: `Large DOM: ${domStats.elementCount} elements (target: <1500)` });

    // Resource count
    const resourceScore = performanceMetrics.resourceCount < 50 ? "good" : performanceMetrics.resourceCount < 100 ? "moderate" : "poor";
    metrics.push({ name: "Resources Loaded", value: performanceMetrics.resourceCount.toString(), score: resourceScore });
    if (performanceMetrics.resourceCount > 80) issues.push({ type: "warning", message: `Many resources: ${performanceMetrics.resourceCount} (target: <50)` });

    // Total size
    const sizeMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const sizeScore = totalBytes < 2 * 1024 * 1024 ? "good" : totalBytes < 5 * 1024 * 1024 ? "moderate" : "poor";
    metrics.push({ name: "Total Page Size", value: `${sizeMB} MB`, score: sizeScore });
    if (totalBytes > 3 * 1024 * 1024) issues.push({ type: "warning", message: `Large page size: ${sizeMB}MB (target: <2MB)` });

    const goodCount = metrics.filter(m => m.score === "good").length;
    const overallScore = Math.round((goodCount / metrics.length) * 100);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "Performance Agent",
        url: ottUrl
      },
      summary: {
        score: overallScore,
        verdict: overallScore >= 80 ? "Good" : overallScore >= 50 ? "Moderate" : "Needs Improvement",
        loadTime: `${(loadTime / 1000).toFixed(2)}s`,
        resourceCount: performanceMetrics.resourceCount,
        totalSize: `${sizeMB} MB`
      },
      coreWebVitals: {
        fcp: `${(fcp / 1000).toFixed(2)}s`,
        domContentLoaded: `${(performanceMetrics.domContentLoaded / 1000).toFixed(2)}s`,
        loadComplete: `${(performanceMetrics.loadComplete / 1000).toFixed(2)}s`
      },
      metrics,
      resourceBreakdown: resourceTypes,
      domStats,
      issues,
      recommendations: [
        loadTime > 5000 ? "Optimize server response time and reduce blocking resources" : null,
        fcp > 2500 ? "Reduce render-blocking CSS and JavaScript" : null,
        domStats.elementCount > 2000 ? "Simplify DOM structure or virtualize long lists" : null,
        resourceTypes.image > 20 ? "Optimize and lazy-load images" : null,
        resourceTypes.script > 15 ? "Consolidate and defer non-critical scripts" : null
      ].filter(Boolean)
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => { });
    return {
      metadata: { generatedAt: new Date().toISOString(), source: "Performance Agent", url: ottUrl },
      summary: { score: 0, verdict: "Error", loadTime: "N/A", resourceCount: 0, totalSize: "N/A" },
      coreWebVitals: {},
      metrics: [],
      resourceBreakdown: {},
      domStats: {},
      issues: [{ type: "error", message: `Performance check failed: ${err.message}` }],
      recommendations: ["Fix agent execution error and retry"]
    };
  }
}

// ========== END OPTIONAL AGENTS ==========

function generateManagerReport(requirements, manualCases, automationBundle, executionReport, accessibilityReport = null, performanceReport = null, securityReport = null) {
  const tests = executionReport.tests || [];
  const failures = tests.filter((t) => t.status === "failed");
  const skipped = tests.filter((t) => t.status === "skipped");
  const passed = tests.filter((t) => t.status === "passed");
  const totalCases = (manualCases.testCases || []).length;
  const totalExecuted = tests.length;
  const passRate = executionReport.totals.passRate || "0%";

  const rootCauses = [];
  const errorMessages = new Set(failures.map((f) => String(f.error).slice(0, 80)));
  if (errorMessages.has("") || failures.some((t) => String(t.error).includes("not visible"))) {
    rootCauses.push("Elements not found: selectors may not match current app layout or content");
  }
  if (failures.some((t) => String(t.error).includes("content card") || String(t.error).includes("Content detail"))) {
    rootCauses.push("Content discovery: card/detail selectors need calibration for this channel");
  }
  if (failures.some((t) => String(t.error).includes("Play") || String(t.error).includes("playback"))) {
    rootCauses.push("Playback flow: Play/Resume CTA or player controls not detected");
  }
  if (failures.some((t) => String(t.error).includes("Login") || String(t.error).includes("OTP"))) {
    rootCauses.push("Auth flow: login/OTP elements not found; check credentials or selectors");
  }
  if (failures.some((t) => String(t.error).includes("Search") || String(t.error).includes("EPG") || String(t.error).includes("channel"))) {
    rootCauses.push("Navigation: Search, EPG or channel entry not visible on landing");
  }
  if (!rootCauses.length && failures.length) {
    rootCauses.push("General: selector drift, timing, or environment variability");
  }

  const failCount = executionReport.totals.failed || 0;
  const decision = failCount === 0 ? "Go" : failCount <= 2 ? "Conditional Go" : "Hold";
  const riskLevel = failCount === 0 ? "Low" : failCount <= 3 ? "Medium" : "High";

  const byFeature = {};
  (manualCases.testCases || []).forEach((tc) => {
    const mod = tc.module || "Other";
    if (!byFeature[mod]) byFeature[mod] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    byFeature[mod].total += 1;
  });
  tests.forEach((t) => {
    const id = t.id.replace("EXEC-", "");
    const tc = (manualCases.testCases || []).find((c) => c.id === id || `EXEC-${c.id}` === t.id);
    const mod = tc ? (tc.module || "Other") : "Other";
    if (!byFeature[mod]) byFeature[mod] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    if (t.status === "passed") byFeature[mod].passed += 1;
    else if (t.status === "failed") byFeature[mod].failed += 1;
    else byFeature[mod].skipped += 1;
  });

  const traceability = tests.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    error: t.error || null
  }));

  const actionPlan = [];
  if (failures.length) {
    actionPlan.push("1. Fix failing tests: update selectors or add element logs for missing elements");
    actionPlan.push("2. Re-run failed only (Re-run Failed button) after selector/flow fixes");
  }
  if (rootCauses.some((r) => r.includes("Auth"))) {
    actionPlan.push("3. Provide valid login credentials in the run form if the app has a login wall");
  }
  actionPlan.push("4. Use Element log tab to feed stable selectors for this OTT URL (Postgres required)");
  actionPlan.push("5. Add assertion lines (selector: or text:) for critical UI checks");

  // Include optional agent summaries
  const optionalAgentSummaries = {};
  if (accessibilityReport && accessibilityReport.summary) {
    optionalAgentSummaries.accessibility = {
      score: accessibilityReport.summary.score,
      verdict: accessibilityReport.summary.verdict,
      errors: accessibilityReport.summary.errors,
      warnings: accessibilityReport.summary.warnings
    };
  }
  if (performanceReport && performanceReport.summary) {
    optionalAgentSummaries.performance = {
      score: performanceReport.summary.score,
      verdict: performanceReport.summary.verdict,
      loadTime: performanceReport.summary.loadTime
    };
  }
  if (securityReport && securityReport.summary) {
    optionalAgentSummaries.security = {
      score: securityReport.summary.score,
      verdict: securityReport.summary.verdict,
      vulnerabilities: securityReport.vulnerabilities?.length || 0,
      criticalIssues: securityReport.vulnerabilities?.filter(v => v.type === 'critical').length || 0
    };
    // Adjust risk level if security issues found
    if (securityReport.summary.score < 50) {
      actionPlan.unshift("SECURITY: Address critical security vulnerabilities before release");
    }
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Manager Agent",
      reviewLevel: "Executive"
    },
    executiveSummary: {
      verdict: decision,
      riskLevel,
      passRate,
      totalTestCases: totalCases,
      executed: totalExecuted,
      passed: passed.length,
      failed: failures.length,
      skipped: skipped.length,
      profile: requirements.metadata.profile,
      ottUrl: requirements.metadata.ottUrl
    },
    optionalAgentSummaries,
    traceabilityMatrix: traceability,
    coverageByFeature: byFeature,
    analysis: {
      rootCauses,
      highImpactFailures: failures.slice(0, 10).map((f) => ({ id: f.id, title: f.title, reason: f.error })),
      skippedReasons: [...new Set(skipped.map((s) => s.error).filter(Boolean))]
    },
    actionPlan,
    signOff: {
      recommendation: decision === "Go" ? "Release readiness accepted from automation perspective." : decision === "Conditional Go" ? "Proceed with caution; address failing tests before release." : "Do not release until critical failures are resolved.",
      nextSteps: actionPlan.slice(0, 3)
    }
  };
}

function generateDeliveryReport(requirements, managerReport, executionReport) {
  const es = managerReport.executiveSummary || {};
  const exec = executionReport || {};
  const totals = exec.totals || {};
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "Delivery Manager Agent",
      role: "Final delivery review for stakeholder"
    },
    deliverySummary: {
      projectOrRun: requirements.metadata.ottUrl || "N/A",
      verdict: es.verdict || "N/A",
      riskLevel: es.riskLevel || "N/A",
      passRate: totals.passRate || "0%",
      totalExecuted: totals.total || 0,
      passed: totals.passed || 0,
      failed: totals.failed || 0,
      skipped: totals.skipped || 0
    },
    forStakeholder: {
      headline: totals.failed === 0 ? "All automated checks passed." : `${totals.failed} check(s) failed; review required.`,
      recommendation: es.verdict === "Go" ? "Ready for release from QA automation perspective." : es.verdict === "Conditional Go" ? "Proceed with caution; address failures before release." : "Do not release until critical failures are fixed.",
      nextSteps: (managerReport.actionPlan || []).slice(0, 5)
    },
    managerSignOff: managerReport.signOff || null
  };
}

async function processRun(id) {
  const run = await getRun(id);
  if (!run) return;

  try {
    run.status = "running";
    await persistRun(run);

    // Optional: Web Analyzer Agent (runs when no test document provided)
    if (run.stages.webAnalyzer) {
      setStage(run, "webAnalyzer", "running");
      run.artifacts.webAnalysis = await generateWebAnalysis(run);
      setStage(run, "webAnalyzer", "done");
      await persistRun(run);
    }

    setStage(run, "ba", "running");
    // If web analysis was run, enhance requirements with its insights
    if (run.artifacts.webAnalysis && run.artifacts.webAnalysis.baInsights) {
      run.input._webAnalysisInsights = run.artifacts.webAnalysis.baInsights;
      run.input._suggestedRequirements = run.artifacts.webAnalysis.suggestedRequirements;
      run.input._suggestedTestAreas = run.artifacts.webAnalysis.suggestedTestAreas;
      run.input._brdDocument = run.artifacts.webAnalysis.brdDocument;
      run.input._autoGeneratedTestCases = run.artifacts.webAnalysis.autoGeneratedTestCases;
      run.input._userFlows = run.artifacts.webAnalysis.userFlows;
      run.input._allElements = run.artifacts.webAnalysis.allElements;
      run.input._observations = run.artifacts.webAnalysis.observations;
    }
    run.artifacts.requirements = consolidateRequirements(run.input);
    run.input.tcFileBuffer = null;
    setStage(run, "ba", "done");
    await persistRun(run);

    setStage(run, "manualQa", "running");
    if (run.input.executionMode === "uploaded_tc_only") {
      // CSV file was uploaded
      run.artifacts.manualTestCases = generateCasesFromUploadedOnly(run.artifacts.requirements);
    } else if (run.input.executionMode === "manual_tc_only" && run.input.manualTestCases && run.input.manualTestCases.length > 0) {
      // Manual test cases were entered in the UI
      run.artifacts.manualTestCases = generateCasesFromManualInput(run.input.manualTestCases, run.artifacts.requirements);
    } else if (run.artifacts.webAnalysis && run.artifacts.webAnalysis.autoGeneratedTestCases && run.artifacts.webAnalysis.autoGeneratedTestCases.length > 0) {
      // Use auto-generated test cases from URL Analyzer when no CSV/manual is provided
      run.artifacts.manualTestCases = generateCasesFromUrlAnalysis(run.artifacts.webAnalysis, run.artifacts.requirements);
    } else {
      run.artifacts.manualTestCases = generateManualCases(run.artifacts.requirements);
    }
    setStage(run, "manualQa", "done");
    await persistRun(run);

    setStage(run, "automationQa", "running");
    run.artifacts.automationBundle = await generateAutomationBundle(run.input, run.artifacts.manualTestCases, run.artifacts.requirements);
    setStage(run, "automationQa", "done");
    await persistRun(run);

    setStage(run, "execution", "running");
    run.artifacts.executionReport = await generateExecutionReport(run, false);
    setStage(run, "execution", "done");
    await persistRun(run);

    // Optional: Accessibility Agent
    if (run.input.enableAccessibility && run.stages.accessibility) {
      setStage(run, "accessibility", "running");
      run.artifacts.accessibilityReport = await generateAccessibilityReport(run);
      setStage(run, "accessibility", "done");
      await persistRun(run);
    }

    // Optional: Performance Agent
    if (run.input.enablePerformance && run.stages.performance) {
      setStage(run, "performance", "running");
      run.artifacts.performanceReport = await generatePerformanceReport(run);
      setStage(run, "performance", "done");
      await persistRun(run);
    }

    // Optional: Security Agent
    if (run.input.enableSecurity && run.stages.security) {
      setStage(run, "security", "running");
      run.artifacts.securityReport = await generateSecurityReport(run);
      setStage(run, "security", "done");
      await persistRun(run);
    }

    setStage(run, "manager", "running");
    run.artifacts.managerReport = generateManagerReport(
      run.artifacts.requirements,
      run.artifacts.manualTestCases,
      run.artifacts.automationBundle,
      run.artifacts.executionReport,
      run.artifacts.accessibilityReport,
      run.artifacts.performanceReport,
      run.artifacts.securityReport
    );
    setStage(run, "manager", "done");
    await persistRun(run);

    setStage(run, "delivery", "running");
    run.artifacts.deliveryReport = generateDeliveryReport(
      run.artifacts.requirements,
      run.artifacts.managerReport,
      run.artifacts.executionReport
    );
    setStage(run, "delivery", "done");

    if (dbEnabled && dbPool && run.input.projectId && run.artifacts.manualTestCases && run.artifacts.automationBundle) {
      const selectors = run.artifacts.automationBundle.selectorCandidates || {};
      const locatorsByKey = Object.fromEntries(Object.entries(selectors).map(([k, v]) => [k, (v || []).map((s) => ({ selectorValue: s, selectorType: "css" }))]));
      const tcs = run.artifacts.manualTestCases.testCases || [];
      for (const tc of tcs.slice(0, 50)) {
        const javaContent = javaSeleniumBuilder.buildSeleniumJavaTest(tc, locatorsByKey, run.input.ottUrl);
        await dbHelpers.insertStoredScript(dbPool, { projectId: run.input.projectId, tcId: tc.id, language: "java", framework: "selenium", contentText: javaContent }).catch(() => { });
      }
    }

    run.status = "completed";
    run.updatedAt = new Date().toISOString();
    await persistRun(run);
    await persistAssets(run);
  } catch (error) {
    run.status = "failed";
    run.error = error.message;
    for (const key of stageKeys) {
      if (run.stages[key].status === "running") {
        setStage(run, key, "failed");
        break;
      }
    }
    await persistRun(run);
  }
}

// --- Recording session API (CORS allowed for bookmarklet from OTT page) ---
app.post("/api/recordings/start", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.json(), (req, res) => {
  const ottUrl = String(req.body?.ottUrl || "").trim() || null;
  const sessionId = `rec-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  recordingSessions.set(sessionId, { ottUrl, events: [], createdAt: new Date().toISOString() });
  return res.json({ sessionId, ottUrl });
});
app.post("/api/recordings/events", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.json(), (req, res) => {
  const sessionId = String(req.body?.sessionId || "").trim();
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  const session = recordingSessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  session.events.push(...events);
  return res.json({ ok: true, count: session.events.length });
});
app.post("/api/recordings/end", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.json(), (req, res) => {
  const sessionId = String(req.body?.sessionId || "").trim();
  const session = recordingSessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  recordingSessions.delete(sessionId);
  const recordingId = `recording-${++recordingIdCounter}-${Date.now()}`;
  const recording = { id: recordingId, ottUrl: session.ottUrl, events: session.events, createdAt: session.createdAt };
  recordingsById.set(recordingId, recording);
  endedSessionToRecordingId.set(sessionId, recordingId);
  return res.json({ recordingId, recording });
});
app.get("/api/recordings/check/:sessionId", (req, res) => {
  const recordingId = endedSessionToRecordingId.get(req.params.sessionId);
  if (!recordingId) return res.json({ ended: false });
  return res.json({ ended: true, recordingId });
});
app.get("/api/recordings/:id", (req, res) => {
  const rec = recordingsById.get(req.params.id);
  if (!rec) return res.status(404).json({ error: "Recording not found" });
  return res.json(rec);
});

function getApiBase(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req && req.get ? req.get("host") : null;
  const protocol = req && req.protocol ? req.protocol : "http";
  return host ? protocol + "://" + host : "http://localhost:" + PORT;
}
app.get("/recorder.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Access-Control-Allow-Origin", "*");
  const sessionId = String(req.query.sessionId || "").replace(/[^a-zA-Z0-9-]/g, "");
  const base = getApiBase(req);
  const script = `
(function(){
  var SESSION_ID = "${sessionId}";
  var API_BASE = "${base}";
  var events = [];
  function send(ev) { events.push(ev); }
  function post(path, body) {
    return fetch(API_BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  document.addEventListener("click", function(e) {
    var t = e.target;
    var sel = t.id ? "#" + t.id : (t.className && typeof t.className === "string" ? "." + t.className.split(" ")[0] : t.tagName);
    send({ type: "click", selector: sel, tagName: t.tagName, text: (t.textContent || "").slice(0, 80), url: location.href, ts: Date.now() });
  }, true);
  document.addEventListener("change", function(e) {
    var t = e.target;
    send({ type: "change", selector: t.name ? "[name=" + t.name + "]" : t.tagName, tagName: t.tagName, value: (t.value || "").slice(0, 200), url: location.href, ts: Date.now() });
  }, true);
  var startUrl = location.href;
  var stopBtn = document.createElement("button");
  stopBtn.textContent = "Stop ZER0 recording";
  stopBtn.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:999999;padding:10px 14px;background:#2ea043;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
  stopBtn.onclick = function() {
    post("/api/recordings/events", { sessionId: SESSION_ID, events: events }).then(function() {
      return post("/api/recordings/end", { sessionId: SESSION_ID });
    }).then(function(r) { return r.json(); }).then(function(d) {
      stopBtn.textContent = "Saved: " + (d.recordingId || "").slice(0, 20);
      if (window.opener) window.opener.postMessage({ type: "recording-saved", recordingId: d.recordingId }, "*");
    }).catch(function() { stopBtn.textContent = "Error saving"; });
  };
  document.body.appendChild(stopBtn);
})();
`;
  res.send(script);
});
const RECORD_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ZERO – Record session</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:1.25rem;max-width:520px;margin:0 auto;}h1{font-size:1.25rem;}p{color:#94a3b8;font-size:0.9rem;}.step{margin:1rem 0;padding:0.75rem;background:#1e293b;border-radius:8px;}a{color:#2ea043;}.bookmarklet{display:inline-block;padding:0.5rem 1rem;background:#2ea043;color:#fff;text-decoration:none;border-radius:6px;margin-top:0.5rem;}.status{margin-top:1rem;padding:0.75rem;border-radius:8px;}.status.waiting{background:#1e293b;color:#94a3b8;}.status.done{background:#14532d;color:#86efac;}</style></head>
<body>
<h1>Record session</h1>
<p>Record your actions on the OTT app so requirements and locators can be improved.</p>
<div class="step"><strong>1.</strong> Open your OTT app in a new tab: <a id="ottLink" href="#" target="_blank" rel="noopener">Open OTT URL</a></div>
<div class="step"><strong>2.</strong> Drag this link to your bookmarks bar, then on the <strong>OTT page</strong> click the bookmark: <a id="bookmarklet" class="bookmarklet" href="#">Start ZER0 recorder</a></div>
<div class="step"><strong>3.</strong> Use the app. A green <strong>Stop ZER0 recording</strong> button will appear at the bottom-right of the OTT page.</div>
<div class="step"><strong>4.</strong> When done, click <strong>Stop ZER0 recording</strong> on the OTT page, then return here.</div>
<div id="status" class="status waiting">Waiting for recording to be saved…</div>
<script>
(function(){
var params=new URLSearchParams(location.search);
var sessionId=params.get("sessionId")||"";
var ottUrl=params.get("ottUrl")||"";
var ottLink=document.getElementById("ottLink");
var bookmarklet=document.getElementById("bookmarklet");
var statusEl=document.getElementById("status");
if(ottUrl) ottLink.href=ottUrl;
ottLink.textContent=ottUrl||"Set ottUrl in the Run form";
var origin=location.origin;
bookmarklet.href="javascript:(function(){var d=document,s=d.createElement('script');s.src='"+origin+"/recorder.js?sessionId="+encodeURIComponent(sessionId)+"';d.body.appendChild(s);})();";
if(!sessionId){statusEl.textContent="No session ID. Start recording from the Run form.";return;}
var poll=setInterval(function(){
fetch("/api/recordings/check/"+encodeURIComponent(sessionId)).then(function(r){return r.json();}).then(function(d){
if(d.ended&&d.recordingId){clearInterval(poll);statusEl.className="status done";statusEl.textContent="Recording saved. You can close this tab and run the pipeline with this recording.";if(window.opener)window.opener.postMessage({type:"recording-saved",recordingId:d.recordingId},"*");}
}).catch(function(){});
},2000);
})();
</script>
</body>
</html>`;

app.get("/record", (req, res) => {
  const recordPath = path.join(__dirname, "public", "record.html");
  fs.access(recordPath).then(() => {
    res.sendFile(recordPath);
  }).catch(() => {
    res.type("html").send(RECORD_PAGE_HTML);
  });
});

app.post("/api/runs", upload.fields([{ name: "tcFile", maxCount: 1 }, { name: "recordingFile", maxCount: 1 }]), async (req, res) => {
  try {
    const ottUrl = String(req.body.ottUrl || "").trim();
    const figmaUrl = String(req.body.figmaUrl || "").trim();
    const assertions = String(req.body.assertions || "").trim();
    const notes = String(req.body.notes || "").trim();
    const loginUsername = String(req.body.loginUsername || "").trim();
    const loginPassword = String(req.body.loginPassword || "").trim();
    const channelProfile = String(req.body.channelProfile || "").trim().toLowerCase();
    const recordingSessionId = String(req.body.recordingSessionId || "").trim() || null;
    const recordingId = String(req.body.recordingId || "").trim() || null;
    
    // Manual test cases from UI
    const manualTestCasesRaw = String(req.body.manualTestCases || "").trim();
    const testCaseInputMode = String(req.body.testCaseInputMode || "").trim() || "auto";
    let manualTestCases = [];
    if (manualTestCasesRaw) {
      try {
        manualTestCases = JSON.parse(manualTestCasesRaw);
      } catch (_) { manualTestCases = []; }
    }

    const tcFile = req.files && req.files.tcFile ? req.files.tcFile[0] : null;
    const recordingFile = req.files && req.files.recordingFile ? req.files.recordingFile[0] : null;
    const tcExt = tcFile ? path.extname(tcFile.originalname).toLowerCase() : "";
    
    // Determine execution mode based on input
    const hasCsv = tcFile && tcExt === ".csv";
    const hasManualCases = manualTestCases.length > 0 && manualTestCases.some(tc => tc.feature || tc.scenario);
    
    let executionMode = "standard";
    if (hasCsv) {
      executionMode = "uploaded_tc_only";
    } else if (hasManualCases) {
      executionMode = "manual_tc_only";
    } else if (testCaseInputMode === "auto") {
      executionMode = "url_analysis_auto";
    }

    if (!ottUrl) return res.status(400).json({ error: "OTT URL is required" });
    
    // Allow running with just URL in auto mode (URL Analyzer will generate test cases)
    const canRunWithAutoGeneration = testCaseInputMode === "auto" || executionMode === "url_analysis_auto";
    if (!figmaUrl && !tcFile && !hasManualCases && !notes && !canRunWithAutoGeneration) {
      return res.status(400).json({ error: "Upload a CSV, enter manual test cases, or use URL Analyzer auto-generation" });
    }
    if (hasCsv) {
      // CSV is primary: run only uploaded test cases, no built-in manual TC
    }

    let recording = null;
    if (recordingSessionId) {
      const session = recordingSessions.get(recordingSessionId);
      if (session) {
        recording = { ottUrl: session.ottUrl, events: session.events, createdAt: session.createdAt, source: "session" };
        recordingSessions.delete(recordingSessionId);
      }
    }
    if (!recording && recordingId && recordingsById.has(recordingId)) {
      const rec = recordingsById.get(recordingId);
      recording = { id: rec.id, ottUrl: rec.ottUrl, events: rec.events, createdAt: rec.createdAt, source: "id" };
    }
    if (!recording && recordingFile) {
      try {
        const raw = recordingFile.buffer.toString("utf8");
        recording = JSON.parse(raw);
        recording.source = "upload";
      } catch (_) {
        // ignore invalid JSON
      }
    }

    const projectId = String(req.body.projectId || "").trim() || null;
    const runHeaded = req.body.runHeaded === "true" || req.body.runHeaded === "on" || process.env.RUN_HEADED === "true";
    const enableAccessibility = req.body.enableAccessibility === "true" || req.body.enableAccessibility === "on";
    const enablePerformance = req.body.enablePerformance === "true" || req.body.enablePerformance === "on";
    const input = {
      ottUrl,
      figmaUrl: figmaUrl || null,
      assertions,
      notes,
      channelProfile: channelProfile || null,
      executionMode,
      testCaseInputMode,
      manualTestCases: hasManualCases ? manualTestCases : null,
      projectId,
      runHeaded,
      enableAccessibility,
      enablePerformance,
      recording,
      login: {
        enabled: Boolean(loginUsername || loginPassword),
        usernameMasked: maskLogin(loginUsername)
      },
      tcFileName: tcFile ? tcFile.originalname : null,
      tcFileContent: tcFile ? tcFile.buffer.toString("utf8") : null,
      tcFileBuffer: tcFile ? tcFile.buffer : null
    };

    const run = createRun(input);
    await fs.mkdir(run.runDir, { recursive: true });
    if (tcFile) {
      await fs.writeFile(path.join(run.runDir, tcFile.originalname), tcFile.buffer);
    }
    if (recording) {
      run.artifacts.recording = recording;
    }
    setRunSecret(run.id, { username: loginUsername, password: loginPassword });

    await persistRun(run).catch(e => console.error("Initial run persistence failed:", e));

    // Fire and forget
    setTimeout(() => processRun(run.id).catch(e => console.error("Background processRun failed:", e)), 0);
    
    return res.status(202).json({ runId: run.id });
  } catch (err) {
    console.error("CRITICAL ENDPOINT FAILURE:", err);
    return res.status(500).json({ 
      error: err.message || "Internal runtime error starting pipeline",
      stack: process.env.NODE_ENV === "development" || process.env.VERCEL ? err.stack : undefined,
      diagnostics: {
        hasFiles: !!req.files,
        hasBody: !!req.body,
        dbEnabled
      }
    });
  }
});

app.get("/api/runs", async (_req, res) => {
  try {
    const files = await fs.readdir(artifactsRoot);
    const loadedRuns = [];
    for (const file of files) {
      const runPath = path.join(artifactsRoot, file, "run.json");
      try {
        const data = await fs.readFile(runPath, "utf8");
        const run = JSON.parse(data);
        loadedRuns.push(run);
      } catch (_) {
        // ignore files/folders that don't contain a valid run.json
      }
    }
    // Sort by createdAt descending
    loadedRuns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ source: "file", runs: loadedRuns.slice(0, 20) });
  } catch (e) {
    return res.json({ source: "memory", runs: Array.from(runs.values()).slice(-20).reverse() });
  }
});

app.get("/api/runs/:id", async (req, res) => {
  const run = await getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  return res.json(run);
});

app.post("/api/runs/:id/rerun-failed", async (req, res) => {
  const run = await getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  if (run.status === "running") return res.status(409).json({ error: "Run is already in progress" });

  try {
    run.status = "running";
    setStage(run, "execution", "running");
    run.artifacts.executionReport = await generateExecutionReport(run, true);
    setStage(run, "execution", "done");
    await persistRun(run);

    setStage(run, "manager", "running");
    run.artifacts.managerReport = generateManagerReport(
      run.artifacts.requirements,
      run.artifacts.manualTestCases,
      run.artifacts.automationBundle,
      run.artifacts.executionReport
    );
    setStage(run, "manager", "done");

    run.status = "completed";
    run.updatedAt = new Date().toISOString();
    await persistRun(run);
    await persistAssets(run);
    return res.json({ ok: true, runId: run.id });
  } catch (error) {
    run.status = "failed";
    setStage(run, "execution", "failed");
    await persistRun(run);
    return res.status(500).json({ error: error.message });
  }
});

function ensurePdfSpace(doc, minHeight = 80) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - minHeight) {
    doc.addPage();
  }
}

function statusColor(status) {
  if (status === "passed") return "#118d57";
  if (status === "failed") return "#d7263d";
  return "#4d5d78";
}

async function screenshotPathFromRef(run, ref) {
  if (!ref || typeof ref !== "string") return null;
  const fileName = path.basename(ref);
  const abs = path.join(run.runDir, fileName);
  try {
    await fs.access(abs);
    return abs;
  } catch {
    return null;
  }
}

async function sendPdfReport(run, res) {
  const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
  const fileName = `run-${run.id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  doc.pipe(res);

  const exec = run.artifacts.executionReport || { totals: {}, tests: [] };
  const manager = run.artifacts.managerReport || {};
  const manualCases = (run.artifacts.manualTestCases && run.artifacts.manualTestCases.testCases) || [];
  const tests = exec.tests || [];

  const orderedTests = [...tests].sort((a, b) => {
    if (a.status === b.status) return 0;
    if (a.status === "failed") return -1;
    if (b.status === "failed") return 1;
    return 0;
  });

  doc.fillColor("#0f172a").fontSize(24).text("ZER0 QA Report", { align: "left" });
  doc.moveDown(0.3);
  doc.fillColor("#334155").fontSize(10)
    .text(`Run ID: ${run.id}`)
    .text(`Generated: ${new Date().toISOString()}`)
    .text(`OTT URL: ${run.input.ottUrl || "N/A"}`)
    .text(`Profile: ${(run.artifacts.requirements && run.artifacts.requirements.metadata && run.artifacts.requirements.metadata.profile) || "N/A"}`);

  doc.moveDown(0.8);
  doc.fillColor("#0f172a").fontSize(14).text("Execution Summary");
  doc.moveDown(0.2);
  doc.fontSize(11).fillColor("#1e293b")
    .text(`Total Checks: ${exec.totals.total || 0}`)
    .text(`Passed: ${exec.totals.passed || 0}`)
    .text(`Failed: ${exec.totals.failed || 0}`)
    .text(`Pass Rate: ${exec.totals.passRate || "0%"}`);

  doc.moveDown(0.8);
  doc.fillColor("#0f172a").fontSize(14).text("Test Case Coverage");
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#1e293b")
    .text(`Manual Test Cases Planned: ${manualCases.length}`)
    .text(`Automation Checks Executed: ${tests.length}`)
    .text("Execution table below contains definitive pass/fail outcomes for all executed checks.");

  doc.moveDown(0.8);
  doc.fillColor("#0f172a").fontSize(14).text("Execution Result Table");
  doc.moveDown(0.3);

  const left = doc.page.margins.left;
  const top = doc.y;
  const widths = { id: 120, title: 330, status: 90, duration: 90, retries: 70 };

  function drawRow(y, cells, header = false) {
    const bg = header ? "#e2e8f0" : "#f8fafc";
    doc.save();
    doc.rect(left, y - 2, widths.id + widths.title + widths.status + widths.duration + widths.retries, 22).fill(bg);
    doc.restore();
    doc.fillColor("#0f172a").fontSize(9);
    doc.text(cells.id, left + 6, y + 4, { width: widths.id - 10, ellipsis: true });
    doc.text(cells.title, left + widths.id + 6, y + 4, { width: widths.title - 10, ellipsis: true });
    doc.fillColor(header ? "#0f172a" : statusColor(cells.statusRaw));
    doc.text(cells.status, left + widths.id + widths.title + 6, y + 4, { width: widths.status - 10 });
    doc.fillColor("#0f172a");
    doc.text(cells.duration, left + widths.id + widths.title + widths.status + 6, y + 4, { width: widths.duration - 10 });
    doc.text(cells.retries, left + widths.id + widths.title + widths.status + widths.duration + 6, y + 4, { width: widths.retries - 10 });
  }

  drawRow(top, {
    id: "Test ID",
    title: "Title",
    status: "Status",
    statusRaw: "header",
    duration: "Duration",
    retries: "Retries"
  }, true);

  let rowY = top + 24;
  orderedTests.forEach((t) => {
    ensurePdfSpace(doc, 80);
    if (rowY > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
      rowY = doc.page.margins.top;
      drawRow(rowY, {
        id: "Test ID",
        title: "Title",
        status: "Status",
        statusRaw: "header",
        duration: "Duration",
        retries: "Retries"
      }, true);
      rowY += 24;
    }
    drawRow(rowY, {
      id: t.id || "N/A",
      title: t.title || "Untitled",
      status: String(t.status || "unknown").toUpperCase(),
      statusRaw: t.status || "unknown",
      duration: `${t.durationMs || 0} ms`,
      retries: String(t.retries || 0)
    }, false);
    rowY += 24;
  });

  const failed = orderedTests.filter((t) => t.status === "failed");
  if (failed.length) {
    doc.moveDown(1);
    doc.fillColor("#991b1b").fontSize(11).text("Failure Details:");
    failed.slice(0, 12).forEach((t) => {
      ensurePdfSpace(doc, 50);
      doc.fillColor("#0f172a").fontSize(10).text(`${t.id}: ${t.title}`);
      doc.fillColor("#991b1b").fontSize(9).text(String(t.error || "No error captured").slice(0, 350));
    });
  }

  doc.addPage();
  doc.fillColor("#0f172a").fontSize(14).text("Screenshot Evidence");
  doc.moveDown(0.2);
  doc.fillColor("#334155").fontSize(9).text("Failed screenshots are shown first for easier triage.");
  doc.moveDown(0.3);
  let attached = 0;
  for (let i = 0; i < orderedTests.length; i += 1) {
    const t = orderedTests[i];
    const imgPath = await screenshotPathFromRef(run, t.screenshot);
    if (!imgPath) continue;
    doc.addPage();
    doc.fontSize(12).fillColor("#0f172a").text(`${t.id} - ${(t.status || "unknown").toUpperCase()} - ${t.title || ""}`);
    doc.moveDown(0.3);
    try {
      doc.image(imgPath, {
        fit: [760, 470],
        align: "center"
      });
      doc.moveDown(0.3);
      doc.fillColor("#334155").fontSize(9).text(`Image: ${path.basename(imgPath)}`);
      attached += 1;
    } catch {
      doc.fillColor("#b91c1c").fontSize(9).text("Failed to attach screenshot image.");
    }
  }
  if (!attached) {
    doc.fillColor("#475569").fontSize(10).text("No screenshots available for this run.");
  }

  doc.addPage();
  doc.fillColor("#0f172a").fontSize(14).text("Manager Review");
  doc.moveDown(0.3);
  const decision = manager.executiveSummary ? manager.executiveSummary.qualityDecision : "N/A";
  doc.fillColor("#1e293b").fontSize(11).text(`Release Decision: ${decision}`);
  const rootCauses = (manager.analysis && manager.analysis.majorRootCauses) || [];
  if (rootCauses.length) {
    doc.moveDown(0.3);
    doc.fillColor("#0f172a").fontSize(11).text("Top Root Causes:");
    rootCauses.slice(0, 8).forEach((cause) => {
      doc.fillColor("#334155").fontSize(10).text(`- ${cause}`);
    });
  }

  const actions = manager.actionPlan || [];
  if (actions.length) {
    doc.moveDown(0.4);
    doc.fillColor("#0f172a").fontSize(11).text("Action Plan:");
    actions.slice(0, 8).forEach((action) => {
      doc.fillColor("#334155").fontSize(10).text(`- ${action}`);
    });
  }

  doc.end();
}

app.get("/api/runs/:id/download", async (req, res) => {
  const run = await getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  if (run.status !== "completed") return res.status(409).json({ error: "Run is not completed yet" });

  if (String(req.query.format || "pdf").toLowerCase() !== "json") {
    await sendPdfReport(run, res);
    return;
  }

  const payload = {
    id: run.id,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    input: run.input,
    artifacts: run.artifacts
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename=run-${run.id}.json`);
  return res.send(JSON.stringify(payload, null, 2));
});

app.get("/api/runs/:id/assets", async (req, res) => {
  const run = await getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  if (!dbEnabled || !dbPool) {
    return res.json({
      source: "memory",
      assets: [
        {
          assetType: "manual_test_cases",
          assetName: "manual_test_cases.json",
          content: run.artifacts.manualTestCases
        },
        {
          assetType: "automation_script",
          assetName: "generated.spec.ts",
          content: run.artifacts.automationBundle ? run.artifacts.automationBundle.generatedPlaywrightScript : null
        }
      ]
    });
  }

  const rows = await dbPool.query(
    "SELECT asset_type, asset_name, content_text, created_at FROM qa_assets WHERE run_id = $1 ORDER BY id ASC",
    [run.id]
  );
  return res.json({
    source: "postgres",
    assets: rows.rows.map((row) => ({
      assetType: row.asset_type,
      assetName: row.asset_name,
      content: row.content_text,
      createdAt: row.created_at
    }))
  });
});

app.post("/api/element-log", async (req, res) => {
  if (!dbEnabled || !dbPool) {
    return res.status(503).json({ error: "PostgreSQL required for element logging. Set DATABASE_URL or PGHOST." });
  }
  try {
    const payload = req.body || {};
    const runId = payload.runId || null;
    const result = await elementLogger.processElementLog(dbPool, payload, runId);
    if (!result.ok) return res.status(400).json(result);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/* ─── Provider API Keys ──────────────────────────────────── */
const ALLOWED_PROVIDERS = ["claude", "openai", "gemini"];

function getUserEmail(req) {
  const h = req.get("X-User-Email") || req.get("x-user-email");
  return (h && String(h).trim().toLowerCase()) || "default@local";
}

app.get("/api/provider-keys", async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    let rows = [];

    if (dbEnabled && dbPool) {
      rows = await dbHelpers.listProviderKeys(dbPool, userEmail);
    } else {
      // Fallback memory lookup
      rows = ALLOWED_PROVIDERS.map(provider => memoryProviderKeys.get(`${userEmail}:${provider}`))
        .filter(Boolean);
    }

    const byProvider = {};
    for (const r of rows) byProvider[r.provider] = r;

    const items = ALLOWED_PROVIDERS.map(provider => {
      const r = byProvider[provider];
      return {
        provider,
        configured: !!r,
        last4: r?.last_4 || null,
        masked: r?.last_4 ? `••••••••••••${r.last_4}` : null,
        createdAt: r?.created_at || null,
        updatedAt: r?.updated_at || null,
        lastUsedAt: r?.last_used_at || null
      };
    });
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/api/provider-keys/:provider", async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `Unknown provider. Use one of: ${ALLOWED_PROVIDERS.join(", ")}` });
  }
  const key = (req.body?.key || "").toString().trim();
  if (!key) return res.status(400).json({ error: "Field 'key' is required." });

  try {
    const userEmail = getUserEmail(req);
    const encryptedKey = encryption.encrypt(key);
    const last4 = encryption.lastFour(key);

    if (dbEnabled && dbPool) {
      await dbHelpers.upsertProviderKey(dbPool, { userEmail, provider, encryptedKey, last4 });
    } else {
      const compositeKey = `${userEmail}:${provider}`;
      const existing = memoryProviderKeys.get(compositeKey);
      memoryProviderKeys.set(compositeKey, {
        provider,
        encrypted_key: encryptedKey,
        last_4: last4,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return res.json({ ok: true, provider, masked: `••••••••••••${last4}`, last4 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/provider-keys/:provider", async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: "Unknown provider." });
  }
  try {
    const userEmail = getUserEmail(req);
    if (dbEnabled && dbPool) {
      await dbHelpers.deleteProviderKey(dbPool, userEmail, provider);
    } else {
      memoryProviderKeys.delete(`${userEmail}:${provider}`);
    }
    return res.json({ ok: true, provider });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/* ─── Agent Settings (model + prompt per LLM-driven agent) ── */
const ALLOWED_AGENTS = ["ba", "manualQa", "automationQa", "manager"];

app.get("/api/agent-settings", async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    let rows = [];

    if (dbEnabled && dbPool) {
      rows = await dbHelpers.listAgentSettings(dbPool, userEmail);
    } else {
      rows = ALLOWED_AGENTS.map(agent => memoryAgentSettings.get(`${userEmail}:${agent}`))
        .filter(Boolean);
    }

    const byAgent = {};
    for (const r of rows) byAgent[r.agent] = r;

    const items = ALLOWED_AGENTS.map(agent => ({
      agent,
      provider: byAgent[agent]?.provider || null,
      model: byAgent[agent]?.model || null,
      prompt: byAgent[agent]?.prompt || null,
      updatedAt: byAgent[agent]?.updated_at || null
    }));
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/api/agent-settings/:agent", async (req, res) => {
  const agent = String(req.params.agent || "");
  if (!ALLOWED_AGENTS.includes(agent)) {
    return res.status(400).json({ error: `Unknown agent. Use one of: ${ALLOWED_AGENTS.join(", ")}` });
  }
  const { provider, model, prompt } = req.body || {};
  if (provider && !ALLOWED_PROVIDERS.includes(String(provider).toLowerCase())) {
    return res.status(400).json({ error: "Unknown provider for agent." });
  }

  try {
    const userEmail = getUserEmail(req);
    const normalizedProvider = provider ? String(provider).toLowerCase() : null;

    if (dbEnabled && dbPool) {
      await dbHelpers.upsertAgentSettings(dbPool, {
        userEmail,
        agent,
        provider: normalizedProvider,
        model: model || null,
        prompt: prompt || null
      });
    } else {
      memoryAgentSettings.set(`${userEmail}:${agent}`, {
        agent,
        provider: normalizedProvider,
        model: model || null,
        prompt: prompt || null,
        updated_at: new Date().toISOString()
      });
    }

    return res.json({ ok: true, agent });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/locators", async (req, res) => {
  const host = String(req.query.host || "").trim().toLowerCase();
  if (!host) return res.status(400).json({ error: "Query 'host' is required (e.g. ?host=app.example.com)" });
  if (!dbEnabled || !dbPool) {
    return res.json({ source: "memory", host, locators: {} });
  }
  try {
    const locators = await dbHelpers.getLocatorsByHost(dbPool, host);
    return res.json({ source: "postgres", host, locators });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const cmsCaptureDir = path.join(artifactsRoot, "cms-captures");

function stationSlugFromCmsUrl(url) {
  const m = String(url).match(/\/gm\/([^/]+)\//i);
  return m ? m[1].toLowerCase().replace(/[^a-z0-9-_]/g, "_") : "station";
}

/** After load: switch to Stream tab (signal view), not Playout. */
async function cmsSwitchToStreamTab(page) {
  await page.waitForTimeout(1200);
  const streamTab = page.getByRole("tab", { name: /^Stream$/i }).first();
  try {
    await streamTab.waitFor({ state: "visible", timeout: 12000 });
    await streamTab.click({ timeout: 8000 });
    await page.waitForTimeout(2000);
    return true;
  } catch {
    try {
      await page.locator('[role="tab"]').filter({ hasText: /^Stream$/i }).first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      return true;
    } catch {
      try {
        await page.locator("button, a, div").filter({ hasText: /^Stream$/ }).first().click({ timeout: 4000 });
        await page.waitForTimeout(2000);
        return true;
      } catch {
        return false;
      }
    }
  }
}

async function cmsCaptureSignalPage(page, url, waitMs, useStreamTab) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => { });
  if (useStreamTab !== false) {
    await cmsSwitchToStreamTab(page);
  }
  await page.waitForTimeout(Math.min(45000, Math.max(2000, waitMs)));
  await page.getByText("Quick Actions", { exact: false }).first().waitFor({ state: "visible", timeout: 15000 }).catch(() => { });
}

/** Standalone CMS screenshot (single URL). streamTab true = Stream (signal), false = current view e.g. Playout. */
app.post("/api/capture-cms-screenshot", express.json({ limit: "32kb" }), async (req, res) => {
  const url = String(req.body?.url || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Provide a valid http(s) URL (e.g. Gray CMS LiveOps playout page)." });
  }
  const stationLabel = String(req.body?.stationLabel || stationSlugFromCmsUrl(url) || "cms")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 48) || "cms";
  const waitMs = Math.min(45000, Math.max(3000, Number(req.body?.waitMs) || 8000));
  const fullPage = req.body?.fullPage !== false;
  const showBrowser = Boolean(req.body?.showBrowser);
  const streamTab = req.body?.streamTab !== false;

  await fs.mkdir(cmsCaptureDir, { recursive: true });
  const tag = streamTab ? "signal-stream" : "playout";
  const fileName = `cms-${tag}-${stationLabel}-${Date.now()}.png`;
  const absPath = path.join(cmsCaptureDir, fileName);
  let browser;
  try {
    browser = await chromium.launch({
      headless: !showBrowser,
      slowMo: showBrowser ? 200 : 0,
      args: showBrowser ? [] : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    await cmsCaptureSignalPage(page, url, waitMs, streamTab);
    await page.screenshot({ path: absPath, fullPage });
    await browser.close();
    browser = null;
    const publicPath = `/artifacts/cms-captures/${fileName}`;
    return res.json({
      ok: true,
      screenshot: publicPath,
      stationLabel,
      streamTab,
      note: streamTab
        ? "Captured with Stream tab (signal view), not Playout."
        : "Captured current view (Playout if that tab was default)."
    });
  } catch (e) {
    if (browser) await browser.close().catch(() => { });
    return res.status(500).json({ error: e.message || "Screenshot failed" });
  }
});

/** Bulk: one signal (Stream) screenshot per station URL — same session across all (login once if Show browser). */
app.post("/api/capture-cms-signal-bulk", express.json({ limit: "1mb" }), async (req, res) => {
  let urls = [];
  if (typeof req.body?.urls === "string") {
    urls = req.body.urls.split(/\r?\n/).map((s) => s.trim()).filter((u) => /^https?:\/\//i.test(u));
  } else if (Array.isArray(req.body?.urls)) {
    urls = req.body.urls.map((u) => String(u).trim()).filter((u) => /^https?:\/\//i.test(u));
  }
  if (!urls.length) {
    return res.status(400).json({ error: "Paste one Gray CMS URL per line (each station’s playout URL)." });
  }
  if (urls.length > 80) {
    return res.status(400).json({ error: "Maximum 80 URLs per batch." });
  }
  const waitMs = Math.min(45000, Math.max(3000, Number(req.body?.waitMs) || 6000));
  const showBrowser = Boolean(req.body?.showBrowser);
  const streamTab = req.body?.streamTab !== false;

  await fs.mkdir(cmsCaptureDir, { recursive: true });
  const results = [];
  let browser;
  try {
    browser = await chromium.launch({
      headless: !showBrowser,
      slowMo: showBrowser ? 150 : 0,
      args: showBrowser ? [] : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const ts = Date.now();
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const slug = stationSlugFromCmsUrl(url);
      const tag = streamTab ? "signal-stream" : "playout";
      const fileName = `cms-${tag}-${slug}-${ts}-${i}.png`;
      const absPath = path.join(cmsCaptureDir, fileName);
      try {
        await cmsCaptureSignalPage(page, url, waitMs, streamTab);
        await page.screenshot({ path: absPath, fullPage: true });
        results.push({
          ok: true,
          url,
          station: slug,
          screenshot: `/artifacts/cms-captures/${fileName}`
        });
      } catch (err) {
        results.push({
          ok: false,
          url,
          station: slug,
          error: err.message || "failed"
        });
      }
    }
    await browser.close();
    browser = null;
    return res.json({
      ok: true,
      count: results.length,
      streamTab,
      results,
      note: streamTab
        ? "Each shot is Stream tab (signal), not Playout. One browser session for all — log in once if Show browser."
        : "Bulk playout/current-tab captures."
    });
  } catch (e) {
    if (browser) await browser.close().catch(() => { });
    return res.status(500).json({ error: e.message || "Bulk capture failed" });
  }
});

// ============== API KEY MANAGEMENT ENDPOINTS ==============

/**
 * @swagger
 * /api/keys:
 *   get:
 *     summary: List all stored API keys
 *     tags: [API Keys]
 *     responses:
 *       200:
 *         description: List of API keys (masked)
 */
app.get("/api/keys", rateLimiters.apiKey, (req, res) => {
  const keys = apiKeyManager.listKeys();
  res.json({ keys });
});

/**
 * @swagger
 * /api/keys:
 *   post:
 *     summary: Store a new API key
 *     tags: [API Keys]
 */
app.post("/api/keys", rateLimiters.apiKey, async (req, res) => {
  const { apiKey, name, provider, ttlHours } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: "apiKey is required" });
  }
  
  const result = apiKeyManager.storeKey(apiKey, { name, provider, ttlHours });
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  
  logger.addAudit("API_KEY_STORED", { keyId: result.keyId, provider: result.provider });
  res.json(result);
});

/**
 * @swagger
 * /api/keys/{keyId}:
 *   delete:
 *     summary: Delete an API key
 *     tags: [API Keys]
 */
app.delete("/api/keys/:keyId", rateLimiters.apiKey, (req, res) => {
  const { keyId } = req.params;
  apiKeyManager.deleteKey(keyId);
  logger.addAudit("API_KEY_DELETED", { keyId });
  res.json({ success: true });
});

/**
 * @swagger
 * /api/keys/{keyId}/test:
 *   post:
 *     summary: Test an API key's validity
 *     tags: [API Keys]
 */
app.post("/api/keys/:keyId/test", rateLimiters.apiKey, async (req, res) => {
  const { keyId } = req.params;
  const apiKey = apiKeyManager.getKey(keyId);
  
  if (!apiKey) {
    return res.status(404).json({ error: "Key not found" });
  }
  
  const result = await apiKeyManager.testKey(apiKey);
  res.json(result);
});

/**
 * @swagger
 * /api/keys/validate:
 *   post:
 *     summary: Validate an API key format without storing
 *     tags: [API Keys]
 */
app.post("/api/keys/validate", rateLimiters.apiKey, (req, res) => {
  const { apiKey } = req.body;
  const result = apiKeyManager.validateKeyFormat(apiKey);
  res.json(result);
});

// ============== HEALTH & SYSTEM ENDPOINTS ==============

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ZER0", storage: dbEnabled ? "postgres+memory" : "memory" });
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check with system metrics
 *     tags: [Health]
 */
app.get("/api/health/detailed", cacheMiddleware(30), (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    ok: true,
    service: "ZER0 QA Orchestrator",
    version: "2.0.0",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    storage: dbEnabled ? "postgres+memory" : "memory",
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB"
    },
    activeRuns: runs.size,
    features: {
      urlAnalyzerPro: true,
      domainDetection: true,
      brdGeneration: true,
      apiKeyManagement: true,
      rateLimiting: true
    }
  });
});

app.use("/assets", (_req, res) => {
  res.status(404).type("text/plain").send("Asset not found");
});

// Error logging middleware
app.use(logger.errorLogger);

// Global error handler
app.use((err, req, res, _next) => {
  logger.error("Unhandled error", { 
    error: err.message, 
    stack: err.stack,
    requestId: req.requestId 
  });
  
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    requestId: req.requestId
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function tryListen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") reject(err);
      else reject(err);
    });
  });
}

// Local/Dedicated environments: start server listener
if (!process.env.VERCEL) {
  fs.mkdir(artifactsRoot, { recursive: true })
    .then(() => fs.mkdir(publicDir, { recursive: true }))
    .then(() => fs.writeFile(path.join(publicDir, "record.html"), RECORD_PAGE_HTML).catch(() => { }))
    .then(async () => {
      let server = null;
      let port = PORT;
      for (let attempt = 0; attempt <= 5; attempt++) {
        try {
          server = await tryListen(port);
          const uiUrl = `http://localhost:${port}`;
          console.log(`ZER0 running. Open the UI at: ${uiUrl}`);
          break;
        } catch (err) {
          if (err.code === "EADDRINUSE" && attempt < 5) {
            port = PORT + attempt + 1;
            console.warn(`Port ${port - 1} in use, trying ${port}...`);
          } else {
            console.error("Startup failed:", err.code === "EADDRINUSE" ? `Port ${port} in use. Stop the other process or set PORT=3001` : err.message);
            process.exit(1);
          }
        }
      }
    }).catch((error) => {
      console.error("Unable to initialize artifacts directory", error);
      process.exit(1);
    });
}

function buildArchitecturePictureSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560" role="img" aria-label="ZER0 Flow">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c111d"/>
      <stop offset="100%" stop-color="#121b2f"/>
    </linearGradient>
    <style>
      .title { font: 700 28px 'Segoe UI', sans-serif; fill: #d9e8ff; }
      .label { font: 600 16px 'Segoe UI', sans-serif; fill: #d8f4ff; }
      .small { font: 500 14px 'Segoe UI', sans-serif; fill: #a5c6d9; }
      .box { fill: #121b2f; stroke: #46d8d2; stroke-width: 2; rx: 14; }
      .line { stroke: #66b9ff; stroke-width: 2.5; marker-end: url(#arrow); }
    </style>
    <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <polygon points="0 0, 10 4, 0 8" fill="#66b9ff"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="1400" height="560" fill="url(#bg)"/>
  <text x="40" y="55" class="title">ZER0 - Architect Flow</text>
  <rect class="box" x="40" y="120" width="220" height="88"/>
  <text x="68" y="155" class="label">User Input</text>
  <text x="68" y="180" class="small">URL + Figma or TC File</text>
  <rect class="box" x="310" y="120" width="220" height="88"/>
  <text x="375" y="155" class="label">BA Agent</text>
  <text x="338" y="180" class="small">Channel Requirements</text>
  <rect class="box" x="580" y="120" width="220" height="88"/>
  <text x="623" y="155" class="label">Manual QA</text>
  <text x="602" y="180" class="small">App-specific TC</text>
  <rect class="box" x="850" y="120" width="230" height="88"/>
  <text x="883" y="155" class="label">Automation QA</text>
  <text x="865" y="180" class="small">Adaptive Locators</text>
  <rect class="box" x="1130" y="120" width="230" height="88"/>
  <text x="1170" y="155" class="label">Execution</text>
  <text x="1145" y="180" class="small">Playwright + Retries</text>
  <rect class="box" x="580" y="290" width="240" height="100"/>
  <text x="618" y="332" class="label">Manager Review</text>
  <text x="620" y="357" class="small">Architect Report</text>
  <line class="line" x1="260" y1="164" x2="310" y2="164"/>
  <line class="line" x1="530" y1="164" x2="580" y2="164"/>
  <line class="line" x1="800" y1="164" x2="850" y2="164"/>
  <line class="line" x1="1080" y1="164" x2="1130" y2="164"/>
  <line class="line" x1="1245" y1="208" x2="820" y2="290"/>
  <rect class="box" x="40" y="430" width="1320" height="90"/>
  <text x="66" y="468" class="label">Artifacts</text>
  <text x="66" y="496" class="small">requirements + manual_tc + automation_bundle + execution + manager_report</text>
</svg>`;
}

// Diagnostic handler to convert unhandled service-level crash stacktraces into friendly UI JSON responses
app.use((err, req, res, next) => {
  console.error("UNHANDLED API ERROR CAPTURED:", err);
  res.status(500).json({
    error: "API execution trace collapsed",
    message: err.message || "Unknown fault",
    diagnostic: err.stack ? err.stack.split("\n")[0] : "Unavailable"
  });
});

module.exports = app;
