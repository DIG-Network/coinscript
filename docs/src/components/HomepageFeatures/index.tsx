import React from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg?: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Familiar Syntax',
    Svg: require('@site/static/img/code-icon.svg').default,
    description: (
      <>
        CoinScript provides a Solidity-like syntax that's familiar to blockchain 
        developers. Write smart contracts using modern programming constructs 
        like functions, variables, and control flow - no Lisp experience required.
      </>
    ),
  },
  {
    title: 'Type Safety',
    Svg: require('@site/static/img/shield-icon.svg').default,
    description: (
      <>
        Catch errors at compile time with CoinScript's robust type system. 
        Strong typing for addresses, amounts, and data structures helps prevent 
        costly mistakes before deployment to the Chia blockchain.
      </>
    ),
  },
  {
    title: 'Powerful Tooling',
    Svg: require('@site/static/img/tools-icon.svg').default,
    description: (
      <>
        The Chia Puzzle Framework includes PuzzleBuilder for programmatic 
        contract creation and an AST engine for advanced transformations. 
        Build, test, and deploy with confidence using modern development tools.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
