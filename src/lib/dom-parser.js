const parser = new DOMParser();

/**
 * @param {string} html
 * @returns {Document}
 */
const dom_parser = (html) => {
  const doc = parser.parseFromString(html, "text/html");
  return doc;
};

export { dom_parser };
