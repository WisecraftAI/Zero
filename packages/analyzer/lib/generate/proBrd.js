const { CRITICAL_FORM_PURPOSES } = require('../constants');

function generateBRD(analysisResult) {
  const { websiteType, pageStructure, elements, forms, userFlows, url, observations, warnings } = analysisResult;
  
  const siteName = pageStructure?.title || 'Target Website';
  const siteType = websiteType?.typeName || 'Website';

  return {
    documentInfo: {
      title: `Business Requirements Document - ${siteName}`,
      version: '1.0',
      generatedAt: new Date().toISOString(),
      source: 'URL Analyzer Pro Agent',
      websiteUrl: url,
      websiteType: siteType
    },
    
    executiveSummary: {
      overview: `This document outlines the business and testing requirements for ${siteName} (${siteType}). The URL Analyzer Pro Agent has conducted comprehensive analysis and identified key features, user flows, and testing requirements.`,
      websiteType: siteType,
      analysisScope: [
        `Website URL: ${url}`,
        `Type: ${siteType}`,
        `Pages Analyzed: ${analysisResult.pagesAnalyzed || 1}`,
        `Features Identified: ${elements ? new Set(elements.map(e => e.category)).size : 0}`,
        `User Flows Detected: ${userFlows?.length || 0}`,
        `Forms Found: ${forms?.length || 0}`
      ],
      keyFindings: generateKeyFindings(analysisResult),
      objectives: [
        'Validate all core functionalities work as expected',
        'Ensure UI elements are interactive and accessible',
        'Verify user flows complete without errors',
        'Confirm form submissions and validations work correctly',
        'Assess performance and responsiveness'
      ]
    },

    projectScope: {
      inScope: generateInScopeItems(analysisResult),
      outOfScope: [
        'Backend API testing (unless exposed via UI)',
        'Database testing',
        'Load and stress testing',
        'Mobile native application testing',
        'Third-party integrations testing (unless visible in UI)'
      ],
      assumptions: [
        'Test environment is stable and accessible',
        'Test data is available for all scenarios',
        'User credentials for authentication tests are provided',
        'Network connectivity is stable during testing'
      ],
      constraints: [
        'Testing limited to web UI interactions',
        ...(analysisResult.antiBot ? ['Anti-bot protection may block some automated tests'] : []),
        'Dynamic content may require adaptive selectors'
      ]
    },

    functionalRequirements: generateFunctionalRequirements(analysisResult),
    
    nonFunctionalRequirements: [
      { id: 'NFR-001', category: 'Performance', description: 'Page load time should be under 3 seconds on standard broadband', priority: 'High' },
      { id: 'NFR-002', category: 'Accessibility', description: 'Website should be accessible via keyboard navigation', priority: 'High' },
      { id: 'NFR-003', category: 'Compatibility', description: 'Website should work on Chrome, Firefox, Safari, Edge (latest 2 versions)', priority: 'High' },
      { id: 'NFR-004', category: 'Security', description: 'All pages should be served over HTTPS', priority: 'Critical' },
      { id: 'NFR-005', category: 'Usability', description: 'Error messages should be clear, helpful, and actionable', priority: 'Medium' },
      { id: 'NFR-006', category: 'Responsive', description: 'Website should be responsive from 320px to 2560px width', priority: 'High' },
      { id: 'NFR-007', category: 'SEO', description: 'Pages should have proper meta tags and heading structure', priority: 'Medium' }
    ],

    testStrategy: {
      approach: 'Risk-based testing with priority on critical user flows and business functions',
      testLevels: [
        { level: 'Smoke Testing', description: 'Verify basic functionality and page loads', priority: 'Critical' },
        { level: 'Functional Testing', description: 'Test all features and user flows', priority: 'Critical' },
        { level: 'Regression Testing', description: 'Ensure changes don\'t break existing functionality', priority: 'High' },
        { level: 'UI/Visual Testing', description: 'Verify visual appearance and layout', priority: 'Medium' },
        { level: 'Accessibility Testing', description: 'WCAG 2.1 compliance verification', priority: 'High' },
        { level: 'Performance Testing', description: 'Page load and Core Web Vitals', priority: 'High' }
      ],
      testTypes: websiteType?.testPriorities?.map(p => ({
        type: p,
        priority: websiteType.criticalFlows?.some(f => f.includes(p)) ? 'Critical' : 'High'
      })) || [
        { type: 'Navigation Testing', priority: 'Critical' },
        { type: 'Form Testing', priority: 'High' },
        { type: 'Content Testing', priority: 'Medium' }
      ],
      entryExitCriteria: {
        entry: [
          'Test environment is available and stable',
          'Test cases are reviewed and approved',
          'Test data is prepared',
          'Tools and access are configured'
        ],
        exit: [
          'All critical and high priority tests executed',
          'No critical or high severity defects open',
          'Test coverage meets minimum 80% requirement',
          'Test summary report is prepared'
        ]
      }
    },

    riskAssessment: generateRiskAssessment(analysisResult),
    
    userFlows: userFlows?.map((flow, i) => ({
      id: `UF-${String(i + 1).padStart(3, '0')}`,
      name: flow.name,
      priority: flow.priority,
      description: flow.description,
      steps: flow.steps,
      assertions: flow.assertions,
      coverage: 'Included in test suite'
    })) || [],

    elementInventory: {
      summary: generateElementSummary(elements),
      byCategory: elements ? Object.entries(
        elements.reduce((acc, el) => {
          acc[el.category] = acc[el.category] || [];
          acc[el.category].push({ selector: el.selector, text: el.text?.slice(0, 50) });
          return acc;
        }, {})
      ).map(([category, els]) => ({
        category,
        count: els.length,
        samples: els.slice(0, 5)
      })) : []
    },

    formInventory: forms?.map((form) => ({
      id: form.id,
      purpose: form.purpose,
      fields: form.fieldCount,
      requiredFields: form.fields.filter(f => f.required).length,
      hasValidation: form.fields.some(f => f.required || f.pattern),
      submitButton: form.submitButton?.text
    })) || [],

    observations: observations || [],
    warnings: warnings || []
  };
}

/**
 * Generate key findings for executive summary
 */
function generateKeyFindings(analysisResult) {
  const findings = [];
  const { websiteType, elements, forms, userFlows, pageStructure } = analysisResult;

  findings.push(`Website Type: ${websiteType?.typeName || 'Generic Website'}`);
  
  if (elements) {
    const interactiveCount = elements.filter(e => e.category === 'BUTTONS' || e.category === 'INTERACTIVE' || e.category === 'LINKS').length;
    findings.push(`Interactive Elements: ${interactiveCount} elements detected`);
  }

  if (forms?.length > 0) {
    const formTypes = [...new Set(forms.map(f => f.purpose))].join(', ');
    findings.push(`Forms Found: ${forms.length} (${formTypes})`);
  }

  if (userFlows?.length > 0) {
    const criticalFlows = userFlows.filter(f => f.priority === 'Critical').length;
    findings.push(`User Flows: ${userFlows.length} identified (${criticalFlows} critical)`);
  }

  if (pageStructure?.headings?.length > 0) {
    const h1Count = pageStructure.headings.filter(h => h.level === 1).length;
    findings.push(`Page Structure: ${pageStructure.headings.length} headings (${h1Count} H1)`);
  }

  if (analysisResult.antiBot) {
    findings.push('Security: Anti-bot protection detected');
  }

  return findings;
}

/**
 * Generate in-scope items
 */
function generateInScopeItems(analysisResult) {
  const items = [];
  const { websiteType, userFlows, forms, elements } = analysisResult;

  // Add website-type specific items
  if (websiteType?.testPriorities) {
    websiteType.testPriorities.forEach(priority => {
      items.push(`${priority}: Functional verification and testing`);
    });
  }

  // Add flow-based items
  userFlows?.forEach(flow => {
    items.push(`${flow.name}: End-to-end flow testing`);
  });

  // Add form-based items
  const uniqueFormTypes = [...new Set(forms?.map(f => f.purpose) || [])];
  uniqueFormTypes.forEach(type => {
    if (type !== 'generic') {
      items.push(`${type.charAt(0).toUpperCase() + type.slice(1)} Form: Validation and submission testing`);
    }
  });

  // Add element-based items
  if (elements?.some(e => e.category === 'MEDIA')) {
    items.push('Media Content: Playback and control testing');
  }
  if (elements?.some(e => e.category === 'SEARCH')) {
    items.push('Search Functionality: Query and results testing');
  }
  if (elements?.some(e => e.category === 'CART')) {
    items.push('Shopping Cart: Add, remove, and checkout testing');
  }

  // Default items
  items.push('UI/Visual: Layout and display verification');
  items.push('Responsive: Mobile and tablet compatibility');
  items.push('Accessibility: Basic WCAG compliance');
  items.push('Performance: Page load and Core Web Vitals');

  return items;
}

/**
 * Generate functional requirements
 */
function generateFunctionalRequirements(analysisResult) {
  const requirements = [];
  let reqId = 1;
  const { websiteType, userFlows, forms, elements } = analysisResult;

  // Requirements from user flows
  userFlows?.forEach(flow => {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: flow.name,
      type: 'User Flow',
      priority: flow.priority,
      description: flow.description || `Users shall be able to complete the ${flow.name}`,
      acceptanceCriteria: flow.assertions || flow.steps.filter(s => s.action === 'verify').map(s => s.description),
      testable: true,
      steps: flow.steps
    });
  });

  // Requirements from forms
  forms?.forEach(form => {
    if (form.purpose !== 'generic' && form.fields.length > 0) {
      const formName = form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1);
      requirements.push({
        id: `FR-${String(reqId++).padStart(3, '0')}`,
        feature: `${formName} Form`,
        type: 'Form',
        priority: CRITICAL_FORM_PURPOSES.has(form.purpose) ? 'Critical' : 'High',
        description: `The ${form.purpose} form shall accept valid input and process submissions correctly`,
        acceptanceCriteria: [
          'All required fields are clearly marked',
          'Validation errors are displayed for invalid input',
          'Form submits successfully with valid data',
          'Appropriate feedback is shown after submission'
        ],
        testable: true,
        formFields: form.fields.map(f => f.name || f.label || f.type)
      });
    }
  });

  // Requirements from detected elements
  const elementCategories = elements ? [...new Set(elements.map(e => e.category))] : [];
  
  if (elementCategories.includes('NAVIGATION')) {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Navigation System',
      type: 'Navigation',
      priority: 'Critical',
      description: 'The website shall provide a functional navigation system',
      acceptanceCriteria: [
        'Navigation menu is visible on all pages',
        'All navigation links are functional',
        'Current page is indicated in navigation',
        'Logo links to homepage'
      ],
      testable: true
    });
  }

  if (elementCategories.includes('SEARCH')) {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Search Functionality',
      type: 'Search',
      priority: 'High',
      description: 'The website shall provide search functionality',
      acceptanceCriteria: [
        'Search box accepts text input',
        'Search results are relevant to query',
        'No results message shown for empty results',
        'Search suggestions appear (if implemented)'
      ],
      testable: true
    });
  }

  if (elementCategories.includes('MEDIA')) {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Media Content',
      type: 'Media',
      priority: 'Medium',
      description: 'Media content shall load and play correctly',
      acceptanceCriteria: [
        'Media elements load without errors',
        'Playback controls are functional',
        'Media plays without buffering issues'
      ],
      testable: true
    });
  }

  // Website-type specific requirements
  if (websiteType?.type === 'RETAIL_STORE') {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Store Branch Information',
      type: 'Business',
      priority: 'Critical',
      description: 'The website shall display accurate store/branch information',
      acceptanceCriteria: [
        'All store branches are listed',
        'Branch addresses are complete and accurate',
        'Contact information is displayed',
        'Store timings are shown',
        'Directions/map functionality works'
      ],
      testable: true
    });
  }

  if (websiteType?.type === 'ECOMMERCE') {
    requirements.push({
      id: `FR-${String(reqId++).padStart(3, '0')}`,
      feature: 'Product Catalog',
      type: 'Business',
      priority: 'Critical',
      description: 'The website shall display products with complete information',
      acceptanceCriteria: [
        'Products are displayed with images',
        'Product titles are visible',
        'Prices are clearly shown',
        'Product details are accessible',
        'Add to cart functionality works'
      ],
      testable: true
    });
  }

  return requirements;
}

/**
 * Generate risk assessment
 */
function generateRiskAssessment(analysisResult) {
  const risks = [];
  let riskId = 1;

  if (analysisResult.antiBot) {
    risks.push({
      id: `RISK-${String(riskId++).padStart(3, '0')}`,
      category: 'Technical',
      description: 'Anti-bot protection detected - automated tests may be blocked',
      probability: 'High',
      impact: 'Critical',
      mitigation: 'Use headed browser mode, add realistic delays, implement retry logic, consider manual testing for protected areas'
    });
  }

  if (analysisResult.forms?.some(f => f.purpose === 'login')) {
    risks.push({
      id: `RISK-${String(riskId++).padStart(3, '0')}`,
      category: 'Data',
      description: 'Authentication required for some features',
      probability: 'High',
      impact: 'High',
      mitigation: 'Ensure test credentials are available, valid, and not subject to rate limiting'
    });
  }

  if (analysisResult.dynamicContent) {
    risks.push({
      id: `RISK-${String(riskId++).padStart(3, '0')}`,
      category: 'Technical',
      description: 'Dynamic content framework detected - selectors may change',
      probability: 'Medium',
      impact: 'Medium',
      mitigation: 'Use data-testid selectors when available, implement robust locator strategies'
    });
  }

  // Standard risks
  risks.push({
    id: `RISK-${String(riskId++).padStart(3, '0')}`,
    category: 'Environment',
    description: 'Network instability may cause test failures',
    probability: 'Low',
    impact: 'Medium',
    mitigation: 'Implement proper timeouts and retry mechanisms, use stable test environment'
  });

  risks.push({
    id: `RISK-${String(riskId++).padStart(3, '0')}`,
    category: 'Content',
    description: 'Dynamic content may change between test runs',
    probability: 'Medium',
    impact: 'Low',
    mitigation: 'Use flexible assertions, avoid hardcoded content validation where possible'
  });

  return risks;
}

/**
 * Generate element summary
 */
function generateElementSummary(elements) {
  if (!elements || elements.length === 0) {
    return { total: 0, byCategory: {} };
  }

  const byCategory = {};
  elements.forEach(el => {
    byCategory[el.category] = (byCategory[el.category] || 0) + 1;
  });

  return {
    total: elements.length,
    byCategory,
    interactive: elements.filter(e => e.category === 'BUTTONS' || e.category === 'INTERACTIVE' || e.category === 'LINKS').length,
    forms: elements.filter(e => e.category === 'FORMS' || e.category === 'INPUTS').length,
    navigation: elements.filter(e => e.category === 'NAVIGATION' || e.category === 'HEADER' || e.category === 'FOOTER').length
  };
}

module.exports = { generateBRD, generateKeyFindings, generateInScopeItems, generateFunctionalRequirements, generateRiskAssessment, generateElementSummary };
