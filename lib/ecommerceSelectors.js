/**
 * E-Commerce Domain Selector Registry
 * Universal selector system that works with any e-commerce site
 * Following industry best practices for web automation
 */

// ============================================================================
// UNIVERSAL SELECTORS - Work on ANY website regardless of type
// ============================================================================
const universalSelectors = {
  // Navigation elements (universal)
  navigation: {
    header: [
      'header', '[role="banner"]', '.header', '#header', '[class*="header"]',
      'nav', '[role="navigation"]', '.nav', '#nav', '[class*="nav"]',
      '.navbar', '#navbar', '[class*="navbar"]'
    ],
    mainMenu: [
      'nav a', 'header a', '.nav a', '#nav a',
      '[role="navigation"] a', '[role="menubar"] a', '[role="menu"] a',
      '.menu a', '#menu a', '[class*="menu"] a',
      'ul.nav a', 'ul.menu a'
    ],
    logo: [
      'a[href="/"]', 'a[href="./"]', '.logo', '#logo', '[class*="logo"]',
      'header a:first-child', 'nav a:first-child',
      'img[alt*="logo" i]', '[class*="brand"]'
    ],
    footer: [
      'footer', '[role="contentinfo"]', '.footer', '#footer', '[class*="footer"]'
    ],
    breadcrumb: [
      '[class*="breadcrumb"]', '[aria-label="breadcrumb"]', 'nav[class*="crumb"]',
      '.breadcrumbs', '#breadcrumbs'
    ]
  },

  // Interactive elements (universal)
  interactive: {
    buttons: [
      'button', '[role="button"]', 'input[type="button"]', 'input[type="submit"]',
      '.btn', '[class*="button"]', 'a.btn', 'a[class*="button"]',
      '[class*="cta"]', '[data-action]'
    ],
    links: [
      'a[href]:not([href^="#"]):not([href^="javascript"])',
      '[role="link"]', '[class*="link"]'
    ],
    clickable: [
      '[onclick]', '[data-click]', '[tabindex]:not([tabindex="-1"])',
      '[class*="click"]', '[class*="toggle"]', '[class*="action"]'
    ]
  },

  // Form elements (universal)
  forms: {
    container: [
      'form', '[role="form"]', '.form', '#form', '[class*="form"]'
    ],
    textInput: [
      'input[type="text"]', 'input[type="email"]', 'input[type="tel"]',
      'input[type="number"]', 'input[type="url"]', 'input[type="password"]',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
      'textarea', '[contenteditable="true"]'
    ],
    dropdown: [
      'select', '[role="combobox"]', '[role="listbox"]',
      '[class*="dropdown"]', '[class*="select"]'
    ],
    checkbox: [
      'input[type="checkbox"]', '[role="checkbox"]', '[class*="checkbox"]'
    ],
    radio: [
      'input[type="radio"]', '[role="radio"]', '[class*="radio"]'
    ],
    submit: [
      'button[type="submit"]', 'input[type="submit"]',
      'button:not([type])', '.submit', '[class*="submit"]'
    ]
  },

  // Content elements (universal)
  content: {
    headings: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[role="heading"]', '.heading', '[class*="title"]'
    ],
    mainContent: [
      'main', '[role="main"]', '#main', '#content', '.main-content',
      '.content', '[class*="main"]', 'article'
    ],
    sections: [
      'section', '[class*="section"]', 'article', '.block', '[class*="block"]'
    ],
    cards: [
      '[class*="card"]', 'article', '.item', '[class*="item"]',
      '[class*="tile"]', '[class*="box"]'
    ],
    images: [
      'img[src]', 'picture', '[role="img"]', 'svg[class]',
      '[class*="image"]', '[class*="img"]', 'figure img'
    ],
    videos: [
      'video', 'iframe[src*="youtube"]', 'iframe[src*="vimeo"]',
      '[class*="video"]', '[class*="player"]', '[data-video]'
    ]
  },

  // Search elements (universal)
  search: {
    input: [
      'input[type="search"]', 'input[name*="search" i]', 'input[name="q"]',
      'input[placeholder*="search" i]', 'input[aria-label*="search" i]',
      '[role="searchbox"]', '.search-input', '#search', '[class*="search"] input'
    ],
    submit: [
      '[class*="search"] button', 'button[aria-label*="search" i]',
      'input[type="submit"][value*="search" i]', '.search-button',
      '[class*="search"] [type="submit"]'
    ],
    results: [
      '.search-results', '[class*="results"]', '.results',
      '[data-search-results]', '#search-results'
    ]
  },

  // Modal/Dialog elements (universal)
  modals: {
    container: [
      '[role="dialog"]', '[role="alertdialog"]', '.modal', '[class*="modal"]',
      '[class*="popup"]', '[class*="overlay"]', '[class*="lightbox"]',
      '.dialog', '[class*="dialog"]'
    ],
    close: [
      '[class*="close"]', '[aria-label="Close"]', 'button[aria-label*="close" i]',
      '.modal-close', '[class*="dismiss"]', 'button.close', '[data-dismiss]'
    ]
  },

  // Slider/Carousel elements (universal)
  sliders: {
    container: [
      '[class*="slider"]', '[class*="carousel"]', '[class*="swiper"]',
      '[class*="slideshow"]', '.slick-slider', '[class*="gallery"]'
    ],
    prev: [
      '[class*="prev"]', '[aria-label*="prev" i]', '[class*="left"]',
      '.slick-prev', '[class*="arrow-left"]'
    ],
    next: [
      '[class*="next"]', '[aria-label*="next" i]', '[class*="right"]',
      '.slick-next', '[class*="arrow-right"]'
    ]
  },

  // Table elements (universal)
  tables: {
    container: [
      'table', '[role="grid"]', '[role="table"]', '.table', '[class*="table"]'
    ],
    header: [
      'thead', 'th', '[role="columnheader"]', '.table-header'
    ],
    row: [
      'tr', '[role="row"]', '.table-row', '[class*="row"]'
    ],
    cell: [
      'td', '[role="cell"]', '[role="gridcell"]', '.table-cell'
    ]
  },

  // Social/Contact elements (universal)
  social: {
    links: [
      'a[href*="facebook"]', 'a[href*="twitter"]', 'a[href*="instagram"]',
      'a[href*="linkedin"]', 'a[href*="youtube"]', 'a[href*="tiktok"]',
      '[class*="social"] a', '.social-links a'
    ],
    contact: [
      'a[href^="tel:"]', 'a[href^="mailto:"]',
      '[class*="contact"]', '[class*="phone"]', '[class*="email"]'
    ]
  },

  // Tab elements (universal)
  tabs: {
    container: [
      '[role="tablist"]', '.tabs', '[class*="tab"]', '[data-tabs]'
    ],
    tab: [
      '[role="tab"]', '.tab', '[class*="tab-item"]',
      '[data-toggle="tab"]', 'button[class*="tab"]'
    ],
    panel: [
      '[role="tabpanel"]', '.tab-content', '[class*="tab-panel"]'
    ]
  },

  // Accordion elements (universal)
  accordion: {
    container: [
      '[class*="accordion"]', '.accordion', '[class*="collapse"]'
    ],
    header: [
      '[class*="accordion-header"]', 'summary', '[class*="collapse-header"]',
      '[data-toggle="collapse"]', '.accordion-trigger'
    ],
    content: [
      '[class*="accordion-body"]', '[class*="accordion-content"]',
      '[class*="collapse-body"]', 'details'
    ]
  }
};

// Domain-specific selector configurations
const domainSelectors = {
  // ============== FLIPKART ==============
  flipkart: {
    name: "Flipkart",
    search: {
      input: [
        "input[name='q']",
        "input.Pke_EE",
        "input.nw1UBF",
        "input[title*='Search for Products']",
        "input[placeholder*='Search for Products']",
        "input[placeholder*='Search']",
        "header input[type='text']",
        ".Pke_EE input",
        "input[autocomplete='off'][type='text']"
      ],
      submit: [
        "button[type='submit']",
        "button.vh79eN",
        "button._2iLD__",
        "svg.aR3fE2",
        ".Pke_EE button",
        "button[class*='search']"
      ]
    },
    results: {
      container: [
        "._1YokD2._3Mn1Gg",
        "[data-id]",
        "._1AtVbE",
        "._4ddWXP",
        "._2kHMtA",
        ".DOjaWF",
        ".cPHDOP"
      ],
      productCard: [
        "a.CGtC98",
        "a.wjcEIp",
        "a.rPDeLR",
        "._1AtVbE a._1fQZEK",
        "[data-id] a._1fQZEK",
        "a._1fQZEK",
        "a[href*='/p/']",
        ".tUxRFH a",
        ".slAVV4 a"
      ],
      productTitle: [
        ".KzDlHZ",
        "._4rR01T",
        ".s1Q9rs",
        "._2WkVRV",
        ".wjcEIp",
        "a[title]"
      ],
      productPrice: [
        ".Nx9bqj._4b5DiR",
        "._30jeq3",
        "._1_WHN1",
        ".Nx9bqj",
        "[class*='price']"
      ]
    },
    productPage: {
      title: [
        "span.VU-ZEz",
        "span.B_NuCI",
        ".yhB1nd span",
        "h1._6EBuvT span",
        "h1 span",
        ".G6XhRU"
      ],
      price: [
        "div.Nx9bqj.CxhGGd",
        "div._30jeq3._16Jk6d",
        "._30jeq3",
        ".Nx9bqj",
        "div[class*='price']",
        "div._25b18c div"
      ],
      addToCart: [
        "button.QqFHMw._1rluMu",
        "button._2KpZ6l._2U9uOA._3v1-ww",
        "button:has-text('Add to cart')",
        "button:has-text('ADD TO CART')",
        "button._2KpZ6l._2U9uOA",
        "button[class*='_2KpZ6l']",
        "button.QqFHMw",
        "div._4SqhHf button:first-child"
      ],
      buyNow: [
        "button.QqFHMw.u8eoAz",
        "button._2KpZ6l._2U9uOA.ihZ75k._3AWRsL",
        "button:has-text('Buy Now')",
        "button:has-text('BUY NOW')",
        "div._4SqhHf button:last-child"
      ],
      image: [
        "img._396cs4._2amPTt._3qGmMb",
        "img._396cs4",
        "img.DByuf4",
        "img._0DkuPH",
        "._1LhVKn img",
        ".CXW8mj img",
        "img[loading='eager']"
      ]
    },
    cart: {
      icon: [
        "a[href*='/viewcart']",
        "a._3GUwXY",
        "a._3V7Fko",
        "a._1ckXL9",
        "[href='/checkout/cart']",
        ".cart-icon"
      ],
      count: [
        "span._2P_LDn",
        "._1P24gL._1E_aEi",
        "span._2MVBM_",
        ".cart-count"
      ],
      itemContainer: [
        "._1AtVbE._3blJSJ",
        "._3AIO4d",
        "._1CPecF",
        ".cart-item"
      ],
      itemTitle: [
        "a._2Kn22P",
        "._25_r8W a",
        ".X3BRps",
        "._2Kn22P",
        ".cart-product-title"
      ],
      itemPrice: [
        "._30jeq3._3D7CT0",
        "._30jeq3",
        "span._2-ut7f"
      ],
      quantity: [
        "div._3dkAqq input",
        "._1jNuIv input",
        "input[class*='qty']",
        "button._23FHuj"
      ],
      placeOrder: [
        "button._3AWRsL.wbNzZ6",
        "button:has-text('Place Order')",
        "button:has-text('PLACE ORDER')",
        "button._2KpZ6l._1FH0tX"
      ],
      remove: [
        "div._3dsJAO",
        "div._1LOesG",
        "button:has-text('Remove')",
        "div:has-text('Remove')"
      ]
    },
    confirmation: {
      added: [
        "._2sj3Ww span",
        ":text('Added to Cart')",
        ":text('added to cart')",
        ".cart-flyout",
        "[class*='added']"
      ]
    }
  },

  // ============== AMAZON ==============
  amazon: {
    name: "Amazon",
    search: {
      input: [
        "input#twotabsearchtextbox",
        "input[name='field-keywords']",
        "input#nav-search-keywords",
        "input[type='text'][name='k']"
      ],
      submit: [
        "#nav-search-submit-button",
        "input[type='submit'][value='Go']",
        ".nav-search-submit"
      ]
    },
    results: {
      container: [
        ".s-main-slot",
        ".s-search-results"
      ],
      productCard: [
        "[data-component-type='s-search-result'] h2 a",
        ".s-result-item h2 a",
        "[data-asin] h2 a",
        "h2 a.a-link-normal[href*='/dp/']"
      ],
      productTitle: [
        ".s-result-item h2",
        "[data-component-type='s-search-result'] h2"
      ],
      productPrice: [
        ".a-price .a-offscreen",
        ".a-price-whole"
      ]
    },
    productPage: {
      title: [
        "#productTitle",
        "#title",
        "h1#title span"
      ],
      price: [
        ".a-price .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-price-whole",
        "#corePrice_feature_div .a-offscreen"
      ],
      addToCart: [
        "#add-to-cart-button",
        "#add-to-cart-button-ubb",
        "input[name='submit.add-to-cart']",
        "#addToCart input[type='submit']"
      ],
      buyNow: [
        "#buy-now-button",
        "#submit.buy-now"
      ],
      image: [
        "#landingImage",
        "#imgTagWrapperId img",
        "#main-image"
      ]
    },
    cart: {
      icon: [
        "#nav-cart",
        "#nav-cart-count-container",
        "a[href*='/cart']"
      ],
      count: [
        "#nav-cart-count",
        ".nav-cart-count"
      ],
      itemContainer: [
        ".sc-list-item",
        "[data-name='Active Items']"
      ],
      itemTitle: [
        ".sc-product-title",
        ".a-truncate-cut"
      ],
      itemPrice: [
        ".sc-product-price",
        ".sc-price"
      ],
      quantity: [
        ".a-dropdown-prompt",
        "select[name='quantity']"
      ],
      placeOrder: [
        "input[name='proceedToRetailCheckout']",
        "#sc-buy-box-ptc-button"
      ],
      remove: [
        "[data-action='delete']",
        "input[value='Delete']"
      ]
    },
    confirmation: {
      added: [
        "#NATC_SMART_WAGON_CONF_MSG_SUCCESS",
        "#attachDisplayAddBase498",
        "h1:has-text('Added to Cart')"
      ]
    }
  },

  // ============== GENERIC E-COMMERCE ==============
  generic: {
    name: "Generic E-commerce",
    search: {
      input: [
        "input[type='search']",
        "input[name='q']",
        "input[name='search']",
        "input[name='query']",
        "input[placeholder*='Search']",
        "input[placeholder*='search']",
        "[aria-label*='Search'] input",
        ".search-input",
        "#search",
        "#search-input"
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
        "button:has-text('Search')",
        ".search-button",
        "[aria-label='Search']"
      ]
    },
    results: {
      container: [
        ".search-results",
        ".product-list",
        ".products-grid",
        "[data-testid='search-results']"
      ],
      productCard: [
        ".product-card a",
        ".product-item a",
        ".product a",
        "article a",
        ".item a"
      ],
      productTitle: [
        ".product-title",
        ".product-name",
        "h2",
        "h3"
      ],
      productPrice: [
        ".price",
        ".product-price",
        "[data-price]",
        ".amount"
      ]
    },
    productPage: {
      title: [
        "h1",
        ".product-title",
        ".product-name",
        "#product-title"
      ],
      price: [
        ".price",
        ".product-price",
        "[data-price]",
        ".current-price"
      ],
      addToCart: [
        "button:has-text('Add to Cart')",
        "button:has-text('ADD TO CART')",
        "button:has-text('Add to Bag')",
        "[data-action='add-to-cart']",
        ".add-to-cart",
        "#add-to-cart"
      ],
      buyNow: [
        "button:has-text('Buy Now')",
        "button:has-text('BUY NOW')",
        ".buy-now"
      ],
      image: [
        ".product-image img",
        "#product-image",
        ".gallery img"
      ]
    },
    cart: {
      icon: [
        "a[href*='cart']",
        ".cart-icon",
        "[data-testid='cart']",
        "#cart",
        ".shopping-cart"
      ],
      count: [
        ".cart-count",
        ".cart-badge",
        "[data-cart-count]"
      ],
      itemContainer: [
        ".cart-item",
        ".cart-product",
        ".line-item"
      ],
      itemTitle: [
        ".cart-item-title",
        ".product-name"
      ],
      itemPrice: [
        ".cart-item-price",
        ".line-item-price"
      ],
      quantity: [
        "input[type='number']",
        ".quantity-selector",
        "select[name='quantity']"
      ],
      placeOrder: [
        "button:has-text('Checkout')",
        "button:has-text('Place Order')",
        "button:has-text('Proceed')",
        ".checkout-button"
      ],
      remove: [
        "button:has-text('Remove')",
        ".remove-item",
        "[data-action='remove']"
      ]
    },
    confirmation: {
      added: [
        ":text('Added to Cart')",
        ":text('added to your cart')",
        ".cart-notification",
        ".add-success"
      ]
    }
  },

  // ============== MANKIND PHARMA (Corporate/Pharma Website) ==============
  mankindpharma: {
    name: "Mankind Pharma",
    navigation: {
      header: [
        "header",
        "nav",
        ".header",
        ".navigation"
      ],
      mainMenu: [
        "nav a",
        "header a",
        ".main-nav a",
        "a[href*='/company']",
        "a[href*='/career']",
        "a[href*='/contact']"
      ],
      logo: [
        "header a[href='/']",
        "a.logo",
        ".logo a",
        "header img[alt*='Mankind']"
      ],
      shop: [
        "a[href*='epiclovestore']",
        "a:has-text('Shop')"
      ]
    },
    contactForm: {
      container: [
        "form",
        ".contact-form",
        "[class*='contact']"
      ],
      helpDropdown: [
        "select",
        "[name*='help']",
        "[name*='subject']"
      ],
      fullName: [
        "input[name*='name']",
        "input[placeholder*='Name']",
        "input[placeholder*='Full Name']",
        "#full-name",
        "#name"
      ],
      mobileNo: [
        "input[name*='mobile']",
        "input[name*='phone']",
        "input[type='tel']",
        "input[placeholder*='Mobile']",
        "input[placeholder*='Phone']"
      ],
      email: [
        "input[type='email']",
        "input[name*='email']",
        "input[placeholder*='Email']"
      ],
      message: [
        "textarea",
        "textarea[name*='message']",
        "textarea[placeholder*='Message']"
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
        "button:has-text('SUBMIT')",
        "button:has-text('Submit')",
        ".submit-button"
      ]
    },
    footer: {
      container: [
        "footer",
        ".footer"
      ],
      quickLinks: [
        ".quick-links a",
        "footer a",
        "a[href*='/blog']",
        "a[href*='/media']",
        "a[href*='/career']",
        "a[href*='/faq']"
      ],
      socialMedia: [
        "a[href*='facebook.com']",
        "a[href*='twitter.com']",
        "a[href*='x.com']",
        "a[href*='linkedin.com']",
        "a[href*='youtube.com']"
      ],
      legal: [
        "a[href*='privacy-policy']",
        "a[href*='disclaimer']",
        "a[href*='code-of-conduct']"
      ],
      contactInfo: [
        "a[href^='tel:']",
        "a[href^='mailto:']",
        ".contact-info"
      ]
    },
    content: {
      heroSection: [
        ".hero",
        ".banner",
        "[class*='hero']",
        "[class*='banner']"
      ],
      sections: [
        "section",
        ".section",
        "[class*='section']"
      ]
    },
    adverseEvent: {
      reportLink: [
        "a[href*='adverse-event']",
        "a:has-text('REPORT NOW')",
        "a:has-text('Report Now')"
      ]
    }
  },

  // ============== SUPER SARAVANA STORES (Retail/Corporate Website) ==============
  saravanastores: {
    name: "Super Saravana Stores",
    navigation: {
      header: [
        "header",
        "nav",
        "[data-testid='header']"
      ],
      mainMenu: [
        "nav a",
        "header a",
        "[role='navigation'] a"
      ],
      logo: [
        "img[alt*='logo']",
        "[class*='logo'] img",
        "header img"
      ]
    },
    branches: {
      links: [
        "a[href*='tnagar']",
        "a[href*='purasaiwalkam']",
        "a[href*='chrompet']",
        "a[href*='porur']",
        "a[href*='madurai']",
        "a[href*='coimbatore']"
      ],
      visitButton: [
        "a:has-text('Visit Branch')",
        "a:has-text('Visit')"
      ]
    },
    categories: {
      section: [
        "[class*='categories']",
        "section"
      ],
      items: [
        "a:has-text('Clothes')",
        "a:has-text('Cosmetics')",
        "a:has-text('Jewellery')",
        "a[href*='annachy']"
      ]
    },
    footer: {
      container: [
        "footer",
        "[class*='footer']"
      ],
      menuLinks: [
        "a[href*='our-brand']",
        "a[href*='ourbusiness']",
        "a[href*='mission']",
        "a[href*='categories']",
        "a[href*='news-media']"
      ],
      policyLinks: [
        "a[href*='privacy-policy']",
        "a[href*='exchange-policy']",
        "a[href*='terms-of-use']"
      ],
      socialMedia: [
        "a[href*='instagram']",
        "a[href*='facebook']",
        "a[href*='youtube']"
      ],
      contact: [
        "a[href^='tel:']",
        "[class*='contact']"
      ]
    },
    content: {
      heroSection: [
        "[class*='banner']",
        "[class*='hero']",
        "section:first-of-type"
      ],
      gallery: [
        "[class*='gallery']",
        "img[class*='gallery']"
      ],
      testimonials: [
        "[class*='testimonial']",
        "[class*='review']"
      ],
      blog: [
        "a[href*='/post/']",
        "[class*='blog']"
      ]
    }
  }
};

/**
 * Detect domain from URL
 * @param {string} url 
 * @returns {string} Domain key (flipkart, amazon, or generic)
 */
function detectDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('flipkart')) return 'flipkart';
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('myntra')) return 'myntra';
    if (hostname.includes('snapdeal')) return 'snapdeal';
    if (hostname.includes('ajio')) return 'ajio';
    if (hostname.includes('nykaa')) return 'nykaa';
    if (hostname.includes('meesho')) return 'meesho';
    if (hostname.includes('tatacliq')) return 'tatacliq';
    if (hostname.includes('ebay')) return 'ebay';
    if (hostname.includes('walmart')) return 'walmart';
    if (hostname.includes('target')) return 'target';
    if (hostname.includes('bestbuy')) return 'bestbuy';
    if (hostname.includes('mankindpharma')) return 'mankindpharma';
    if (hostname.includes('supersaravanastores') || hostname.includes('saravana')) return 'saravanastores';
    
    return 'generic';
  } catch {
    return 'generic';
  }
}

/**
 * Get selectors for a specific domain and action
 * @param {string} url - The URL to get selectors for
 * @param {string} category - Category (search, results, productPage, cart, confirmation)
 * @param {string} element - Element type within category
 * @returns {string[]} Array of CSS selectors
 */
function getSelectors(url, category, element) {
  const domain = detectDomain(url);
  const config = domainSelectors[domain] || domainSelectors.generic;
  const genericConfig = domainSelectors.generic;

  const domainSelArray = config[category]?.[element] || [];
  const genericSelArray = genericConfig[category]?.[element] || [];

  // Combine domain-specific with generic, domain first for priority
  const combined = [...new Set([...domainSelArray, ...genericSelArray])];
  return combined;
}

/**
 * Get all selectors for a domain
 * @param {string} url 
 * @returns {object} Full selector config for domain
 */
function getDomainConfig(url) {
  const domain = detectDomain(url);
  return {
    domain,
    name: (domainSelectors[domain] || domainSelectors.generic).name,
    selectors: domainSelectors[domain] || domainSelectors.generic
  };
}

/**
 * Get universal selectors for any website type
 * @param {string} category - Category (navigation, interactive, forms, content, search, modals, sliders, tables, social, tabs, accordion)
 * @param {string} element - Element type within category
 * @returns {string[]} Array of CSS selectors
 */
function getUniversalSelectors(category, element) {
  return universalSelectors[category]?.[element] || [];
}

/**
 * Get all universal selectors
 * @returns {object} Full universal selector configuration
 */
function getAllUniversalSelectors() {
  return universalSelectors;
}

/**
 * Build adaptive selectors from discovered elements
 * Combines discovered selectors with universal fallbacks
 * @param {object} discoveredElements - Elements discovered from URL analysis
 * @param {string} url - The target URL
 * @returns {object} Adaptive selector map
 */
function buildAdaptiveSelectors(discoveredElements, url) {
  const domain = detectDomain(url);
  const domainConfig = domainSelectors[domain] || domainSelectors.generic;

  const adaptiveSelectors = {
    // Navigation
    header: [],
    navigation: [],
    logo: [],
    footer: [],

    // Interactive
    buttons: [],
    links: [],
    clickable: [],

    // Forms
    forms: [],
    inputs: [],
    textInputs: [],
    dropdowns: [],
    checkboxes: [],
    radios: [],
    submits: [],

    // Content
    headings: [],
    mainContent: [],
    sections: [],
    cards: [],
    images: [],
    videos: [],

    // Search
    searchInput: [],
    searchSubmit: [],
    searchResults: [],

    // Modals
    modals: [],
    modalClose: [],

    // Tabs
    tabs: [],
    tabPanels: [],

    // Accordion
    accordions: [],
    accordionHeaders: []
  };

  // Priority 1: Use discovered elements (most reliable - actually found on page)
  if (discoveredElements) {
    // Map discovered elements to selector categories
    Object.entries(discoveredElements).forEach(([category, elements]) => {
      if (!Array.isArray(elements)) return;

      elements.forEach(el => {
        if (!el.selector) return;

        const selector = el.selector;
        const cat = category.toUpperCase();

        // Map to appropriate category
        if (cat.includes('HEADER') || cat === 'NAVIGATION') {
          adaptiveSelectors.header.push(selector);
          adaptiveSelectors.navigation.push(selector);
        }
        if (cat.includes('BUTTON') || cat === 'INTERACTIVE') {
          adaptiveSelectors.buttons.push(selector);
        }
        if (cat.includes('LINK')) {
          adaptiveSelectors.links.push(selector);
        }
        if (cat.includes('FORM') || cat === 'INPUTS') {
          adaptiveSelectors.forms.push(selector);
          adaptiveSelectors.inputs.push(selector);
        }
        if (cat.includes('FOOTER')) {
          adaptiveSelectors.footer.push(selector);
        }
        if (cat.includes('MODAL') || cat.includes('DIALOG')) {
          adaptiveSelectors.modals.push(selector);
        }
        if (cat.includes('TAB')) {
          adaptiveSelectors.tabs.push(selector);
        }
        if (cat.includes('SEARCH')) {
          adaptiveSelectors.searchInput.push(selector);
        }
        if (cat.includes('CARD') || cat.includes('CONTENT')) {
          adaptiveSelectors.cards.push(selector);
          adaptiveSelectors.mainContent.push(selector);
        }
        if (cat.includes('IMAGE') || cat.includes('MEDIA')) {
          adaptiveSelectors.images.push(selector);
        }
        if (cat.includes('VIDEO') || cat.includes('PLAYER')) {
          adaptiveSelectors.videos.push(selector);
        }
      });
    });
  }

  // Priority 2: Add domain-specific selectors
  if (domainConfig.navigation) {
    adaptiveSelectors.header.push(...(domainConfig.navigation.header || []));
    adaptiveSelectors.navigation.push(...(domainConfig.navigation.mainMenu || []));
    adaptiveSelectors.logo.push(...(domainConfig.navigation.logo || []));
  }
  if (domainConfig.footer) {
    adaptiveSelectors.footer.push(...(domainConfig.footer.container || []));
  }
  if (domainConfig.search) {
    adaptiveSelectors.searchInput.push(...(domainConfig.search.input || []));
    adaptiveSelectors.searchSubmit.push(...(domainConfig.search.submit || []));
  }

  // Priority 3: Add universal selectors as fallbacks
  Object.entries(universalSelectors).forEach(([category, elements]) => {
    Object.entries(elements).forEach(([elementType, selectors]) => {
      const mapKey = `${category}_${elementType}`.toLowerCase();

      // Map to appropriate adaptive selector key
      if (category === 'navigation') {
        if (elementType === 'header') adaptiveSelectors.header.push(...selectors);
        if (elementType === 'mainMenu') adaptiveSelectors.navigation.push(...selectors);
        if (elementType === 'logo') adaptiveSelectors.logo.push(...selectors);
        if (elementType === 'footer') adaptiveSelectors.footer.push(...selectors);
      }
      if (category === 'interactive') {
        if (elementType === 'buttons') adaptiveSelectors.buttons.push(...selectors);
        if (elementType === 'links') adaptiveSelectors.links.push(...selectors);
        if (elementType === 'clickable') adaptiveSelectors.clickable.push(...selectors);
      }
      if (category === 'forms') {
        if (elementType === 'container') adaptiveSelectors.forms.push(...selectors);
        if (elementType === 'textInput') adaptiveSelectors.textInputs.push(...selectors);
        if (elementType === 'dropdown') adaptiveSelectors.dropdowns.push(...selectors);
        if (elementType === 'checkbox') adaptiveSelectors.checkboxes.push(...selectors);
        if (elementType === 'radio') adaptiveSelectors.radios.push(...selectors);
        if (elementType === 'submit') adaptiveSelectors.submits.push(...selectors);
      }
      if (category === 'content') {
        if (elementType === 'headings') adaptiveSelectors.headings.push(...selectors);
        if (elementType === 'mainContent') adaptiveSelectors.mainContent.push(...selectors);
        if (elementType === 'sections') adaptiveSelectors.sections.push(...selectors);
        if (elementType === 'cards') adaptiveSelectors.cards.push(...selectors);
        if (elementType === 'images') adaptiveSelectors.images.push(...selectors);
        if (elementType === 'videos') adaptiveSelectors.videos.push(...selectors);
      }
      if (category === 'search') {
        if (elementType === 'input') adaptiveSelectors.searchInput.push(...selectors);
        if (elementType === 'submit') adaptiveSelectors.searchSubmit.push(...selectors);
        if (elementType === 'results') adaptiveSelectors.searchResults.push(...selectors);
      }
      if (category === 'modals') {
        if (elementType === 'container') adaptiveSelectors.modals.push(...selectors);
        if (elementType === 'close') adaptiveSelectors.modalClose.push(...selectors);
      }
      if (category === 'tabs') {
        if (elementType === 'tab') adaptiveSelectors.tabs.push(...selectors);
        if (elementType === 'panel') adaptiveSelectors.tabPanels.push(...selectors);
      }
      if (category === 'accordion') {
        if (elementType === 'container') adaptiveSelectors.accordions.push(...selectors);
        if (elementType === 'header') adaptiveSelectors.accordionHeaders.push(...selectors);
      }
    });
  });

  // Remove duplicates from each category
  Object.keys(adaptiveSelectors).forEach(key => {
    adaptiveSelectors[key] = [...new Set(adaptiveSelectors[key])];
  });

  return adaptiveSelectors;
}

/**
 * Check if URL is a known domain with specific selectors
 * @param {string} url
 * @returns {boolean}
 */
function isKnownDomain(url) {
  const domain = detectDomain(url);
  return domain !== 'generic' && domainSelectors[domain] !== undefined;
}

module.exports = {
  domainSelectors,
  universalSelectors,
  detectDomain,
  getSelectors,
  getDomainConfig,
  getUniversalSelectors,
  getAllUniversalSelectors,
  buildAdaptiveSelectors,
  isKnownDomain
};
