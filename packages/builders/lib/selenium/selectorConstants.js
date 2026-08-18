const { escapeJava } = require("../shared/text");

function generateSelectorConstants(config) {
  const lines = [];

  const addArray = (name, values) => {
    if (values?.length) {
      lines.push(
        `    private static final String[] ${name} = {${values
          .slice(0, 5)
          .map((value) => `"${escapeJava(value)}"`)
          .join(", ")}};`
      );
    }
  };

  addArray("SEARCH_INPUT", config.search?.input);
  addArray("SEARCH_SUBMIT", config.search?.submit);
  addArray("PRODUCT_CARD", config.results?.productCard);
  addArray("PRODUCT_TITLE", config.productPage?.title);
  addArray("PRODUCT_PRICE", config.productPage?.price);
  addArray("ADD_TO_CART", config.productPage?.addToCart);
  addArray("CART_ICON", config.cart?.icon);
  addArray("CART_ITEM_TITLE", config.cart?.itemTitle);
  addArray("PLACE_ORDER", config.cart?.placeOrder);

  return lines.join("\n");
}

module.exports = { generateSelectorConstants };
