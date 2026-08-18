function loadEcommerceConfig(url) {
  const { detectDomain, domainSelectors } = require("@zero/locators/ecommerceSelectors");
  const domain = detectDomain(url);
  const config = domainSelectors[domain] || domainSelectors.generic;

  return {
    domain,
    config,
    siteName: config.name || domain
  };
}

module.exports = { loadEcommerceConfig };
