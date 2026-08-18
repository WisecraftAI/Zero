const { createFlow, formsWithPurpose } = require('./helpers');

function buildRetailStoreFlows() {
  return [
    createFlow({
      name: 'Store/Branch Locator',
      priority: 'Critical',
      description: 'Verify users can find store locations and branch information',
      steps: [
        {
          action: 'navigate',
          target: 'Branches/Locations page',
          description: 'Navigate to store locations section'
        },
        { action: 'verify', target: 'Branch List', description: 'Verify list of store branches is displayed' },
        { action: 'interact', target: 'Branch Details', description: 'Click on a branch to view details' },
        {
          action: 'verify',
          target: 'Address/Contact',
          description: 'Verify address and contact information is shown'
        },
        { action: 'verify', target: 'Map/Directions', description: 'Verify map or directions link is available' }
      ],
      assertions: [
        'All branch locations are listed',
        'Each branch shows complete address',
        'Contact numbers are displayed correctly',
        'Branch timings/hours are visible',
        'Get directions functionality works'
      ]
    }),
    createFlow({
      name: 'Product Categories Browse',
      priority: 'High',
      description: 'Verify product category navigation and display',
      steps: [
        { action: 'navigate', target: 'Categories Section', description: 'Navigate to product categories' },
        { action: 'verify', target: 'Category List', description: 'Verify all categories are displayed' },
        { action: 'interact', target: 'Category', description: 'Click on a product category' },
        {
          action: 'verify',
          target: 'Products/Content',
          description: 'Verify category page loads with relevant content'
        }
      ],
      assertions: [
        'All product categories are visible',
        'Category images/icons load correctly',
        'Category pages show relevant products',
        'Navigation breadcrumbs work correctly'
      ]
    })
  ];
}

function buildEcommerceFlows(ctx) {
  const flows = [];

  if (ctx.hasCategory('SEARCH')) {
    flows.push(
      createFlow({
        name: 'Product Search',
        priority: 'Critical',
        description: 'Verify product search functionality',
        steps: [
          { action: 'interact', target: 'Search Box', description: 'Click on search input' },
          { action: 'input', target: 'Search Query', description: 'Enter product search term' },
          { action: 'submit', target: 'Search', description: 'Submit search (Enter or click button)' },
          { action: 'verify', target: 'Results', description: 'Verify search results are displayed' },
          { action: 'verify', target: 'Result Count', description: 'Verify result count is shown' }
        ],
        assertions: [
          'Search box accepts input',
          'Search suggestions appear (if applicable)',
          'Results show relevant products',
          'No results message shown for invalid search'
        ],
        elements: ctx.elementSelectors('SEARCH')
      })
    );
  }

  if (ctx.hasCategory('CART')) {
    flows.push(
      createFlow({
        name: 'Add to Cart',
        priority: 'Critical',
        description: 'Verify add to cart functionality',
        steps: [
          { action: 'navigate', target: 'Product Page', description: 'Navigate to a product page' },
          { action: 'verify', target: 'Product Details', description: 'Verify product title, price, and image' },
          { action: 'interact', target: 'Add to Cart', description: 'Click Add to Cart button' },
          { action: 'verify', target: 'Confirmation', description: 'Verify cart update confirmation' },
          { action: 'navigate', target: 'Cart Page', description: 'Go to shopping cart' },
          { action: 'verify', target: 'Cart Contents', description: 'Verify product is in cart with correct details' }
        ],
        assertions: [
          'Add to Cart button is clickable',
          'Cart icon shows updated count',
          'Cart page shows correct product',
          'Price is calculated correctly'
        ],
        elements: ctx.elementSelectors('CART')
      })
    );
  }

  return flows;
}

function buildHealthcarePharmaFlows(ctx, forms) {
  const flows = [
    createFlow({
      name: 'Product/Medicine Information',
      priority: 'Critical',
      description: 'Verify product information accessibility',
      steps: [
        { action: 'navigate', target: 'Products Section', description: 'Navigate to products/brands section' },
        { action: 'interact', target: 'Product Category', description: 'Select a product category' },
        { action: 'verify', target: 'Product List', description: 'Verify products are listed' },
        { action: 'interact', target: 'Product', description: 'Click on a product' },
        {
          action: 'verify',
          target: 'Product Details',
          description: 'Verify product details, composition, usage information'
        }
      ],
      assertions: [
        'Product categories are clearly organized',
        'Product information is accurate and complete',
        'Usage instructions are present',
        'Warnings and precautions are displayed'
      ]
    })
  ];

  const contactForms = formsWithPurpose(forms, 'contact');
  if (contactForms.length > 0 || ctx.hasCategory('AUTH')) {
    flows.push(
      createFlow({
        name: 'Contact/Adverse Event Reporting',
        priority: 'Critical',
        description: 'Verify contact form and adverse event reporting functionality',
        steps: [
          { action: 'navigate', target: 'Contact Page', description: 'Navigate to contact/report section' },
          { action: 'verify', target: 'Contact Form', description: 'Verify contact form is displayed' },
          { action: 'input', target: 'Form Fields', description: 'Fill in all required fields' },
          { action: 'submit', target: 'Form', description: 'Submit the form' },
          { action: 'verify', target: 'Confirmation', description: 'Verify submission confirmation' }
        ],
        assertions: [
          'Contact form is accessible',
          'All required fields are clearly marked',
          'Form validation works correctly',
          'Confirmation message is shown after submission'
        ]
      })
    );
  }

  return flows;
}

function buildOttStreamingFlows(ctx) {
  const flows = [
    createFlow({
      name: 'Content Discovery',
      priority: 'Critical',
      description: 'Verify content discovery and browsing',
      steps: [
        { action: 'navigate', target: 'Homepage', description: 'Load homepage' },
        { action: 'verify', target: 'Content Rails', description: 'Verify content carousels/rails are displayed' },
        { action: 'interact', target: 'Content Item', description: 'Click on a content tile' },
        { action: 'verify', target: 'Details Page', description: 'Verify content details page loads' },
        { action: 'verify', target: 'Play Button', description: 'Verify play button is available' }
      ],
      assertions: [
        'Content thumbnails load correctly',
        'Content metadata is displayed',
        'Play/Watch button is visible',
        'Content ratings are shown'
      ]
    })
  ];

  if (ctx.hasCategory('MEDIA')) {
    flows.push(
      createFlow({
        name: 'Video Playback',
        priority: 'Critical',
        description: 'Verify video playback functionality',
        steps: [
          { action: 'navigate', target: 'Content', description: 'Navigate to playable content' },
          { action: 'interact', target: 'Play Button', description: 'Click play button' },
          { action: 'verify', target: 'Video Player', description: 'Verify video player loads' },
          {
            action: 'verify',
            target: 'Controls',
            description: 'Verify playback controls (play/pause, seek, volume)'
          }
        ],
        assertions: [
          'Video starts playing',
          'Playback controls are functional',
          'Video quality is acceptable',
          'No buffering issues'
        ],
        elements: ctx.elementSelectors('MEDIA')
      })
    );
  }

  return flows;
}

function buildBankingFinanceFlows() {
  return [
    createFlow({
      name: 'Secure Login',
      priority: 'Critical',
      description: 'Verify secure authentication process',
      steps: [
        { action: 'navigate', target: 'Login Page', description: 'Navigate to login page' },
        { action: 'verify', target: 'HTTPS', description: 'Verify secure connection (HTTPS)' },
        { action: 'input', target: 'Credentials', description: 'Enter username and password' },
        { action: 'submit', target: 'Login', description: 'Submit login form' },
        { action: 'verify', target: 'Dashboard', description: 'Verify successful login and dashboard access' }
      ],
      assertions: [
        'Login page uses HTTPS',
        'Password field masks input',
        'Invalid credentials show error',
        'Session timeout works correctly'
      ]
    })
  ];
}

const TYPE_FLOW_BUILDERS = {
  RETAIL_STORE: () => buildRetailStoreFlows(),
  ECOMMERCE: (ctx) => buildEcommerceFlows(ctx),
  HEALTHCARE_PHARMA: (ctx, forms) => buildHealthcarePharmaFlows(ctx, forms),
  OTT_STREAMING: (ctx) => buildOttStreamingFlows(ctx),
  BANKING_FINANCE: () => buildBankingFinanceFlows()
};

/**
 * @param {{ type?: string }} websiteType
 * @param {ReturnType<import('./helpers').createElementContext>} ctx
 * @param {Array<{ purpose: string }>} forms
 */
function buildTypeSpecificFlows(websiteType, ctx, forms) {
  const builder = TYPE_FLOW_BUILDERS[websiteType?.type];
  return builder ? builder(ctx, forms) : [];
}

module.exports = {
  TYPE_FLOW_BUILDERS,
  buildTypeSpecificFlows
};
