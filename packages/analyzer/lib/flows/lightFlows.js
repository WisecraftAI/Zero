function detectUserFlows(domainConfig, elements) {
  const flows = [];
  const domain = domainConfig.domain;

  // E-commerce flows
  if (domain === 'flipkart' || domain === 'amazon' || domain === 'generic') {
    const hasSearch = elements.some(e => e.category === 'SEARCH');
    const hasCart = elements.some(e => e.category === 'CART');
    const hasAuth = elements.some(e => e.category === 'AUTH');
    const hasProducts = elements.some(e => e.text?.toLowerCase().includes('product') || e.href?.includes('/p/') || e.href?.includes('/product'));

    if (hasSearch) {
      flows.push({
        name: 'Product Search Flow',
        priority: 'Critical',
        steps: [
          { action: 'navigate', description: 'Load homepage' },
          { action: 'verify', description: 'Verify search bar is visible' },
          { action: 'input', description: 'Enter search query in search box' },
          { action: 'click', description: 'Click search button or press Enter' },
          { action: 'verify', description: 'Verify search results are displayed' }
        ],
        assertions: ['Search box accepts input', 'Results display matching products', 'Results count is shown']
      });
    }

    if (hasProducts) {
      flows.push({
        name: 'Product Browse Flow',
        priority: 'High',
        steps: [
          { action: 'navigate', description: 'Navigate to product listing' },
          { action: 'verify', description: 'Verify products are displayed' },
          { action: 'click', description: 'Click on a product' },
          { action: 'verify', description: 'Verify product details page loads' },
          { action: 'verify', description: 'Verify product title, price, and images' }
        ],
        assertions: ['Product cards are clickable', 'Product details show title', 'Product details show price', 'Product images are visible']
      });
    }

    if (hasCart) {
      flows.push({
        name: 'Add to Cart Flow',
        priority: 'Critical',
        steps: [
          { action: 'navigate', description: 'Go to product page' },
          { action: 'verify', description: 'Verify Add to Cart button is visible' },
          { action: 'click', description: 'Click Add to Cart button' },
          { action: 'verify', description: 'Verify cart count updates' },
          { action: 'click', description: 'Click cart icon' },
          { action: 'verify', description: 'Verify product is in cart' }
        ],
        assertions: ['Add to Cart button is enabled', 'Cart count increases', 'Product appears in cart', 'Cart shows correct price']
      });
    }

    if (hasAuth) {
      flows.push({
        name: 'User Authentication Flow',
        priority: 'High',
        steps: [
          { action: 'navigate', description: 'Click on Login/Sign in' },
          { action: 'verify', description: 'Verify login form appears' },
          { action: 'input', description: 'Enter username/email' },
          { action: 'input', description: 'Enter password' },
          { action: 'click', description: 'Click submit/login button' },
          { action: 'verify', description: 'Verify successful login' }
        ],
        assertions: ['Login form has email field', 'Login form has password field', 'Login button is clickable', 'Error messages for invalid credentials']
      });
    }
  }

  // Generic flows based on detected elements
  const hasForms = elements.filter(e => e.category === 'FORMS').length > 0;
  const hasNavigation = elements.filter(e => e.category === 'NAVIGATION').length > 0;

  if (hasNavigation) {
    flows.push({
      name: 'Navigation Flow',
      priority: 'High',
      steps: [
        { action: 'navigate', description: 'Load homepage' },
        { action: 'verify', description: 'Verify navigation menu is visible' },
        { action: 'click', description: 'Click each navigation link' },
        { action: 'verify', description: 'Verify page navigates correctly' }
      ],
      assertions: ['Navigation menu is visible', 'Links are clickable', 'Pages load without errors']
    });
  }

  if (hasForms) {
    flows.push({
      name: 'Form Submission Flow',
      priority: 'Medium',
      steps: [
        { action: 'navigate', description: 'Navigate to form page' },
        { action: 'verify', description: 'Verify form is visible' },
        { action: 'input', description: 'Fill all required fields' },
        { action: 'click', description: 'Submit form' },
        { action: 'verify', description: 'Verify success message or navigation' }
      ],
      assertions: ['Form fields accept input', 'Validation works correctly', 'Submit button is clickable']
    });
  }

  return flows;
}

module.exports = { detectUserFlows };
