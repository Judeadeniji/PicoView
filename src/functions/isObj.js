/**
 * Checks if the given value is an object.
 * @param {*} i
 * @returns {boolean}
 */
export function isObj(i) {
    return typeof i === "object" && i !== null && !Array.isArray(i);
}
