const MAX_ELEMENT_SELECTORS = 5;
const DEFAULT_ELEMENT_SELECTORS = 3;

/**
 * @param {Array<{ category: string, selector?: string }>} elements
 */
function createElementContext(elements = []) {
  const hasCategory = (category) => elements.some((element) => element.category === category);
  const getElements = (category) => elements.filter((element) => element.category === category);
  const elementSelectors = (category, limit = DEFAULT_ELEMENT_SELECTORS) =>
    getElements(category)
      .slice(0, limit)
      .map((element) => element.selector)
      .filter(Boolean);

  return { hasCategory, getElements, elementSelectors };
}

/**
 * @param {Array<{ name: string }>} flows
 * @param {string} fragment
 */
function hasFlowNamed(flows, fragment) {
  return flows.some((flow) => flow.name.includes(fragment));
}

/**
 * @param {Array<{ purpose: string }>} forms
 * @param {string} purpose
 */
function formsWithPurpose(forms, purpose) {
  return forms.filter((form) => form.purpose === purpose);
}

function createFlow({ name, priority, description, steps, assertions, elements, formId }) {
  const flow = { name, priority, description, steps, assertions };

  if (elements?.length) {
    flow.elements = elements;
  }
  if (formId) {
    flow.formId = formId;
  }

  return flow;
}

module.exports = {
  MAX_ELEMENT_SELECTORS,
  DEFAULT_ELEMENT_SELECTORS,
  createElementContext,
  hasFlowNamed,
  formsWithPurpose,
  createFlow
};
