const { CRITICAL_FORM_PURPOSES } = require('../constants');

function generateBRD(analysisResult) {
  const { siteOverview, discoveredFeatures, discoveredForms, userFlows, domainConfig } = analysisResult;
  
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
  forms.forEach((form) => {
    if (form.purpose !== 'generic') {
      requirements.push({
        id: `FR-${String(reqId++).padStart(3, '0')}`,
        feature: `${form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1)} Form`,
        type: 'Functional',
        priority: CRITICAL_FORM_PURPOSES.has(form.purpose) ? 'Critical' : 'High',
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

module.exports = {
  generateBRD,
  generateExecutiveSummary,
  generateInScopeItems,
  generateFunctionalRequirements,
  generateRiskAssessment
};
