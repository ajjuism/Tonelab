import React, { useState } from 'react';
import './styles.css';

const InfoButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleInfo = (e) => {
    // Stop event propagation to prevent parent elements from capturing the click
    e.stopPropagation();
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="info-button-container">
      <button 
        className="info-button" 
        onClick={toggleInfo}
        aria-label="Information about ToneLab"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="white"/>
        </svg>
      </button>
      
      {isOpen && (
        <div className="info-panel" onClick={(e) => e.stopPropagation()}>
          <div className="info-header">
            <h3>About ToneLab 2.0</h3>
            <button 
              className="close-button" 
              onClick={toggleInfo}
              aria-label="Close information panel"
            >
              ×
            </button>
          </div>
          <div className="info-content">
            <p>ToneLab is an interactive musical playground where visual elements trigger sounds based on physical interactions.</p>
            
            <h4>How to use</h4>
            <ul>
              <li>Click on the canvas to create bouncing balls</li>
              <li>Each collision triggers musical notes</li>
              <li>Adjust controls to modify the sounds</li>
            </ul>
            
            <h4>Built with</h4>
            <ul>
              <li>React.js & Tone.js</li>
              <li>HTML Canvas & Styled Components</li>
            </ul>
            
            <div className="info-links">
              <a 
                href="https://tone-lab-v1.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="previous-version-link"
              >
                View Previous Version
                <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 5L21 12M21 12L14 19M21 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="info-footer">
            Made with <span className="heart">❤️</span> and 
            <a 
              href="https://tonejs.github.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            > Tone.js</a> | 
            <a 
              href="https://ajjuism.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            > @ajjuism</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoButton; 