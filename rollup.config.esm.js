import resolve from 'rollup-plugin-node-resolve';
/**
 * @type {import('rollup').RollupOptions}
 */

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/picoview.mjs',
        format: 'esm',
        name: 'picoview',
        sourcemap: true,
    },
    plugins: [resolve()],
    "treeshake": true,
};