const { WEBSITE_TYPES } = require('../constants');

async function detectWebsiteType(page, url) {
  const result = {
    type: 'GENERIC',
    typeName: 'Website',
    confidence: 0,
    indicators: []
  };

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // First check URL patterns (highest confidence)
    for (const [type, config] of Object.entries(WEBSITE_TYPES)) {
      if (config.urlPatterns?.some(pattern => hostname.includes(pattern))) {
        result.type = type;
        result.typeName = config.name;
        result.confidence = 0.9;
        result.indicators.push(`URL pattern match: ${hostname}`);
        break;
      }
    }

    // If not matched by URL, analyze page content
    if (result.confidence < 0.5) {
      const pageText = await page.evaluate(() => {
        return document.body?.innerText?.toLowerCase() || '';
      }).catch(() => '');
      
      const pageTitle = await page.title().catch(() => '');
      const metaDescription = await page.$eval('meta[name="description"]', m => m.content?.toLowerCase()).catch(() => '');
      const combinedText = `${pageText} ${pageTitle} ${metaDescription}`.toLowerCase();

      // Score each website type based on indicators
      let bestScore = 0;
      let bestType = 'GENERIC';

      for (const [type, config] of Object.entries(WEBSITE_TYPES)) {
        if (!config.indicators.length) continue;
        
        let score = 0;
        const matchedIndicators = [];
        
        for (const indicator of config.indicators) {
          if (combinedText.includes(indicator)) {
            score++;
            matchedIndicators.push(indicator);
          }
        }
        
        const normalizedScore = score / config.indicators.length;
        
        if (normalizedScore > bestScore) {
          bestScore = normalizedScore;
          bestType = type;
          result.indicators = matchedIndicators;
        }
      }

      if (bestScore > 0.2) {
        result.type = bestType;
        result.typeName = WEBSITE_TYPES[bestType].name;
        result.confidence = Math.min(0.85, 0.3 + bestScore);
      }
    }

    // Special handling for retail stores
    if (hostname.includes('saravana') || hostname.includes('supersaravana')) {
      result.type = 'RETAIL_STORE';
      result.typeName = 'Retail Store (Super Saravana Stores)';
      result.confidence = 0.95;
      result.indicators = ['saravana stores brand'];
    }

    // Add testing priorities and critical flows
    const typeConfig = WEBSITE_TYPES[result.type];
    result.testPriorities = typeConfig.testPriorities;
    result.criticalFlows = typeConfig.criticalFlows;

  } catch (error) {
    console.error('Website type detection error:', error.message);
  }

  return result;
}

module.exports = { detectWebsiteType };
