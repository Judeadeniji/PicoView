interface Data {
    state: State;
    handlers: Handlers;
    getters: Getters;
}

interface Handlers {
    [key: string]: (this: State) => (void | Promise<void>);
}

interface Getters {
    [key: string]: (this: State) => any;
}

type State = {
    [key: string]: any;
}

type Routes = {
    [key: string]: Route;
}

type Param = {
    [key: string]: string;
}

type Route = {
    /**
     * @description
     * @param {Param} params 
     * @returns {Promise<string>}
     */
    page?: (params: Param) => Promise<string>;
    /**
     * Fallback to be desplayed when page is not found
     * @type {string}
     */
    fallback: string;
    /**
     * A guard function to be called before page is loaded
     * @returns {boolean}
     */
    guard?: () => boolean;
    /**
     * A function to be called when guard fails
     */
    onGuardFail?: () => void;
}

// declare a class named App
declare class IApp {
  constructor(name: string);
  state: State;
  routes: Routes
  _container: HTMLElement;
  route_container: HTMLElement;
  pages: Map<string, string>;
  onNavigate: (path: string) => void;

  get container(): HTMLElement;
  set container(value: HTMLElement);
  get historyState(): History["state"];

}

type MountOptions = {
    spa: boolean;
}

type EventHandlers<K> = {
    [P in keyof K as P extends `on${infer Event}` ? `pv-on:${Event}` : never]: K[P];
}

// Bindable attributes are attributes that can be bound to a state property e.g `value` attribute of an input element
type BindableAttributes<K> = {
    [P in keyof K as P extends infer Attr extends string | number | bigint | boolean ? `bind:${Attr}` : never]: K[P];
}

// define types for custom normal html attributes

interface PVAttributes extends HTMLElement {
    "pv-if"?: string;
    "pv-for"?: string;
    "pv-show"?: string;
    "pv-hide"?: string;
    "pv-bind"?: string;
    "pv-defer"?: "viewport" | "hover" | "click" | "scroll" | "load" | "idle";
    "pv-defer:src"?: string;
    "pv-defer:swap"?: "inner" | "outer" | "text";
    "pv-html"?: string;
    "pv-on:init"?: string;
}

type HTMLAttributes<K> = BindableAttributes<K> & EventHandlers<K> & PVAttributes;

declare function do_children(children: HTMLElement[], parent: HTMLElement): void;

declare function log(...args: any[]): void;

declare function batch(fn: () => void): void;

declare function createApp(name: string, options?: MountOptions): IApp;

declare function nextTick(fn: () => void): void;

declare function part(name: string): Promise<string>;

declare function useFetcher(name: string, fetcher: (url: string) => Promise<string>): void;

type define_globals = (g_obj: any) => void;

export {
    Data, Getters, HTMLAttributes, Handlers, IApp, MountOptions, Param,
    Route, Routes, State, batch, createApp, define_globals, do_children, log, nextTick, part, useFetcher
};

