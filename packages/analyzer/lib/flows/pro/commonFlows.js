const { createFlow } = require('./helpers');

function buildCommonFlows(ctx) {
  const flows = [];

  if (ctx.hasCategory('NAVIGATION') || ctx.hasCategory('HEADER')) {
    flows.push(
      createFlow({
        name: 'Site Navigation',
        priority: 'Critical',
        description: 'Verify main navigation menu functionality',
        steps: [
          { action: 'navigate', target: 'Homepage', description: 'Load the homepage' },
          {
            action: 'verify',
            target: 'Header/Navigation',
            description: 'Verify header and navigation menu are visible'
          },
          { action: 'verify', target: 'Logo', description: 'Verify site logo is displayed and clickable' },
          { action: 'interact', target: 'Menu Items', description: 'Click on each main navigation link' },
          {
            action: 'verify',
            target: 'Page Load',
            description: 'Verify each page loads correctly without errors'
          }
        ],
        assertions: [
          'Navigation menu is visible on all pages',
          'All menu links are functional',
          'Pages load within acceptable time (<3s)',
          'Logo links back to homepage'
        ],
        elements: ctx.elementSelectors('NAVIGATION', 5)
      })
    );
  }

  if (ctx.hasCategory('FOOTER')) {
    flows.push(
      createFlow({
        name: 'Footer Verification',
        priority: 'Medium',
        description: 'Verify footer content and links',
        steps: [
          { action: 'scroll', target: 'Footer', description: 'Scroll to page footer' },
          { action: 'verify', target: 'Footer Content', description: 'Verify footer is visible' },
          {
            action: 'verify',
            target: 'Footer Links',
            description: 'Verify important links are present (About, Contact, Privacy, Terms)'
          },
          { action: 'interact', target: 'Footer Links', description: 'Click and verify footer links work' }
        ],
        assertions: [
          'Footer is visible at bottom of page',
          'Contact information is present',
          'Social media links are functional',
          'Legal links (Privacy, Terms) are accessible'
        ]
      })
    );
  }

  return flows;
}

module.exports = { buildCommonFlows };
