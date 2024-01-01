const $$fetch_ = globalThis.fetch;

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit | undefined} [init=undefined]
 * @returns {Promise<Response>}
 */
let fetch = async function (input, init) {
  try {
    return await $$fetch_(input, init);
  } catch (error) {
    throw error;
  }
}

/**
 * @param {typeof window.fetch} f
*/
  function useFetcher(f) {
    // @ts-ignore
    fetch = f;
  }


  export { fetch, useFetcher };
