/** @type {Map<string, import('picoview').PicoApp>} */
const apps = new Map();

/**
 * @param {string} name
 * @param {import('picoview').PicoApp} app 
 */
function add_app(name, app) {
  if (apps.has(name)) return;

  apps.set(name, app);
}

/**
 * @param {string} name
 */
function get_app(name) {
  return apps.get(name);
}
/**
 * @param {string} name
 */
function has_app(name) {
  return apps.has(name);
}

export { add_app, get_app, has_app };

