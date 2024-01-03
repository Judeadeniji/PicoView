const globals = new Map();

function define_globals(g_obj) {
  for (const key in g_obj) {
    globals.set(key, g_obj[key]);
  }

  return toJSON(globals);
}

/**
 *
 * @param {Map<any, any>} item
 */
function toJSON(item) {
  const obj = {};
  const entries = item.entries();

  for (const entry of entries) {
    obj[entry[0]] = entry[1];
  }

  return obj;
}

function read_globals() {
  return toJSON(globals);
}

export { define_globals, read_globals };

