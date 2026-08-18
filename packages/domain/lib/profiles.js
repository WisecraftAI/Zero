"use strict";

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

module.exports = { appProfiles };
