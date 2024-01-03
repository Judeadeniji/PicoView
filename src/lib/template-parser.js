export const TEMPLATE_REGEX = /\{\{(.*?)\}\}/g

class TemplateParser {
    constructor(template, data) {
        this.template = template;
        this.data = data;
        this.templates = []
    }

    /**
     * Parses the template string with the given data.
     * @returns {string} The parsed template.
     * @throws {Error} If an error occurs while parsing the template.
     */
    parse() {
        try {
            return this.template.replace(TEMPLATE_REGEX, (match, expression) => {
                const result = this.evaluateExpression(expression.trim());
                this.templates.push({ match, result })
                return result !== undefined ? result : '';
            });
        } catch (error) {
            console.error("Error parsing template:", error);
            return this.template;
        }
    }

    /**
     * Evaluates the given expression with the given data.
     * @param {string} expression The expression to evaluate.
     * @returns {any} The result of the expression.
     */
    evaluateExpression(expression) {
        try {
            if (this.data.hasOwnProperty(expression)) {
                return this.data[expression];
            } else {
                const safeEval = new Function('data', `with(data) { return ${expression}; }`);
                return safeEval(this.data);
            }
        } catch (error) {
            console.error("Error evaluating expression:", error);
            return undefined;
        }
    }
}

/**
 * Parses a template string with the given data.
 * @param {string} template The template string to parse.
 * @param {object} data The data to use when parsing the template.
 * @returns {TemplateParser} The parsed template.
 */
function parseTemplate(template, data) {
    return new TemplateParser(template, data);
}

export { parseTemplate };

