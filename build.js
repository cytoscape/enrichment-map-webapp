import { build } from 'esbuild';
import { config } from 'dotenv-defaults';

config();  // Load from .env and .env.defaults

// Map ALL current environment variables into esbuild's "define"
const envKeys = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    `process.env.${key}`,
    JSON.stringify(value)
  ])
);

await build({
  entryPoints: ['./src/client/index.js'],
  bundle: true,
  outdir: 'build',
  sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
  minify: process.env.MINIFY === 'true' || process.env.NODE_ENV === 'production',
  loader: { '.js': 'jsx' },
  define: envKeys
});