
import { fetch, useFetcher } from "./functions/fetch.js";
import { flatten } from "./functions/flatten.js";
import { isObj } from "./functions/isObj.js";
import { init_router, navigate, onNavigate, routes } from "./router.js";
/**
 * @property {typeof console.error} error
 * @property {typeof console.warn} warn
 */
const log = console.log.bind(window, "window-ui:");
/**
 * @type {typeof console.error}
 */
log.error = console.error.bind(window, "window-ui:");
/**
 * @type {typeof console.warn}
 */
log.warn = console.warn.bind(window, "window-ui:");


const apps = new Map();

let running = false;
let batch_depth = 0;

/**
 * @implements {App}
 */
// @ts-ignore
class App {
  constructor(name) {
    this.name = name;
    /**
     * @type {import("picoview.js").State}
     */
    this.state = {};
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

function run_getters(getters) {
  for (const key in getters) {
    const fn = getters[key];
    this._snapshot[key] = fn.call(this.state);
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

function recompute(app) {
  if (batch_depth > 0) {
    batch_depth--;
    recompute(app);
    return;
  }
  run_getters.call(app, app.getters);
  do_children.call(app, app.container);
}

function batch(compute) {
  batch_depth++;
  compute();
}

/**
 *
 * @param {import("picoview.js").Data} o
 * @this {App}
 */
function data(o) {
  const app = this;

  // @ts-ignore
  app.getters = o.getters || {};

  app.state = new Proxy(o.state, {
    get(target, key) {
      // @ts-ignore
      return target[key];
    },
    set(target, key, value) {
      // @ts-ignore
      app._snapshot[key] = target[key];
      // @ts-ignore
      target[key] = value;
      batch_depth++;
      recompute(app);
      if (!running) {
        running = true;
        ticks.forEach((tick) => tick.call(o.state));
        running = false;
        ticks.clear();
      }
      return true;
    },
  });

  // @ts-ignore
  run_getters.call(app, app.getters);

  this.handlers = o.handlers || {};
}

/**
 *
 * @param {HTMLElement} el
 * @returns void
 */
function do_props(el) {
  for (const attr of el.attributes) {
    let name = attr.nodeName;
    
    /**
     * @type string
     */
    let value = attr.nodeValue;

    if (name.startsWith("bind")) {
      const attr = name.slice(5);
      const app = this;
      if (attr == "value") {
        el.oninput = function change(e) {
          app.state[value] = e.target["value"];
        };
      } else {
        let new_val = value;
        for (const key in this.state) {
          const part = `{${key}}`;
          if (value.includes(part)) {
            new_val = new_val.replace(part, app.state[key]);
          }
        }

        el.setAttribute(attr, new_val);
        log({ attr, new_val });
        el.removeAttribute(name);
        name = attr;
        value = new_val;

        // nasty hack to parse defer src that contains parts
        if (name.includes("defer")) {
          //defer_block.call(this, el, el.getAttribute(":defer"));
        }
      }
    }

    if (name === ":init") {
      el.removeAttribute(name);
      if (value.includes(":")) {
        const [key, ...args] = value.split(":");
        this.handlers[key].apply(this.state, args);
      } else this.handlers[value].call(this.state);
    }

    if (name === ":html") {
      const text = this.state[value];
      el.innerHTML = text;
      el.removeAttribute(name);
    }

    if (name === ":if") {
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

      el.addEventListener(name.slice(3), (ev) => {
        if (!(fn_name in self.handlers)) {
          throw new ReferenceError(`${fn_name} is not defined`);
        }
        self.handlers[fn_name].call(self.state, ev, ...args);
        do_children.call(this, this.container);
      });
    }

    if (name === ":for") {
      const comment_start = document.createComment("for loop");
      const [item, keyword, stateKey, index] = value.split(" ");

      // @ts-ignore
      comment_start.node = el;

      if (keyword === "in") {
        /**
         * @type any[]
         */
        const data = flatten(this.state, "state")[`state.${stateKey}`];

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
            const state = flatten(i, item);

            if (index) {
              state[index] = data.indexOf(i);
            }

            do_children.call({ state: { ...this.state, ...state } }, node);
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
          // @ts-ignore
          ? (el.head._length = arr_data.length)
          // @ts-ignore
          : (el.head = comment_start);
        el.replaceWith(comment_start);

        // @ts-ignore
        el.head ? el.head.after(...arr_data) : comment_start.after(...arr_data);
      }
    }

    if (name === ":defer") {
      // @ts-ignore
      if (!el.has_done_props) {
        // @ts-ignore
        el.has_done_props = true;
        // nasty hack to parse defer src that contains parts
        el.setAttribute("bind:defer:src", el.getAttribute("defer:src"));
        do_props.call({ state: this.state }, el);
      } else {
        defer_block.call(this, el, value);
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

/**
 * @this {App}
 * @param {HTMLElement} child
 * @param {"state" | "getters"} stateOrGetter 
 * @returns void
 */
function inject_parts(child, stateOrGetter) { 
    for (const key in this[stateOrGetter]) {
        const part = `{${key}}`;
        if (child instanceof Text && child.data.includes(part)) {
          const offset = child.data.indexOf(part);
          const right = child.splitText(offset);
          right.splitText(part.length);
          const offset2 = right.data.indexOf(part);
          right.replaceData(
            offset2,
            part.length,
            // @ts-ignore
            stateOrGetter === "getters" ? this.getters[key].call(this.state) : this.state[key]
          );
          // @ts-ignore
          !right.keys && (right.keys = []);
          // @ts-ignore
          right.keys.push(key);
        // @ts-ignore
        } else if (child instanceof Text && child.keys?.includes?.(key)) {
            let newData = this[stateOrGetter][key]
            // @ts-ignore
            stateOrGetter === "getter" ? newData = this.getters[key].call(
              Object.freeze({ ...this.state })
            ) : newData;
          
          child.replaceData(0, child.data.length, newData);
        }
      }
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
      do_child_styles(child)
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

    inject_parts.call(this, child, "state");

    if (child instanceof Comment) {
      if (child.textContent === "for loop") {
        // @ts-ignore
        child.node.head = child;
        // @ts-ignore
        do_props.call(this, child.node, true);
      }
    }

    inject_parts.call(this, child, "getters");

    // @ts-ignore
    child.tagName && do_props.call(this, child);
    if (child.childNodes.length) {
      do_children.call(this, child);
    }
  }
}

/**
 * @this {App}
 * @param {HTMLElement} el
 * @param {import("picoview.js").HTMLAttributes<HTMLElement>["pv-defer"]} strategy
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
      referrerPolicy: "no-referrer"
    });
    const text = await response.text();

    if (swap === "inner") {
      el.innerHTML = text;
    } else if (swap === "outer") {
        el.outerHTML = text;
    } else if (swap === "text") {
        el.innerText = text;
    }
    do_children.call(app, el);
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
 * @param {import("picoview.js").MountOptions} options options
 * @returns void
 */
// @ts-ignore
function mount(s, options = {}) {
  const c = document.querySelector(s);
  // @ts-ignore
  this.container = c;

  this.pages[location.pathname] = this.container.innerHTML;
  options.spa && init_router.call(this);

  do_children.call(this, c);
}

// @ts-ignore
window.$$inject_ = function (name) {
  if (apps.has(name)) {
    const app = apps.get(name);
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
  apps.set(name, app);

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

export { batch, createApp, log, nextTick, part, useFetcher };

