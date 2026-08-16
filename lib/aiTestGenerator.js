/**
 * AI-Powered Test Case Generator
 *
 * Uses LLM APIs (OpenAI, Anthropic Claude, Google Gemini) to generate
 * high-quality, contextual test cases based on Senior QA Test Lead methodology.
 *
 * Supports:
 * - OpenAI GPT-4/GPT-4-Turbo/GPT-3.5-Turbo
 * - Anthropic Claude 3 (Opus/Sonnet/Haiku)
 * - Google Gemini Pro
 */

const logger = require('./logger');

// AI Provider configurations
// Each provider lists a "cheap" model (classification/repair - small structured
// tasks) and a "quality" model (actual test-case authoring, where reasoning
// quality matters most). This tiering is the main token-cost lever alongside
// caching: cheap tasks never touch the expensive model.
const AI_PROVIDERS = {
  OPENAI: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
    cheapModel: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    supportsJsonMode: true
  },
  ANTHROPIC: {
    name: 'Anthropic Claude',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    cheapModel: 'claude-3-haiku-20240307',
    endpoint: 'https://api.anthropic.com/v1/messages',
    envKey: 'ANTHROPIC_API_KEY',
    supportsJsonMode: false
  },
  GEMINI: {
    name: 'Google Gemini',
    models: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-1.5-pro',
    cheapModel: 'gemini-1.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    envKey: 'GEMINI_API_KEY',
    supportsJsonMode: true
  }
};

/**
 * Estimate a reasonable max_tokens budget from the expected output size
 * instead of always requesting a flat 8000 - the #1 easy token-cost win.
 * ~120 tokens per test case (JSON) is a safe generous estimate.
 */
function estimateMaxTokens(expectedCaseCount = 40) {
  const budget = Math.ceil(expectedCaseCount * 120) + 500;
  return Math.max(1200, Math.min(budget, 6000));
}

/**
 * Senior QA Test Lead Prompt for AI
 */
const SENIOR_QA_PROMPT = `You are acting as a Senior QA Test Lead with 15+ years of domain experience in enterprise testing, business analysis validation, risk-based testing, and release governance.

Your task is to generate HIGHLY DETAILED, SPECIFIC, and PROFESSIONAL test cases for the given website/feature.

CRITICAL INSTRUCTIONS:
1. Generate test cases that are SPECIFIC to the actual website content, NOT generic templates
2. Use ACTUAL element names, page names, section names discovered from the website
3. Include SPECIFIC test data (actual branch names, product categories, phone numbers, addresses visible on the website)
4. Each test case must have DETAILED step-by-step instructions that a junior tester can follow
5. Expected results must be SPECIFIC and MEASURABLE
6. Include edge cases, boundary conditions, and negative scenarios SPECIFIC to the feature
7. Consider the DOMAIN context (retail store, e-commerce, banking, etc.) for relevant test scenarios
8. Avoid placeholder and vague language such as "relevant page", "relevant feature", "invalid data" without explicit values
9. If source inputs are missing (BRD/Figma/Jira), explicitly note assumptions in each case's notes
10. Every test case must be independently executable and traceable to an observed UI element or requirement

MANDATORY QUALITY BARS:
- No duplicated scenarios with renamed titles
- Negative tests must target a concrete validation or workflow failure mode
- UI tests must reference visible components/states (alignment, responsive behavior, empty/loading/error states)
- Security tests must specify the attack vector or permission boundary under test
- Integration tests must specify source/target dependency and expected data/state sync behavior

TEST CASE FORMAT:
{
  "id": "TC-XXX-001",
  "module": "Specific Module Name",
  "scenario": "Clear, specific scenario description",
  "priority": "Critical/High/Medium/Low",
  "severity": "Blocker/Critical/Major/Minor",
  "type": "Functional/UI/Integration/Security/Performance/Accessibility",
  "preconditions": ["Specific precondition 1", "Specific precondition 2"],
  "testData": "Actual test data to use (e.g., 'Branch: T Nagar, Phone: 044-24341234')",
  "steps": [
    "Step 1: Navigate to https://example.com/branches",
    "Step 2: Locate the 'T Nagar' branch card in the branch listing",
    "Step 3: Click on the 'T Nagar' branch to view details",
    "Step 4: Verify the address shows '123 Anna Nagar, Chennai - 600001'",
    "Step 5: Verify phone number displays '044-24341234'"
  ],
  "expectedResult": "Specific, measurable expected outcome",
  "notes": "Any additional context or edge cases to consider"
}

IMPORTANT:
- DO NOT generate generic steps like "Navigate to relevant feature"
- DO NOT use placeholder text - use actual content from the website
- Each test case should be UNIQUE and test a SPECIFIC aspect
- Include negative scenarios that are RELEVANT to the feature (not generic "enter invalid data")
`;

/**
 * Check which AI providers are configured
 */
function getAvailableProviders() {
  const available = [];

  for (const [key, config] of Object.entries(AI_PROVIDERS)) {
    if (process.env[config.envKey]) {
      available.push({
        provider: key,
        name: config.name,
        models: config.models,
        defaultModel: config.defaultModel
      });
    }
  }

  return available;
}

/**
 * Get the best available AI provider
 */
function getBestProvider() {
  // Priority: Claude > GPT-4 > Gemini
  if (process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
  if (process.env.OPENAI_API_KEY) return 'OPENAI';
  if (process.env.GEMINI_API_KEY) return 'GEMINI';
  return null;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt, model = 'gpt-4-turbo', options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  const { maxTokens = 4000, jsonMode = true, systemPrompt = SENIOR_QA_PROMPT } = options;

  const body = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: maxTokens
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(AI_PROVIDERS.OPENAI.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return { text: data.choices[0].message.content, usage: data.usage || null };
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(prompt, model = 'claude-3-5-sonnet-20241022', options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const { maxTokens = 4000, systemPrompt = SENIOR_QA_PROMPT } = options;

  const response = await fetch(AI_PROVIDERS.ANTHROPIC.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: maxTokens,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return { text: data.content[0].text, usage: data.usage || null };
}

/**
 * Call Google Gemini API
 */
async function callGemini(prompt, model = 'gemini-1.5-pro', options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const { maxTokens = 4000, jsonMode = true, systemPrompt = SENIOR_QA_PROMPT } = options;

  const endpoint = `${AI_PROVIDERS.GEMINI.endpoint}/${model}:generateContent?key=${apiKey}`;

  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens: maxTokens
  };
  if (jsonMode) generationConfig.responseMimeType = 'application/json';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${prompt}`
        }]
      }],
      generationConfig
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return { text: data.candidates[0].content.parts[0].text, usage: data.usageMetadata || null };
}

const CALLERS = { OPENAI: callOpenAI, ANTHROPIC: callAnthropic, GEMINI: callGemini };

/**
 * Generate test cases using AI, grounded in real crawled page context.
 * Token-cost controls: dynamic max_tokens (not a flat 8000), strict JSON
 * mode where supported (avoids costly parse-retry loops), and a single
 * cheap-model repair pass instead of a full expensive re-generation when
 * the first response isn't valid JSON.
 */
async function generateTestCasesWithAI(context, options = {}) {
  const provider = options.provider || getBestProvider();
  const model = options.model;
  const expectedCaseCount = options.expectedCaseCount || 40;

  if (!provider) {
    logger.warn('No AI provider configured - falling back to template-based generation');
    return null;
  }

  const providerConfig = AI_PROVIDERS[provider];
  const caller = CALLERS[provider];
  const maxTokens = options.maxTokens || estimateMaxTokens(expectedCaseCount);
  const chosenModel = model || providerConfig.defaultModel;

  // Build context-rich prompt (grounded in real DOM extraction, not guesses)
  const prompt = buildTestGenerationPrompt(context);

  logger.info(`Generating test cases using ${providerConfig.name} (${chosenModel}), maxTokens=${maxTokens}`);

  try {
    const callOptions = { maxTokens, jsonMode: providerConfig.supportsJsonMode };
    let { text: response, usage } = await caller(prompt, chosenModel, callOptions);

    let rawTestCases = parseAIResponse(response);

    // One cheap repair attempt (not a full expensive re-generation) if parsing failed.
    if (!rawTestCases.length) {
      logger.warn('Primary response failed to parse as test cases - attempting cheap-model JSON repair');
      try {
        const repaired = await repairJSONResponse(response, provider);
        if (repaired) rawTestCases = parseAIResponse(repaired);
      } catch (repairErr) {
        logger.warn(`JSON repair pass failed: ${repairErr.message}`);
      }
    }

    const testCases = postProcessAICases(rawTestCases);

    logger.info(`AI generated ${testCases.length} usable test cases (tokens used: ${usage?.total_tokens || usage?.totalTokenCount || 'n/a'})`);

    return {
      provider: providerConfig.name,
      model: chosenModel,
      testCases,
      usage,
      rawResponse: response
    };
  } catch (error) {
    logger.error(`AI test generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Ask the cheap/fast tier model to fix malformed JSON - small, targeted,
 * inexpensive, instead of re-running the whole expensive generation prompt.
 */
async function repairJSONResponse(brokenText, provider) {
  const providerConfig = AI_PROVIDERS[provider];
  const caller = CALLERS[provider];
  if (!caller || !providerConfig) return null;

  const repairPrompt = `The following text should be a JSON object of shape { "testCases": [...] } but may be malformed (extra prose, trailing commas, truncation). Return ONLY the corrected, strict, valid JSON - no markdown, no commentary.\n\nTEXT:\n${brokenText.slice(0, 12000)}`;

  const { text } = await caller(repairPrompt, providerConfig.cheapModel || providerConfig.defaultModel, {
    maxTokens: 3000,
    jsonMode: providerConfig.supportsJsonMode,
    systemPrompt: 'You are a strict JSON repair tool. Output only valid JSON.'
  });
  return text;
}

/**
 * Build the LLM context object directly from the already-crawled DOM data
 * (run.artifacts.webAnalysis) + BA requirements - this is the "grounding"
 * step: the model never has to guess what's on the page.
 */
function buildContextFromWebAnalysis(webAnalysis, requirements, extra = {}) {
  const wa = webAnalysis || {};
  const discoveredElements = [];
  const allElements = wa.allElements || {};
  for (const [category, els] of Object.entries(allElements)) {
    (els || []).slice(0, 15).forEach((el) => {
      discoveredElements.push({
        category,
        text: el.text || el.label || el.selector || '',
        selector: el.selector || el.css || ''
      });
    });
  }

  return {
    url: wa.metadata?.url || requirements?.metadata?.ottUrl || extra.url,
    websiteType: {
      typeName: wa.metadata?.websiteType || requirements?.metadata?.websiteType || requirements?.metadata?.profile,
      type: wa.metadata?.domain || requirements?.metadata?.profileKey
    },
    pageContent: {
      title: wa.siteOverview?.title,
      headings: wa.siteStructure?.headers || wa.pageStructure?.headings || []
    },
    discoveredElements,
    userFlows: wa.userFlows || [],
    brdDocument: wa.brdDocument || requirements?.urlAnalysis?.brdDocument || null,
    requirements
  };
}

/**
 * Deterministic cache key for a given page context + requirements, so an
 * unchanged page never triggers a repeat (paid) LLM call.
 */
function buildContextCacheKey(context) {
  const crypto = require('crypto');
  const fingerprint = JSON.stringify({
    url: context.url,
    headings: (context.pageContent?.headings || []).map((h) => h.text || h),
    elements: (context.discoveredElements || []).map((e) => `${e.category}:${e.text}`).slice(0, 60),
    flows: (context.userFlows || []).map((f) => f.name)
  });
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Build a rich context prompt for AI
 */
function buildTestGenerationPrompt(context) {
  const { url, websiteType, pageContent, discoveredElements, userFlows, brdDocument, requirements } = context;

  let prompt = `Generate comprehensive, SPECIFIC test cases for the following website:\n\n`;

  prompt += `## Website Information\n`;
  prompt += `- URL: ${url}\n`;
  prompt += `- Website Type: ${websiteType?.typeName || websiteType || 'Website'}\n`;
  prompt += `- Domain: ${websiteType?.type || 'GENERIC'}\n\n`;

  // Add page structure info
  if (pageContent?.title) {
    prompt += `## Page Title\n${pageContent.title}\n\n`;
  }

  if (pageContent?.headings?.length) {
    prompt += `## Page Sections (from headings)\n`;
    pageContent.headings.slice(0, 20).forEach(h => {
      prompt += `- ${h.text}\n`;
    });
    prompt += `\n`;
  }

  // Add discovered elements
  if (discoveredElements?.length) {
    prompt += `## Discovered UI Elements\n`;
    const elementsByCategory = {};
    discoveredElements.forEach(el => {
      if (!elementsByCategory[el.category]) elementsByCategory[el.category] = [];
      if (elementsByCategory[el.category].length < 5) {
        elementsByCategory[el.category].push(el.text || el.selector);
      }
    });

    for (const [category, elements] of Object.entries(elementsByCategory)) {
      prompt += `### ${category}\n`;
      elements.forEach(e => prompt += `- ${e}\n`);
    }
    prompt += `\n`;
  }

  // Add user flows
  if (userFlows?.length) {
    prompt += `## User Flows to Test\n`;
    userFlows.forEach((flow, i) => {
      prompt += `${i + 1}. ${flow.name} (Priority: ${flow.priority})\n`;
      prompt += `   Description: ${flow.description}\n`;
      if (flow.assertions?.length) {
        prompt += `   Key assertions:\n`;
        flow.assertions.forEach(a => prompt += `   - ${a}\n`);
      }
    });
    prompt += `\n`;
  }

  // Add requirements
  if (requirements?.requirementStatements?.length) {
    prompt += `## Requirements to Validate\n`;
    requirements.requirementStatements.slice(0, 15).forEach(req => {
      prompt += `- ${req}\n`;
    });
    prompt += `\n`;
  }

  // Add BRD info if available
  if (brdDocument?.functionalRequirements?.length) {
    prompt += `## Functional Requirements from BRD\n`;
    brdDocument.functionalRequirements.slice(0, 10).forEach(req => {
      prompt += `- ${req.feature}: ${req.description}\n`;
      if (req.acceptanceCriteria?.length) {
        req.acceptanceCriteria.forEach(ac => prompt += `  - AC: ${ac}\n`);
      }
    });
    prompt += `\n`;
  }

  prompt += `## Instructions\n`;
  prompt += `Generate 35-60 detailed test cases covering:\n`;
  prompt += `1. Functional testing (happy path, alternate flows, business rules)\n`;
  prompt += `2. Negative testing (feature-specific invalid inputs and failure paths)\n`;
  prompt += `3. UI/UX testing (layout, responsive behavior, loading/empty/error states)\n`;
  prompt += `4. Accessibility testing (keyboard, focus, labels, semantic structure)\n`;
  prompt += `5. Performance testing (page load budgets, key interaction latency assumptions)\n`;
  prompt += `6. Edge cases and boundary conditions\n`;
  prompt += `7. Security/permission validation relevant to the website capabilities\n`;
  prompt += `8. Regression impact checks for common navigation and high-traffic flows\n\n`;

  prompt += `IMPORTANT: Use ACTUAL content from the website (real branch names, real categories, real phone numbers) in your test cases. Do NOT use generic placeholders.\n\n`;
  prompt += `Output STRICT JSON only (no markdown), using this shape:\n`;
  prompt += `{\n`;
  prompt += `  "testCases": [\n`;
  prompt += `    {\n`;
  prompt += `      "id": "TC-FUNC-001",\n`;
  prompt += `      "module": "Navigation",\n`;
  prompt += `      "scenario": "Verify header category menu opens and navigates to expected category page",\n`;
  prompt += `      "priority": "Critical",\n`;
  prompt += `      "severity": "Major",\n`;
  prompt += `      "type": "Functional",\n`;
  prompt += `      "preconditions": ["User has opened homepage"],\n`;
  prompt += `      "testData": "Category: Electronics",\n`;
  prompt += `      "steps": ["Step 1: ...", "Step 2: ..."],\n`;
  prompt += `      "expectedResult": "Specific measurable outcome",\n`;
  prompt += `      "notes": "Traceability: Header nav requirement"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n\n`;

  prompt += `Hard constraints:\n`;
  prompt += `- Do not include generic steps such as "navigate to relevant feature/page"\n`;
  prompt += `- Do not repeat the same scenario with different IDs\n`;
  prompt += `- Each test case needs 4 or more concrete steps\n`;
  prompt += `- Expected result must be one sentence and measurable\n`;
  prompt += `- Include at least 5 negative test cases and at least 5 UI/accessibility focused cases\n`;

  prompt += `Return STRICT JSON only. Output must be a single JSON object.`;

  return prompt;
}

/**
 * Parse AI response to extract test cases
 */
function parseAIResponse(response) {
  try {
    // JSON object with testCases field
    const parsedObj = tryParseJSON(response);
    if (parsedObj && Array.isArray(parsedObj.testCases)) {
      return parsedObj.testCases;
    }

    // Fenced JSON block: ```json ... ```
    const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      const fencedObj = tryParseJSON(fenced[1].trim());
      if (Array.isArray(fencedObj)) return fencedObj;
      if (fencedObj && Array.isArray(fencedObj.testCases)) return fencedObj.testCases;
    }

    // Raw array in output
    const jsonArrayMatch = response.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      const parsed = tryParseJSON(jsonArrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    }

    // JSON object in output
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      const parsed = tryParseJSON(jsonObjectMatch[0]);
      if (Array.isArray(parsed?.testCases)) return parsed.testCases;
    }

    // Try to parse the entire response as JSON (array fallback)
    const full = tryParseJSON(response);
    if (Array.isArray(full)) return full;
  } catch (error) {
    logger.warn(`Could not parse AI response as JSON directly: ${error.message}`);

    // Continue to text extraction fallback
  }

  logger.warn('Extracting test cases from text fallback');

  // Extract test cases from structured text
  const testCases = [];
  const tcMatches = response.matchAll(/TC-[A-Z]+-\d+[\s\S]*?(?=TC-[A-Z]+-\d+|$)/g);

  for (const match of tcMatches) {
    const tcText = match[0];
    // Parse individual test case from text
    const tc = parseTestCaseFromText(tcText);
    if (tc) testCases.push(tc);
  }

  return testCases;
}

function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function postProcessAICases(testCases) {
  if (!Array.isArray(testCases)) return [];

  const normalized = testCases
    .map(normalizeTestCase)
    .filter(Boolean)
    .filter(isNonGenericCase);

  const deduped = dedupeByScenario(normalized);
  return deduped;
}

function normalizeTestCase(tc, index = 0) {
  if (!tc || typeof tc !== 'object') return null;

  const steps = Array.isArray(tc.steps)
    ? tc.steps.filter(Boolean).map(s => String(s).trim()).filter(Boolean)
    : [];

  const normalized = {
    id: String(tc.id || `TC-AI-${String(index + 1).padStart(3, '0')}`).trim(),
    module: String(tc.module || 'General').trim(),
    scenario: String(tc.scenario || '').trim(),
    priority: String(tc.priority || 'Medium').trim(),
    severity: String(tc.severity || 'Major').trim(),
    type: String(tc.type || 'Functional').trim(),
    preconditions: Array.isArray(tc.preconditions)
      ? tc.preconditions.map(p => String(p).trim()).filter(Boolean)
      : [],
    testData: String(tc.testData || '').trim(),
    steps,
    expectedResult: String(tc.expectedResult || tc.expected || '').trim(),
    notes: String(tc.notes || '').trim()
  };

  if (!normalized.scenario || !normalized.expectedResult || normalized.steps.length < 2) {
    return null;
  }

  return normalized;
}

function isNonGenericCase(tc) {
  const genericFragments = [
    'relevant feature',
    'relevant page',
    'navigate to the feature/page',
    'enter invalid/malicious data in input fields',
    'verify error handling and validation messages',
    'system remains in stable state'
  ];

  const scenario = `${tc.scenario} ${tc.testData} ${tc.expectedResult}`.toLowerCase();
  const stepsBlob = tc.steps.join(' ').toLowerCase();
  const combined = `${scenario} ${stepsBlob}`;

  if (genericFragments.some(fragment => combined.includes(fragment))) {
    return false;
  }

  return true;
}

function dedupeByScenario(testCases) {
  const seen = new Set();
  const result = [];

  for (const tc of testCases) {
    const key = String(tc.scenario || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(tc);
  }

  return result;
}

/**
 * Parse a single test case from text format
 */
function parseTestCaseFromText(text) {
  try {
    const idMatch = text.match(/TC-[A-Z]+-\d+/);
    const scenarioMatch = text.match(/Scenario[:\s]*(.+)/i);
    const stepsMatch = text.match(/Steps?[:\s]*([\s\S]*?)(?=Expected|$)/i);
    const expectedMatch = text.match(/Expected[:\s]*([\s\S]*?)(?=Notes|Priority|$)/i);

    if (!idMatch) return null;

    return {
      id: idMatch[0],
      scenario: scenarioMatch ? scenarioMatch[1].trim() : 'Test Scenario',
      steps: stepsMatch ? stepsMatch[1].split(/\n/).filter(s => s.trim()).map(s => s.replace(/^[\d\.\-\*]+\s*/, '').trim()) : [],
      expectedResult: expectedMatch ? expectedMatch[1].trim() : 'Expected behavior verified'
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if AI generation is available
 */
function isAIAvailable() {
  return getBestProvider() !== null;
}

/**
 * Get AI configuration status
 */
function getAIStatus() {
  const available = getAvailableProviders();
  const bestProvider = getBestProvider();

  return {
    enabled: available.length > 0,
    availableProviders: available,
    currentProvider: bestProvider ? AI_PROVIDERS[bestProvider].name : null,
    currentModel: bestProvider ? AI_PROVIDERS[bestProvider].defaultModel : null,
    configInstructions: available.length === 0 ? [
      'To enable AI-powered test generation, add one of these API keys to your .env file:',
      '  OPENAI_API_KEY=your_openai_api_key (for GPT-4)',
      '  ANTHROPIC_API_KEY=your_anthropic_api_key (for Claude 3)',
      '  GEMINI_API_KEY=your_google_api_key (for Gemini Pro)'
    ] : []
  };
}

module.exports = {
  AI_PROVIDERS,
  getAvailableProviders,
  getBestProvider,
  generateTestCasesWithAI,
  isAIAvailable,
  getAIStatus,
  buildContextFromWebAnalysis,
  buildContextCacheKey,
  estimateMaxTokens,
  SENIOR_QA_PROMPT
};


