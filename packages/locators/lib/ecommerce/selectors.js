/**
 * E-Commerce Domain Selector Registry
 * Universal selector system that works with any e-commerce site
 * Following industry best practices for web automation
 */

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

module.exports = { domainSelectors };
