const { getSelectors } = require('@zero/locators/ecommerceSelectors');

function detectFeatures(elements, forms, domainConfig) {
  const features = [];
  const domain = domainConfig.domain;

  // Search feature
  if (elements.some(e => e.category === 'SEARCH')) {
    features.push({
      name: 'Search',
      type: 'core',
      description: 'Search functionality for finding content/products',
      priority: 'Critical',
      testable: true
    });
  }

  // Cart feature (e-commerce)
  if (elements.some(e => e.category === 'CART')) {
    features.push({
      name: 'Shopping Cart',
      type: 'core',
      description: 'Shopping cart for adding and managing products',
      priority: 'Critical',
      testable: true
    });
  }

  // Authentication feature
  if (elements.some(e => e.category === 'AUTH') || forms.some(f => f.purpose === 'login' || f.purpose === 'registration')) {
    features.push({
      name: 'User Authentication',
      type: 'core',
      description: 'User login and registration system',
      priority: 'Critical',
      testable: true
    });
  }

  // Navigation feature
  if (elements.some(e => e.category === 'NAVIGATION')) {
    features.push({
      name: 'Navigation Menu',
      type: 'core',
      description: 'Site navigation and menu system',
      priority: 'High',
      testable: true
    });
  }

  // Forms feature
  if (forms.length > 0) {
    features.push({
      name: 'Form Handling',
      type: 'feature',
      description: `${forms.length} form(s) for user input`,
      priority: 'High',
      testable: true
    });
  }

  // Media feature
  if (elements.some(e => e.category === 'MEDIA')) {
    features.push({
      name: 'Media Content',
      type: 'feature',
      description: 'Video/audio content playback',
      priority: 'Medium',
      testable: true
    });
  }

  // Interactive elements
  const interactiveCount = elements.filter(e => e.category === 'INTERACTIVE' || e.isInteractive).length;
  if (interactiveCount > 10) {
    features.push({
      name: 'Interactive UI',
      type: 'feature',
      description: `${interactiveCount} interactive elements detected`,
      priority: 'Medium',
      testable: true
    });
  }

  // E-commerce specific
  if (domain === 'flipkart' || domain === 'amazon') {
    features.push({
      name: 'Product Listing',
      type: 'core',
      description: 'Product catalog and listing functionality',
      priority: 'Critical',
      testable: true
    });
    features.push({
      name: 'Product Details',
      type: 'core',
      description: 'Individual product details page',
      priority: 'Critical',
      testable: true
    });
  }

  return features;
}

function generateAutomationSelectors(elements, domainConfig) {
  const selectors = {};

  // Group elements by category and extract best selectors
  const categories = ['SEARCH', 'CART', 'AUTH', 'BUTTONS', 'FORMS', 'NAVIGATION'];
  
  categories.forEach(cat => {
    const catElements = elements.filter(e => e.category === cat);
    selectors[cat.toLowerCase()] = catElements
      .filter(e => e.selector)
      .map(e => e.selector)
      .slice(0, 10);
  });

  // Add domain-specific selectors
  const domainUrls = {
    flipkart: 'https://www.flipkart.com',
    amazon: 'https://www.amazon.in'
  };
  const domainUrl = domainUrls[domainConfig.domain] || 'https://example.com';
  const domainSelectors = getSelectors(domainUrl, 'search', 'input');
  selectors.domainSearch = domainSelectors;

  return selectors;
}

module.exports = { detectFeatures, generateAutomationSelectors };
