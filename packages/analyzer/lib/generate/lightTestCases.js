const { CRITICAL_FORM_PURPOSES } = require('../constants');

function generateTestCasesFromAnalysis(analysisResult) {
  const { discoveredFeatures, discoveredForms, userFlows, pageStructure, siteOverview } = analysisResult;
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
  discoveredForms.forEach((form) => {
    if (form.fields.length > 0) {
      // Positive test case
      testCases.push({
        id: `TC-AUTO-${String(tcId++).padStart(3, '0')}`,
        module: 'Forms',
        scenario: `${form.purpose.charAt(0).toUpperCase() + form.purpose.slice(1)} Form - Valid Submission`,
        title: `${siteOverview.title || 'Website'}: ${form.purpose} form valid submission`,
        type: 'Functional',
        priority: CRITICAL_FORM_PURPOSES.has(form.purpose) ? 'Critical' : 'High',
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

module.exports = { generateTestCasesFromAnalysis };
