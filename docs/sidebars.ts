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
  // Main documentation sidebar with logical flow
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Introduction',
      collapsed: false,
      items: [
        'intro',
        'getting-started',
        'quick-start',
        'basic-examples',
        'chialisp-overview',
      ],
    },
    {
      type: 'category',
      label: 'CoinScript',
      collapsed: false,
      items: [
        'coinscript/introduction',
        'coinscript/why-coinscript',
        'coinscript/quick-start',
        'coinscript/examples',
        'coinscript/reference',
      ],
    },
    {
      type: 'category',
      label: 'PuzzleBuilder',
      collapsed: false,
      items: [
        'coinscript/puzzle-solution-builder',
        'coinscript/builder-patterns',
      ],
    },
    {
      type: 'category',
      label: 'AST Engine',
      collapsed: false,
      items: [
        'coinscript/ast-engine',
      ],
    },
  ],
};

export default sidebars;
