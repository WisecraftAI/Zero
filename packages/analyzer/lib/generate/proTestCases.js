const { CRITICAL_FORM_PURPOSES } = require('../constants');

function generateTestCases(analysisResult) {
  const { websiteType, pageStructure, elements, forms, userFlows } = analysisResult;
  const testCases = [];
  let tcId = 1;

  const siteName = websiteType?.typeName || 'Website';
  const url = analysisResult.url;

  // Helper to create test case ID
  const makeId = (prefix) => `TC-${prefix}-${String(tcId++).padStart(3, '0')}`;

  // ======== USER FLOW TEST CASES ========
  userFlows.forEach((flow) => {
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
  forms.forEach((form) => {
    if (form.fields.length === 0) return;

    const formName = form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1);
    const priority = CRITICAL_FORM_PURPOSES.has(form.purpose) ? 'Critical' : 'High';

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
  
  brd.functionalRequirements.slice(0, 10).forEach((req) => {
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

module.exports = { generateTestCases, generateBRDTestCases, getExpectedBehavior, getPostconditions, getTestDataForField };
