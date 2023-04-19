import React from 'react';
import './styles.css';

const Footer = () => {
  return (
    <div className="footer">
      © 2023 Tone Lab | Made with Love {' '}
      <a href="https://tonejs.github.io/" target="_blank" rel="noreferrer">
        and Tone.js
      </a>{' '}
      Imagined by_{' '}
      <a href="https://twitter.com/ajjuism" target="_blank" rel="noreferrer">
        @ajjuism
      </a>
    </div>
  );
};

export default Footer;
