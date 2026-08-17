/**
 * URL Analyzer Agent
 * 
 * A comprehensive website analysis agent that:
 * 1. Deeply analyzes any website to discover all elements, features, and navigation
 * 2. Generates BRD (Business Requirements Document) when no CSV test cases are provided
 * 3. Creates structured test cases from observations
 * 4. Provides detailed insights for downstream agents (BA, Manual QA, Automation QA)
 */

const { detectDomain, getDomainConfig, getSelectors } = require("@zero/locators/ecommerceSelectors");

/**
 * Element categories for comprehensive analysis
 */
const ELEMENT_CATEGORIES = {
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

/**
 * Action types for test case generation
 */
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

/**
 * Deep element analyzer - extracts comprehensive element information
 */
async function analyzeElement(page, selector, category) {
  try {
    const elements = await page.$$(selector);
    const analyzed = [];

    for (let i = 0; i < Math.min(elements.length, 20); i++) {
      const el = elements[i];
      try {
        const info = await el.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(node);
          
          return {
            tagName: node.tagName.toLowerCase(),
            id: node.id || null,
            className: node.className?.toString().slice(0, 150) || '',
            text: node.textContent?.trim().slice(0, 100) || '',
            placeholder: node.placeholder || null,
            name: node.name || null,
            type: node.type || null,
            href: node.href || null,
            src: node.src?.slice(0, 200) || null,
            alt: node.alt || null,
            ariaLabel: node.getAttribute('aria-label') || null,
            ariaRole: node.getAttribute('role') || null,
            dataTestId: node.getAttribute('data-testid') || node.getAttribute('data-test-id') || null,
            value: node.value?.slice(0, 50) || null,
            required: node.required || false,
            disabled: node.disabled || false,
            visible: rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
            position: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
            isInteractive: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) || node.hasAttribute('onclick') || node.hasAttribute('tabindex')
          };
        });

        if (info.visible || info.isInteractive) {
          // Generate best selector for this element
          info.selector = generateBestSelector(info);
          info.category = category;
          analyzed.push(info);
        }
      } catch (_) { /* skip failed element */ }
    }

    return analyzed;
  } catch (_) {
    return [];
  }
}

/**
 * Generate the best CSS selector for an element
 */
function generateBestSelector(elementInfo) {
  // Priority: data-testid > id > unique class > tag + attributes
  if (elementInfo.dataTestId) {
    return `[data-testid="${elementInfo.dataTestId}"]`;
  }
  if (elementInfo.id) {
    return `#${elementInfo.id}`;
  }
  if (elementInfo.ariaLabel) {
    return `[aria-label="${elementInfo.ariaLabel.replace(/"/g, '\\"')}"]`;
  }
  if (elementInfo.name && elementInfo.tagName === 'input') {
    return `input[name="${elementInfo.name}"]`;
  }
  if (elementInfo.placeholder) {
    return `${elementInfo.tagName}[placeholder="${elementInfo.placeholder.replace(/"/g, '\\"').slice(0, 50)}"]`;
  }
  if (elementInfo.href && elementInfo.tagName === 'a') {
    const hrefPart = elementInfo.href.split('?')[0].split('#')[0];
    if (hrefPart.length < 80) {
      return `a[href="${hrefPart}"]`;
    }
  }
  if (elementInfo.className) {
    const classes = elementInfo.className.split(/\s+/).filter(c => c.length > 2 && !c.match(/^\d/)).slice(0, 2);
    if (classes.length) {
      return `${elementInfo.tagName}.${classes.join('.')}`;
    }
  }
  if (elementInfo.text && elementInfo.text.length > 2 && elementInfo.text.length < 30) {
    return `${elementInfo.tagName}:has-text("${elementInfo.text.slice(0, 30)}")`;
  }
  return elementInfo.tagName;
}

/**
 * Analyze page structure and hierarchy
 */
async function analyzePageStructure(page) {
  return page.evaluate(() => {
    const structure = {
      title: document.title,
      url: window.location.href,
      headings: [],
      sections: [],
      landmarks: [],
      depth: 0
    };

    // Get all headings
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h, i) => {
      if (i < 30) {
        structure.headings.push({
          level: parseInt(h.tagName[1]),
          text: h.textContent?.trim().slice(0, 100) || '',
          id: h.id || null
        });
      }
    });

    // Get landmark regions
    document.querySelectorAll('main, nav, header, footer, aside, section, article, [role]').forEach((el, i) => {
      if (i < 30) {
        structure.landmarks.push({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          id: el.id
        });
      }
    });

    // Calculate DOM depth
    function getMaxDepth(el, depth = 0) {
      if (!el.children.length) return depth;
      return Math.max(...Array.from(el.children).map(c => getMaxDepth(c, depth + 1)));
    }
    structure.depth = getMaxDepth(document.body);

    // Get main sections
    document.querySelectorAll('section, [class*="section"], main > div').forEach((sec, i) => {
      if (i < 15) {
        const heading = sec.querySelector('h1, h2, h3');
        structure.sections.push({
          id: sec.id,
          className: sec.className?.toString().slice(0, 100),
          heading: heading?.textContent?.trim().slice(0, 50) || null,
          childCount: sec.children.length
        });
      }
    });

    return structure;
  });
}

/**
 * Analyze forms in detail
 */
async function analyzeFormsDeep(page) {
  return page.evaluate(() => {
    const forms = [];
    document.querySelectorAll('form').forEach((form, i) => {
      if (i >= 10) return;

      const fields = [];
      form.querySelectorAll('input, select, textarea').forEach((field, j) => {
        if (j >= 20) return;
        fields.push({
          tagName: field.tagName.toLowerCase(),
          type: field.type || 'text',
          name: field.name || null,
          id: field.id || null,
          placeholder: field.placeholder || null,
          required: field.required,
          pattern: field.pattern || null,
          minLength: field.minLength > 0 ? field.minLength : null,
          maxLength: field.maxLength > 0 && field.maxLength < 10000 ? field.maxLength : null,
          label: field.labels?.[0]?.textContent?.trim() || null,
          ariaLabel: field.getAttribute('aria-label'),
          validation: field.validationMessage || null
        });
      });

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      
      forms.push({
        id: form.id || `form-${i}`,
        name: form.name || null,
        action: form.action || window.location.href,
        method: form.method.toUpperCase() || 'GET',
        enctype: form.enctype || null,
        fieldCount: fields.length,
        fields,
        submitButton: submitBtn ? {
          text: submitBtn.textContent?.trim() || submitBtn.value || 'Submit',
          type: submitBtn.type,
          disabled: submitBtn.disabled
        } : null,
        hasFileUpload: fields.some(f => f.type === 'file'),
        hasPassword: fields.some(f => f.type === 'password'),
        purpose: detectFormPurpose(fields)
      });
    });

    function detectFormPurpose(fields) {
      const fieldNames = fields.map(f => (f.name || f.placeholder || f.label || '').toLowerCase()).join(' ');
      if (fieldNames.includes('search') || fieldNames.includes('query')) return 'search';
      if (fieldNames.includes('password') && (fieldNames.includes('email') || fieldNames.includes('username'))) return 'login';
      if (fieldNames.includes('password') && fieldNames.includes('confirm')) return 'registration';
      if (fieldNames.includes('email') && !fieldNames.includes('password')) return 'newsletter';
      if (fieldNames.includes('address') || fieldNames.includes('shipping')) return 'address';
      if (fieldNames.includes('card') || fieldNames.includes('payment')) return 'payment';
      if (fieldNames.includes('message') || fieldNames.includes('comment')) return 'contact';
      return 'generic';
    }

    return forms;
  });
}

/**
 * Detect user flows and journeys on the page
 */
async function detectUserFlows(page, domainConfig, elements) {
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

/**
 * Generate BRD (Business Requirements Document) from analysis
 */
function generateBRD(analysisResult) {
  const { siteOverview, discoveredFeatures, discoveredForms, userFlows, pageStructure, domainConfig } = analysisResult;
  
  const brd = {
    documentInfo: {
      title: `Business Requirements Document - ${siteOverview.title || 'Website Analysis'}`,
      generatedAt: new Date().toISOString(),
      version: '1.0',
      source: 'URL Analyzer Agent'
    },
    executiveSummary: generateExecutiveSummary(siteOverview, discoveredFeatures, domainConfig),
    projectScope: {
      inScope: generateInScopeItems(discoveredFeatures, userFlows),
      outOfScope: ['Backend API testing', 'Database testing', 'Load/Stress testing', 'Mobile native app testing'],
      assumptions: [
        'Test environment is stable and accessible',
        'Test data is available for all scenarios',
        'User credentials for authentication tests are provided'
      ],
      constraints: [
        'Testing limited to web UI interactions',
        'Anti-bot protection may block automated tests',
        'Dynamic content may require adaptive selectors'
      ]
    },
    functionalRequirements: generateFunctionalRequirements(discoveredFeatures, discoveredForms, userFlows),
    nonFunctionalRequirements: [
      { id: 'NFR-001', category: 'Performance', description: 'Page load time should be under 3 seconds' },
      { id: 'NFR-002', category: 'Accessibility', description: 'Website should be accessible via keyboard navigation' },
      { id: 'NFR-003', category: 'Compatibility', description: 'Website should work on Chrome, Firefox, Safari' },
      { id: 'NFR-004', category: 'Security', description: 'HTTPS should be enabled for all pages' },
      { id: 'NFR-005', category: 'Usability', description: 'Error messages should be clear and helpful' }
    ],
    testStrategy: {
      approach: 'Risk-based testing with priority on critical user flows',
      testLevels: ['Smoke Testing', 'Sanity Testing', 'Regression Testing', 'User Acceptance Testing'],
      testTypes: ['Functional Testing', 'UI Testing', 'Navigation Testing', 'Form Validation Testing'],
      entryExitCriteria: {
        entry: ['Test environment available', 'Test data prepared', 'Test cases reviewed'],
        exit: ['All critical tests passed', 'No critical defects open', 'Test coverage > 80%']
      }
    },
    riskAssessment: generateRiskAssessment(analysisResult),
    userFlows: userFlows.map((flow, i) => ({
      id: `UF-${String(i + 1).padStart(3, '0')}`,
      ...flow
    }))
  };

  return brd;
}

/**
 * Generate executive summary for BRD
 */
function generateExecutiveSummary(siteOverview, features, domainConfig) {
  const featureCount = features.length;
  const siteType = domainConfig.name || 'Website';

  return {
    overview: `This document outlines the business and testing requirements for ${siteOverview.title || 'the target website'} (${siteType}). The URL Analyzer Agent has identified ${featureCount} key features requiring testing.`,
    objectives: [
      'Ensure all core functionalities work as expected',
      'Validate user interface elements are interactive and accessible',
      'Verify navigation flows complete without errors',
      'Confirm form submissions and data validations work correctly'
    ],
    keyFindings: [
      `Site type: ${siteType}`,
      `Features discovered: ${featureCount}`,
      `Pages analyzed: ${siteOverview.pagesDiscovered || 1}`,
      `Forms found: ${features.filter(f => f.type === 'form').length || 'Multiple'}`
    ]
  };
}

/**
 * Generate in-scope items from features
 */
function generateInScopeItems(features, userFlows) {
  const items = [];
  
  features.forEach(f => {
    items.push(`${f.name}: ${f.description || 'Functional testing'}`);
  });

  userFlows.forEach(flow => {
    items.push(`${flow.name}: End-to-end flow validation`);
  });

  if (items.length === 0) {
    items.push('Homepage functionality', 'Navigation verification', 'UI element validation');
  }

  return items;
}

/**
 * Generate functional requirements from analysis
 */
function generateFunctionalRequirements(features, forms, userFlows) {
  const requirements = [];
  let reqId = 1;

  // Requirements from features
  features.forEach(feature => {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: feature.name,
      type: feature.type || 'Functional',
      priority: feature.priority || 'Medium',
      description: `The system shall provide ${feature.name.toLowerCase()} functionality`,
      acceptanceCriteria: feature.testable ? [
        `${feature.name} is accessible to users`,
        `${feature.name} responds to user interactions`,
        `${feature.name} displays expected output`
      ] : ['Feature is visible', 'Feature is functional'],
      testable: feature.testable !== false
    });
  });

  // Requirements from forms
  forms.forEach((form, i) => {
    if (form.purpose !== 'generic') {
      requirements.push({
        id: `FR-${String(reqId++).padStart(3, '0')}`,
        feature: `${form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1)} Form`,
        type: 'Functional',
        priority: ['login', 'registration', 'payment'].includes(form.purpose) ? 'Critical' : 'High',
        description: `The ${form.purpose} form shall accept user input and submit successfully`,
        acceptanceCriteria: [
          'All required fields are marked',
          'Validation errors are displayed for invalid input',
          'Form submits successfully with valid data',
          'Appropriate feedback is shown after submission'
        ],
        testable: true,
        formFields: form.fields.map(f => f.name || f.placeholder || f.type)
      });
    }
  });

  // Requirements from user flows
  userFlows.forEach(flow => {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: flow.name,
      type: 'Flow',
      priority: flow.priority,
      description: `Users shall be able to complete the ${flow.name.toLowerCase()}`,
      acceptanceCriteria: flow.assertions || flow.steps.filter(s => s.action === 'verify').map(s => s.description),
      testable: true,
      steps: flow.steps
    });
  });

  return requirements;
}

/**
 * Generate risk assessment
 */
function generateRiskAssessment(analysisResult) {
  const risks = [];
  
  // Check for potential issues
  if (analysisResult.antiBot) {
    risks.push({
      id: 'RISK-001',
      category: 'Technical',
      description: 'Anti-bot protection detected - automated tests may be blocked',
      probability: 'High',
      impact: 'Critical',
      mitigation: 'Use headed browser mode, add delays, consider manual testing for protected areas'
    });
  }

  if (analysisResult.discoveredFeatures.some(f => f.name === 'User Authentication')) {
    risks.push({
      id: 'RISK-002',
      category: 'Data',
      description: 'Authentication required for some features',
      probability: 'Medium',
      impact: 'High',
      mitigation: 'Ensure test credentials are available and valid'
    });
  }

  if (analysisResult.dynamicContent) {
    risks.push({
      id: 'RISK-003',
      category: 'Technical',
      description: 'Dynamic content detected - selectors may change between runs',
      probability: 'Medium',
      impact: 'Medium',
      mitigation: 'Use robust selectors (data-testid, aria-label), implement retry logic'
    });
  }

  risks.push({
    id: 'RISK-004',
    category: 'Environment',
    description: 'Network issues may cause test failures',
    probability: 'Low',
    impact: 'Medium',
    mitigation: 'Implement proper timeouts and retry mechanisms'
  });

  return risks;
}

/**
 * Generate test cases from analysis
 */
function generateTestCasesFromAnalysis(analysisResult) {
  const { discoveredFeatures, discoveredForms, userFlows, pageStructure, siteOverview, domainConfig } = analysisResult;
  const testCases = [];
  let tcId = 1;

  // Test cases from user flows
  userFlows.forEach(flow => {
    testCases.push({
      id: `TC-AUTO-${String(tcId++).padStart(3, '0')}`,
      module: flow.name.split(' ')[0],
      scenario: flow.name,
      title: `${siteOverview.title || 'Website'}: ${flow.name}`,
      type: 'Flow',
      priority: flow.priority,
      preconditions: 'Website is accessible, browser is open',
      testData: 'Standard test data',
      steps: flow.steps.map((step, i) => `Step ${i + 1}: ${step.description}`),
      expectedResult: flow.assertions.join('; '),
      traceability: 'Generated from URL Analysis - User Flow'
    });
  });

  // Test cases from features
  discoveredFeatures.forEach(feature => {
    testCases.push({
      id: `TC-AUTO-${String(tcId++).padStart(3, '0')}`,
      module: feature.type === 'core' ? 'Core' : 'Feature',
      scenario: `Verify ${feature.name}`,
      title: `${siteOverview.title || 'Website'}: ${feature.name} Verification`,
      type: feature.type === 'core' ? 'Sanity' : 'Functional',
      priority: feature.type === 'core' ? 'High' : 'Medium',
      preconditions: 'Website is accessible',
      testData: 'N/A',
      steps: [
        `Navigate to ${siteOverview.url || 'homepage'}`,
        `Locate ${feature.name} element/area`,
        `Verify ${feature.name} is visible and functional`,
        feature.description ? `Verify: ${feature.description}` : 'Capture screenshot for evidence'
      ],
      expectedResult: `${feature.name} is visible and functional`,
      traceability: 'Generated from URL Analysis - Feature Detection'
    });
  });

  // Test cases from forms
  discoveredForms.forEach((form, i) => {
    if (form.fields.length > 0) {
      // Positive test case
      testCases.push({
        id: `TC-AUTO-${String(tcId++).padStart(3, '0')}`,
        module: 'Forms',
        scenario: `${form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1)} Form - Valid Submission`,
        title: `${siteOverview.title || 'Website'}: ${form.purpose} form valid submission`,
        type: 'Functional',
        priority: ['login', 'registration', 'payment'].includes(form.purpose) ? 'Critical' : 'High',
        preconditions: `Navigate to page with ${form.purpose} form`,
        testData: form.fields.map(f => `${f.name || f.type}: valid value`).join(', '),
        steps: [
          `Locate the ${form.purpose} form`,
          ...form.fields.slice(0, 6).map(f => `Enter valid data in ${f.name || f.placeholder || f.type} field`),
          `Click ${form.submitButton?.text || 'Submit'} button`,
          'Verify successful submission'
        ],
        expectedResult: 'Form submits successfully without errors',
        traceability: 'Generated from URL Analysis - Form Detection'
      });

      // Negative test case for required fields
      if (form.fields.some(f => f.required)) {
        testCases.push({
          id: `TC-AUTO-${String(tcId++).padStart(3, '0')}`,
          module: 'Forms',
          scenario: `${form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1)} Form - Empty Required Fields`,
          title: `${siteOverview.title || 'Website'}: ${form.purpose} form validation`,
          type: 'Negative',
          priority: 'High',
          preconditions: `Navigate to page with ${form.purpose} form`,
          testData: 'Empty/blank values',
          steps: [
            `Locate the ${form.purpose} form`,
            'Leave required fields empty',
            `Click ${form.submitButton?.text || 'Submit'} button`,
            'Verify validation errors appear'
          ],
          expectedResult: 'Form shows validation errors for required fields',
          traceability: 'Generated from URL Analysis - Form Validation'
        });
      }
    }
  });

  // Navigation test cases
  if (pageStructure && pageStructure.headings.length > 0) {
    testCases.push({
      id: `TC-AUTO-${String(tcId++).padStart(3, '0')}`,
      module: 'UI',
      scenario: 'Page Structure Verification',
      title: `${siteOverview.title || 'Website'}: Page structure and headings`,
      type: 'UI',
      priority: 'Medium',
      preconditions: 'Website is accessible',
      testData: 'N/A',
      steps: [
        'Load the homepage',
        'Verify page title is displayed',
        'Verify heading hierarchy (H1, H2, H3)',
        'Verify main navigation is visible',
        'Verify footer is present'
      ],
      expectedResult: `Page displays with title "${pageStructure.title}", proper heading structure`,
      traceability: 'Generated from URL Analysis - Page Structure'
    });
  }

  return testCases;
}

/**
 * Main URL Analyzer function - comprehensive website analysis
 */
async function analyzeUrl(page, url, options = {}) {
  const startTime = Date.now();
  const result = {
    metadata: {
      url,
      analyzedAt: new Date().toISOString(),
      source: 'URL Analyzer Agent',
      duration: 0
    },
    siteOverview: {},
    pageStructure: {},
    discoveredFeatures: [],
    discoveredForms: [],
    discoveredElements: {},
    userFlows: [],
    selectors: {},
    brd: null,
    generatedTestCases: [],
    observations: [],
    warnings: [],
    domainConfig: {}
  };

  try {
    // Domain detection
    const domainConfig = getDomainConfig(url);
    result.domainConfig = domainConfig;
    result.metadata.domain = domainConfig.domain;
    result.metadata.siteName = domainConfig.name;

    // Navigate to URL
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Check for anti-bot protection
    const pageContent = await page.content();
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const blockedIndicators = ['captcha', 'recaptcha', 'cloudflare', 'access denied', 'blocked', 'verify you are human'];
    const isBlocked = blockedIndicators.some(ind => (pageContent + bodyText).toLowerCase().includes(ind));
    
    if (isBlocked) {
      result.antiBot = true;
      result.warnings.push('Anti-bot protection detected. Some automated tests may fail.');
      result.observations.push({
        type: 'warning',
        category: 'Security',
        message: 'Website has anti-bot protection that may interfere with automated testing'
      });
    }

    // Get site overview
    const pageTitle = await page.title();
    const metaDescription = await page.$eval('meta[name="description"]', m => m.content).catch(() => '');
    
    result.siteOverview = {
      title: pageTitle,
      description: metaDescription,
      url: url,
      type: domainConfig.name,
      pagesDiscovered: 1
    };

    // Analyze page structure
    result.pageStructure = await analyzePageStructure(page);

    // Analyze all element categories
    for (const [category, selectors] of Object.entries(ELEMENT_CATEGORIES)) {
      const elements = [];
      for (const selector of selectors) {
        const found = await analyzeElement(page, selector, category);
        elements.push(...found);
      }
      // Deduplicate by selector
      const unique = elements.filter((el, i, arr) => arr.findIndex(e => e.selector === el.selector) === i);
      result.discoveredElements[category] = unique;

      // Add observations
      if (unique.length > 0) {
        result.observations.push({
          type: 'info',
          category: category,
          message: `Found ${unique.length} ${category.toLowerCase()} elements`,
          count: unique.length,
          samples: unique.slice(0, 3).map(e => e.selector)
        });
      }
    }

    // Analyze forms in detail
    result.discoveredForms = await analyzeFormsDeep(page);
    
    // Detect features based on elements
    const allElements = Object.values(result.discoveredElements).flat();
    result.discoveredFeatures = detectFeatures(allElements, result.discoveredForms, domainConfig);

    // Detect user flows
    result.userFlows = await detectUserFlows(page, domainConfig, allElements);

    // Generate selectors for automation
    result.selectors = generateAutomationSelectors(allElements, domainConfig);

    // Check for dynamic content
    const hasDynamicContent = await page.evaluate(() => {
      return document.querySelectorAll('[data-react-root], [ng-app], [data-v-], #__next, #root').length > 0;
    });
    result.dynamicContent = hasDynamicContent;
    if (hasDynamicContent) {
      result.observations.push({
        type: 'info',
        category: 'Technical',
        message: 'Dynamic content framework detected (React/Angular/Vue/Next.js)',
        recommendation: 'Use data-testid selectors when available for more stable automation'
      });
    }

    // Crawl linked pages (limited)
    const navLinks = result.discoveredElements.NAVIGATION || [];
    const internalLinks = navLinks
      .filter(l => l.href && l.href.includes(new URL(url).hostname) && !l.href.includes('#'))
      .slice(0, 5);

    for (const link of internalLinks) {
      try {
        await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        
        const subTitle = await page.title();
        result.siteOverview.pagesDiscovered++;
        
        result.observations.push({
          type: 'info',
          category: 'Navigation',
          message: `Discovered page: ${link.text} -> ${subTitle}`,
          url: link.href
        });
      } catch (_) { /* skip failed pages */ }
    }

    // Navigate back to original page for final analysis
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Generate BRD document
    result.brd = generateBRD(result);

    // Generate test cases
    result.generatedTestCases = generateTestCasesFromAnalysis(result);

    // Calculate analysis duration
    result.metadata.duration = Date.now() - startTime;

    // Add summary observation
    result.observations.unshift({
      type: 'summary',
      category: 'Analysis',
      message: `Website analysis completed in ${result.metadata.duration}ms`,
      stats: {
        featuresFound: result.discoveredFeatures.length,
        formsFound: result.discoveredForms.length,
        userFlowsDetected: result.userFlows.length,
        testCasesGenerated: result.generatedTestCases.length,
        pagesAnalyzed: result.siteOverview.pagesDiscovered
      }
    });

  } catch (error) {
    result.error = error.message;
    result.warnings.push(`Analysis error: ${error.message}`);
  }

  return result;
}

/**
 * Detect features from analyzed elements
 */
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
  if (elements.filter(e => e.category === 'NAVIGATION').length > 0) {
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

/**
 * Generate automation selectors from elements
 */
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
  const domainSelectors = getSelectors(domainConfig.domain === 'flipkart' ? 'https://www.flipkart.com' : 
                                       domainConfig.domain === 'amazon' ? 'https://www.amazon.in' : 
                                       'https://example.com', 'search', 'input');
  selectors.domainSearch = domainSelectors;

  return selectors;
}

/**
 * Generate observations formatted for BA Agent
 */
function formatObservationsForBA(analysisResult) {
  const baObservations = {
    siteType: analysisResult.domainConfig?.name || 'Website',
    summary: `Analyzed ${analysisResult.siteOverview?.url || 'target URL'}. Found ${analysisResult.discoveredFeatures?.length || 0} features, ${analysisResult.discoveredForms?.length || 0} forms, ${analysisResult.userFlows?.length || 0} user flows.`,
    
    keyFeatures: analysisResult.discoveredFeatures?.map(f => ({
      name: f.name,
      priority: f.priority,
      description: f.description
    })) || [],
    
    criticalFlows: analysisResult.userFlows?.filter(f => f.priority === 'Critical').map(f => f.name) || [],
    
    formAnalysis: analysisResult.discoveredForms?.map(f => ({
      purpose: f.purpose,
      fieldCount: f.fieldCount,
      hasValidation: f.fields.some(field => field.required || field.pattern)
    })) || [],
    
    navigationStructure: {
      menuItems: analysisResult.discoveredElements?.NAVIGATION?.length || 0,
      pageHierarchy: analysisResult.pageStructure?.headings?.map(h => `H${h.level}: ${h.text}`).slice(0, 10) || []
    },
    
    testingRecommendations: [
      ...(analysisResult.antiBot ? ['Use headed browser mode due to anti-bot protection'] : []),
      ...(analysisResult.dynamicContent ? ['Use data-testid selectors for dynamic content'] : []),
      ...analysisResult.discoveredFeatures?.filter(f => f.priority === 'Critical').map(f => `Prioritize testing: ${f.name}`) || []
    ],
    
    warnings: analysisResult.warnings || [],
    
    suggestedRequirements: analysisResult.brd?.functionalRequirements?.slice(0, 10) || [],
    
    suggestedTestCases: analysisResult.generatedTestCases?.slice(0, 15) || []
  };

  return baObservations;
}

module.exports = {
  analyzeUrl,
  generateBRD,
  generateTestCasesFromAnalysis,
  formatObservationsForBA,
  ELEMENT_CATEGORIES,
  ACTION_TYPES
};
