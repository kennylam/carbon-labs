import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path, { join, dirname } from 'path';
import remarkGfm from 'remark-gfm';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, 'package.json')));
}

// Check if v12 stories should be included
const includeV12 = process.env.STORYBOOK_INCLUDE_V12 === 'true';

// Build stories array based on environment variable
const storiesGlobs = includeV12
  ? ['../src/v12/**/*.mdx', '../src/v12/**/*.stories.@(js|jsx|mjs|ts|tsx)']
  : [
      '../src/components/**/*.mdx',
      '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    ];

const config = {
  stories: storiesGlobs,
  staticDirs: ['../../../public'],
  addons: [
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('storybook-addon-accessibility-checker'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-webpack5-compiler-babel'),
    {
      name: getAbsolutePath('@storybook/addon-docs'),
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],
  babel: async (config) => {
    return {
      ...config,
      presets: [
        '@babel/preset-env',
        '@babel/preset-react',
        '@babel/preset-typescript',
      ],
    };
  },
  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {},
  },
  webpack(config) {
    const utilitiesRoot = path.resolve(__dirname, '../../utilities');
    const mdxComponentsRoot = path.resolve(
      __dirname,
      '../src/components/MDXComponents'
    );

    // Resolve workspace packages for Storybook under pnpm hoisting.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@carbon-labs/mdx-components/components': path.join(
        mdxComponentsRoot,
        'components'
      ),
      '@carbon-labs/mdx-components': path.join(mdxComponentsRoot, 'es'),
      '@carbon-labs/utilities/usePrefix': path.join(
        utilitiesRoot,
        'es/usePrefix.js'
      ),
      '@carbon-labs/utilities': path.join(utilitiesRoot, 'es/index.js'),
    };

    config.module.rules.push({
      test: /\.s?css$/,
      sideEffects: true,
      use: [
        {
          loader:
            process.env.NODE_ENV === 'production'
              ? MiniCssExtractPlugin.loader
              : 'style-loader',
        },
        {
          loader: 'css-loader',
          options: {
            importLoaders: 2,
            sourceMap: true,
          },
        },
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: [
                require('autoprefixer')({
                  overrideBrowserslist: ['last 1 version'],
                }),
              ],
            },
            sourceMap: true,
          },
        },
        {
          loader: 'sass-loader',
          options: {
            implementation: require('sass'),
            sassOptions: {
              includePaths: [
                path.resolve(__dirname, '..', 'node_modules'),
                path.resolve(__dirname, '..', '..', '..', 'node_modules'),
                mdxComponentsRoot,
                utilitiesRoot,
              ],
            },
            warnRuleAsWarning: true,
            sourceMap: true,
          },
        },
      ],
    });
    if (process.env.NODE_ENV === 'production') {
      config.plugins.push(
        new MiniCssExtractPlugin({
          filename: '[name].[contenthash].css',
        })
      );
    }
    return config;
  },
  docs: {
    defaultName: 'Overview',
  },
};
export default config;
