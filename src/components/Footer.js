// src/components/Footer.js
import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-info">
          <p className="copyright">
            © {currentYear} Pin Noter. All Rights Reserved.
          </p>
          <div className="developer-info">
            <p>
              Developed with <span className="heart">❤</span> by{' '}
              <a 
                href="https://github.com/kushyanthpothineni" 
                target="_blank" 
                rel="noopener noreferrer"
                className="developer-link"
              >
                Kushyanth Pothineni
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;