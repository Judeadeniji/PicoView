import resolve from 'rollup-plugin-node-resolve';
/**
 * @type {import('rollup').RollupOptions}
 */

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/picoview.cjs.js',
        format: 'cjs',
        name: 'picoview',
        sourcemap: true,
    },
    plugins: [resolve({
        extensions: ['.js', '.ts']
    })],
    "treeshake": true,
};