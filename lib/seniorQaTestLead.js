/**
 * Senior QA Test Lead Module
 *
 * Implements AI-Assisted Test Case Generation following enterprise QA standards.
 * Based on the structured prompt approach for comprehensive test coverage.
 *
 * Capabilities:
 * - Requirement validation and gap analysis
 * - Coverage analysis and ambiguity detection
 * - Edge-case discovery and risk assessment
 * - UX validation and business flow validation
 * - Regression impact analysis
 * - Negative testing strategy
 * - Integration and dependency validation
 */

const TEST_TYPES = {
  FUNCTIONAL: 'Functional',
  UI_UX: 'UI/UX',
  INTEGRATION: 'Integration',
  REGRESSION: 'Regression',
  EDGE_CASE: 'Edge Case',
  SECURITY: 'Security',
  PERFORMANCE: 'Performance',
  DATA_VALIDATION: 'Data Validation',
  ACCESSIBILITY: 'Accessibility',
  NEGATIVE: 'Negative',
  BOUNDARY: 'Boundary',
  USABILITY: 'Usability'
};

const PRIORITIES = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

const SEVERITIES = {
  BLOCKER: 'Blocker',
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
  TRIVIAL: 'Trivial'
};

/**
 * Senior QA Test Lead Prompt Template
 * Used for AI-assisted test case generation
 */
const SENIOR_QA_TEST_LEAD_PROMPT = `You are acting as a Senior QA Test Lead with 15+ years of experience in enterprise product testing, business analysis validation, risk-based testing, and release governance.

Your task is to perform an exhaustive QA review for a feature by analyzing and correlating the following inputs:
- Solution Design Document
- BRD (Business Requirements Document)
- Figma Designs / Prototype Links
- JIRA Epic and linked stories/tasks/subtasks
- Existing manually written test cases (if provided)

Your objective is NOT just to generate test cases, but to think and review like a highly experienced Test Lead performing:
- Requirement validation
- Coverage analysis
- Gap analysis
- Ambiguity detection
- Edge-case discovery
- Risk assessment
- UX validation
- Business flow validation
- Regression impact analysis
- Negative testing strategy
- Integration and dependency validation

INSTRUCTIONS:

Step 1 — Understand and Correlate All Inputs
- Carefully read and cross-reference all provided documents
- Build a consolidated understanding of: business goals, functional scope, technical implementation, UI/UX behavior, workflows, validations, integrations, dependencies, assumptions, non-functional expectations
- Identify and document any conflicting or incomplete requirements

Step 2 — Analyze Requirements Thoroughly
- Review complete requirements and all linked user stories, subtasks, acceptance criteria
- Identify: hidden requirements, implied functionality, edge cases, integration impacts, workflow transitions, state management scenarios, permission/role considerations, backward compatibility concerns

Step 3 — Analyze UI/UX Designs in Detail
- Inspect: screen behavior, user journeys, field validations, button states, modal/dialog behavior, responsive considerations, accessibility concerns, error messaging, loading states, empty states, navigation flow, visual consistency, hidden interactions
- Cross-check behavior against requirements and acceptance criteria
- Document any mismatches or missing requirements

Step 4 — Generate Comprehensive Test Cases covering:
- Functional Testing: happy path, alternate flows, negative scenarios, validation checks, business rules
- UI/UX Testing: layout consistency, alignment, responsiveness, accessibility, visual regressions
- Integration Testing: API interactions, downstream systems, event triggers, data synchronization
- Regression Testing: impacted modules, dependency validation, legacy functionality impact
- Edge Cases: boundary values, invalid combinations, concurrency issues, session handling, partial failures
- Security & Permissions: authorization, authentication, role-based access, data exposure risks
- Non-Functional Testing: performance considerations, scalability assumptions, reliability, usability
- Data Validation: database consistency, field mapping, transformation validation

Step 5 — Compare Against Manual Test Cases
- If manual test cases are provided, compare AI-generated cases against them
- Produce coverage analysis: covered scenarios, uncovered scenarios, duplicate cases, weak cases, redundant cases
- Identify gaps: missing edge cases, missing validations, missing negative tests, missing workflow coverage, missing integration scenarios

Step 6 — Produce Final Deliverables:
1. Requirement Understanding Summary
2. Risk Assessment Report
3. Requirement Gaps & Ambiguities
4. Comprehensive Test Case Suite with: Test Case ID, Module, Scenario, Preconditions, Test Steps, Test Data, Expected Results, Priority, Severity, Type
5. Comparison Report (if manual test cases provided)
6. Test Lead Review Summary with release readiness concerns, quality risks, UAT focus recommendations, automation candidates, regression suite recommendations`;

/**
 * Parse detailed BA requirements from various input formats
 * Enhanced to handle structured BA prompt format with modules, userJourneys, requirementStatements, etc.
 */
function parseBARequirements(input) {
  const requirements = {
    title: null,
    overview: null,
    businessGoals: [],
    functionalRequirements: [],
    nonFunctionalRequirements: [],
    userStories: [],
    acceptanceCriteria: [],
    userJourneys: [],
    integrations: [],
    dependencies: [],
    assumptions: [],
    risks: [],
    constraints: [],
    outOfScope: [],
    figmaDesigns: null,
    jiraEpic: null,
    existingTestCases: [],
    rawText: null,
    // Additional fields from structured BA prompt format
    modules: [],
    channelContext: null,
    validations: [],
    businessRules: [],
    domainContext: null
  };

  if (!input) return requirements;

  // Handle string input
  if (typeof input === 'string') {
    requirements.rawText = input;
    return parseStructuredText(input, requirements);
  }

  // Handle object input (already structured)
  if (typeof input === 'object') {
    // Map structured BA requirements from the prompt format
    const mapped = { ...requirements, ...input };
    
    // Handle modules array from BA prompt format
    if (input.modules?.length) {
      mapped.modules = input.modules;
      // Convert modules to functional requirements
      input.modules.forEach((mod, i) => {
        mod.features?.forEach((feature, j) => {
          mapped.functionalRequirements.push({
            id: `FR-${mod.moduleId || i + 1}-${j + 1}`,
            feature: `${mod.name || 'Module'}: ${feature}`,
            description: feature,
            priority: mod.priority || 'High',
            acceptanceCriteria: mod.validations || [],
            testable: true,
            module: mod.name
          });
        });
      });
    }
    
    // Handle requirementStatements from BA prompt format
    if (input.requirementStatements?.length) {
      input.requirementStatements.forEach((stmt, i) => {
        if (!mapped.functionalRequirements.find(r => r.description === stmt)) {
          mapped.functionalRequirements.push({
            id: `REQ-${String(i + 1).padStart(3, '0')}`,
            feature: `Requirement ${i + 1}`,
            description: stmt,
            priority: 'High',
            acceptanceCriteria: [],
            testable: true
          });
        }
      });
    }
    
    // Handle channelContext from BA prompt format
    if (input.channelContext) {
      mapped.channelContext = input.channelContext;
      mapped.domainContext = input.channelContext.domain || input.channelContext.industry || 'General';
      
      if (input.channelContext.platforms?.length) {
        input.channelContext.platforms.forEach(platform => {
          mapped.nonFunctionalRequirements.push(`Cross-platform support: ${platform}`);
        });
      }
      
      if (input.channelContext.regions?.length) {
        input.channelContext.regions.forEach(region => {
          mapped.nonFunctionalRequirements.push(`Regional support: ${region}`);
        });
      }
    }
    
    // Handle user journeys from BA prompt format
    if (input.userJourneys?.length && !mapped.userJourneys?.length) {
      mapped.userJourneys = input.userJourneys;
    }
    
    // Handle assertions as acceptance criteria
    if (input.assertions?.length) {
      mapped.acceptanceCriteria = [...(mapped.acceptanceCriteria || []), ...input.assertions];
    }
    
    // Handle dependencies
    if (input.dependencies?.length) {
      mapped.dependencies = input.dependencies;
    }
    
    // Handle integrations
    if (input.integrations?.length) {
      mapped.integrations = input.integrations;
    }
    
    // Handle title from metadata
    if (input.metadata?.profile) {
      mapped.title = input.metadata.profile;
    }
    
    return mapped;
  }

  return requirements;
}

/**
 * Parse structured text format (markdown, plain text, etc.)
 */
function parseStructuredText(text, requirements) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let currentSection = null;
  const sections = {};

  lines.forEach(line => {
    // Detect headers
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);
    const numberedMatch = line.match(/^(\d+\.)\s*(.+)$/);

    if (h1Match) {
      requirements.title = h1Match[1].trim();
      currentSection = 'title';
      return;
    }

    if (h2Match || h3Match) {
      const header = (h2Match ? h2Match[1] : h3Match[1]).trim().toLowerCase();
      currentSection = normalizeSection(header);
      sections[currentSection] = sections[currentSection] || [];
      return;
    }

    if (numberedMatch && !currentSection) {
      currentSection = normalizeSection(numberedMatch[2].trim().toLowerCase());
      sections[currentSection] = sections[currentSection] || [];
      return;
    }

    if (currentSection && line.trim()) {
      sections[currentSection] = sections[currentSection] || [];
      sections[currentSection].push(line);
    }
  });

  // Map sections to requirements
  if (sections.overview || sections.introduction || sections.summary) {
    requirements.overview = (sections.overview || sections.introduction || sections.summary).join('\n').trim();
  }

  if (sections.businessgoals || sections.objectives || sections.goals) {
    requirements.businessGoals = parseBulletList(sections.businessgoals || sections.objectives || sections.goals);
  }

  if (sections.functionalrequirements || sections.functional || sections.requirements) {
    requirements.functionalRequirements = parseRequirementTable(
      sections.functionalrequirements || sections.functional || sections.requirements
    );
  }

  if (sections.nonfunctionalrequirements || sections.nonfunctional || sections.nfr) {
    requirements.nonFunctionalRequirements = parseBulletList(
      sections.nonfunctionalrequirements || sections.nonfunctional || sections.nfr
    );
  }

  if (sections.userstories || sections.stories) {
    requirements.userStories = parseUserStories(sections.userstories || sections.stories);
  }

  if (sections.acceptancecriteria || sections.acceptance) {
    requirements.acceptanceCriteria = parseBulletList(sections.acceptancecriteria || sections.acceptance);
  }

  if (sections.userjourney || sections.userjourneys || sections.userflow || sections.userflows) {
    requirements.userJourneys = parseBulletList(
      sections.userjourney || sections.userjourneys || sections.userflow || sections.userflows
    );
  }

  if (sections.integrations || sections.integration) {
    requirements.integrations = parseBulletList(sections.integrations || sections.integration);
  }

  if (sections.dependencies || sections.dependency) {
    requirements.dependencies = parseBulletList(sections.dependencies || sections.dependency);
  }

  if (sections.assumptions) {
    requirements.assumptions = parseBulletList(sections.assumptions);
  }

  if (sections.risks || sections.risk) {
    requirements.risks = parseBulletList(sections.risks || sections.risk);
  }

  if (sections.constraints || sections.constraint) {
    requirements.constraints = parseBulletList(sections.constraints || sections.constraint);
  }

  if (sections.outofscope || sections.exclusions) {
    requirements.outOfScope = parseBulletList(sections.outofscope || sections.exclusions);
  }

  return requirements;
}

/**
 * Normalize section names for consistency
 */
function normalizeSection(header) {
  return header
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Parse bullet list from section lines
 */
function parseBulletList(lines) {
  if (!lines || !lines.length) return [];
  return lines
    .map(line => line.replace(/^[-*+•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * Parse requirements table format
 */
function parseRequirementTable(lines) {
  if (!lines || !lines.length) return [];

  const requirements = [];
  const tableRows = lines.filter(line => line.trim().startsWith('|'));

  if (tableRows.length >= 2) {
    // Table format
    for (let i = 2; i < tableRows.length; i++) {
      const cols = tableRows[i].split('|').slice(1, -1).map(col => col.trim());
      if (cols.length >= 3) {
        const acceptanceText = cols[3] || '';
        const acceptanceCriteria = acceptanceText
          ? acceptanceText.split(/;|\.|\n/).map(item => item.trim()).filter(Boolean)
          : [];

        requirements.push({
          id: cols[0] || `FR-${i - 1}`,
          feature: cols[0] || 'Requirement',
          description: cols[1] || '',
          priority: cols[2] || 'Medium',
          acceptanceCriteria,
          testable: true
        });
      }
    }
  } else {
    // Bullet/text format
    lines.forEach((line, i) => {
      const match = line.match(/^(FR-\d+|REQ-\d+|[A-Z]+-\d+)\s*[:.-]?\s*(.+)$/i);
      if (match) {
        requirements.push({
          id: match[1],
          feature: match[1],
          description: match[2].trim(),
          priority: 'Medium',
          acceptanceCriteria: [],
          testable: true
        });
      } else if (line.trim() && !line.startsWith('|') && !line.startsWith('-')) {
        requirements.push({
          id: `FR-${String(i + 1).padStart(3, '0')}`,
          feature: `Requirement ${i + 1}`,
          description: line.trim(),
          priority: 'Medium',
          acceptanceCriteria: [],
          testable: true
        });
      }
    });
  }

  return requirements;
}

/**
 * Parse user stories from section lines
 */
function parseUserStories(lines) {
  if (!lines || !lines.length) return [];

  const stories = [];
  let currentStory = null;

  lines.forEach(line => {
    const storyMatch = line.match(/^(US-\d+|STORY-\d+)\s*[:.-]?\s*(.+)$/i);
    const asAMatch = line.match(/^As\s+(?:a|an)\s+(.+),?\s+I\s+want\s+(.+?),?\s+so\s+that\s+(.+)$/i);

    if (storyMatch) {
      if (currentStory) stories.push(currentStory);
      currentStory = {
        id: storyMatch[1],
        description: storyMatch[2].trim(),
        acceptanceCriteria: []
      };
    } else if (asAMatch) {
      if (currentStory) stories.push(currentStory);
      currentStory = {
        id: `US-${String(stories.length + 1).padStart(3, '0')}`,
        role: asAMatch[1].trim(),
        action: asAMatch[2].trim(),
        benefit: asAMatch[3].trim(),
        description: line.trim(),
        acceptanceCriteria: []
      };
    } else if (currentStory && line.trim().match(/^[-*•]\s*AC\d*[:.-]?\s*/i)) {
      currentStory.acceptanceCriteria.push(line.replace(/^[-*•]\s*AC\d*[:.-]?\s*/i, '').trim());
    } else if (currentStory && line.trim().match(/^[-*•]\s*/)) {
      currentStory.acceptanceCriteria.push(line.replace(/^[-*•]\s*/, '').trim());
    }
  });

  if (currentStory) stories.push(currentStory);
  return stories;
}

/**
 * Generate comprehensive test cases from BA requirements
 * Following Senior QA Test Lead methodology
 */
function generateComprehensiveTestCases(baRequirements, webAnalysis = null, existingTestCases = []) {
  const testCases = [];
  const profile = baRequirements.title || webAnalysis?.siteOverview?.title || 'Application';
  const siteUrl = webAnalysis?.url || baRequirements.url || '';
  const siteName = webAnalysis?.websiteType?.typeName || profile;
  let tcCounter = 1;

  // Build context object for step generators
  const context = {
    url: siteUrl,
    siteName: siteName,
    profile: profile,
    domain: webAnalysis?.websiteType?.type || baRequirements.domainContext || 'GENERAL'
  };

  const generateId = (type) => {
    const id = `TC-${type}-${String(tcCounter).padStart(3, '0')}`;
    tcCounter++;
    return id;
  };

  // 1. Generate Functional Test Cases (Happy Path)
  if (baRequirements.functionalRequirements?.length) {
    baRequirements.functionalRequirements.forEach((req, index) => {
      const reqContext = { ...context, ...req };

      // Happy path test case
      testCases.push({
        id: generateId('FUNC'),
        module: req.module || req.feature || `Functional Requirement ${index + 1}`,
        scenario: `Verify ${req.description?.slice(0, 100) || req.feature}`,
        title: `${siteName}: ${req.feature} - Happy Path Verification`,
        type: TEST_TYPES.FUNCTIONAL,
        priority: mapPriority(req.priority),
        severity: SEVERITIES.MAJOR,
        preconditions: [
          siteUrl ? `Browser opened at ${siteUrl}` : 'Browser is ready',
          'Network connection is stable',
          'Test data is prepared for this scenario',
          req.preconditions || 'All dependencies are available'
        ].join('\n'),
        testData: generateTestData(req, context),
        steps: generateStepsFromRequirement(req, reqContext),
        expectedResult: req.acceptanceCriteria?.length
          ? req.acceptanceCriteria.join('\n')
          : `${req.description} functionality works as expected`,
        traceability: `BRD Requirement: ${req.id}`,
        automationCandidate: true,
        riskLevel: 'Medium'
      });

      // Negative test case for each requirement
      testCases.push({
        id: generateId('NEG'),
        module: req.module || req.feature || `Functional Requirement ${index + 1}`,
        scenario: `${req.feature} - Negative/Error Handling`,
        title: `${siteName}: ${req.feature} - Negative Testing`,
        type: TEST_TYPES.NEGATIVE,
        priority: PRIORITIES.HIGH,
        severity: SEVERITIES.MAJOR,
        preconditions: [
          siteUrl ? `Browser opened at ${siteUrl}` : 'Browser is ready',
          'Test environment is stable'
        ].join('\n'),
        testData: generateNegativeTestData(req, context),
        steps: generateNegativeSteps(req, reqContext),
        expectedResult: 'System handles all invalid inputs gracefully with user-friendly error messages. No sensitive information exposed. User can recover and continue.',
        traceability: `BRD Requirement: ${req.id} (Negative)`,
        automationCandidate: true,
        riskLevel: 'High'
      });
    });
  }

  // 2. Generate User Story Test Cases
  if (baRequirements.userStories?.length) {
    baRequirements.userStories.forEach((story, index) => {
      testCases.push({
        id: generateId('US'),
        module: 'User Story',
        scenario: story.description?.slice(0, 100) || `User Story ${index + 1}`,
        title: `${profile}: ${story.id || `US-${index + 1}`} - Story Verification`,
        type: TEST_TYPES.FUNCTIONAL,
        priority: PRIORITIES.HIGH,
        severity: SEVERITIES.CRITICAL,
        preconditions: [
          `As ${story.role || 'a user'}`,
          'User has appropriate permissions',
          'System is accessible'
        ].join('\n'),
        testData: 'Valid user credentials and required test data',
        steps: story.acceptanceCriteria?.length
          ? story.acceptanceCriteria.map((ac, i) => `Step ${i + 1}: Verify - ${ac}`)
          : [`Navigate to feature`, `Execute: ${story.action || story.description}`, `Verify: ${story.benefit || 'Expected outcome'}`],
        expectedResult: story.acceptanceCriteria?.length
          ? story.acceptanceCriteria.join('\n')
          : story.benefit || 'User story requirements are met',
        traceability: `User Story: ${story.id || `US-${index + 1}`}`,
        automationCandidate: true,
        riskLevel: 'High'
      });
    });
  }

  // 3. Generate User Journey Test Cases
  if (baRequirements.userJourneys?.length) {
    baRequirements.userJourneys.forEach((journey, index) => {
      const journeyText = typeof journey === 'string' ? journey : journey.name || journey.description || `Journey ${index + 1}`;
      const journeyLower = journeyText.toLowerCase();

      // Generate SPECIFIC journey steps based on journey type
      let journeySteps = [];
      if (journeyLower.includes('navigation') || journeyLower.includes('menu')) {
        journeySteps = [
          `Step 1: Open ${siteUrl || 'the application'} in browser`,
          'Step 2: Verify homepage loads with navigation menu visible',
          'Step 3: Click on first navigation item and verify page loads',
          'Step 4: Click on each subsequent navigation item',
          'Step 5: Verify each page loads within 3 seconds',
          'Step 6: Click logo and verify return to homepage',
          'Step 7: Verify active state indication throughout journey'
        ];
      } else if (journeyLower.includes('store') || journeyLower.includes('branch') || journeyLower.includes('location')) {
        journeySteps = [
          `Step 1: Navigate to ${siteUrl || 'the application'}`,
          'Step 2: Locate and click on "Find Store" or Store Locator link',
          'Step 3: Enter valid pincode (e.g., 600002) in search field',
          'Step 4: Click Search and wait for results',
          'Step 5: Verify store results display with name, address, phone, hours',
          'Step 6: Click on a store card to view details',
          'Step 7: Click "Get Directions" and verify map opens correctly',
          'Step 8: Return to store locator and search different location'
        ];
      } else if (journeyLower.includes('product') || journeyLower.includes('category') || journeyLower.includes('browse')) {
        journeySteps = [
          `Step 1: Navigate to ${siteUrl || 'the application'}`,
          'Step 2: Click on Products or main category in navigation',
          'Step 3: Verify product categories are displayed',
          'Step 4: Click on a specific category (e.g., Gold Jewelry)',
          'Step 5: Verify products load with images, names, prices',
          'Step 6: Apply filters if available (price, type)',
          'Step 7: Click on a product to view details',
          'Step 8: Verify product detail page shows complete information',
          'Step 9: Navigate back and verify state is preserved'
        ];
      } else if (journeyLower.includes('contact')) {
        journeySteps = [
          `Step 1: Navigate to ${siteUrl || 'the application'}`,
          'Step 2: Locate Contact link in header/footer',
          'Step 3: Click and verify Contact page loads',
          'Step 4: Verify contact form is visible',
          'Step 5: Fill in Name field with "Test User"',
          'Step 6: Fill in Email field with "test@example.com"',
          'Step 7: Fill in Message field with inquiry text',
          'Step 8: Submit form and verify success message'
        ];
      } else if (journeyLower.includes('footer')) {
        journeySteps = [
          `Step 1: Navigate to ${siteUrl || 'the application'}`,
          'Step 2: Scroll to the bottom of the page',
          'Step 3: Verify footer section is visible',
          'Step 4: Verify contact information is displayed',
          'Step 5: Click each footer link and verify page loads',
          'Step 6: Verify social media links open correct platforms',
          'Step 7: Verify legal links (Privacy, Terms) are accessible'
        ];
      } else if (journeyLower.includes('image') || journeyLower.includes('gallery') || journeyLower.includes('promotion')) {
        journeySteps = [
          `Step 1: Navigate to ${siteUrl || 'the application'}`,
          'Step 2: Verify promotional banners/images load on homepage',
          'Step 3: If carousel present, click next/prev to navigate',
          'Step 4: Verify all images load without broken placeholders',
          'Step 5: Click on promotional banner if linked',
          'Step 6: Verify landing page for promotion loads correctly',
          'Step 7: Navigate to gallery section if available',
          'Step 8: Verify image zoom/lightbox works if present'
        ];
      } else {
        // Generic but better journey steps
        journeySteps = [
          `Step 1: Navigate to ${siteUrl || 'the application'}`,
          `Step 2: Locate and access the ${journeyText.slice(0, 50)} feature`,
          'Step 3: Complete the primary action for this journey',
          'Step 4: Verify expected outcome and state changes',
          'Step 5: Navigate through any related screens',
          'Step 6: Verify data persistence where applicable',
          'Step 7: Complete journey and verify end state'
        ];
      }

      testCases.push({
        id: generateId('JOUR'),
        module: 'User Journey',
        scenario: `End-to-End: ${journeyText.slice(0, 80)}`,
        title: `${siteName}: ${journeyText.slice(0, 50)} - E2E Verification`,
        type: TEST_TYPES.FUNCTIONAL,
        priority: PRIORITIES.CRITICAL,
        severity: SEVERITIES.CRITICAL,
        preconditions: [
          siteUrl ? `Browser ready to navigate to ${siteUrl}` : 'Browser is ready',
          'Network connection is stable',
          'Test data is prepared for end-to-end flow'
        ].join('\n'),
        testData: 'Complete test data set for end-to-end flow as specified in journey steps',
        steps: journeySteps,
        expectedResult: `User journey "${journeyText.slice(0, 60)}" completes successfully. All intermediate steps pass. Final state matches expected outcome.`,
        traceability: `User Journey: UJ-${index + 1}`,
        automationCandidate: true,
        riskLevel: 'Critical'
      });
    });
  }

  // 4. Generate Integration Test Cases
  if (baRequirements.integrations?.length) {
    baRequirements.integrations.forEach((integration, index) => {
      testCases.push({
        id: generateId('INT'),
        module: 'Integration',
        scenario: `Integration: ${integration.slice(0, 80)}`,
        title: `${profile}: Integration Point ${index + 1} - Verification`,
        type: TEST_TYPES.INTEGRATION,
        priority: PRIORITIES.HIGH,
        severity: SEVERITIES.CRITICAL,
        preconditions: [
          'All integrated systems are accessible',
          'API endpoints are available',
          'Authentication is configured',
          'Test data is synchronized across systems'
        ].join('\n'),
        testData: 'Integration test data with valid API credentials',
        steps: [
          `Step 1: Verify integration point - ${integration}`,
          'Step 2: Send request to integrated system',
          'Step 3: Verify response received',
          'Step 4: Validate data synchronization',
          'Step 5: Check for data consistency across systems'
        ],
        expectedResult: `Integration "${integration}" functions correctly with proper data flow`,
        traceability: `Integration: INT-${index + 1}`,
        automationCandidate: true,
        riskLevel: 'High'
      });
    });
  }

  // 5. Generate UI/UX Test Cases from Web Analysis
  if (webAnalysis?.features?.length) {
    webAnalysis.features.forEach((feature, index) => {
      const featureName = feature.name || 'UI Feature';
      const featureLower = featureName.toLowerCase();

      // Generate SPECIFIC UI test steps based on feature type
      let uiSteps = [];
      if (featureLower.includes('navigation') || featureLower.includes('menu') || featureLower.includes('header')) {
        uiSteps = [
          `Step 1: Open ${siteUrl || 'the application'} and observe header/navigation area`,
          'Step 2: Verify navigation menu is horizontally aligned and properly spaced',
          'Step 3: Hover over menu items and verify hover states (color change, underline)',
          'Step 4: Resize browser to tablet (768px) and verify menu adapts',
          'Step 5: Resize to mobile (375px) and verify hamburger menu appears',
          'Step 6: Click hamburger and verify mobile menu slides in smoothly',
          'Step 7: Verify menu items have adequate touch targets (44x44px minimum)',
          'Step 8: Tab through navigation using keyboard and verify focus indicators visible'
        ];
      } else if (featureLower.includes('footer')) {
        uiSteps = [
          `Step 1: Navigate to ${siteUrl || 'the application'} and scroll to footer`,
          'Step 2: Verify footer spans full width and has consistent background',
          'Step 3: Verify footer content is properly aligned in columns',
          'Step 4: Verify contact information is readable (font size >= 14px)',
          'Step 5: Verify social media icons are aligned and properly sized',
          'Step 6: Resize to mobile and verify footer stacks vertically',
          'Step 7: Verify footer links have proper hover states',
          'Step 8: Tab through footer links and verify keyboard accessibility'
        ];
      } else if (featureLower.includes('store') || featureLower.includes('locator') || featureLower.includes('branch')) {
        uiSteps = [
          `Step 1: Navigate to Store Locator page`,
          'Step 2: Verify search input field is prominently displayed',
          'Step 3: Verify search button has clear visual affordance',
          'Step 4: Enter pincode and verify results layout (cards or list)',
          'Step 5: Verify store cards show consistent formatting',
          'Step 6: Verify map integration loads without layout shift',
          'Step 7: Resize to mobile and verify responsive layout',
          'Step 8: Verify error states are styled consistently'
        ];
      } else if (featureLower.includes('product') || featureLower.includes('category') || featureLower.includes('catalog')) {
        uiSteps = [
          `Step 1: Navigate to product category page`,
          'Step 2: Verify product grid has consistent card sizes',
          'Step 3: Verify product images have same aspect ratio',
          'Step 4: Verify price formatting is consistent (₹XX,XXX)',
          'Step 5: Hover over product card and verify hover effects',
          'Step 6: Verify "Add to Cart" button has clear visual prominence',
          'Step 7: Resize to tablet and verify 2-3 column layout',
          'Step 8: Resize to mobile and verify single column layout'
        ];
      } else if (featureLower.includes('form') || featureLower.includes('contact')) {
        uiSteps = [
          `Step 1: Navigate to the form/contact page`,
          'Step 2: Verify form fields are properly labeled',
          'Step 3: Verify required field indicators (*) are visible',
          'Step 4: Verify input fields have consistent styling (border, padding)',
          'Step 5: Click into a field and verify focus state (border color change)',
          'Step 6: Enter invalid data and verify error message styling',
          'Step 7: Verify submit button has prominent styling',
          'Step 8: Verify form is accessible via keyboard (tab order correct)'
        ];
      } else if (featureLower.includes('image') || featureLower.includes('gallery') || featureLower.includes('banner') || featureLower.includes('carousel')) {
        uiSteps = [
          `Step 1: Navigate to page with ${featureName}`,
          'Step 2: Verify images load without layout shift (CLS < 0.1)',
          'Step 3: Verify image quality is crisp at current resolution',
          'Step 4: If carousel, verify navigation arrows are visible',
          'Step 5: Verify carousel dots/indicators show current position',
          'Step 6: Verify images are responsive across breakpoints',
          'Step 7: Verify lazy-loaded images show placeholders while loading',
          'Step 8: Verify image alt text is present for accessibility'
        ];
      } else {
        // Generic UI test steps but more specific
        uiSteps = [
          `Step 1: Navigate to ${featureName} section at ${siteUrl || 'the application'}`,
          `Step 2: Verify ${featureName} component is visible and properly positioned`,
          'Step 3: Verify layout consistency with design system',
          'Step 4: Verify color contrast meets WCAG AA (4.5:1 for text)',
          'Step 5: Verify interactive elements have hover/focus states',
          'Step 6: Resize viewport to 1920px, 768px, 375px and verify responsiveness',
          'Step 7: Verify touch targets are minimum 44x44px on mobile',
          'Step 8: Verify keyboard navigation and focus indicators'
        ];
      }

      testCases.push({
        id: generateId('UI'),
        module: featureName,
        scenario: `UI/UX: ${featureName} - Visual & Interaction Verification`,
        title: `${siteName}: ${featureName} - UI/UX Testing`,
        type: TEST_TYPES.UI_UX,
        priority: feature.type === 'core' ? PRIORITIES.HIGH : PRIORITIES.MEDIUM,
        severity: SEVERITIES.MAJOR,
        preconditions: [
          siteUrl ? `Browser opened at ${siteUrl}` : 'Page is loaded',
          'Browser DevTools available for viewport testing',
          'Color contrast analyzer available'
        ].join('\n'),
        testData: 'Viewport sizes: 1920x1080 (desktop), 768x1024 (tablet), 375x667 (mobile)',
        steps: uiSteps,
        expectedResult: `${featureName} displays correctly with proper styling, responsive behavior, and accessibility. All interactive elements have appropriate visual feedback.`,
        traceability: `Web Analysis: FEAT-${index + 1}`,
        automationCandidate: true,
        riskLevel: 'Medium'
      });
    });
  }

  // 6. Generate Edge Case and Boundary Test Cases
  if (baRequirements.functionalRequirements?.length) {
    testCases.push({
      id: generateId('EDGE'),
      module: 'Edge Cases',
      scenario: 'Boundary Value Analysis - Input Fields',
      title: `${profile}: Boundary Value Testing - All Input Fields`,
      type: TEST_TYPES.BOUNDARY,
      priority: PRIORITIES.HIGH,
      severity: SEVERITIES.MAJOR,
      preconditions: 'Application is accessible with all forms available',
      testData: [
        'Empty values', 'Minimum boundary values', 'Maximum boundary values',
        'Values just below minimum', 'Values just above maximum',
        'Special characters', 'Unicode characters', 'Very long strings'
      ].join('\n'),
      steps: [
        'Step 1: Identify all input fields in the application',
        'Step 2: Test each field with empty value',
        'Step 3: Test with minimum boundary value',
        'Step 4: Test with maximum boundary value',
        'Step 5: Test with boundary +/- 1 values',
        'Step 6: Test with special characters and unicode',
        'Step 7: Document all validation messages'
      ],
      expectedResult: 'All input validations work correctly at boundaries with appropriate error messages',
      traceability: 'Edge Case Testing',
      automationCandidate: true,
      riskLevel: 'High'
    });

    testCases.push({
      id: generateId('EDGE'),
      module: 'Edge Cases',
      scenario: 'Concurrent Session Handling',
      title: `${profile}: Concurrent User Session Testing`,
      type: TEST_TYPES.EDGE_CASE,
      priority: PRIORITIES.HIGH,
      severity: SEVERITIES.CRITICAL,
      preconditions: 'Multiple browser sessions are available',
      testData: 'Same user credentials for concurrent login attempts',
      steps: [
        'Step 1: Login with user credentials in Browser 1',
        'Step 2: Open new browser session (Browser 2)',
        'Step 3: Attempt login with same credentials',
        'Step 4: Verify session handling behavior',
        'Step 5: Perform actions in both sessions (if allowed)',
        'Step 6: Verify data consistency across sessions'
      ],
      expectedResult: 'Application handles concurrent sessions according to security policy',
      traceability: 'Edge Case: Concurrent Sessions',
      automationCandidate: false,
      riskLevel: 'Critical'
    });
  }

  // 7. Generate Security Test Cases
  testCases.push({
    id: generateId('SEC'),
    module: 'Security',
    scenario: 'Authentication - Invalid Credentials',
    title: `${profile}: Security - Invalid Login Attempts`,
    type: TEST_TYPES.SECURITY,
    priority: PRIORITIES.CRITICAL,
    severity: SEVERITIES.BLOCKER,
    preconditions: 'Login page is accessible',
    testData: [
      'Invalid username with valid password',
      'Valid username with invalid password',
      'SQL injection attempts',
      'XSS payloads',
      'Empty credentials'
    ].join('\n'),
    steps: [
      'Step 1: Attempt login with invalid username',
      'Step 2: Verify error message does not reveal valid usernames',
      'Step 3: Attempt login with invalid password',
      'Step 4: Verify account lockout after multiple failed attempts',
      'Step 5: Test for SQL injection in login fields',
      'Step 6: Test for XSS vulnerabilities',
      'Step 7: Verify secure error messages'
    ],
    expectedResult: 'Application securely handles all invalid authentication attempts without exposing sensitive information',
    traceability: 'Security Testing: Authentication',
    automationCandidate: true,
    riskLevel: 'Critical'
  });

  testCases.push({
    id: generateId('SEC'),
    module: 'Security',
    scenario: 'Authorization - Role-Based Access Control',
    title: `${profile}: Security - RBAC Verification`,
    type: TEST_TYPES.SECURITY,
    priority: PRIORITIES.CRITICAL,
    severity: SEVERITIES.BLOCKER,
    preconditions: 'Multiple user roles are configured in the system',
    testData: 'User accounts with different roles (Admin, User, Guest, etc.)',
    steps: [
      'Step 1: Login as Admin user and note accessible features',
      'Step 2: Login as regular User and verify restricted access',
      'Step 3: Attempt to access admin URLs directly as regular user',
      'Step 4: Verify API endpoints enforce authorization',
      'Step 5: Test horizontal privilege escalation attempts',
      'Step 6: Test vertical privilege escalation attempts'
    ],
    expectedResult: 'Role-based access control is properly enforced across all features and APIs',
    traceability: 'Security Testing: Authorization',
    automationCandidate: true,
    riskLevel: 'Critical'
  });

  // 8. Generate Accessibility Test Cases
  testCases.push({
    id: generateId('ACC'),
    module: 'Accessibility',
    scenario: 'WCAG 2.1 Compliance - Keyboard Navigation',
    title: `${profile}: Accessibility - Keyboard Navigation`,
    type: TEST_TYPES.ACCESSIBILITY,
    priority: PRIORITIES.HIGH,
    severity: SEVERITIES.MAJOR,
    preconditions: 'Application is loaded in browser without mouse',
    testData: 'Keyboard-only navigation through all interactive elements',
    steps: [
      'Step 1: Navigate to application using Tab key only',
      'Step 2: Verify focus indicators are visible on all focusable elements',
      'Step 3: Verify logical tab order',
      'Step 4: Test all interactive elements using Enter/Space keys',
      'Step 5: Test dropdown menus and modals with keyboard',
      'Step 6: Verify Escape key closes modals/dropdowns',
      'Step 7: Test skip navigation links'
    ],
    expectedResult: 'All functionality is accessible via keyboard with visible focus indicators',
    traceability: 'Accessibility: WCAG 2.1 AA',
    automationCandidate: true,
    riskLevel: 'High'
  });

  testCases.push({
    id: generateId('ACC'),
    module: 'Accessibility',
    scenario: 'Screen Reader Compatibility',
    title: `${profile}: Accessibility - Screen Reader Testing`,
    type: TEST_TYPES.ACCESSIBILITY,
    priority: PRIORITIES.HIGH,
    severity: SEVERITIES.MAJOR,
    preconditions: 'Screen reader software is installed and configured',
    testData: 'Complete user journey using screen reader only',
    steps: [
      'Step 1: Enable screen reader (NVDA/JAWS/VoiceOver)',
      'Step 2: Navigate to application',
      'Step 3: Verify all images have meaningful alt text',
      'Step 4: Verify form labels are properly associated',
      'Step 5: Verify ARIA landmarks are present',
      'Step 6: Verify error messages are announced',
      'Step 7: Complete key user flows using screen reader only'
    ],
    expectedResult: 'Application is fully usable with screen reader with all content properly announced',
    traceability: 'Accessibility: Screen Reader',
    automationCandidate: false,
    riskLevel: 'High'
  });

  // 9. Generate Performance Test Cases
  testCases.push({
    id: generateId('PERF'),
    module: 'Performance',
    scenario: 'Page Load Performance',
    title: `${profile}: Performance - Page Load Time`,
    type: TEST_TYPES.PERFORMANCE,
    priority: PRIORITIES.HIGH,
    severity: SEVERITIES.MAJOR,
    preconditions: 'Network conditions are stable, browser cache is cleared',
    testData: 'Performance metrics using browser developer tools',
    steps: [
      'Step 1: Clear browser cache and cookies',
      'Step 2: Open browser developer tools, go to Network tab',
      'Step 3: Navigate to application URL',
      'Step 4: Record page load time (DOMContentLoaded)',
      'Step 5: Record full page load time (Load event)',
      'Step 6: Record Largest Contentful Paint (LCP)',
      'Step 7: Check for render-blocking resources'
    ],
    expectedResult: 'Page loads within 3 seconds, LCP under 2.5 seconds, no significant render-blocking resources',
    traceability: 'Performance: Core Web Vitals',
    automationCandidate: true,
    riskLevel: 'Medium'
  });

  // 10. Generate Regression Test Cases
  if (baRequirements.dependencies?.length) {
    baRequirements.dependencies.forEach((dep, index) => {
      testCases.push({
        id: generateId('REG'),
        module: 'Regression',
        scenario: `Regression: Verify ${dep} after changes`,
        title: `${profile}: Regression - ${dep.slice(0, 50)}`,
        type: TEST_TYPES.REGRESSION,
        priority: PRIORITIES.HIGH,
        severity: SEVERITIES.CRITICAL,
        preconditions: 'Feature changes have been deployed to test environment',
        testData: 'Existing test data from previous releases',
        steps: [
          `Step 1: Verify ${dep} functionality works as before`,
          'Step 2: Execute existing test cases for this module',
          'Step 3: Compare results with baseline',
          'Step 4: Verify no unintended side effects',
          'Step 5: Check data integrity'
        ],
        expectedResult: `${dep} continues to work correctly without regression`,
        traceability: `Regression: DEP-${index + 1}`,
        automationCandidate: true,
        riskLevel: 'High'
      });
    });
  }

  // 11. Data Validation Test Cases
  testCases.push({
    id: generateId('DATA'),
    module: 'Data Validation',
    scenario: 'Data Persistence Verification',
    title: `${profile}: Data Validation - CRUD Operations`,
    type: TEST_TYPES.DATA_VALIDATION,
    priority: PRIORITIES.HIGH,
    severity: SEVERITIES.CRITICAL,
    preconditions: 'Database is accessible, user has data modification permissions',
    testData: 'Various data sets for Create, Read, Update, Delete operations',
    steps: [
      'Step 1: Create new record with valid data',
      'Step 2: Verify record is saved correctly in database',
      'Step 3: Read the record and verify all fields',
      'Step 4: Update the record and save',
      'Step 5: Verify updates are persisted correctly',
      'Step 6: Delete the record',
      'Step 7: Verify record is properly removed'
    ],
    expectedResult: 'All CRUD operations work correctly with data integrity maintained',
    traceability: 'Data Validation: CRUD',
    automationCandidate: true,
    riskLevel: 'High'
  });

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'Senior QA Test Lead Agent',
      profile,
      methodology: 'AI-Assisted Test Case Generation with Enterprise QA Standards',
      totalCases: testCases.length,
      coverageBreakdown: getCoverageBreakdown(testCases),
      qualityGate: {
        structureRate: calculateStructureRate(testCases),
        minAcceptedStructureRate: '95%'
      }
    },
    testCases,
    riskAssessment: generateRiskAssessment(baRequirements, testCases),
    gapAnalysis: generateGapAnalysis(baRequirements, existingTestCases, testCases),
    testLeadSummary: generateTestLeadSummary(baRequirements, testCases)
  };
}

/**
 * Helper functions
 */
function mapPriority(priority) {
  if (!priority) return PRIORITIES.MEDIUM;
  const p = priority.toLowerCase();
  if (p.includes('critical') || p.includes('p0')) return PRIORITIES.CRITICAL;
  if (p.includes('high') || p.includes('p1')) return PRIORITIES.HIGH;
  if (p.includes('low') || p.includes('p3')) return PRIORITIES.LOW;
  return PRIORITIES.MEDIUM;
}

function generateTestData(req, context = {}) {
  const description = (req.description || '').toLowerCase();
  const feature = (req.feature || '').toLowerCase();
  const combined = description + ' ' + feature;

  // Generate SPECIFIC test data based on feature type
  if (combined.includes('store') || combined.includes('branch') || combined.includes('location') || combined.includes('locator')) {
    return [
      'Valid pincode: "600002" (Chennai area)',
      'Valid pincode: "400001" (Mumbai area)',
      'Valid city name: "Chennai"',
      'Expected fields: Store Name, Address, Phone, Hours'
    ].join('\n');
  }

  if (combined.includes('contact') || combined.includes('email') || combined.includes('form')) {
    return [
      'Name: "Test User"',
      'Email: "testuser@example.com"',
      'Phone: "+91-9876543210"',
      'Message: "This is a test inquiry about your services."'
    ].join('\n');
  }

  if (combined.includes('search')) {
    return [
      'Search term with results: "gold ring"',
      'Search term with results: "necklace"',
      'Partial search: "dia" (for diamonds)',
      'Category search: "earrings"'
    ].join('\n');
  }

  if (combined.includes('product') || combined.includes('category') || combined.includes('catalog')) {
    return [
      'Product category: "Gold Jewelry"',
      'Product category: "Silver Items"',
      'Product category: "Diamonds"',
      'Filter: Price range ₹10,000 - ₹50,000'
    ].join('\n');
  }

  if (combined.includes('login') || combined.includes('signin') || combined.includes('auth')) {
    return [
      'Valid username: "testuser@example.com"',
      'Valid password: "SecureP@ss123"',
      'Remember me: checked/unchecked'
    ].join('\n');
  }

  if (combined.includes('cart') || combined.includes('checkout') || combined.includes('order')) {
    return [
      'Product: Any available product',
      'Quantity: 1, 2, 5',
      'Shipping address: Complete valid address',
      'Payment method: Available payment options'
    ].join('\n');
  }

  if (combined.includes('navigation') || combined.includes('menu')) {
    return [
      'Navigation items to test: Home, Products, About, Contact',
      'Expected page titles for each section',
      'Logo click should return to homepage'
    ].join('\n');
  }

  if (combined.includes('footer')) {
    return [
      'Footer links: Privacy Policy, Terms, Contact',
      'Social media links: Facebook, Twitter, Instagram',
      'Contact info: Phone, Email, Address'
    ].join('\n');
  }

  if (combined.includes('image') || combined.includes('gallery') || combined.includes('banner')) {
    return [
      'Image count verification',
      'Image load time measurement',
      'Carousel/slider navigation',
      'Image resolution check'
    ].join('\n');
  }

  // Default contextual test data
  return [
    'Valid test data appropriate for the feature',
    context.url ? `Test URL: ${context.url}` : 'Application URL',
    'Standard user credentials if required'
  ].join('\n');
}

function generateNegativeTestData(req, context = {}) {
  const description = (req.description || '').toLowerCase();
  const feature = (req.feature || '').toLowerCase();
  const combined = description + ' ' + feature;

  if (combined.includes('store') || combined.includes('branch') || combined.includes('location') || combined.includes('locator')) {
    return [
      'Invalid pincode: "999999" (non-existent)',
      'Invalid pincode: "000000"',
      'Non-numeric: "ABCDEF"',
      'Empty pincode: ""',
      'Special chars: "600<>2"',
      'SQL injection: "\' OR 1=1 --"'
    ].join('\n');
  }

  if (combined.includes('contact') || combined.includes('email') || combined.includes('form')) {
    return [
      'Invalid email: "not-an-email"',
      'Invalid email: "user@"',
      'Empty required fields',
      'XSS attempt: "<script>alert(1)</script>"',
      'Very long input: 10000+ characters',
      'Special chars in name: "Test<>User"'
    ].join('\n');
  }

  if (combined.includes('search')) {
    return [
      'Empty search: ""',
      'No results term: "xyznonexistent12345"',
      'Very long query: 500+ characters',
      'Special characters: "!@#$%^&*()"',
      'SQL injection: "\' OR 1=1 --"'
    ].join('\n');
  }

  if (combined.includes('login') || combined.includes('signin') || combined.includes('auth')) {
    return [
      'Invalid username: "nonexistent@test.com"',
      'Invalid password: "wrongpassword"',
      'Empty credentials',
      'SQL injection in username: "\' OR 1=1 --"',
      'XSS in password field'
    ].join('\n');
  }

  if (combined.includes('cart') || combined.includes('quantity')) {
    return [
      'Quantity: 0',
      'Quantity: -1',
      'Quantity: 999999 (exceeds stock)',
      'Non-numeric quantity: "abc"'
    ].join('\n');
  }

  // Default negative test data
  return [
    'Empty/null values for required fields',
    'Boundary values: min-1, max+1',
    'XSS payload: <script>alert("xss")</script>',
    'SQL injection: \' OR 1=1 --',
    'Very long strings (1000+ chars)',
    'Invalid data types'
  ].join('\n');
}

function generateStepsFromRequirement(req, context = {}) {
  const steps = [];
  const url = context.url || req.url || '';
  const moduleName = req.module || req.feature || 'the feature';
  const description = req.description || '';

  // Generate SPECIFIC navigation step with actual URL
  if (url) {
    steps.push(`Step 1: Open browser and navigate to ${url}`);
  } else {
    steps.push(`Step 1: Navigate to the ${moduleName} section of the application`);
  }

  // If we have acceptance criteria, use them with specific context
  if (req.acceptanceCriteria?.length) {
    req.acceptanceCriteria.forEach((ac, i) => {
      // Make the acceptance criteria actionable
      const actionVerb = ac.toLowerCase().startsWith('verify') || ac.toLowerCase().startsWith('ensure')
        ? ac
        : `Verify that ${ac}`;
      steps.push(`Step ${i + 2}: ${actionVerb}`);
    });
  } else {
    // Generate contextual steps based on description/feature type
    const lowerDesc = description.toLowerCase();
    const lowerModule = moduleName.toLowerCase();

    if (lowerDesc.includes('navigation') || lowerModule.includes('navigation') || lowerModule.includes('menu')) {
      steps.push(`Step 2: Locate the main navigation menu/header on the page`);
      steps.push(`Step 3: Click on each navigation link and verify it loads the correct page`);
      steps.push(`Step 4: Verify the logo is displayed and clicking it returns to homepage`);
      steps.push(`Step 5: Verify current page indicator/active state in navigation`);
    } else if (lowerDesc.includes('footer') || lowerModule.includes('footer')) {
      steps.push(`Step 2: Scroll to the bottom of the page to view footer section`);
      steps.push(`Step 3: Verify footer contains company contact information (address, phone, email)`);
      steps.push(`Step 4: Click each footer link and verify it loads the correct page`);
      steps.push(`Step 5: Verify social media icons are present and links open correct social pages`);
    } else if (lowerDesc.includes('store') || lowerDesc.includes('branch') || lowerDesc.includes('location')) {
      steps.push(`Step 2: Locate the Store Locator / Find Store section`);
      steps.push(`Step 3: Enter a valid pincode/location in the search field`);
      steps.push(`Step 4: Click Search and verify store results are displayed`);
      steps.push(`Step 5: Verify each store card shows: name, address, phone number, operating hours`);
      steps.push(`Step 6: Click on a store to view detailed information`);
      steps.push(`Step 7: Verify "Get Directions" link opens map with correct location`);
    } else if (lowerDesc.includes('product') || lowerDesc.includes('category') || lowerDesc.includes('catalog')) {
      steps.push(`Step 2: Locate product categories in navigation or homepage`);
      steps.push(`Step 3: Click on a product category to view products`);
      steps.push(`Step 4: Verify products display with: image, name, price, and description`);
      steps.push(`Step 5: Verify pagination or infinite scroll works correctly`);
      steps.push(`Step 6: Click on a product to view product detail page`);
      steps.push(`Step 7: Verify all product details, images, and pricing are accurate`);
    } else if (lowerDesc.includes('contact') || lowerModule.includes('contact')) {
      steps.push(`Step 2: Navigate to Contact Us page`);
      steps.push(`Step 3: Verify contact form is displayed with required fields`);
      steps.push(`Step 4: Fill in all required fields with valid data`);
      steps.push(`Step 5: Submit the form and verify success message`);
      steps.push(`Step 6: Verify company contact details are displayed (phone, email, address)`);
    } else if (lowerDesc.includes('search')) {
      steps.push(`Step 2: Locate the search input field`);
      steps.push(`Step 3: Enter a valid search term and submit`);
      steps.push(`Step 4: Verify search results page displays relevant items`);
      steps.push(`Step 5: Verify search result count is displayed`);
      steps.push(`Step 6: Click on a search result and verify correct page opens`);
    } else if (lowerDesc.includes('image') || lowerDesc.includes('gallery') || lowerDesc.includes('banner')) {
      steps.push(`Step 2: Identify all images/banners on the page`);
      steps.push(`Step 3: Verify each image loads completely without broken placeholders`);
      steps.push(`Step 4: Verify image carousel/slider navigation works (if present)`);
      steps.push(`Step 5: Verify images are responsive and display correctly on different screen sizes`);
    } else if (lowerDesc.includes('login') || lowerDesc.includes('signin') || lowerDesc.includes('auth')) {
      steps.push(`Step 2: Navigate to the login/sign-in page`);
      steps.push(`Step 3: Enter valid username/email in the username field`);
      steps.push(`Step 4: Enter valid password in the password field`);
      steps.push(`Step 5: Click the Login/Sign In button`);
      steps.push(`Step 6: Verify successful login redirects to dashboard/home page`);
      steps.push(`Step 7: Verify user name/profile is displayed after login`);
    } else if (lowerDesc.includes('cart') || lowerDesc.includes('checkout') || lowerDesc.includes('order')) {
      steps.push(`Step 2: Add a product to the shopping cart`);
      steps.push(`Step 3: Navigate to the cart page`);
      steps.push(`Step 4: Verify product details, quantity, and price are correct`);
      steps.push(`Step 5: Update quantity and verify total updates correctly`);
      steps.push(`Step 6: Proceed to checkout`);
      steps.push(`Step 7: Complete the order process and verify confirmation`);
    } else {
      // Generic but more actionable fallback
      steps.push(`Step 2: Locate and identify all interactive elements related to ${moduleName}`);
      steps.push(`Step 3: Interact with the primary feature: ${description.slice(0, 80) || moduleName}`);
      steps.push(`Step 4: Verify the expected behavior and UI state changes`);
      steps.push(`Step 5: Validate data displayed matches expected values`);
      steps.push(`Step 6: Capture screenshot as evidence`);
    }
  }

  return steps;
}

function generateNegativeSteps(req, context = {}) {
  const url = context.url || req.url || '';
  const moduleName = req.module || req.feature || 'the feature';
  const description = (req.description || '').toLowerCase();
  const lowerModule = moduleName.toLowerCase();

  // Generate SPECIFIC negative tests based on feature type
  if (description.includes('navigation') || lowerModule.includes('navigation') || lowerModule.includes('menu')) {
    return [
      `Step 1: Navigate to ${url || 'the application'}`,
      'Step 2: Click on a navigation link that points to a non-existent page (e.g., /invalid-page-xyz)',
      'Step 3: Verify 404 error page is displayed with helpful message',
      'Step 4: Verify navigation menu remains functional on error page',
      'Step 5: Use browser back button and verify previous page loads correctly',
      'Step 6: Verify no JavaScript errors in browser console'
    ];
  } else if (description.includes('store') || description.includes('branch') || description.includes('location') || lowerModule.includes('locator')) {
    return [
      `Step 1: Navigate to Store Locator / Find Store page`,
      'Step 2: Enter invalid pincode "999999" (non-existent location)',
      'Step 3: Click Search and verify friendly "No stores found" message displays',
      'Step 4: Enter non-numeric characters "ABCDEF" in pincode field',
      'Step 5: Verify input validation rejects non-numeric entry OR shows appropriate error',
      'Step 6: Leave pincode field empty and click Search',
      'Step 7: Verify "Please enter a valid pincode" error message displays',
      'Step 8: Enter SQL injection attempt: "\' OR 1=1 --" and verify it is sanitized'
    ];
  } else if (description.includes('contact') || description.includes('form') || lowerModule.includes('contact')) {
    return [
      `Step 1: Navigate to Contact form`,
      'Step 2: Leave all required fields empty and click Submit',
      'Step 3: Verify validation errors appear for each required field',
      'Step 4: Enter invalid email format "not-an-email" in email field',
      'Step 5: Verify "Please enter a valid email address" error displays',
      'Step 6: Enter XSS attempt "<script>alert(1)</script>" in message field',
      'Step 7: Verify script is sanitized/escaped and does not execute',
      'Step 8: Submit form with valid data multiple times rapidly (rate limiting test)',
      'Step 9: Verify system prevents spam submissions with appropriate message'
    ];
  } else if (description.includes('search')) {
    return [
      `Step 1: Navigate to search functionality`,
      'Step 2: Enter an empty search query and click Search',
      'Step 3: Verify appropriate message "Please enter a search term" displays',
      'Step 4: Search for a term with no results (e.g., "xyznonexistent12345")',
      'Step 5: Verify "No results found" message with suggestion to try different terms',
      'Step 6: Enter very long search query (500+ characters)',
      'Step 7: Verify system handles gracefully (truncates or shows error)',
      'Step 8: Enter special characters "!@#$%^&*()" and verify proper handling'
    ];
  } else if (description.includes('login') || description.includes('signin') || description.includes('auth')) {
    return [
      `Step 1: Navigate to Login page`,
      'Step 2: Enter invalid username "nonexistent_user_xyz@test.com"',
      'Step 3: Enter any password and click Login',
      'Step 4: Verify generic error "Invalid credentials" (not revealing if username exists)',
      'Step 5: Enter valid username with wrong password 5 times',
      'Step 6: Verify account lockout or rate limiting is triggered',
      'Step 7: Enter SQL injection "\' OR 1=1 --" in username field',
      'Step 8: Verify login fails and no database error is exposed',
      'Step 9: Verify password field masks input (shows dots/asterisks)'
    ];
  } else if (description.includes('product') || description.includes('category') || description.includes('catalog')) {
    return [
      `Step 1: Navigate to Product listing page`,
      'Step 2: Directly access a non-existent product URL (e.g., /product/99999999)',
      'Step 3: Verify friendly "Product not found" message displays',
      'Step 4: Manipulate price/quantity parameters in URL if visible',
      'Step 5: Verify server-side validation prevents price manipulation',
      'Step 6: Add product with quantity -1 or 0 to cart',
      'Step 7: Verify system rejects invalid quantity with error message',
      'Step 8: Verify page handles slow network gracefully with loading indicators'
    ];
  } else if (description.includes('image') || description.includes('gallery') || description.includes('banner')) {
    return [
      `Step 1: Navigate to page with images/gallery`,
      'Step 2: Disable images in browser settings and reload page',
      'Step 3: Verify alt text is displayed for all important images',
      'Step 4: Throttle network to "Slow 3G" in DevTools',
      'Step 5: Verify images show loading placeholders while loading',
      'Step 6: Block image CDN domain in DevTools',
      'Step 7: Verify page remains usable with broken images (content still readable)',
      'Step 8: Verify image carousel handles missing images gracefully'
    ];
  } else if (description.includes('cart') || description.includes('checkout') || description.includes('order')) {
    return [
      `Step 1: Navigate to Shopping Cart`,
      'Step 2: Update product quantity to 0',
      'Step 3: Verify product is removed OR minimum quantity validation appears',
      'Step 4: Update quantity to very large number (e.g., 999999)',
      'Step 5: Verify system shows "Insufficient stock" or caps quantity',
      'Step 6: Remove all items from cart',
      'Step 7: Verify empty cart message displays with "Continue Shopping" link',
      'Step 8: Try accessing checkout with empty cart',
      'Step 9: Verify system redirects to cart with message "Cart is empty"'
    ];
  } else {
    // More intelligent fallback based on common patterns
    return [
      `Step 1: Navigate to ${moduleName} feature`,
      'Step 2: Identify all input fields and interactive elements',
      'Step 3: Test required field validation by leaving mandatory fields empty',
      'Step 4: Enter boundary values: empty string, single character, maximum length + 1',
      'Step 5: Enter special characters: < > " \' & ; to test XSS prevention',
      'Step 6: Test with different user roles/permissions if applicable',
      'Step 7: Test behavior with network disconnected mid-operation',
      'Step 8: Verify all error messages are user-friendly and do not expose system details'
    ];
  }
}

function getCoverageBreakdown(testCases) {
  const breakdown = {};
  testCases.forEach(tc => {
    breakdown[tc.type] = (breakdown[tc.type] || 0) + 1;
  });
  return breakdown;
}

function calculateStructureRate(testCases) {
  if (!testCases.length) return '0%';
  const wellStructured = testCases.filter(tc =>
    tc.id && tc.module && tc.scenario && tc.steps?.length >= 3 && tc.expectedResult && tc.priority
  ).length;
  return `${Math.round((wellStructured / testCases.length) * 100)}%`;
}

function generateRiskAssessment(baRequirements, testCases) {
  const risks = [];

  if (baRequirements.risks?.length) {
    baRequirements.risks.forEach(risk => {
      risks.push({ category: 'Documented Risk', description: risk, severity: 'High' });
    });
  }

  if (!baRequirements.integrations?.length) {
    risks.push({ category: 'Integration Risk', description: 'No integrations documented - verify if any exist', severity: 'Medium' });
  }

  if (!baRequirements.nonFunctionalRequirements?.length) {
    risks.push({ category: 'NFR Risk', description: 'Non-functional requirements not documented', severity: 'High' });
  }

  const securityTests = testCases.filter(tc => tc.type === TEST_TYPES.SECURITY);
  if (securityTests.length < 3) {
    risks.push({ category: 'Security Risk', description: 'Limited security test coverage', severity: 'Critical' });
  }

  return {
    totalRisks: risks.length,
    highRiskAreas: risks.filter(r => r.severity === 'Critical' || r.severity === 'High'),
    risks
  };
}

function generateGapAnalysis(baRequirements, existingTestCases, generatedTestCases) {
  const gaps = [];

  // Compare with existing test cases if provided
  if (existingTestCases?.length) {
    const existingScenarios = new Set(existingTestCases.map(tc => tc.scenario?.toLowerCase()));
    const generatedScenarios = new Set(generatedTestCases.map(tc => tc.scenario?.toLowerCase()));

    // Find scenarios in generated but not in existing
    generatedTestCases.forEach(tc => {
      if (!existingScenarios.has(tc.scenario?.toLowerCase())) {
        gaps.push({
          type: 'Missing in Manual',
          scenario: tc.scenario,
          recommendation: `Add test case: ${tc.title}`
        });
      }
    });

    // Find scenarios in existing but not in generated
    existingTestCases.forEach(tc => {
      if (!generatedScenarios.has(tc.scenario?.toLowerCase())) {
        gaps.push({
          type: 'Additional Manual Coverage',
          scenario: tc.scenario,
          recommendation: 'Verify if this existing test case is still relevant'
        });
      }
    });
  }

  // Check for missing test types
  const coverage = getCoverageBreakdown(generatedTestCases);
  const requiredTypes = [TEST_TYPES.FUNCTIONAL, TEST_TYPES.NEGATIVE, TEST_TYPES.SECURITY, TEST_TYPES.UI_UX];

  requiredTypes.forEach(type => {
    if (!coverage[type]) {
      gaps.push({
        type: 'Missing Test Type',
        scenario: type,
        recommendation: `Add ${type} test cases`
      });
    }
  });

  return {
    totalGaps: gaps.length,
    gaps,
    coverageCompleteness: Object.keys(coverage).length >= 8 ? 'High' : Object.keys(coverage).length >= 5 ? 'Medium' : 'Low'
  };
}

function generateTestLeadSummary(baRequirements, testCases) {
  const coverage = getCoverageBreakdown(testCases);

  return {
    releaseReadiness: testCases.length >= 20 ? 'CONDITIONAL GO' : 'REVIEW REQUIRED',
    qualityRisks: [
      baRequirements.risks?.length ? `${baRequirements.risks.length} documented risks require mitigation` : null,
      !coverage[TEST_TYPES.SECURITY] ? 'Security testing may need enhancement' : null,
      !coverage[TEST_TYPES.ACCESSIBILITY] ? 'Accessibility testing may need enhancement' : null
    ].filter(Boolean),
    uatFocusRecommendations: [
      'Focus on critical user journeys',
      'Validate all integration points',
      'Verify edge cases in production-like environment',
      'Conduct security testing before release'
    ],
    automationCandidates: testCases.filter(tc => tc.automationCandidate).length,
    regressionSuiteRecommendations: [
      'Include all functional happy path tests',
      'Add critical integration tests',
      'Include boundary value tests',
      'Add smoke tests for quick validation'
    ],
    productionRiskAreas: [
      'Data integrity during concurrent operations',
      'Performance under load',
      'Security vulnerabilities',
      'Integration point failures'
    ]
  };
}

/**
 * Compare generated test cases with manually written ones
 */
function compareTestCases(generatedTestCases, manualTestCases) {
  const comparison = {
    totalGenerated: generatedTestCases.length,
    totalManual: manualTestCases.length,
    coveredByBoth: [],
    onlyInGenerated: [],
    onlyInManual: [],
    duplicates: [],
    weakCases: [],
    recommendations: []
  };

  const manualScenarios = new Map();
  manualTestCases.forEach(tc => {
    const key = (tc.scenario || tc.feature || '').toLowerCase().trim();
    manualScenarios.set(key, tc);
  });

  generatedTestCases.forEach(gtc => {
    const key = (gtc.scenario || '').toLowerCase().trim();
    if (manualScenarios.has(key)) {
      comparison.coveredByBoth.push({
        generated: gtc,
        manual: manualScenarios.get(key)
      });
      manualScenarios.delete(key);
    } else {
      comparison.onlyInGenerated.push(gtc);
    }
  });

  manualScenarios.forEach((tc, key) => {
    comparison.onlyInManual.push(tc);
  });

  // Identify weak cases
  manualTestCases.forEach(tc => {
    if (!tc.steps || (Array.isArray(tc.steps) && tc.steps.length < 3)) {
      comparison.weakCases.push({ testCase: tc, reason: 'Insufficient test steps' });
    }
    if (!tc.expectedResult || tc.expectedResult.length < 20) {
      comparison.weakCases.push({ testCase: tc, reason: 'Weak expected result' });
    }
  });

  // Generate recommendations
  if (comparison.onlyInGenerated.length > 0) {
    comparison.recommendations.push({
      type: 'Coverage Gap',
      message: `${comparison.onlyInGenerated.length} scenarios identified in AI analysis are missing from manual test cases`,
      priority: 'High'
    });
  }

  if (comparison.weakCases.length > 0) {
    comparison.recommendations.push({
      type: 'Quality Improvement',
      message: `${comparison.weakCases.length} manual test cases need enhancement (better steps or expected results)`,
      priority: 'Medium'
    });
  }

  return comparison;
}

module.exports = {
  SENIOR_QA_TEST_LEAD_PROMPT,
  TEST_TYPES,
  PRIORITIES,
  SEVERITIES,
  parseBARequirements,
  generateComprehensiveTestCases,
  compareTestCases,
  generateRiskAssessment,
  generateGapAnalysis,
  generateTestLeadSummary
};
