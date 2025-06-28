import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header
      className={clsx('hero hero--primary', styles.heroBanner)}
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div className="container">
        <Heading as="h1" className="hero__title text-white">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle text-white">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--lg rounded-3xl bg-white text-purple-700 hover:bg-gray-100"
            to="/docs/intro">
            Get Started with CoinScript
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description="CoinScript is a high-level language that compiles to ChiaLisp, making Chia blockchain development accessible to developers familiar with modern programming languages.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
