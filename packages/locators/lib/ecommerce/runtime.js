const { domainSelectors } = require("./selectors");

function detectDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes("flipkart")) return "flipkart";
    if (hostname.includes("amazon")) return "amazon";
    if (hostname.includes("myntra")) return "myntra";
    if (hostname.includes("snapdeal")) return "snapdeal";
    if (hostname.includes("ajio")) return "ajio";
    if (hostname.includes("nykaa")) return "nykaa";
    if (hostname.includes("meesho")) return "meesho";
    if (hostname.includes("tatacliq")) return "tatacliq";
    if (hostname.includes("ebay")) return "ebay";
    if (hostname.includes("walmart")) return "walmart";
    if (hostname.includes("target")) return "target";
    if (hostname.includes("bestbuy")) return "bestbuy";
    if (hostname.includes("mankindpharma")) return "mankindpharma";
    if (hostname.includes("supersaravanastores") || hostname.includes("saravana")) return "saravanastores";

    return "generic";
  } catch {
    return "generic";
  }
}

function getSelectors(url, category, element) {
  const domain = detectDomain(url);
  const config = domainSelectors[domain] || domainSelectors.generic;
  const genericConfig = domainSelectors.generic;
  const domainSelArray = config[category]?.[element] || [];
  const genericSelArray = genericConfig[category]?.[element] || [];
  return [...new Set([...domainSelArray, ...genericSelArray])];
}

function getDomainConfig(url) {
  const domain = detectDomain(url);
  return {
    domain,
    name: (domainSelectors[domain] || domainSelectors.generic).name,
    selectors: domainSelectors[domain] || domainSelectors.generic
  };
}

module.exports = {
  domainSelectors,
  detectDomain,
  getSelectors,
  getDomainConfig
};
