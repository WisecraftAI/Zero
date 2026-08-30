const { createFlow, formsWithPurpose, hasFlowNamed } = require('./helpers');

function buildContactFormFlow(forms) {
  const contactForms = formsWithPurpose(forms, 'contact').filter(
    (form) => Number(form.fieldCount || form.fields?.length || 0) > 0
  );
  if (contactForms.length === 0) {
    return null;
  }

  return createFlow({
    name: 'Contact Form Submission',
    priority: 'High',
    description: 'Verify contact form functionality',
    steps: [
      { action: 'navigate', target: 'Contact Page', description: 'Navigate to contact page' },
      { action: 'verify', target: 'Form', description: 'Verify contact form is displayed' },
      { action: 'input', target: 'Name Field', description: 'Enter name' },
      { action: 'input', target: 'Email Field', description: 'Enter email address' },
      { action: 'input', target: 'Message Field', description: 'Enter message' },
      { action: 'submit', target: 'Form', description: 'Submit contact form' },
      { action: 'verify', target: 'Confirmation', description: 'Verify success message' }
    ],
    assertions: [
      'All form fields accept input',
      'Email validation works',
      'Required field validation works',
      'Success message is displayed'
    ],
    formId: contactForms[0].id
  });
}

function buildLoginFormFlow(ctx, forms) {
  const loginForms = formsWithPurpose(forms, 'login');
  if (loginForms.length === 0 && !ctx.hasCategory('AUTH')) {
    return null;
  }

  return createFlow({
    name: 'User Authentication',
    priority: 'Critical',
    description: 'Verify login functionality',
    steps: [
      { action: 'navigate', target: 'Login Page', description: 'Navigate to login page' },
      { action: 'verify', target: 'Login Form', description: 'Verify login form is displayed' },
      { action: 'input', target: 'Email/Username', description: 'Enter valid email or username' },
      { action: 'input', target: 'Password', description: 'Enter valid password' },
      { action: 'submit', target: 'Login', description: 'Click login button' },
      { action: 'verify', target: 'Success', description: 'Verify successful login' }
    ],
    assertions: [
      'Login form accepts credentials',
      'Error message for invalid credentials',
      'Password field is masked',
      'Successful login redirects to dashboard/home'
    ]
  });
}

function buildGenericSearchFlow(ctx, existingFlows) {
  if (!ctx.hasCategory('SEARCH') || hasFlowNamed(existingFlows, 'Search')) {
    return null;
  }

  return createFlow({
    name: 'Site Search',
    priority: 'High',
    description: 'Verify search functionality',
    steps: [
      { action: 'interact', target: 'Search Box', description: 'Click on search input' },
      { action: 'input', target: 'Search Query', description: 'Enter search term' },
      { action: 'submit', target: 'Search', description: 'Submit search' },
      { action: 'verify', target: 'Results', description: 'Verify search results are displayed' }
    ],
    assertions: [
      'Search box is functional',
      'Results are relevant to query',
      'No results message for empty results'
    ],
    elements: ctx.elementSelectors('SEARCH')
  });
}

function buildGenericMediaFlow(ctx, existingFlows) {
  const mediaElements = ctx.getElements('MEDIA').filter((element) => {
    const tagName = String(element.tagName || '').toLowerCase();
    const selector = String(element.originalSelector || element.selector || '').toLowerCase();
    if (tagName === 'video' || tagName === 'audio' || /^(video|audio)\b/.test(selector)) {
      return true;
    }
    return tagName === 'iframe' && /(youtube|vimeo)/.test(String(element.src || selector));
  });
  if (mediaElements.length === 0 || hasFlowNamed(existingFlows, 'Video')) {
    return null;
  }

  return createFlow({
    name: 'Media Content Playback',
    priority: 'Medium',
    description: 'Verify media content loads and plays',
    steps: [
      { action: 'navigate', target: 'Page with Media', description: 'Navigate to page with video/audio' },
      { action: 'verify', target: 'Media Element', description: 'Verify media element is visible' },
      { action: 'interact', target: 'Play Button', description: 'Click play button' },
      { action: 'verify', target: 'Playback', description: 'Verify media starts playing' }
    ],
    assertions: [
      'Media element loads correctly',
      'Play controls are functional',
      'Media plays without errors'
    ],
    elements: mediaElements.slice(0, 3).map((element) => element.selector).filter(Boolean)
  });
}

/**
 * @param {ReturnType<import('./helpers').createElementContext>} ctx
 * @param {Array<{ id?: string, purpose: string }>} forms
 * @param {Array<{ name: string }>} existingFlows
 */
function buildFormAndFallbackFlows(ctx, forms, existingFlows) {
  const flows = [];

  const contactFlow = buildContactFormFlow(forms);
  if (contactFlow) {
    flows.push(contactFlow);
  }

  const loginFlow = buildLoginFormFlow(ctx, forms);
  if (loginFlow) {
    flows.push(loginFlow);
  }

  const searchFlow = buildGenericSearchFlow(ctx, [...existingFlows, ...flows]);
  if (searchFlow) {
    flows.push(searchFlow);
  }

  const mediaFlow = buildGenericMediaFlow(ctx, [...existingFlows, ...flows]);
  if (mediaFlow) {
    flows.push(mediaFlow);
  }

  return flows;
}

module.exports = {
  buildFormAndFallbackFlows,
  buildContactFormFlow,
  buildLoginFormFlow,
  buildGenericSearchFlow,
  buildGenericMediaFlow
};
