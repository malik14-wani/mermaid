import { build, InlineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import jisonPlugin from './jisonPlugin.js';
import pkg from '../package.json' assert { type: 'json' };

const { dependencies } = pkg;
const watch = process.argv.includes('--watch');
const __dirname = fileURLToPath(new URL('.', import.meta.url));

type OutputOptions = Exclude<
  Exclude<InlineConfig['build'], undefined>['rollupOptions'],
  undefined
>['output'];

const packageOptions = {
  mermaid: {
    name: 'mermaid',
    file: 'mermaid.ts',
  },
  'mermaid-mindmap': {
    name: 'mermaid-mindmap',
    file: 'registry.ts',
  },
};

interface BuildOptions {
  minify: boolean | 'esbuild';
  core?: boolean;
  watch?: boolean;
  packageName: keyof typeof packageOptions;
}

export const getBuildConfig = ({
  minify,
  core,
  watch,
  packageName,
}: BuildOptions): InlineConfig => {
  const external = ['require', 'fs', 'path'];
  const { name, file } = packageOptions[packageName];
  let output: OutputOptions = [
    {
      name,
      format: 'esm',
      sourcemap: true,
      entryFileNames: `[name].esm${minify ? '.min' : ''}.mjs`,
    },
    {
      name,
      format: 'umd',
      sourcemap: true,
      entryFileNames: `[name]${minify ? '.min' : ''}.js`,
    },
  ];

  if (core) {
    external.push(...Object.keys(dependencies));
    output = {
      name,
      format: 'esm',
      sourcemap: true,
      entryFileNames: `[name].core.mjs`,
    };
  }

  const config: InlineConfig = {
    configFile: false,
    build: {
      emptyOutDir: false,
      outDir: resolve(__dirname, `../packages/${packageName}/dist`),
      lib: {
        entry: resolve(__dirname, `../packages/${packageName}/src/${file}`),
        name,
        // the proper extensions will be added
        fileName: name,
      },
      minify,
      rollupOptions: {
        external,
        output,
      },
    },
    resolve: {
      extensions: ['.jison', '.js', '.ts', '.json'],
    },
    plugins: [jisonPlugin()],
  };

  if (watch && config.build) {
    config.build.watch = {
      include: 'src/**',
    };
  }

  return config;
};

const buildPackage = async (packageName: keyof typeof packageOptions) => {
  return Promise.allSettled([
    build(getBuildConfig({ minify: false, packageName })),
    build(getBuildConfig({ minify: 'esbuild', packageName })),
    build(getBuildConfig({ minify: true, core: true, packageName })),
  ]);
};

const main = async () => {
  const packageNames = Object.keys(packageOptions) as (keyof typeof packageOptions)[];
  for (const pkg of packageNames) {
    await buildPackage(pkg);
  }
};

if (watch) {
  build(getBuildConfig({ minify: false, watch, packageName: 'mermaid' }));
} else {
  void main();
}