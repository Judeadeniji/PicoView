import { do_children, log } from "./picoview.js";

/**
 * @this {import("./picoview").IApp}
 * @param {string} to
 */
export function match_route(to) {
    const segments_0 = to.split("/").filter((r) => r !== "");
    let route = null;
    const params = {};
    for (const path in this.routes) {
        if (Object.hasOwnProperty.call(this.routes, path)) {
            const element = this.routes[path];
            const segments_1 = path.split("/").filter((r) => r !== "");

            if (to === path) {
                route = element;
                break;
            }

            if (segments_0.length === segments_1.length) {
                for (let index in segments_0) {
                    const _index = Number(index);
                    const a = segments_0[_index], b = segments_1[_index];
                    if (a === b) {
                        route = element;
                        continue;
                    }

                    if (b && a && b.includes(":")) {
                        params[b.split(":")[1]] = a;
                        route = element;
                        continue;
                    }

                    if (a !== b) {
                        route = null;
                        continue;
                    }
                }
            } else {
                continue;
            }
        }
    }

    if (route === null) {
        route = this.routes["**"] || null;
    }

    return { route, params };
}

/**
 * @this {import("./picoview").IApp}
 * @param {(this: { state: Readonly<import("./picoview.js").State>, routes: ReadonlyArray<any> }, isNavigating: boolean) => void} callback
 */
export function onNavigate(callback) {
    this.onNavigate = callback.bind({ state: this.state, routes: this.routes });
}


/**
 * Routes for the IApp
 * @param {import("./picoview.js").Routes} routes
 * @this {import("./picoview").IApp}
 */
export function routes(routes) {
    this.routes = routes;
}
/**
 *
 * @param {string} res
 * @this {import("./picoview").IApp}
 */
export function update_view(res) {
    document.querySelectorAll("[window_tag]").forEach((el) => el.remove());
    if (!this.pages.has(location.pathname)) {
        this.pages.set(location.pathname, res);
    } else {
        res = this.pages.get(location.pathname);
    }
    this.route_container.innerHTML = res?.toString() || "";
    do_children.call(this, this.container);
}
/**
 * @this {import("./picoview").IApp}
 * @param {string} to
 */
export function navigate(to) {
    const app = this;
    app.onNavigate.call({ state: this.state, routes: this.routes }, true);
    const href = to;
    const { route, params } = match_route.call(app, href);
    const fn = route?.page;
    const shouldRoute = route.guard ? route?.guard?.(params) : true;

    if (shouldRoute) {
        history.pushState({ href }, null, href);

        if (fn) {
            fn(params)
                .then((res) => update_view.call(app, res))
                .catch((reason) => {
                    update_view.call(app, route.fallback);
                    console.error(reason);
                })
                .finally(() => {
                    app.onNavigate.call(
                        { state: this.state, routes: this.routes },
                        false
                    );
                });
        } else {
            update_view.call(app, route.fallback);
        }

        return true;
    }

    app.onNavigate.call({ state: this.state, routes: this.routes }, false);
    route?.onGuardFail?.();

    return false;
}
/**
 * @this {IApp}
 */
export function init_router() {
    if (!this.container) return;

    // @ts-ignore
    log.warn("Client Side Router is unstable and can match wroong routes");

    const IApp = this;

    this.container.addEventListener("click", (event) => {
        /**
         * @type {HTMLAnchorElement}
         */
        const el = event.target["closest"]("a");

        if (el) {
            event.preventDefault();
            const href = el.getAttribute("href");
            navigate.call(IApp, href);
        }
    });
    navigate.call(IApp, location.pathname);

    window.addEventListener("popstate", () => {
        navigate.call(IApp, location.pathname);
    });
}

