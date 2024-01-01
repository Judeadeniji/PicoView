// write a rollup config for this project

import resolve from 'rollup-plugin-node-resolve';

/** 
 * @type {import('rollup').RollupOptions}
 */
export default {
    input: 'src/index.js',
    output: {
        file: 'dist/picoview.umd.js',
        format: 'umd',
        name: 'picoview',
        sourcemap: true,
    },
    plugins: [
        resolve({
            extensions: ['.js']
        })
    ],
    "treeshake": true,
    
};