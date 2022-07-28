import React, { Component } from 'react';

import Content from './content';

import ReactTooltip from 'react-tooltip';

export class Home extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <>
        <Content />
        <ReactTooltip effect="solid" delayShow={500} />
      </>
    );
  }
}

export default Home;