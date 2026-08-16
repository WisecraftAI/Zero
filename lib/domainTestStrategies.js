/**
 * Domain Test Strategies Module
 *
 * Provides domain-specific test case generation and automation code patterns
 * for various website/application domains including:
 * - OTT/Streaming Platforms (Netflix, Hotstar, Prime Video, etc.)
 * - E-commerce (Amazon, Flipkart, Myntra, etc.)
 * - Travel/Booking (MakeMyTrip, Booking.com, Airbnb, etc.)
 * - Banking/Finance (HDFC, ICICI, Paytm, etc.)
 * - Healthcare/Pharma (Apollo, 1mg, Practo, etc.)
 * - Food Delivery (Swiggy, Zomato, Uber Eats, etc.)
 * - Education (Coursera, Udemy, Byju's, etc.)
 * - Social Media (Facebook, Instagram, LinkedIn, etc.)
 * - News/Media (Times, NDTV, BBC, etc.)
 */

// ============================================================================
// DOMAIN DEFINITIONS AND TEST STRATEGIES
// ============================================================================

const DOMAIN_STRATEGIES = {
  // ========== OTT / STREAMING PLATFORMS ==========
  OTT_STREAMING: {
    name: 'OTT/Streaming Platform',
    aliases: ['streaming', 'video platform', 'ott', 'netflix', 'hotstar', 'prime video', 'disney+', 'zee5', 'sony liv'],

    coreFeatures: [
      'Content Discovery & Browse',
      'Video Playback',
      'User Profile Management',
      'Subscription Management',
      'Watchlist/Favorites',
      'Continue Watching',
      'Search & Recommendations',
      'Download for Offline',
      'Parental Controls',
      'Multi-Profile Support'
    ],

    criticalFlows: [
      'User Registration and Subscription',
      'Content Search and Discovery',
      'Video Playback Flow',
      'Profile Creation and Switching',
      'Watchlist Management',
      'Subscription Upgrade/Downgrade',
      'Payment and Billing',
      'Offline Download Flow'
    ],

    testScenarios: {
      functional: [
        { scenario: 'User Sign Up', priority: 'Critical', steps: ['Navigate to sign up', 'Enter valid details', 'Verify email OTP', 'Complete registration'] },
        { scenario: 'User Login', priority: 'Critical', steps: ['Navigate to login', 'Enter credentials', 'Verify successful login', 'Verify profile loaded'] },
        { scenario: 'Content Search', priority: 'Critical', steps: ['Click search icon', 'Enter search term', 'Verify search results', 'Click on content'] },
        { scenario: 'Video Playback', priority: 'Critical', steps: ['Select content', 'Click play button', 'Verify video loads', 'Verify playback controls'] },
        { scenario: 'Add to Watchlist', priority: 'High', steps: ['Navigate to content', 'Click Add to Watchlist', 'Verify watchlist updated', 'Access watchlist'] },
        { scenario: 'Continue Watching', priority: 'High', steps: ['Start watching content', 'Exit mid-way', 'Return to homepage', 'Verify content in Continue Watching'] },
        { scenario: 'Profile Switch', priority: 'High', steps: ['Click profile icon', 'Select different profile', 'Verify profile switched', 'Verify personalized content'] },
        { scenario: 'Subscription Management', priority: 'Critical', steps: ['Go to subscription page', 'View current plan', 'Change plan', 'Verify plan changed'] },
        { scenario: 'Offline Download', priority: 'Medium', steps: ['Select downloadable content', 'Click download', 'Verify download progress', 'Play offline content'] },
        { scenario: 'Parental Controls', priority: 'High', steps: ['Access settings', 'Enable parental controls', 'Set PIN', 'Verify restricted content'] }
      ],

      playbackTests: [
        { scenario: 'Play/Pause Control', priority: 'Critical', steps: ['Start playback', 'Click pause', 'Verify video paused', 'Click play', 'Verify resumed'] },
        { scenario: 'Seek Forward/Backward', priority: 'Critical', steps: ['Start playback', 'Seek forward 10s', 'Verify position changed', 'Seek backward', 'Verify position'] },
        { scenario: 'Volume Control', priority: 'High', steps: ['Start playback', 'Adjust volume', 'Mute', 'Unmute', 'Verify audio'] },
        { scenario: 'Fullscreen Toggle', priority: 'High', steps: ['Start playback', 'Enter fullscreen', 'Verify fullscreen mode', 'Exit fullscreen'] },
        { scenario: 'Quality Selection', priority: 'Medium', steps: ['Start playback', 'Open quality settings', 'Select different quality', 'Verify quality changed'] },
        { scenario: 'Subtitle Selection', priority: 'Medium', steps: ['Start playback', 'Open subtitle settings', 'Enable subtitles', 'Change language', 'Verify subtitles'] },
        { scenario: 'Audio Track Selection', priority: 'Medium', steps: ['Start playback', 'Open audio settings', 'Select different audio track', 'Verify audio changed'] },
        { scenario: 'Playback Speed', priority: 'Low', steps: ['Start playback', 'Change speed to 1.5x', 'Verify speed changed', 'Reset to 1x'] },
        { scenario: 'Picture-in-Picture', priority: 'Medium', steps: ['Start playback', 'Enable PiP mode', 'Verify PiP window', 'Exit PiP'] },
        { scenario: 'Chromecast/AirPlay', priority: 'Medium', steps: ['Start playback', 'Click cast button', 'Select device', 'Verify cast started'] }
      ],

      edgeCases: [
        { scenario: 'Network Interruption During Playback', priority: 'High' },
        { scenario: 'Session Timeout While Watching', priority: 'High' },
        { scenario: 'Multiple Device Login Limit', priority: 'Critical' },
        { scenario: 'Expired Subscription Access', priority: 'Critical' },
        { scenario: 'Content Region Restriction', priority: 'High' },
        { scenario: 'Age-Restricted Content Access', priority: 'High' },
        { scenario: 'Download Storage Full', priority: 'Medium' },
        { scenario: 'Concurrent Streams Limit', priority: 'Critical' }
      ],

      securityTests: [
        { scenario: 'DRM Content Protection', priority: 'Critical' },
        { scenario: 'Screen Recording Prevention', priority: 'High' },
        { scenario: 'Session Hijacking Prevention', priority: 'Critical' },
        { scenario: 'Payment Data Security', priority: 'Critical' },
        { scenario: 'Profile PIN Validation', priority: 'High' }
      ]
    },

    automationSelectors: {
      searchBox: ['input[type="search"]', '[data-testid="search-input"]', '.search-input', '#search'],
      playButton: ['[data-testid="play-button"]', '.play-button', 'button[aria-label*="play"]', '.btn-play'],
      pauseButton: ['[data-testid="pause-button"]', '.pause-button', 'button[aria-label*="pause"]'],
      videoPlayer: ['video', '[data-testid="video-player"]', '.video-player', '#player'],
      contentCard: ['[data-testid="content-card"]', '.content-tile', '.movie-card', '.show-card'],
      watchlistButton: ['[data-testid="add-watchlist"]', '.watchlist-btn', 'button[aria-label*="watchlist"]'],
      profileIcon: ['[data-testid="profile-icon"]', '.profile-avatar', '.user-profile'],
      volumeSlider: ['[data-testid="volume-slider"]', '.volume-control', 'input[type="range"][aria-label*="volume"]'],
      progressBar: ['[data-testid="progress-bar"]', '.progress-bar', '.seek-bar'],
      fullscreenButton: ['[data-testid="fullscreen"]', '.fullscreen-btn', 'button[aria-label*="fullscreen"]'],
      qualitySettings: ['[data-testid="quality-settings"]', '.quality-selector', '.settings-quality'],
      subtitleButton: ['[data-testid="subtitles"]', '.subtitle-btn', 'button[aria-label*="subtitle"]']
    },

    sampleAutomationCode: {
      playwright: `
// OTT Platform - Video Playback Test
const { test, expect } = require('@playwright/test');

test.describe('OTT Platform - Video Playback Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.OTT_URL || 'https://example-ott.com');
    // Login if required
    await page.fill('[data-testid="email"]', process.env.TEST_EMAIL);
    await page.fill('[data-testid="password"]', process.env.TEST_PASSWORD);
    await page.click('[data-testid="login-btn"]');
    await page.waitForSelector('[data-testid="profile-icon"]');
  });

  test('Search and Play Content', async ({ page }) => {
    // Search for content
    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', 'Action Movie');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="content-card"]');
    const results = await page.locator('[data-testid="content-card"]').count();
    expect(results).toBeGreaterThan(0);
    
    // Click on first result
    await page.click('[data-testid="content-card"]:first-child');
    
    // Wait for content details page
    await page.waitForSelector('[data-testid="play-button"]');
    
    // Start playback
    await page.click('[data-testid="play-button"]');
    
    // Verify video player loaded
    await page.waitForSelector('video', { state: 'visible' });
    const video = page.locator('video');
    await expect(video).toBeVisible();
    
    // Verify video is playing
    await page.waitForTimeout(3000);
    const currentTime = await video.evaluate(v => v.currentTime);
    expect(currentTime).toBeGreaterThan(0);
  });

  test('Playback Controls - Play/Pause', async ({ page }) => {
    // Navigate to content and start playback
    await page.click('[data-testid="content-card"]:first-child');
    await page.click('[data-testid="play-button"]');
    await page.waitForSelector('video');
    
    // Wait for video to start
    await page.waitForTimeout(2000);
    
    // Pause video
    await page.click('[data-testid="pause-button"]');
    const pausedTime = await page.locator('video').evaluate(v => v.currentTime);
    
    await page.waitForTimeout(1000);
    const afterPauseTime = await page.locator('video').evaluate(v => v.currentTime);
    expect(afterPauseTime).toBe(pausedTime);
    
    // Resume video
    await page.click('[data-testid="play-button"]');
    await page.waitForTimeout(1000);
    const resumedTime = await page.locator('video').evaluate(v => v.currentTime);
    expect(resumedTime).toBeGreaterThan(pausedTime);
  });

  test('Add to Watchlist', async ({ page }) => {
    await page.click('[data-testid="content-card"]:first-child');
    await page.waitForSelector('[data-testid="add-watchlist"]');
    
    // Add to watchlist
    await page.click('[data-testid="add-watchlist"]');
    
    // Verify added
    await expect(page.locator('[data-testid="add-watchlist"]')).toHaveAttribute('aria-pressed', 'true');
    
    // Navigate to watchlist
    await page.click('[data-testid="watchlist-nav"]');
    await page.waitForSelector('[data-testid="watchlist-item"]');
    
    const watchlistItems = await page.locator('[data-testid="watchlist-item"]').count();
    expect(watchlistItems).toBeGreaterThan(0);
  });

  test('Volume Control', async ({ page }) => {
    await page.click('[data-testid="content-card"]:first-child');
    await page.click('[data-testid="play-button"]');
    await page.waitForSelector('video');
    
    // Mute
    await page.click('[data-testid="volume-btn"]');
    const isMuted = await page.locator('video').evaluate(v => v.muted);
    expect(isMuted).toBe(true);
    
    // Unmute
    await page.click('[data-testid="volume-btn"]');
    const isUnmuted = await page.locator('video').evaluate(v => !v.muted);
    expect(isUnmuted).toBe(true);
  });
});
`
    }
  },

  // ========== E-COMMERCE PLATFORMS ==========
  ECOMMERCE: {
    name: 'E-commerce Platform',
    aliases: ['ecommerce', 'online shopping', 'amazon', 'flipkart', 'myntra', 'ebay', 'walmart'],

    coreFeatures: [
      'Product Search & Browse',
      'Product Details & Reviews',
      'Shopping Cart',
      'Checkout Process',
      'Payment Gateway Integration',
      'Order Tracking',
      'User Account Management',
      'Wishlist/Favorites',
      'Product Filtering & Sorting',
      'Offers & Coupons'
    ],

    criticalFlows: [
      'Guest Checkout Flow',
      'Registered User Checkout',
      'Search to Purchase Journey',
      'Add to Cart and Update Cart',
      'Apply Coupon/Discount',
      'Multiple Payment Methods',
      'Order Cancellation/Return',
      'Address Management'
    ],

    testScenarios: {
      functional: [
        { scenario: 'Product Search', priority: 'Critical', steps: ['Enter search term', 'View search results', 'Verify product listings', 'Filter/Sort results'] },
        { scenario: 'Add to Cart', priority: 'Critical', steps: ['Navigate to product', 'Select variants', 'Click Add to Cart', 'Verify cart updated'] },
        { scenario: 'Update Cart Quantity', priority: 'High', steps: ['Go to cart', 'Change quantity', 'Verify price updated', 'Remove item'] },
        { scenario: 'Apply Coupon Code', priority: 'High', steps: ['Add items to cart', 'Enter coupon code', 'Apply coupon', 'Verify discount'] },
        { scenario: 'Guest Checkout', priority: 'Critical', steps: ['Add to cart', 'Proceed to checkout', 'Enter shipping details', 'Complete payment'] },
        { scenario: 'User Login Checkout', priority: 'Critical', steps: ['Login', 'Add to cart', 'Select saved address', 'Complete payment'] },
        { scenario: 'Add to Wishlist', priority: 'Medium', steps: ['View product', 'Click wishlist', 'Verify added', 'Move to cart'] },
        { scenario: 'Product Review', priority: 'Medium', steps: ['Navigate to purchased product', 'Write review', 'Add rating', 'Submit review'] },
        { scenario: 'Order Tracking', priority: 'High', steps: ['Go to orders', 'Select order', 'View tracking details', 'Verify status'] },
        { scenario: 'Order Cancellation', priority: 'High', steps: ['Go to orders', 'Select cancellable order', 'Request cancellation', 'Verify cancelled'] }
      ],

      paymentTests: [
        { scenario: 'Credit Card Payment', priority: 'Critical' },
        { scenario: 'Debit Card Payment', priority: 'Critical' },
        { scenario: 'Net Banking', priority: 'High' },
        { scenario: 'UPI Payment', priority: 'High' },
        { scenario: 'Wallet Payment', priority: 'Medium' },
        { scenario: 'Cash on Delivery', priority: 'High' },
        { scenario: 'EMI Payment', priority: 'Medium' },
        { scenario: 'Gift Card Redemption', priority: 'Medium' },
        { scenario: 'Payment Failure Handling', priority: 'Critical' },
        { scenario: 'Partial Payment', priority: 'Low' }
      ],

      edgeCases: [
        { scenario: 'Out of Stock Product', priority: 'High' },
        { scenario: 'Price Change During Checkout', priority: 'Critical' },
        { scenario: 'Cart Expiry', priority: 'High' },
        { scenario: 'Invalid Coupon Code', priority: 'Medium' },
        { scenario: 'Delivery Unavailable Location', priority: 'High' },
        { scenario: 'Maximum Cart Limit', priority: 'Medium' },
        { scenario: 'Concurrent Purchase Same Item', priority: 'High' },
        { scenario: 'Payment Timeout', priority: 'Critical' }
      ],

      securityTests: [
        { scenario: 'Payment Data Encryption', priority: 'Critical' },
        { scenario: 'PCI DSS Compliance', priority: 'Critical' },
        { scenario: 'Session Hijacking Prevention', priority: 'Critical' },
        { scenario: 'Price Manipulation Prevention', priority: 'Critical' },
        { scenario: 'Coupon Code Brute Force', priority: 'High' }
      ]
    },

    automationSelectors: {
      searchBox: ['input[type="search"]', '#search', '.search-input', '[name="q"]', '[data-testid="search"]'],
      searchButton: ['button[type="submit"]', '.search-btn', '[data-testid="search-btn"]'],
      productCard: ['.product-card', '[data-testid="product"]', '.product-item', '.listing-item'],
      addToCartButton: ['[data-testid="add-to-cart"]', '.add-to-cart', '#add-cart', 'button:has-text("Add to Cart")'],
      cartIcon: ['.cart-icon', '[data-testid="cart"]', '#cart', 'a[href*="cart"]'],
      cartQuantity: ['.cart-count', '.quantity-input', '[data-testid="quantity"]'],
      checkoutButton: ['[data-testid="checkout"]', '.checkout-btn', '#checkout', 'button:has-text("Checkout")'],
      priceElement: ['.price', '[data-testid="price"]', '.product-price', '.amount'],
      couponInput: ['#coupon', '.coupon-input', '[data-testid="coupon"]', '[name="couponCode"]'],
      wishlistButton: ['.wishlist-btn', '[data-testid="wishlist"]', '.add-wishlist', 'button:has-text("Wishlist")']
    },

    sampleAutomationCode: {
      playwright: `
// E-commerce Platform - Shopping Flow Test
const { test, expect } = require('@playwright/test');

test.describe('E-commerce - Shopping Cart Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.ECOMMERCE_URL || 'https://example-shop.com');
  });

  test('Search and Add Product to Cart', async ({ page }) => {
    // Search for product
    await page.fill('[data-testid="search"]', 'iPhone 15');
    await page.click('[data-testid="search-btn"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="product"]');
    const products = await page.locator('[data-testid="product"]').count();
    expect(products).toBeGreaterThan(0);
    
    // Click first product
    await page.click('[data-testid="product"]:first-child');
    
    // Add to cart
    await page.waitForSelector('[data-testid="add-to-cart"]');
    await page.click('[data-testid="add-to-cart"]');
    
    // Verify cart updated
    await expect(page.locator('.cart-count')).toHaveText(/[1-9]/);
  });

  test('Update Cart Quantity', async ({ page }) => {
    // Add product first
    await page.fill('[data-testid="search"]', 'Test Product');
    await page.click('[data-testid="search-btn"]');
    await page.click('[data-testid="product"]:first-child');
    await page.click('[data-testid="add-to-cart"]');
    
    // Go to cart
    await page.click('[data-testid="cart"]');
    await page.waitForSelector('[data-testid="cart-item"]');
    
    // Get initial price
    const initialPrice = await page.locator('[data-testid="total-price"]').textContent();
    
    // Increase quantity
    await page.click('[data-testid="increase-qty"]');
    await page.waitForTimeout(500);
    
    // Verify price changed
    const updatedPrice = await page.locator('[data-testid="total-price"]').textContent();
    expect(updatedPrice).not.toBe(initialPrice);
  });

  test('Apply Valid Coupon Code', async ({ page }) => {
    // Add product to cart
    await page.fill('[data-testid="search"]', 'Test Product');
    await page.click('[data-testid="search-btn"]');
    await page.click('[data-testid="product"]:first-child');
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="cart"]');
    
    // Get price before coupon
    const originalPrice = await page.locator('[data-testid="total-price"]').textContent();
    
    // Apply coupon
    await page.fill('[data-testid="coupon"]', 'SAVE10');
    await page.click('[data-testid="apply-coupon"]');
    
    // Wait for discount to apply
    await page.waitForSelector('[data-testid="discount-applied"]');
    
    // Verify discount
    const discountedPrice = await page.locator('[data-testid="total-price"]').textContent();
    expect(parseFloat(discountedPrice.replace(/[^0-9.]/g, ''))).toBeLessThan(
      parseFloat(originalPrice.replace(/[^0-9.]/g, ''))
    );
  });

  test('Complete Checkout Flow', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login"]');
    await page.fill('[data-testid="email"]', process.env.TEST_EMAIL);
    await page.fill('[data-testid="password"]', process.env.TEST_PASSWORD);
    await page.click('[data-testid="login-btn"]');
    
    // Add product
    await page.fill('[data-testid="search"]', 'Test Product');
    await page.click('[data-testid="search-btn"]');
    await page.click('[data-testid="product"]:first-child');
    await page.click('[data-testid="add-to-cart"]');
    
    // Proceed to checkout
    await page.click('[data-testid="cart"]');
    await page.click('[data-testid="checkout"]');
    
    // Select address
    await page.click('[data-testid="saved-address"]:first-child');
    await page.click('[data-testid="continue"]');
    
    // Select payment method
    await page.click('[data-testid="payment-cod"]');
    await page.click('[data-testid="place-order"]');
    
    // Verify order confirmation
    await page.waitForSelector('[data-testid="order-confirmation"]');
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });
});
`
    }
  },

  // ========== TRAVEL/BOOKING PLATFORMS ==========
  TRAVEL_BOOKING: {
    name: 'Travel Booking Platform',
    aliases: ['travel', 'booking', 'makemytrip', 'goibibo', 'cleartrip', 'yatra', 'airbnb', 'booking.com'],

    coreFeatures: [
      'Flight Search & Booking',
      'Hotel Search & Booking',
      'Bus/Train Booking',
      'Holiday Packages',
      'Cab/Car Rental',
      'Trip Planning',
      'Price Comparison',
      'Booking Management',
      'Fare Calendar',
      'Travel Insurance'
    ],

    criticalFlows: [
      'Flight Search and Booking',
      'Hotel Search and Booking',
      'Round Trip vs One Way',
      'Multi-City Booking',
      'Guest Booking',
      'Booking Modification',
      'Booking Cancellation',
      'Refund Processing'
    ],

    testScenarios: {
      functional: [
        { scenario: 'One Way Flight Search', priority: 'Critical', steps: ['Select one way', 'Enter origin/destination', 'Select date', 'Search flights', 'View results'] },
        { scenario: 'Round Trip Flight Search', priority: 'Critical', steps: ['Select round trip', 'Enter cities', 'Select dates', 'Search', 'View itinerary'] },
        { scenario: 'Hotel Search', priority: 'Critical', steps: ['Enter city/hotel', 'Select check-in/out dates', 'Add guests', 'Search', 'View hotels'] },
        { scenario: 'Flight Booking', priority: 'Critical', steps: ['Search flight', 'Select flight', 'Add travelers', 'Add extras', 'Make payment'] },
        { scenario: 'Hotel Booking', priority: 'Critical', steps: ['Search hotel', 'Select room', 'Enter guest details', 'Make payment', 'Confirm'] },
        { scenario: 'Filter & Sort Results', priority: 'High', steps: ['Search flights/hotels', 'Apply price filter', 'Apply time filter', 'Sort by price', 'Verify sorted'] },
        { scenario: 'Compare Prices', priority: 'Medium', steps: ['Search results', 'Select compare', 'Add items to compare', 'View comparison', 'Make decision'] },
        { scenario: 'Booking Modification', priority: 'High', steps: ['Go to bookings', 'Select booking', 'Request change', 'Pay difference', 'Confirm change'] },
        { scenario: 'Booking Cancellation', priority: 'High', steps: ['Go to bookings', 'Select booking', 'Request cancel', 'Confirm cancellation', 'Check refund status'] },
        { scenario: 'Travel Insurance', priority: 'Medium', steps: ['During booking', 'Select insurance', 'View coverage', 'Add to booking', 'Verify in summary'] }
      ],

      searchTests: [
        { scenario: 'Auto-suggest Origin/Destination', priority: 'High' },
        { scenario: 'Date Picker Validation', priority: 'Critical' },
        { scenario: 'Passenger Count Selection', priority: 'High' },
        { scenario: 'Class Selection (Economy/Business)', priority: 'High' },
        { scenario: 'Flexible Date Search', priority: 'Medium' },
        { scenario: 'No Results Handling', priority: 'High' },
        { scenario: 'Price Alert Setup', priority: 'Low' },
        { scenario: 'Recent Search History', priority: 'Medium' }
      ],

      edgeCases: [
        { scenario: 'Past Date Selection', priority: 'High' },
        { scenario: 'Same Origin and Destination', priority: 'High' },
        { scenario: 'Flight Sold Out During Booking', priority: 'Critical' },
        { scenario: 'Price Change During Booking', priority: 'Critical' },
        { scenario: 'International Date Crossing', priority: 'Medium' },
        { scenario: 'Multiple Passengers Different Nationalities', priority: 'Medium' },
        { scenario: 'Infant Without Adult', priority: 'High' },
        { scenario: 'Session Timeout During Payment', priority: 'Critical' }
      ],

      securityTests: [
        { scenario: 'Payment Card Security', priority: 'Critical' },
        { scenario: 'Passport/ID Data Protection', priority: 'Critical' },
        { scenario: 'Booking Reference Protection', priority: 'High' },
        { scenario: 'Session Security', priority: 'High' }
      ]
    },

    automationSelectors: {
      originInput: ['#origin', '[data-testid="origin"]', '.from-city', 'input[placeholder*="From"]'],
      destinationInput: ['#destination', '[data-testid="destination"]', '.to-city', 'input[placeholder*="To"]'],
      departureDatePicker: ['#departure', '[data-testid="departure-date"]', '.departure-date'],
      returnDatePicker: ['#return', '[data-testid="return-date"]', '.return-date'],
      searchButton: ['[data-testid="search-flights"]', '.search-btn', '#search-btn'],
      flightCard: ['.flight-card', '[data-testid="flight-result"]', '.flight-item'],
      hotelCard: ['.hotel-card', '[data-testid="hotel-result"]', '.hotel-item'],
      priceFilter: ['[data-testid="price-filter"]', '.price-range', '#price-slider'],
      bookButton: ['[data-testid="book-now"]', '.book-btn', 'button:has-text("Book")'],
      passengerSelector: ['[data-testid="passengers"]', '.traveller-selector', '#passengers']
    },

    sampleAutomationCode: {
      playwright: `
// Travel Booking - Flight Search Test
const { test, expect } = require('@playwright/test');

test.describe('Travel Booking - Flight Search Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.TRAVEL_URL || 'https://example-travel.com');
  });

  test('One Way Flight Search', async ({ page }) => {
    // Select one way
    await page.click('[data-testid="one-way"]');
    
    // Enter origin
    await page.click('[data-testid="origin"]');
    await page.fill('[data-testid="origin"]', 'Delhi');
    await page.click('.autocomplete-item:first-child');
    
    // Enter destination
    await page.click('[data-testid="destination"]');
    await page.fill('[data-testid="destination"]', 'Mumbai');
    await page.click('.autocomplete-item:first-child');
    
    // Select date
    await page.click('[data-testid="departure-date"]');
    await page.click('.date-picker-day:not(.disabled):nth-child(15)');
    
    // Search
    await page.click('[data-testid="search-flights"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="flight-result"]');
    const results = await page.locator('[data-testid="flight-result"]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('Apply Price Filter', async ({ page }) => {
    // Perform search first
    await page.click('[data-testid="origin"]');
    await page.fill('[data-testid="origin"]', 'Delhi');
    await page.click('.autocomplete-item:first-child');
    await page.click('[data-testid="destination"]');
    await page.fill('[data-testid="destination"]', 'Mumbai');
    await page.click('.autocomplete-item:first-child');
    await page.click('[data-testid="departure-date"]');
    await page.click('.date-picker-day:not(.disabled):nth-child(15)');
    await page.click('[data-testid="search-flights"]');
    await page.waitForSelector('[data-testid="flight-result"]');
    
    // Apply price filter
    await page.fill('[data-testid="max-price"]', '5000');
    await page.click('[data-testid="apply-filter"]');
    
    // Verify filtered results
    await page.waitForTimeout(1000);
    const prices = await page.locator('[data-testid="flight-price"]').allTextContents();
    prices.forEach(price => {
      const numericPrice = parseFloat(price.replace(/[^0-9]/g, ''));
      expect(numericPrice).toBeLessThanOrEqual(5000);
    });
  });

  test('Round Trip Search', async ({ page }) => {
    // Select round trip
    await page.click('[data-testid="round-trip"]');
    
    // Enter origin and destination
    await page.fill('[data-testid="origin"]', 'Bangalore');
    await page.click('.autocomplete-item:first-child');
    await page.fill('[data-testid="destination"]', 'Chennai');
    await page.click('.autocomplete-item:first-child');
    
    // Select departure date
    await page.click('[data-testid="departure-date"]');
    await page.click('.date-picker-day:not(.disabled):nth-child(10)');
    
    // Select return date
    await page.click('[data-testid="return-date"]');
    await page.click('.date-picker-day:not(.disabled):nth-child(17)');
    
    // Search
    await page.click('[data-testid="search-flights"]');
    
    // Verify both outbound and return flights shown
    await page.waitForSelector('[data-testid="outbound-flights"]');
    await page.waitForSelector('[data-testid="return-flights"]');
    
    const outbound = await page.locator('[data-testid="outbound-flights"] [data-testid="flight-result"]').count();
    const returnFlights = await page.locator('[data-testid="return-flights"] [data-testid="flight-result"]').count();
    
    expect(outbound).toBeGreaterThan(0);
    expect(returnFlights).toBeGreaterThan(0);
  });
});
`
    }
  },

  // ========== BANKING/FINANCE PLATFORMS ==========
  BANKING_FINANCE: {
    name: 'Banking/Finance Portal',
    aliases: ['banking', 'finance', 'bank', 'hdfc', 'icici', 'sbi', 'axis', 'paytm', 'phonepe', 'google pay'],

    coreFeatures: [
      'Account Login/Authentication',
      'Account Summary/Dashboard',
      'Fund Transfer (NEFT/RTGS/IMPS)',
      'UPI Payments',
      'Bill Payments',
      'Mobile Recharge',
      'Account Statement',
      'Fixed Deposit/Investments',
      'Loan Management',
      'Card Management'
    ],

    criticalFlows: [
      'Secure Login with MFA',
      'Own Account Transfer',
      'Third Party Transfer',
      'UPI Payment Flow',
      'Bill Payment Flow',
      'Statement Download',
      'Beneficiary Management',
      'Password/PIN Change'
    ],

    testScenarios: {
      functional: [
        { scenario: 'User Login', priority: 'Critical', steps: ['Enter customer ID', 'Enter password', 'Complete 2FA', 'Verify dashboard'] },
        { scenario: 'View Account Balance', priority: 'Critical', steps: ['Login', 'Navigate to accounts', 'View balance', 'Verify accuracy'] },
        { scenario: 'Fund Transfer - Own Account', priority: 'Critical', steps: ['Select from account', 'Select to account', 'Enter amount', 'Confirm', 'Verify transfer'] },
        { scenario: 'Fund Transfer - Third Party', priority: 'Critical', steps: ['Select from account', 'Select beneficiary', 'Enter amount', 'Enter OTP', 'Confirm'] },
        { scenario: 'Add Beneficiary', priority: 'High', steps: ['Go to beneficiary', 'Add new', 'Enter details', 'Verify via OTP', 'Confirm added'] },
        { scenario: 'Bill Payment', priority: 'High', steps: ['Select biller', 'Enter details', 'Enter amount', 'Make payment', 'Verify receipt'] },
        { scenario: 'Download Statement', priority: 'Medium', steps: ['Go to statements', 'Select account', 'Select date range', 'Download', 'Verify file'] },
        { scenario: 'UPI Payment', priority: 'High', steps: ['Select UPI pay', 'Enter UPI ID', 'Enter amount', 'Enter PIN', 'Verify payment'] },
        { scenario: 'Change Password', priority: 'High', steps: ['Go to settings', 'Change password', 'Enter old password', 'Enter new password', 'Verify changed'] },
        { scenario: 'Set Transaction Limits', priority: 'Medium', steps: ['Go to settings', 'Set limits', 'Enter new limits', 'Verify via OTP', 'Confirm'] }
      ],

      securityTests: [
        { scenario: 'Invalid Login Attempts Lockout', priority: 'Critical' },
        { scenario: 'Session Timeout', priority: 'Critical' },
        { scenario: 'OTP Expiry', priority: 'Critical' },
        { scenario: 'Transaction Limits Enforcement', priority: 'Critical' },
        { scenario: 'SQL Injection Prevention', priority: 'Critical' },
        { scenario: 'XSS Prevention', priority: 'Critical' },
        { scenario: 'CSRF Protection', priority: 'Critical' },
        { scenario: 'SSL/TLS Verification', priority: 'Critical' },
        { scenario: 'Concurrent Session Prevention', priority: 'High' },
        { scenario: 'Sensitive Data Masking', priority: 'Critical' }
      ],

      edgeCases: [
        { scenario: 'Insufficient Balance Transfer', priority: 'Critical' },
        { scenario: 'Daily Transfer Limit Exceeded', priority: 'Critical' },
        { scenario: 'Invalid Beneficiary Account', priority: 'High' },
        { scenario: 'Network Failure During Transaction', priority: 'Critical' },
        { scenario: 'Duplicate Transaction Prevention', priority: 'Critical' },
        { scenario: 'Transaction During Maintenance', priority: 'High' },
        { scenario: 'Expired Session Transaction', priority: 'Critical' }
      ]
    },

    automationSelectors: {
      customerIdInput: ['#customerId', '[data-testid="customer-id"]', 'input[name="userId"]'],
      passwordInput: ['#password', '[data-testid="password"]', 'input[type="password"]'],
      loginButton: ['[data-testid="login"]', '#login-btn', 'button[type="submit"]'],
      otpInput: ['#otp', '[data-testid="otp"]', 'input[name="otp"]'],
      balanceDisplay: ['[data-testid="balance"]', '.account-balance', '#balance'],
      transferButton: ['[data-testid="transfer"]', '.transfer-btn', '#fund-transfer'],
      amountInput: ['#amount', '[data-testid="amount"]', 'input[name="amount"]'],
      confirmButton: ['[data-testid="confirm"]', '.confirm-btn', '#confirm-transaction']
    },

    sampleAutomationCode: {
      playwright: `
// Banking Portal - Fund Transfer Test
const { test, expect } = require('@playwright/test');

test.describe('Banking Portal - Transaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.BANK_URL || 'https://example-bank.com');
    
    // Secure login
    await page.fill('[data-testid="customer-id"]', process.env.CUSTOMER_ID);
    await page.fill('[data-testid="password"]', process.env.PASSWORD);
    await page.click('[data-testid="login"]');
    
    // Handle 2FA if present
    const otpField = await page.locator('[data-testid="otp"]').isVisible();
    if (otpField) {
      // In real tests, use OTP from test environment
      await page.fill('[data-testid="otp"]', process.env.TEST_OTP || '123456');
      await page.click('[data-testid="verify-otp"]');
    }
    
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('View Account Balance', async ({ page }) => {
    await page.click('[data-testid="accounts"]');
    await page.waitForSelector('[data-testid="balance"]');
    
    const balance = await page.locator('[data-testid="balance"]').textContent();
    expect(balance).toMatch(/₹|Rs\.|INR/);
  });

  test('Fund Transfer - Own Account', async ({ page }) => {
    await page.click('[data-testid="transfer"]');
    await page.click('[data-testid="own-account"]');
    
    // Select accounts
    await page.selectOption('[data-testid="from-account"]', { index: 0 });
    await page.selectOption('[data-testid="to-account"]', { index: 1 });
    
    // Enter amount
    await page.fill('[data-testid="amount"]', '100');
    await page.fill('[data-testid="remarks"]', 'Test Transfer');
    
    // Confirm
    await page.click('[data-testid="proceed"]');
    await page.waitForSelector('[data-testid="confirm-details"]');
    await page.click('[data-testid="confirm"]');
    
    // Verify success
    await page.waitForSelector('[data-testid="success-message"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('successful');
  });

  test('Insufficient Balance Error', async ({ page }) => {
    await page.click('[data-testid="transfer"]');
    await page.click('[data-testid="third-party"]');
    
    // Select account and beneficiary
    await page.selectOption('[data-testid="from-account"]', { index: 0 });
    await page.selectOption('[data-testid="beneficiary"]', { index: 0 });
    
    // Enter amount greater than balance
    await page.fill('[data-testid="amount"]', '999999999');
    await page.click('[data-testid="proceed"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('insufficient');
  });

  test('Session Timeout Warning', async ({ page }) => {
    // Wait for session timeout warning
    await page.waitForSelector('[data-testid="session-warning"]', { timeout: 300000 });
    await expect(page.locator('[data-testid="session-warning"]')).toBeVisible();
    
    // Extend session
    await page.click('[data-testid="extend-session"]');
    await expect(page.locator('[data-testid="session-warning"]')).not.toBeVisible();
  });
});
`
    }
  },

  // ========== FOOD DELIVERY PLATFORMS ==========
  FOOD_DELIVERY: {
    name: 'Food Delivery Platform',
    aliases: ['food delivery', 'swiggy', 'zomato', 'uber eats', 'doordash', 'foodpanda'],

    coreFeatures: [
      'Restaurant Search & Browse',
      'Menu Browse',
      'Cart Management',
      'Order Placement',
      'Live Order Tracking',
      'Address Management',
      'Payment Options',
      'Offers & Coupons',
      'Ratings & Reviews',
      'Reorder'
    ],

    criticalFlows: [
      'Restaurant Discovery',
      'Add Items to Cart',
      'Checkout & Payment',
      'Order Tracking',
      'Apply Offers',
      'Delivery Address Selection',
      'Order Cancellation'
    ],

    testScenarios: {
      functional: [
        { scenario: 'Search Restaurant', priority: 'Critical', steps: ['Enter location', 'Search restaurant', 'View results', 'Filter by cuisine'] },
        { scenario: 'Browse Menu', priority: 'Critical', steps: ['Select restaurant', 'View menu', 'Browse categories', 'View item details'] },
        { scenario: 'Add to Cart', priority: 'Critical', steps: ['Select item', 'Customize if needed', 'Add to cart', 'Verify cart updated'] },
        { scenario: 'Place Order', priority: 'Critical', steps: ['Go to cart', 'Select address', 'Apply coupon', 'Make payment', 'Confirm order'] },
        { scenario: 'Track Order', priority: 'High', steps: ['Go to orders', 'Select active order', 'View live tracking', 'Verify status updates'] },
        { scenario: 'Cancel Order', priority: 'High', steps: ['Go to orders', 'Select order', 'Request cancel', 'Confirm cancellation', 'Check refund'] },
        { scenario: 'Apply Offer', priority: 'High', steps: ['Add items to cart', 'View available offers', 'Apply offer', 'Verify discount'] },
        { scenario: 'Add Address', priority: 'Medium', steps: ['Go to addresses', 'Add new address', 'Enter details', 'Save address', 'Verify saved'] },
        { scenario: 'Rate Order', priority: 'Medium', steps: ['Complete order', 'Rate restaurant', 'Rate delivery', 'Add feedback', 'Submit'] },
        { scenario: 'Reorder', priority: 'Medium', steps: ['Go to orders', 'Select past order', 'Click reorder', 'Verify cart populated'] }
      ],

      edgeCases: [
        { scenario: 'Restaurant Closed', priority: 'High' },
        { scenario: 'Item Out of Stock', priority: 'High' },
        { scenario: 'Delivery Not Available', priority: 'Critical' },
        { scenario: 'Minimum Order Value Not Met', priority: 'High' },
        { scenario: 'Multiple Restaurants in Cart', priority: 'High' },
        { scenario: 'Order During High Demand', priority: 'Medium' },
        { scenario: 'Delivery Executive Unavailable', priority: 'High' }
      ]
    },

    automationSelectors: {
      locationInput: ['#location', '[data-testid="location"]', '.location-input'],
      searchBox: ['#search', '[data-testid="search"]', '.search-restaurant'],
      restaurantCard: ['.restaurant-card', '[data-testid="restaurant"]', '.restaurant-item'],
      menuItem: ['.menu-item', '[data-testid="menu-item"]', '.dish-item'],
      addButton: ['[data-testid="add-item"]', '.add-btn', 'button:has-text("Add")'],
      cartIcon: ['.cart-icon', '[data-testid="cart"]', '#cart'],
      checkoutButton: ['[data-testid="checkout"]', '.checkout-btn', '#checkout'],
      trackOrder: ['[data-testid="track-order"]', '.track-btn', '#track']
    },

    sampleAutomationCode: {
      playwright: `
// Food Delivery - Order Flow Test
const { test, expect } = require('@playwright/test');

test.describe('Food Delivery - Order Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.FOOD_URL || 'https://example-food.com');
    
    // Set location
    await page.fill('[data-testid="location"]', 'Bangalore, India');
    await page.click('.location-suggestion:first-child');
    await page.waitForSelector('[data-testid="restaurant"]');
  });

  test('Search and Order from Restaurant', async ({ page }) => {
    // Search restaurant
    await page.fill('[data-testid="search"]', 'Pizza');
    await page.waitForSelector('[data-testid="restaurant"]');
    
    // Select first restaurant
    await page.click('[data-testid="restaurant"]:first-child');
    await page.waitForSelector('[data-testid="menu-item"]');
    
    // Add item to cart
    await page.click('[data-testid="add-item"]:first-child');
    
    // Verify cart updated
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // Go to cart
    await page.click('[data-testid="cart"]');
    await page.waitForSelector('[data-testid="cart-item"]');
    
    // Proceed to checkout
    await page.click('[data-testid="checkout"]');
    
    // Select address
    await page.click('[data-testid="saved-address"]:first-child');
    
    // Place order (COD)
    await page.click('[data-testid="payment-cod"]');
    await page.click('[data-testid="place-order"]');
    
    // Verify order placed
    await page.waitForSelector('[data-testid="order-confirmation"]');
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });

  test('Live Order Tracking', async ({ page }) => {
    // Assume order already placed
    await page.click('[data-testid="orders"]');
    await page.click('[data-testid="active-order"]:first-child');
    
    // Verify tracking elements
    await expect(page.locator('[data-testid="order-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-map"]')).toBeVisible();
  });
});
`
    }
  },

  // ========== HEALTHCARE/PHARMA ==========
  HEALTHCARE_PHARMA: {
    name: 'Healthcare/Pharmaceutical',
    aliases: ['healthcare', 'pharma', 'medical', 'apollo', '1mg', 'practo', 'netmeds'],

    coreFeatures: [
      'Doctor Consultation Booking',
      'Medicine Search & Order',
      'Lab Test Booking',
      'Health Records',
      'Prescription Upload',
      'Video Consultation',
      'Symptom Checker',
      'Health Tips/Articles',
      'Insurance Integration',
      'Reminder/Notifications'
    ],

    testScenarios: {
      functional: [
        { scenario: 'Book Doctor Appointment', priority: 'Critical' },
        { scenario: 'Search Medicine', priority: 'Critical' },
        { scenario: 'Order Medicine with Prescription', priority: 'Critical' },
        { scenario: 'Book Lab Test', priority: 'High' },
        { scenario: 'Video Consultation', priority: 'Critical' },
        { scenario: 'Upload Prescription', priority: 'High' },
        { scenario: 'View Health Records', priority: 'Medium' },
        { scenario: 'Set Medicine Reminder', priority: 'Medium' }
      ],

      securityTests: [
        { scenario: 'PHI Data Protection', priority: 'Critical' },
        { scenario: 'Prescription Verification', priority: 'Critical' },
        { scenario: 'Doctor Credentials Verification', priority: 'Critical' },
        { scenario: 'HIPAA Compliance', priority: 'Critical' }
      ]
    }
  },

  // ========== EDUCATION PLATFORMS ==========
  EDUCATION: {
    name: 'Education Platform',
    aliases: ['education', 'elearning', 'coursera', 'udemy', 'byju', 'unacademy'],

    coreFeatures: [
      'Course Search & Browse',
      'Course Enrollment',
      'Video Lectures',
      'Quizzes & Assessments',
      'Progress Tracking',
      'Certificates',
      'Discussion Forums',
      'Live Classes',
      'Notes & Downloads',
      'Student Dashboard'
    ],

    testScenarios: {
      functional: [
        { scenario: 'Search Course', priority: 'Critical' },
        { scenario: 'Enroll in Course', priority: 'Critical' },
        { scenario: 'Watch Video Lecture', priority: 'Critical' },
        { scenario: 'Take Quiz', priority: 'High' },
        { scenario: 'View Progress', priority: 'High' },
        { scenario: 'Download Certificate', priority: 'Medium' },
        { scenario: 'Join Live Class', priority: 'High' },
        { scenario: 'Post in Discussion', priority: 'Medium' }
      ]
    }
  },

  // ========== NEWS/MEDIA ==========
  NEWS_MEDIA: {
    name: 'News/Media Website',
    aliases: ['news', 'media', 'times', 'ndtv', 'bbc', 'cnn'],

    coreFeatures: [
      'Article Reading',
      'Category Browse',
      'Search Articles',
      'Breaking News',
      'Video News',
      'Opinion/Editorial',
      'Newsletter Subscribe',
      'Comments/Discussion',
      'Save/Bookmark Article',
      'Share Article'
    ],

    testScenarios: {
      functional: [
        { scenario: 'Browse Homepage', priority: 'Critical' },
        { scenario: 'Read Article', priority: 'Critical' },
        { scenario: 'Search News', priority: 'High' },
        { scenario: 'Browse Category', priority: 'High' },
        { scenario: 'Watch Video', priority: 'High' },
        { scenario: 'Subscribe Newsletter', priority: 'Medium' },
        { scenario: 'Share Article', priority: 'Medium' },
        { scenario: 'Post Comment', priority: 'Low' }
      ]
    }
  },

  // ========== SOCIAL MEDIA ==========
  SOCIAL_MEDIA: {
    name: 'Social Media Platform',
    aliases: ['social', 'facebook', 'instagram', 'twitter', 'linkedin'],

    coreFeatures: [
      'User Profile',
      'Post Content',
      'Feed/Timeline',
      'Like/React',
      'Comment',
      'Share/Retweet',
      'Follow/Connect',
      'Messaging',
      'Notifications',
      'Search Users/Content'
    ],

    testScenarios: {
      functional: [
        { scenario: 'Create Post', priority: 'Critical' },
        { scenario: 'View Feed', priority: 'Critical' },
        { scenario: 'Like Post', priority: 'High' },
        { scenario: 'Comment on Post', priority: 'High' },
        { scenario: 'Share Post', priority: 'High' },
        { scenario: 'Send Message', priority: 'High' },
        { scenario: 'Follow User', priority: 'High' },
        { scenario: 'Update Profile', priority: 'Medium' },
        { scenario: 'Search Users', priority: 'Medium' },
        { scenario: 'Upload Media', priority: 'High' }
      ],

      securityTests: [
        { scenario: 'Privacy Settings', priority: 'Critical' },
        { scenario: 'Content Moderation', priority: 'High' },
        { scenario: 'Account Security', priority: 'Critical' },
        { scenario: 'Data Export/Delete', priority: 'High' }
      ]
    }
  },

  // ========== RETAIL STORE WEBSITES ==========
  RETAIL_STORE: {
    name: 'Retail Store Website',
    aliases: ['retail', 'store', 'saravana', 'supermarket', 'department store', 'shopping mall', 'reliance', 'dmart', 'bigbazaar', 'pantaloons', 'lifestyle', 'shoppers stop'],
    
    coreFeatures: [
      'Store Locator/Branch Information',
      'Product Categories',
      'About Us/Company Information',
      'Contact Information',
      'Store Timings',
      'Offers & Promotions',
      'Product Gallery',
      'Navigation Menu',
      'Social Media Links',
      'Customer Service'
    ],
    
    criticalFlows: [
      'Find Store/Branch Location',
      'View Branch Contact Details',
      'Browse Product Categories',
      'View Store Timings',
      'Navigate to Contact Page',
      'View Current Offers',
      'Access Store Information'
    ],
    
    testScenarios: {
      functional: [
        { scenario: 'Homepage Load and Display', priority: 'Critical', steps: ['Navigate to homepage', 'Verify page loads completely', 'Check all sections visible', 'Verify logo displayed'] },
        { scenario: 'Navigation Menu Functionality', priority: 'Critical', steps: ['Verify menu is visible', 'Click each menu item', 'Verify correct page loads', 'Test back navigation'] },
        { scenario: 'Store/Branch Locator', priority: 'Critical', steps: ['Navigate to branches section', 'Verify all branches listed', 'Check branch addresses displayed', 'Verify contact numbers shown'] },
        { scenario: 'Branch Details Display', priority: 'Critical', steps: ['Select a branch', 'Verify address is complete', 'Check phone number displayed', 'Verify store timings shown'] },
        { scenario: 'Product Categories Browse', priority: 'High', steps: ['Navigate to products/categories', 'Verify categories displayed', 'Click on category', 'Verify category content loads'] },
        { scenario: 'Contact Information Access', priority: 'High', steps: ['Navigate to contact page', 'Verify contact form/info displayed', 'Check phone numbers', 'Verify email address'] },
        { scenario: 'About Us Page', priority: 'Medium', steps: ['Navigate to About Us', 'Verify company info displayed', 'Check history/mission content', 'Verify images load'] },
        { scenario: 'Offers/Promotions Display', priority: 'High', steps: ['Navigate to offers section', 'Verify current offers displayed', 'Check offer validity dates', 'Verify offer details'] },
        { scenario: 'Store Timings Verification', priority: 'High', steps: ['Find store timings section', 'Verify opening hours displayed', 'Check closing hours', 'Verify holiday information'] },
        { scenario: 'Social Media Links', priority: 'Medium', steps: ['Scroll to footer', 'Find social media icons', 'Click each social link', 'Verify correct profile opens'] },
        { scenario: 'Map/Directions Functionality', priority: 'High', steps: ['Go to branch page', 'Click Get Directions/Map', 'Verify map loads', 'Check directions option'] },
        { scenario: 'Image Gallery View', priority: 'Medium', steps: ['Navigate to gallery section', 'Verify images load', 'Click on image', 'Test gallery navigation'] }
      ],
      
      branchTests: [
        { scenario: 'All Branches Listed', priority: 'Critical', steps: ['Navigate to branches', 'Count branches displayed', 'Verify against expected count', 'Check no duplicates'] },
        { scenario: 'Branch Address Accuracy', priority: 'Critical', steps: ['Select each branch', 'Verify complete address', 'Check city/state', 'Verify PIN code'] },
        { scenario: 'Branch Contact Numbers', priority: 'High', steps: ['View branch details', 'Verify phone numbers displayed', 'Check format validity', 'Test click-to-call if available'] },
        { scenario: 'Branch Store Timings', priority: 'High', steps: ['Check each branch timing', 'Verify weekday hours', 'Check weekend hours', 'Verify holiday schedule'] },
        { scenario: 'Branch Specific Offers', priority: 'Medium', steps: ['Select branch', 'Check for branch offers', 'Verify offer applicability', 'Check validity period'] },
        { scenario: 'Branch Photos/Gallery', priority: 'Low', steps: ['View branch page', 'Check store photos', 'Verify image quality', 'Test gallery slideshow'] }
      ],
      
      navigationTests: [
        { scenario: 'Main Menu Navigation', priority: 'Critical', steps: ['Click Home menu', 'Click About menu', 'Click Branches menu', 'Click Contact menu'] },
        { scenario: 'Logo Click Returns Home', priority: 'High', steps: ['Navigate to any page', 'Click logo', 'Verify returns to homepage', 'Check page loads correctly'] },
        { scenario: 'Footer Navigation Links', priority: 'Medium', steps: ['Scroll to footer', 'Click footer links', 'Verify pages load', 'Test all footer links'] },
        { scenario: 'Mobile Menu (Hamburger)', priority: 'High', steps: ['Switch to mobile view', 'Click hamburger menu', 'Verify menu opens', 'Test menu items'] },
        { scenario: 'Breadcrumb Navigation', priority: 'Low', steps: ['Navigate to deep page', 'Check breadcrumbs displayed', 'Click breadcrumb links', 'Verify navigation works'] }
      ],
      
      contentTests: [
        { scenario: 'All Images Load Correctly', priority: 'High', steps: ['Load each page', 'Check all images visible', 'Verify no broken images', 'Check image quality'] },
        { scenario: 'Video Content Playback', priority: 'Medium', steps: ['Find video content', 'Click play button', 'Verify video plays', 'Test video controls'] },
        { scenario: 'Text Content Readability', priority: 'Medium', steps: ['Check font sizes', 'Verify text contrast', 'Check content formatting', 'Test different screen sizes'] },
        { scenario: 'Banner/Carousel Display', priority: 'Medium', steps: ['View hero banner', 'Check auto-rotation', 'Test manual navigation', 'Verify all slides display'] }
      ],
      
      edgeCases: [
        { scenario: 'Slow Network Loading', priority: 'High' },
        { scenario: 'Page Refresh Behavior', priority: 'Medium' },
        { scenario: 'Browser Back/Forward', priority: 'Medium' },
        { scenario: 'Deep Link Access', priority: 'Medium' },
        { scenario: 'Multiple Tab Access', priority: 'Low' },
        { scenario: 'Session Persistence', priority: 'Low' }
      ],
      
      accessibilityTests: [
        { scenario: 'Keyboard Navigation', priority: 'High', steps: ['Navigate using Tab', 'Verify focus visible', 'Test Enter key actions', 'Check skip links'] },
        { scenario: 'Screen Reader Compatibility', priority: 'High', steps: ['Enable screen reader', 'Navigate the site', 'Verify content announced', 'Check ARIA labels'] },
        { scenario: 'Color Contrast Check', priority: 'Medium', steps: ['Check text contrast', 'Verify button visibility', 'Test link colors', 'Check error states'] },
        { scenario: 'Alt Text for Images', priority: 'High', steps: ['Inspect images', 'Verify alt text present', 'Check alt text meaningful', 'Test decorative images'] }
      ],
      
      responsiveTests: [
        { scenario: 'Desktop Layout (1920x1080)', priority: 'High', steps: ['Set desktop viewport', 'Verify full layout', 'Check all elements visible', 'Test interactions'] },
        { scenario: 'Tablet Layout (768x1024)', priority: 'High', steps: ['Set tablet viewport', 'Check responsive layout', 'Verify touch targets', 'Test menu behavior'] },
        { scenario: 'Mobile Layout (375x667)', priority: 'Critical', steps: ['Set mobile viewport', 'Check mobile menu', 'Verify scrolling', 'Test all features'] },
        { scenario: 'Landscape Orientation', priority: 'Medium', steps: ['Rotate to landscape', 'Check layout adjusts', 'Verify no overflow', 'Test content visibility'] }
      ],
      
      performanceTests: [
        { scenario: 'Page Load Time', priority: 'High', steps: ['Clear cache', 'Load homepage', 'Measure load time', 'Check under 3 seconds'] },
        { scenario: 'Image Optimization', priority: 'Medium', steps: ['Check image sizes', 'Verify compression', 'Test lazy loading', 'Check format (WebP)'] },
        { scenario: 'First Contentful Paint', priority: 'High', steps: ['Measure FCP', 'Check under 1.8s', 'Identify blocking resources', 'Verify critical CSS'] }
      ]
    },
    
    automationSelectors: {
      navigation: ['nav', '[role="navigation"]', '.nav', '.menu', '.navbar', 'header nav'],
      logo: ['[class*="logo"]', 'img[alt*="logo"]', 'a[href="/"]', '.header-logo'],
      menuItems: ['nav a', '.menu-item', '.nav-link', '[role="menuitem"]'],
      branchCard: ['[class*="branch"]', '[class*="store"]', '[class*="location"]', '.branch-item'],
      branchAddress: ['[class*="address"]', '.location-address', '.branch-address', 'p:has-text("Address")'],
      branchPhone: ['[class*="phone"]', '[class*="contact"]', 'a[href^="tel:"]', '.branch-phone'],
      branchTiming: ['[class*="timing"]', '[class*="hours"]', '.store-hours', '.opening-hours'],
      footer: ['footer', '[role="contentinfo"]', '.footer', '#footer'],
      socialLinks: ['[class*="social"]', 'a[href*="facebook"]', 'a[href*="instagram"]', 'a[href*="twitter"]'],
      categoryCard: ['[class*="category"]', '[class*="product"]', '.category-item', '.product-category'],
      gallery: ['[class*="gallery"]', '[class*="slider"]', '.image-gallery', '.carousel'],
      contactForm: ['form[class*="contact"]', '#contact-form', '.contact-form'],
      mapElement: ['[class*="map"]', 'iframe[src*="maps"]', '#map', '.store-map']
    },
    
    sampleAutomationCode: {
      playwright: `
// Retail Store Website - Store Locator & Navigation Tests
const { test, expect } = require('@playwright/test');

test.describe('Retail Store Website - Store Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.STORE_URL || 'https://example-store.com');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('Verify Homepage Loads Correctly', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/store|saravana|retail/i);
    
    // Check logo is visible
    const logo = page.locator('[class*="logo"], img[alt*="logo"]').first();
    await expect(logo).toBeVisible();
    
    // Verify navigation menu
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible();
    
    // Check main content
    await expect(page.locator('body')).toBeVisible();
  });

  test('Navigation Menu Functionality', async ({ page }) => {
    // Find and verify navigation
    const menuItems = page.locator('nav a, .menu-item, .nav-link');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
    
    // Test each menu item
    for (let i = 0; i < Math.min(count, 5); i++) {
      const item = menuItems.nth(i);
      const href = await item.getAttribute('href');
      if (href && !href.startsWith('#') && !href.includes('javascript')) {
        await item.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        await expect(page.locator('body')).toBeVisible();
        await page.goBack();
        await page.waitForTimeout(500);
      }
    }
  });

  test('Store/Branch Locator', async ({ page }) => {
    // Navigate to branches section
    const branchLink = page.locator('a:has-text("Branch"), a:has-text("Store"), a:has-text("Location")').first();
    if (await branchLink.isVisible()) {
      await branchLink.click();
      await page.waitForLoadState('domcontentloaded');
    }
    
    // Find branch cards/listings
    const branches = page.locator('[class*="branch"], [class*="store"], [class*="location"]');
    await page.waitForTimeout(2000);
    
    // Verify branches are displayed
    const branchCount = await branches.count();
    console.log(\`Found \${branchCount} branches\`);
    
    // Check at least one branch has address
    if (branchCount > 0) {
      const firstBranch = branches.first();
      await expect(firstBranch).toBeVisible();
    }
  });

  test('Verify Branch Details', async ({ page }) => {
    // Navigate to branches
    await page.click('a:has-text("Branch"), a:has-text("Store")');
    await page.waitForTimeout(2000);
    
    // Check for address elements
    const addresses = page.locator('[class*="address"], .location-address');
    const phones = page.locator('[class*="phone"], a[href^="tel:"]');
    
    // Verify addresses are displayed
    if (await addresses.count() > 0) {
      const firstAddress = addresses.first();
      const addressText = await firstAddress.textContent();
      expect(addressText.length).toBeGreaterThan(10);
    }
    
    // Verify phone numbers if present
    if (await phones.count() > 0) {
      const firstPhone = phones.first();
      await expect(firstPhone).toBeVisible();
    }
  });

  test('Footer and Social Links', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Verify footer visible
    const footer = page.locator('footer, [role="contentinfo"], .footer').first();
    await expect(footer).toBeVisible();
    
    // Check for social media links
    const socialLinks = page.locator('a[href*="facebook"], a[href*="instagram"], a[href*="twitter"]');
    const socialCount = await socialLinks.count();
    console.log(\`Found \${socialCount} social media links\`);
  });

  test('Responsive - Mobile View', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Check for hamburger menu
    const hamburger = page.locator('[class*="hamburger"], [class*="mobile-menu"], button[aria-label*="menu"]').first();
    
    // Verify page content visible
    await expect(page.locator('body')).toBeVisible();
    
    // If hamburger exists, test it
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);
      // Mobile menu should be visible
      const mobileNav = page.locator('[class*="mobile-nav"], [class*="menu-open"]');
      // Navigation should become visible
    }
  });
});
`
    }
  },

  // ========== CORPORATE WEBSITE ==========
  CORPORATE: {
    name: 'Corporate Website',
    aliases: ['corporate', 'company', 'enterprise', 'business', 'about us', 'investor relations'],
    
    coreFeatures: [
      'Company Information',
      'About Us',
      'Leadership Team',
      'Careers/Jobs',
      'Investor Relations',
      'News/Press Releases',
      'Contact Information',
      'CSR/Sustainability',
      'Products/Services',
      'Locations/Offices'
    ],
    
    testScenarios: {
      functional: [
        { scenario: 'Homepage Display', priority: 'Critical', steps: ['Load homepage', 'Verify content', 'Check navigation'] },
        { scenario: 'About Us Page', priority: 'High', steps: ['Navigate to About', 'Verify company info', 'Check mission/vision'] },
        { scenario: 'Leadership Page', priority: 'Medium', steps: ['Navigate to leadership', 'Verify team displayed', 'Check profiles'] },
        { scenario: 'Careers/Jobs Section', priority: 'High', steps: ['Navigate to careers', 'Verify job listings', 'Test job search'] },
        { scenario: 'News/Press Releases', priority: 'Medium', steps: ['Navigate to news', 'Verify articles', 'Check dates'] },
        { scenario: 'Contact Page', priority: 'High', steps: ['Navigate to contact', 'Verify contact info', 'Test form if present'] },
        { scenario: 'Investor Relations', priority: 'Medium', steps: ['Navigate to IR', 'Check financial info', 'Verify reports'] },
        { scenario: 'Office Locations', priority: 'Medium', steps: ['Find locations', 'Verify addresses', 'Check maps'] }
      ]
    }
  }
};

// ============================================================================
// DOMAIN DETECTION AND MAPPING
// ============================================================================

/**
 * Detect domain from URL and page content
 */
function detectDomain(url, pageContent = '', pageTitle = '') {
  const combinedText = `${url} ${pageContent} ${pageTitle}`.toLowerCase();

  let bestMatch = { domain: 'GENERIC', confidence: 0 };

  for (const [domainKey, config] of Object.entries(DOMAIN_STRATEGIES)) {
    let score = 0;

    // Check aliases
    for (const alias of config.aliases || []) {
      if (combinedText.includes(alias.toLowerCase())) {
        score += 2;
      }
    }

    // Check core features mentioned
    for (const feature of config.coreFeatures || []) {
      const featureWords = feature.toLowerCase().split(/\s+/);
      const matchCount = featureWords.filter(w => combinedText.includes(w)).length;
      if (matchCount >= Math.ceil(featureWords.length / 2)) {
        score += 1;
      }
    }

    if (score > bestMatch.confidence) {
      bestMatch = { domain: domainKey, confidence: score };
    }
  }

  return bestMatch;
}

/**
 * Get domain-specific test strategy
 */
function getDomainStrategy(domainType) {
  return DOMAIN_STRATEGIES[domainType] || DOMAIN_STRATEGIES.GENERIC || {
    name: 'Generic Website',
    coreFeatures: ['Navigation', 'Content Display', 'Forms', 'Search'],
    testScenarios: {
      functional: [
        { scenario: 'Homepage Load', priority: 'Critical' },
        { scenario: 'Navigation', priority: 'High' },
        { scenario: 'Search', priority: 'High' },
        { scenario: 'Form Submission', priority: 'High' }
      ]
    }
  };
}

/**
 * Generate domain-specific test cases
 */
function generateDomainTestCases(domainType, profile = 'Application', webAnalysis = null) {
  const strategy = getDomainStrategy(domainType);
  const testCases = [];
  let tcCounter = 1;

  const generateId = (prefix) => {
    const id = `TC-${prefix}-${String(tcCounter).padStart(3, '0')}`;
    tcCounter++;
    return id;
  };

  // Generate functional test cases
  if (strategy.testScenarios?.functional) {
    strategy.testScenarios.functional.forEach(scenario => {
      testCases.push({
        id: generateId('FUNC'),
        module: strategy.name,
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Functional',
        priority: scenario.priority || 'High',
        severity: scenario.priority === 'Critical' ? 'Critical' : 'Major',
        preconditions: [
          `${strategy.name} is accessible`,
          'User has required permissions',
          'Test data is available'
        ].join('\n'),
        testData: `Domain-specific test data for ${scenario.scenario}`,
        steps: scenario.steps || [
          `Step 1: Navigate to ${scenario.scenario} feature`,
          'Step 2: Execute the test scenario',
          'Step 3: Verify expected behavior',
          'Step 4: Capture results'
        ],
        expectedResult: `${scenario.scenario} functions correctly as per ${strategy.name} requirements`,
        traceability: `Domain: ${strategy.name} - Feature: ${scenario.scenario}`,
        automationCandidate: true,
        riskLevel: scenario.priority
      });
    });
  }

  // Generate playback tests for OTT
  if (strategy.testScenarios?.playbackTests) {
    strategy.testScenarios.playbackTests.forEach(scenario => {
      testCases.push({
        id: generateId('PLAY'),
        module: 'Video Playback',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Functional',
        priority: scenario.priority,
        severity: scenario.priority === 'Critical' ? 'Critical' : 'Major',
        preconditions: 'Video player is loaded with playable content',
        testData: 'Valid video content with all controls available',
        steps: scenario.steps || ['Execute playback test scenario'],
        expectedResult: `${scenario.scenario} works correctly`,
        traceability: `OTT Playback: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  // Generate payment tests for E-commerce
  if (strategy.testScenarios?.paymentTests) {
    strategy.testScenarios.paymentTests.forEach(scenario => {
      testCases.push({
        id: generateId('PAY'),
        module: 'Payment',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Functional',
        priority: scenario.priority,
        severity: 'Critical',
        preconditions: 'Cart has items, payment gateway is configured',
        testData: `Test payment credentials for ${scenario.scenario}`,
        steps: [
          'Step 1: Proceed to checkout',
          `Step 2: Select ${scenario.scenario} payment method`,
          'Step 3: Enter payment details',
          'Step 4: Complete payment',
          'Step 5: Verify order confirmation'
        ],
        expectedResult: `Payment via ${scenario.scenario} completes successfully`,
        traceability: `E-commerce Payment: ${scenario.scenario}`,
        automationCandidate: scenario.priority !== 'Low'
      });
    });
  }

  // Generate edge case tests
  if (strategy.testScenarios?.edgeCases) {
    strategy.testScenarios.edgeCases.forEach(scenario => {
      testCases.push({
        id: generateId('EDGE'),
        module: 'Edge Cases',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Edge Case',
        priority: scenario.priority,
        severity: scenario.priority === 'Critical' ? 'Critical' : 'Major',
        preconditions: 'System is in a state where edge case can be triggered',
        testData: `Test data to trigger ${scenario.scenario}`,
        steps: [
          'Step 1: Set up edge case conditions',
          `Step 2: Trigger ${scenario.scenario}`,
          'Step 3: Observe system behavior',
          'Step 4: Verify error handling',
          'Step 5: Verify system stability'
        ],
        expectedResult: `System handles ${scenario.scenario} gracefully with appropriate messaging`,
        traceability: `Edge Case: ${scenario.scenario}`,
        automationCandidate: true,
        riskLevel: 'High'
      });
    });
  }

  // Generate security tests
  if (strategy.testScenarios?.securityTests) {
    strategy.testScenarios.securityTests.forEach(scenario => {
      testCases.push({
        id: generateId('SEC'),
        module: 'Security',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Security',
        priority: scenario.priority,
        severity: 'Blocker',
        preconditions: 'Security testing tools are available',
        testData: 'Security test payloads and credentials',
        steps: [
          `Step 1: Prepare security test for ${scenario.scenario}`,
          'Step 2: Execute security test',
          'Step 3: Analyze results',
          'Step 4: Document vulnerabilities if any',
          'Step 5: Verify security controls'
        ],
        expectedResult: `${scenario.scenario} security is properly implemented`,
        traceability: `Security: ${scenario.scenario}`,
        automationCandidate: true,
        riskLevel: 'Critical'
      });
    });
  }

  // Generate search tests for travel
  if (strategy.testScenarios?.searchTests) {
    strategy.testScenarios.searchTests.forEach(scenario => {
      testCases.push({
        id: generateId('SRCH'),
        module: 'Search',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Functional',
        priority: scenario.priority,
        severity: 'Major',
        preconditions: 'Search functionality is available',
        testData: 'Valid search parameters',
        steps: [
          'Step 1: Access search feature',
          `Step 2: ${scenario.scenario}`,
          'Step 3: Verify search behavior',
          'Step 4: Validate results'
        ],
        expectedResult: `${scenario.scenario} works as expected`,
        traceability: `Search: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  // Generate branch tests for Retail Stores
  if (strategy.testScenarios?.branchTests) {
    strategy.testScenarios.branchTests.forEach(scenario => {
      testCases.push({
        id: generateId('BRANCH'),
        module: 'Store/Branch',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Functional',
        priority: scenario.priority,
        severity: scenario.priority === 'Critical' ? 'Critical' : 'Major',
        preconditions: 'Store/Branch information page is accessible',
        testData: 'Known branch locations and contact details',
        steps: scenario.steps || [
          'Step 1: Navigate to branches/stores section',
          `Step 2: ${scenario.scenario}`,
          'Step 3: Verify branch information accuracy',
          'Step 4: Validate contact details'
        ],
        expectedResult: `${scenario.scenario} - Branch information is accurate and complete`,
        traceability: `Retail Store Branch: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  // Generate navigation tests for Retail Stores
  if (strategy.testScenarios?.navigationTests) {
    strategy.testScenarios.navigationTests.forEach(scenario => {
      testCases.push({
        id: generateId('NAV'),
        module: 'Navigation',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Functional',
        priority: scenario.priority,
        severity: scenario.priority === 'Critical' ? 'Critical' : 'Major',
        preconditions: 'Website is loaded and navigation is visible',
        testData: 'N/A',
        steps: scenario.steps || [
          'Step 1: Locate navigation menu',
          `Step 2: ${scenario.scenario}`,
          'Step 3: Verify navigation behavior',
          'Step 4: Check page loads correctly'
        ],
        expectedResult: `${scenario.scenario} - Navigation works correctly`,
        traceability: `Navigation: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  // Generate content tests for Retail Stores
  if (strategy.testScenarios?.contentTests) {
    strategy.testScenarios.contentTests.forEach(scenario => {
      testCases.push({
        id: generateId('CONTENT'),
        module: 'Content',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'UI',
        priority: scenario.priority,
        severity: 'Major',
        preconditions: 'Page is fully loaded',
        testData: 'Various content elements',
        steps: scenario.steps || [
          'Step 1: Load the page',
          `Step 2: ${scenario.scenario}`,
          'Step 3: Verify content displays correctly',
          'Step 4: Check for errors or missing elements'
        ],
        expectedResult: `${scenario.scenario} - Content displays correctly`,
        traceability: `Content: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  // Generate accessibility tests
  if (strategy.testScenarios?.accessibilityTests) {
    strategy.testScenarios.accessibilityTests.forEach(scenario => {
      testCases.push({
        id: generateId('A11Y'),
        module: 'Accessibility',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Accessibility',
        priority: scenario.priority,
        severity: 'Major',
        preconditions: 'Accessibility testing tools are available',
        testData: 'Various accessibility test scenarios',
        steps: scenario.steps || [
          `Step 1: ${scenario.scenario}`,
          'Step 2: Verify WCAG compliance',
          'Step 3: Check accessibility attributes',
          'Step 4: Document any issues'
        ],
        expectedResult: `${scenario.scenario} - WCAG 2.1 AA compliance`,
        traceability: `Accessibility: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  // Generate responsive tests
  if (strategy.testScenarios?.responsiveTests) {
    strategy.testScenarios.responsiveTests.forEach(scenario => {
      testCases.push({
        id: generateId('RESP'),
        module: 'Responsive',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Responsive',
        priority: scenario.priority,
        severity: 'Major',
        preconditions: 'Browser/device with specified viewport available',
        testData: scenario.scenario,
        steps: scenario.steps || [
          `Step 1: ${scenario.scenario}`,
          'Step 2: Verify layout adjusts correctly',
          'Step 3: Check all elements visible',
          'Step 4: Test interactions'
        ],
        expectedResult: `${scenario.scenario} - Layout displays correctly`,
        traceability: `Responsive: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  // Generate performance tests
  if (strategy.testScenarios?.performanceTests) {
    strategy.testScenarios.performanceTests.forEach(scenario => {
      testCases.push({
        id: generateId('PERF'),
        module: 'Performance',
        scenario: scenario.scenario,
        title: `${profile}: ${scenario.scenario}`,
        type: 'Performance',
        priority: scenario.priority,
        severity: 'Major',
        preconditions: 'Performance monitoring tools available, cache cleared',
        testData: 'N/A',
        steps: scenario.steps || [
          `Step 1: ${scenario.scenario}`,
          'Step 2: Measure performance metrics',
          'Step 3: Compare against benchmarks',
          'Step 4: Document results'
        ],
        expectedResult: `${scenario.scenario} - Meets performance benchmarks`,
        traceability: `Performance: ${scenario.scenario}`,
        automationCandidate: true
      });
    });
  }

  return testCases;
}

/**
 * Get domain-specific automation selectors
 */
function getDomainSelectors(domainType) {
  const strategy = getDomainStrategy(domainType);
  return strategy.automationSelectors || {};
}

/**
 * Get sample automation code for domain
 */
function getDomainAutomationCode(domainType, framework = 'playwright') {
  const strategy = getDomainStrategy(domainType);
  return strategy.sampleAutomationCode?.[framework] || '';
}

/**
 * Generate complete domain-aware test suite
 */
function generateDomainAwareTestSuite(domainType, baRequirements = {}, webAnalysis = null) {
  const strategy = getDomainStrategy(domainType);
  const profile = baRequirements.title || webAnalysis?.siteOverview?.title || strategy.name;

  // Generate domain-specific test cases
  const domainTests = generateDomainTestCases(domainType, profile, webAnalysis);

  // Get automation code sample
  const automationCode = getDomainAutomationCode(domainType);

  // Get selectors
  const selectors = getDomainSelectors(domainType);

  return {
    metadata: {
      domain: domainType,
      domainName: strategy.name,
      profile,
      generatedAt: new Date().toISOString(),
      totalCases: domainTests.length,
      coreFeatures: strategy.coreFeatures,
      criticalFlows: strategy.criticalFlows
    },
    testCases: domainTests,
    automationGuidance: {
      recommendedSelectors: selectors,
      sampleCode: automationCode,
      frameworks: ['playwright', 'selenium', 'cypress'],
      tips: getDomainAutomationTips(domainType)
    },
    coverageReport: {
      functional: domainTests.filter(tc => tc.type === 'Functional').length,
      edgeCases: domainTests.filter(tc => tc.type === 'Edge Case').length,
      security: domainTests.filter(tc => tc.type === 'Security').length,
      playback: domainTests.filter(tc => tc.module === 'Video Playback').length,
      payment: domainTests.filter(tc => tc.module === 'Payment').length,
      branch: domainTests.filter(tc => tc.module === 'Store/Branch').length,
      navigation: domainTests.filter(tc => tc.module === 'Navigation').length,
      content: domainTests.filter(tc => tc.module === 'Content').length,
      accessibility: domainTests.filter(tc => tc.type === 'Accessibility').length,
      responsive: domainTests.filter(tc => tc.type === 'Responsive').length,
      performance: domainTests.filter(tc => tc.type === 'Performance').length
    }
  };
}

/**
 * Get domain-specific automation tips
 */
function getDomainAutomationTips(domainType) {
  const tips = {
    OTT_STREAMING: [
      'Use video element events for playback verification (play, pause, ended, timeupdate)',
      'Handle DRM content differently - may need special setup',
      'Test with different network conditions for streaming quality',
      'Verify subtitles and audio tracks programmatically',
      'Handle fullscreen mode and orientation changes'
    ],
    ECOMMERCE: [
      'Use stable selectors for cart operations (data-testid preferred)',
      'Handle dynamic pricing with flexible assertions',
      'Test payment flows in sandbox/test mode only',
      'Verify inventory changes don\'t break tests',
      'Handle promotional banners and popups'
    ],
    TRAVEL_BOOKING: [
      'Use relative date selection to avoid failures on past dates',
      'Handle autocomplete carefully with proper waits',
      'Test with multiple traveler scenarios',
      'Verify pricing calculations at each step',
      'Handle session timeouts during long booking flows'
    ],
    BANKING_FINANCE: [
      'Never use real credentials in tests',
      'Handle OTP/2FA with test environment setup',
      'Verify all transactions in test/sandbox mode',
      'Test session timeout and concurrent login scenarios',
      'Ensure sensitive data is masked in logs'
    ],
    FOOD_DELIVERY: [
      'Handle location permissions and geolocation mocking',
      'Test with restaurant open/closed states',
      'Verify real-time order tracking elements',
      'Handle cart across multiple restaurants',
      'Test time-sensitive offers and delivery estimates'
    ],
    RETAIL_STORE: [
      'Use stable selectors for branch/store listings',
      'Verify branch information (address, phone, timings) against known data',
      'Test map/directions functionality with geolocation mocking',
      'Handle dynamic content like promotions and offers',
      'Test mobile hamburger menu behavior',
      'Verify footer contact information and social links',
      'Check image galleries and sliders',
      'Test navigation menu on all viewport sizes'
    ],
    CORPORATE: [
      'Verify company information accuracy',
      'Test careers/jobs section filtering',
      'Check investor relations document downloads',
      'Verify leadership team profiles and images',
      'Test contact forms with validation',
      'Check office locations and maps'
    ]
  };

  return tips[domainType] || [
    'Use stable, unique selectors',
    'Handle dynamic content with proper waits',
    'Test both positive and negative scenarios',
    'Verify error handling and edge cases',
    'Ensure test data cleanup after execution'
  ];
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  DOMAIN_STRATEGIES,
  detectDomain,
  getDomainStrategy,
  generateDomainTestCases,
  getDomainSelectors,
  getDomainAutomationCode,
  generateDomainAwareTestSuite,
  getDomainAutomationTips
};

