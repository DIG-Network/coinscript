import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "CoinScript",
  tagline: "High Level ChiaLisp Transcompiler",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://coinscript.dev",
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: process.env.BASE_URL || '/',

  // GitHub pages deployment config.
  organizationName: "chia-blockchain", // Update with your org
  projectName: "chia-puzzle-framework", // Update with your repo

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang.
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Update this to your repo
          editUrl:
            "https://github.com/chia-blockchain/chia-puzzle-framework/tree/main/docs/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    image: "img/coinscript-social-card.png",
    navbar: {
      title: "CoinScript",
      logo: {
        alt: "CoinScript Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/chia-blockchain/chia-puzzle-framework",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Introduction",
              to: "/docs/intro",
            },
            {
              label: "CoinScript Reference",
              to: "/docs/coinscript/reference",
            },
            {
              label: "PuzzleBuilder Guide",
              to: "/docs/coinscript/puzzle-solution-builder",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Chia Developer Forum",
              href: "https://developers.chia.net",
            },
            {
              label: "Discord",
              href: "https://discord.gg/chia",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/chia-blockchain/chia-puzzle-framework",
            },
            {
              label: "Chia Network",
              href: "https://www.chia.net",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} CoinScript. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['lisp', 'clojure'], // For ChiaLisp syntax highlighting
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
