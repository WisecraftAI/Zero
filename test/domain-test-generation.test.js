"use strict";

const { generateMajorFunctionalCases } = require("../packages/analyzer/lib/generate/majorFunctionalCases");

function ecommerceFixture() {
  return {
    url: "https://shop.example.test",
    websiteType: {
      type: "ECOMMERCE",
      typeName: "E-commerce Platform",
      confidence: 0.9,
      testPriorities: ["Search", "Product Listing", "Checkout", "User Auth"],
      criticalFlows: ["Search to Purchase", "Cart Management"],
    },
    userFlows: [
      {
        name: "Product Search Flow",
        priority: "Critical",
        steps: [
          { action: "navigate", description: "Load homepage" },
          { action: "input", description: "Enter search query in search box" },
          { action: "verify", description: "Verify search results are displayed" },
        ],
        assertions: ["Results display matching products"],
      },
      {
        name: "Add to Cart Flow",
        priority: "Critical",
        steps: [
          { action: "click", description: "Click Add to Cart button" },
          { action: "verify", description: "Verify cart count updates" },
        ],
        assertions: ["Cart count increases"],
      },
    ],
    crawledPages: [
      { url: "https://shop.example.test/", title: "Home", path: "/" },
      { url: "https://shop.example.test/products", title: "Products", path: "/products" },
    ],
    elements: [
      { category: "SEARCH", selector: "input[type='search']" },
      { category: "CART", selector: ".cart" },
      { category: "NAVIGATION", selector: "nav" },
    ],
  };
}

describe("Q2 domain-driven major functional cases", () => {
  it("generates at least five major functional cases for e-commerce fixture", () => {
    const cases = generateMajorFunctionalCases(ecommerceFixture());
    expect(cases.length).toBeGreaterThanOrEqual(5);
  });

  it("maps critical user flows to case modules/scenarios", () => {
    const cases = generateMajorFunctionalCases(ecommerceFixture());
    const names = cases.map((tc) => `${tc.module} ${tc.scenario}`.toLowerCase());
    expect(names.some((n) => n.includes("product search"))).toBe(true);
    expect(names.some((n) => n.includes("add to cart") || n.includes("cart"))).toBe(true);
  });

  it("includes steps and expected results on every case", () => {
    const cases = generateMajorFunctionalCases(ecommerceFixture());
    for (const tc of cases) {
      expect(Array.isArray(tc.steps)).toBe(true);
      expect(tc.steps.length).toBeGreaterThan(0);
      expect(tc.expectedResult).toBeTruthy();
    }
  });
});
