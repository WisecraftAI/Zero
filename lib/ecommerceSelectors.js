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
        "input[title='Search for products, brands and more']",
        "input.LM6RPg",
        "input._3704LK",
        "header input[type='text']"
      ],
      submit: [
        "button[type='submit']",
        "button.L0Z3Pu",
        "button._2iLD__",
        "svg[width='20'][height='20']" // Search icon
      ]
    },
    results: {
      container: [
        "._1YokD2._3Mn1Gg",
        "[data-id]",
        "._1AtVbE",
        "._4ddWXP",
        "._2kHMtA"
      ],
      productCard: [
        "._1AtVbE a._1fQZEK",
        "[data-id] a._1fQZEK",
        "._4ddWXP a._1fQZEK",
        "._2kHMtA a",
        "a._1fQZEK",
        "a[href*='/p/']"
      ],
      productTitle: [
        "._4rR01T",
        ".s1Q9rs",
        "._2WkVRV",
        "a[title]"
      ],
      productPrice: [
        "._30jeq3",
        "._1_WHN1",
        "[class*='price']"
      ]
    },
    productPage: {
      title: [
        "span.B_NuCI",
        ".yhB1nd span",
        "h1.yhB1nd span",
        "h1 span._35KyD6",
        ".G6XhRU"
      ],
      price: [
        "div._30jeq3._16Jk6d",
        "._30jeq3",
        "div._25b18c ._30jeq3"
      ],
      addToCart: [
        "button._2KpZ6l._2U9uOA._3v1-ww",
        "button:has-text('ADD TO CART')",
        "button:has-text('Add to Cart')",
        "._2KpZ6l._2U9uOA",
        "button[class*='_2KpZ6l']"
      ],
      buyNow: [
        "button._2KpZ6l._2U9uOA.ihZ75k._3AWRsL",
        "button:has-text('BUY NOW')",
        "button:has-text('Buy Now')"
      ],
      image: [
        "._396cs4._2amPTt._3qGmMb",
        "img._396cs4",
        "._1LhVKn img"
      ]
    },
    cart: {
      icon: [
        "a[href*='/viewcart']",
        "a._3V7Fko",
        "a._1ckXL9",
        ".cart-icon",
        "[href='/checkout/cart']"
      ],
      count: [
        "._1P24gL._1E_aEi",
        "span._2MVBM_",
        ".cart-count"
      ],
      itemContainer: [
        "._1AtVbE._3blJSJ",
        "._3AIO4d",
        ".cart-item"
      ],
      itemTitle: [
        "._25_r8W a",
        ".X3BRps",
        ".cart-item-title"
      ],
      itemPrice: [
        "._30jeq3._3D7CT0",
        "._30jeq3"
      ],
      quantity: [
        "._1jNuIv input",
        "input[class*='qtySelector']",
        ".quantity-selector"
      ],
      placeOrder: [
        "button:has-text('PLACE ORDER')",
        "button._2KpZ6l._1FH0tX",
        "button:has-text('Place Order')"
      ],
      remove: [
        "div._1LOesG",
        "div:has-text('Remove')",
        "button:has-text('Remove')"
      ]
    },
    confirmation: {
      added: [
        "._2sj3Ww span",
        ":text('Added to Cart')",
        ".cart-flyout"
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

module.exports = {
  domainSelectors,
  detectDomain,
  getSelectors,
  getDomainConfig
};
