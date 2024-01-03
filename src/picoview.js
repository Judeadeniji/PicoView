import { add_app, get_app, has_app } from "./apps.js";
import { fetch, useFetcher } from "./functions/fetch.js";
import { isObj } from "./functions/isObj.js";
import { define_globals, read_globals } from "./globals.js";
import { dom_parser } from "./lib/dom-parser.js";
import { TEMPLATE_REGEX, parseTemplate } from "./lib/template-parser.js";
import { init_router, navigate, onNavigate, routes } from "./router.js";
/**
 * @property {typeof console.error} error
 * @property {typeof console.warn} warn
 */
const log = console.log.bind(globalThis, "window-ui:");
/**
 * @type {typeof console.error}
 */
log.error = console.error.bind(globalThis, "window-ui:");
/**
 * @type {typeof console.warn}
 */
log.warn = console.warn.bind(globalThis, "window-ui:");

let running = false;
let batch_depth = 0;

/**
 * @typedef {App} PicoApp
 */

/**
 * @implements {App}
 */
// @ts-ignore
class App {
  constructor(name) {
    this.name = name;
    /**
     * @type {import("picoview-types.js").State}
     */
    this.state = {};
    this.getters = {};
    this.routes = {};
    this._snapshot = this.state;
    this.handlers = {};
    this.lists = new Map();
    /**
     * @type {null | HTMLElement}
     */
    this._container = null;
    /**
     * @type {null | HTMLElement}
     */
    this.route_container = null;
    this.pages = new Map();
    this.onNavigate = () => {};
    this.deps_graph = {
      state: {},
      getters: {},
    };
  }

  get historyState() {
    return history.state;
  }

  /**
   * @returns {typeof this._container}
   */
  get container() {
    return this._container;
  }

  set container(c) {
    this._container = c;
    this.route_container = c.querySelector("route");
  }
}

const ticks = new Set();

/**
 * Runs a given callback once on the next state update
 * @param {() => void} callback callback to run on the next state update
 */
function nextTick(callback) {
  ticks.add(callback.bind(this));
}

function batch(compute) {
  batch_depth++;
  compute();
}

/**
 * @description sets the data for the app
 * @param {import("picoview-types.js").Data} o
 * @this {App}
 */
function data(o) {
  const app = this;

  // @ts-ignore
  app.getters = o.getters || {};

  app.state = new Proxy(o.state, {
    get(target, key) {

      if (key === "global") {
        return read_globals()
      }
      // @ts-ignore
      return target[key];
    },
    set(target, key, value) {
      if (key === "global") {
         define_globals({ [key]: value })

         return true
      }
      // @ts-ignore
      app._snapshot[key] = target[key];
      // @ts-ignore
      target[key] = value;

      update_node_from_state.call(app, key, value);
      return true;
    },
  });

  this.handlers = o.handlers || {};
}

/**
 *
 * @param {HTMLElement} el
 * @returns void
 */
function do_props(el) {
  const attributes = [...el.attributes];
  for (const attr of attributes) {
    const name = attr.nodeName;

    /**
     * @type string
     */
    const value = attr.nodeValue;


    if (name === "pv-html") {
      const text = this.state[value];
      el.innerHTML = text;
      el.removeAttribute(name);
    }

    if (name === "pv-if") {
      const clause = Boolean(this.state[value]);

      if (clause) {
        el.hidden = false;
      } else {
        el.hidden = true;
      }

      // @ts-ignore
      el.type = "control-flow";
      // @ts-ignore
      el.clauseKey = value;
    }

    if (name.startsWith("pv-on:")) {
      const self = this;
      const [fn_name, ...args] = value.split(":").filter((v) => v != "");

      if (name === "pv-on:init") {
        !running && self.handlers[fn_name].call(self.state, ...args);
        el.removeAttribute(name);
        return;
      }

      el.addEventListener(name.slice("pv-on:".length), (ev) => {
        if (!(fn_name in self.handlers)) {
          throw new ReferenceError(`${fn_name} is not defined`);
        }
        self.handlers[fn_name].call(self.state, ev, ...args);
      });
    }

    if (name === "pv-for") {
      alert(name)
      const comment_start = document.createComment("for loop");
      const [item, keyword, stateKey, index] = value.split(" ");

      // @ts-ignore
      comment_start.node = el;

      if (keyword === "in") {
        /**
         * @type any[]
         */
        const data = this.state[stateKey];

        if (!data) {
          // @ts-ignore
          if (comment_start.node === el) return;
          throw new ReferenceError(
            `${stateKey} is not defined for this block ${el.id}.`
          );
        }

        /**
         * @type {HTMLElement[]}
         */
        const arr_data = [];

        if (data?.length) {
          for (let i = 0; i < data.length; i++) {
            // @ts-ignore
            el?.head?.nextSibling?.remove();
          }
        }

        for (const i of data) {
          const node = el.cloneNode(true);

          if (isObj(i)) {
            const state = i;

            if (index) {
              state[index] = data.indexOf(i);
            }

            do_children.call({ state: { ...this.state, [stateKey]: state } }, node);
            // @ts-ignore
            node.removeAttribute(name);
            // @ts-ignore
            if (node.attributes.length) {
              do_props.call({ state }, node);
            }
          } else {
            do_children.call({ state: { ...this.state, [item]: i } }, node);
            // @ts-ignore
            node.removeAttribute(name);
            // @ts-ignore
            if (node.attributes.length) {
              do_props.call({ state: { [item]: i } }, node);
            }
          }

          // @ts-ignore
          arr_data.push(node);
        }

        // @ts-ignore
        !comment_start.keys && (comment_start.keys = []);
        // @ts-ignore
        comment_start.keys.push(stateKey);
        // @ts-ignore
        comment_start._length = arr_data.length;
        // @ts-ignore
        el.head
          ? // @ts-ignore
            (el.head._length = arr_data.length)
          : // @ts-ignore
            (el.head = comment_start);
        el.replaceWith(comment_start);

        // @ts-ignore
        el.head ? el.head.after(...arr_data) : comment_start.after(...arr_data);
      }
    }

    if (name === "pv-defer") {
      // @ts-ignore
      if (!el.has_done_props) {
        // @ts-ignore
        el.has_done_props = true;
        // nasty hack to parse defer src that contains parts
        el.setAttribute("bind:defer:src", el.getAttribute("defer:src"));
        do_props.call({ state: this.state }, el);
        do_children.call({ state: this.state }, el);
      } else {
        defer_block.call(this, el, value);
      }
    }

    if (name.startsWith("pv-bind:")) {
      const attr_name = name.slice("pv-bind:".length);
      const app = this;
      if (attr_name === "value") {
        el.oninput = function change(e) {
          app.state[value] = e.target["value"];
        };
      } else {
        const is_template = TEMPLATE_REGEX.test(value);
        el.setAttribute(attr_name, value);
        if (is_template) {
          inject_parts2.call(this, el.attributes.getNamedItem(attr_name));
        }
      }
    }


    name.includes(":") && el.removeAttribute(name);
  }
}

const ids = new Set();

/**
 *
 * @param {HTMLElement} child
 */
function do_child_styles(child) {
  child.setAttribute("window_tag", child?.id);

  if (!ids.has(child?.id)) {
    ids.add(child?.id);
  }
  document.head.appendChild(child);
}

function do_child_pv_tag(child) {
  const [, tagName] = child.localName.split(":");
  const is_critical = child.hasAttribute("critical");

  if (!["script"].includes(tagName)) {
    child.remove();
    return;
  }
  /**
   * @type {HTMLElement}
   */
  const el = document.createElement(tagName);
  el.setAttribute("window_tag", "");
  if (!ids.has(child?.id)) {
    el.append(...child.childNodes);
    ids.add(child?.id);
  }

  // el.innerText = `try {${child.innerText}} catch(e) {}`
  child.remove();
  document.head.appendChild(el);

  if (is_critical) el.remove();
}

// rewrite inject_parts to suppport the new template parser function
function inject_parts2(el, key) {
  log(this, key)
  const app = this;

  if (el.nodeType === Node.ELEMENT_NODE) {
    [...el.childNodes].forEach((el) => inject_parts2.call(app, el));
    return;
  }

  if (el.nodeType === Node.TEXT_NODE) {
    const text = el.$pv ? el.$pv.originalText : el.data;
    if (key) {
      const template_data = read_globals()[key] || app.state[key];
      const isTemplate = TEMPLATE_REGEX.test(text);

      if (isTemplate && template_data) {
        const p = parseTemplate(text, { [key]: template_data });
        const newText = p.parse();

        el.replaceData(0, text.length, newText);
        el.$pv
          ? (el.$pv.currentText = newText)
          : (el.$pv = {
              templates: p.templates,
              originalText: text,
              currentText: newText,
            });

        update_deps_graph.call(app, el, key, template_data);
        return;
      }
    }
    for (const key in app.state) {
      const template_data = app.state[key];
      const isTemplate = TEMPLATE_REGEX.test(text);

      if (isTemplate && template_data) {
        log(text, template_data)
        const p = parseTemplate(text, { ...app.state, ...read_globals() });
        const newText = p.parse();

        el.replaceData(0, text.length, newText);
        el.$pv
          ? (el.$pv.currentText = newText)
          : (el.$pv = {
              templates: p.templates,
              originalText: text,
              currentText: newText,
            });

        update_deps_graph.call(app, el, key, template_data);
      }
    }
  }

  if (el.nodeType === Node.ATTRIBUTE_NODE) {
    /** @type {Attr & { $pv: any }} */
    const attr = el;
    const value = attr.$pv ? attr.$pv.originalText : attr.nodeValue;

    if (key) {
      const template_data = app.state[key];

      if (template_data) {
        const new_val = parseTemplate(value, {...app.state, ...read_globals()}).parse();
        attr.value = new_val;
        attr.$pv.currentText = new_val
        update_deps_graph.call(app, attr, key, template_data);
      }
    } else {
      for (const key in app.state) {
        const template_data = app.state[key];
        const p = parseTemplate(value, { ...app.state, ...read_globals() });
        const new_val = p.parse();
        attr.value = new_val;

        attr.$pv
          ? (attr.$pv.currentText = new_val)
          : (attr.$pv = {
              templates: p.templates,
              originalText: value,
              currentText: new_val,
            });

        update_deps_graph.call(app, attr, key, template_data);
      }
    }
  }
}

function update_deps_graph(node, key, data) {
  log(this)
  const graph = this.deps_graph.state;
  let state_graph = graph[key];

  if (!state_graph) {
    state_graph = graph[key] = {
      nodes: [],
      data,
    };
  }

  const existing_node = state_graph.nodes.includes(node);
  !existing_node && state_graph.nodes.push(node);
  state_graph.data = data;
}

function update_node_from_state(key, value) {
  const graph = this.deps_graph.state;
  let state_graph = graph[key];

  if (!state_graph) {
    state_graph = graph[key] = {
      nodes: [],
      value,
    };
  }

  state_graph.nodes.forEach((node) => {
    inject_parts2.call(this, node, key);
  });
}

/**
 * @this {App}
 * @param {HTMLElement} p
 * @returns void
 * @todo add support for nested for loops
 * @todo add support for nested if statements
 */
export function do_children(p) {
  for (const child of p.childNodes) {
    // @ts-ignore
    if (child.localName === "style") {
      // @ts-ignore
      do_child_styles(child);
    }

    if (
      ["link", "script", "head", "body", "html", "iframe"].includes(
        // @ts-ignore
        child.localName
      )
    ) {
      child.remove();
    }

    // @ts-ignore
    if (child.localName?.startsWith?.("pv:")) {
      do_child_pv_tag.call(this, child);
    }

    if (child.nodeType === Node.COMMENT_NODE) {
      if (child.textContent === "for loop") {
        // @ts-ignore
        child.node.head = child;
        // @ts-ignore
        do_props.call(this, child.node, true);
      }
    }

    // @ts-ignore
    child.tagName && do_props.call(this, child);

    inject_parts2.call(this, child);
    if (child.childNodes.length) {
      do_children.call(this, child);
    }
  }
}

/**
 * @this {App}
 * @param {HTMLElement} el
 * @param {import("picoview-types.js").HTMLAttributes<HTMLElement>["pv-defer"]} strategy
 * @returns void
 */
function defer_block(el, strategy) {
  const app = this;
  const src = el.getAttribute("pv-defer:src");

  const swap = el.getAttribute("pv-defer:swap") || "inner";

  async function undefer() {
    const response = await fetch(src, {
      cache: "force-cache",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    const text = await response.text();

    const document = dom_parser(text);
    // body may contain multiple children
    // we want all the children in the body
    const child = document.body.children[0];

    if (swap === "inner") {
      el.innerHTML = child.innerHTML;
    } else {
      el.replaceWith(child);
    }
    do_props.call(app, child);
    do_children.call(app, child);
  }

  switch (strategy) {
    case "click":
      el.onclick = function onclick() {
        undefer();
        el.onclick = null;
      };
      break;

    case "hover":
      el.onmouseover = undefer;
      el.onmouseleave = function onmouseleave() {
        el.onmouseover = null;
        el.onmouseleave = null;
      };
      break;

    case "viewport":
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          undefer();
          observer.disconnect();
        }
      });
      observer.observe(el);
      break;

    case "idle":
      requestIdleCallback(undefer);
      break;

    case "load":
      window.addEventListener("load", undefer);
      break;

    default:
      undefer();
      break;
  }
}

/**
 * @this {App}
 * @param {string} s selector
 * @param {import("picoview-types.js").MountOptions} options options
 * @returns void
 */
// @ts-ignore
function mount(s, options = {}) {
  const c = document.querySelector(s);
  // @ts-ignore
  this.container = c;

  this.pages[location.pathname] = this.container.innerHTML;
  options.spa && init_router.call(this);

  // filter out all non-critical nodes like styles and scripts
  const all_nodes = [...document.querySelectorAll("*")].filter((node) => {
    return !["style", "script"].includes(node.localName);
  });

  // get all the attributes from all the nodes
  const all_attributes = all_nodes.map((node) => [...node.attributes]).flat(Infinity);

  // @ts-ignore
  for (const node of all_nodes) {
    inject_parts2.call(this, node);
  }

  for (const attribute of all_attributes) {
    inject_parts2.call(this, attribute);
  }
  
  do_children.call(this, c);
}

// @ts-ignore
window.$$inject_ = function (name) {
  if (has_app(name)) {
    const app = get_app(name);
    return function inject(type, key, value) {
      nextTick(() => (app[type][key] = value));
    };
  }

  return null;
};

/**
 * Creates A new App
 * @param {string} name The name of the App
 * @returns {{ data: typeof data; compile: typeof compile; mount: typeof mount; routes: typeof routes; navigate: typeof navigate; onNavigate: typeof onNavigate }}
 */
function createApp(name) {
  const app = new App(name);
  add_app(name, app);

  return {
    data: data.bind(app),
    compile: compile.bind(app),
    mount: mount.bind(app),
    navigate: navigate.bind(app),
    onNavigate: onNavigate.bind(app),
    routes: routes.bind(app),
  };
}

async function part(url) {
  const res = await fetch(url);
  const resText = await res.text();
  return resText;
}

/**
 *
 * @param {string} name element name
 * @param {(this: App, node: Element) => void} fn a callback function that gets called when when the element is encountered in the dom
 */
function compile(name, fn) {
  const app = this;
  if (!app.container) {
    throw new Error("app.compile should be called after th app has mounted");
  }
  app.container.querySelectorAll(name).forEach((e) => {
    // @ts-ignore
    fn(e);
    do_children.call(app, e);
  });
}

////////////////////////////////////////

export { batch, createApp, define_globals, log, nextTick, part, useFetcher };

