import { isObj } from "./isObj.js";

/**
 * Transform an object into a flat object
 * @param {object} obj
 * @param {string} name
 * @returns {object}
 */
export function flatten(obj, name) {
    let res = {};
    const keys = Object.keys(obj);

    let last = name;
    keys.forEach((key) => {
        last = `${name}.${key}`;
        const v = obj[key];
        if (isObj(v)) {
            res = { ...res, ...flatten(v, last) };
            return;
        }
        res[last] = v;
    });

    return res;
}
