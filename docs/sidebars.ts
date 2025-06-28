import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Main sidebar
  tutorialSidebar: [
    'intro',
  ],

  implementationSidebar: [
    'intro',
  ],

  // CoinScript documentation sidebar
  coinscriptSidebar: [
    {
      type: 'category',
      label: 'CoinScript',
      items: [
        'coinscript/why-coinscript',
        'coinscript/quick-start',
        'coinscript/examples',
        'coinscript/puzzle-solution-builder',
        'coinscript/ast-engine',
        'coinscript/reference',
        'coinscript/builder-patterns',
      ],
    },
  ],
};

export default sidebars;
