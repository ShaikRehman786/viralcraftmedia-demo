import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const handleLinkClick = (e, hash) => {
    if (isHome) {
      e.preventDefault();
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="ft-grid">
          <div className="ft-brand">
            <img className="ft-logo-img" src="/logoooooooooo.png" alt="ViralCraftMedia" loading="eager" decoding="async" />
            <p className="ft-tagline">Luxury Creative Editing Studio.<br />Hyderabad, Telangana</p>
            <div className="ft-social">
              <a href="https://www.instagram.com/viralcraftsocial" target="_blank" rel="noopener noreferrer" className="ft-social-link" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
              <a href="mailto:contact@viralcraftmedia.com" className="ft-social-link" aria-label="Email">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </a>
            </div>
          </div>
          <div className="ft-col">
            <h4>Navigation</h4>
            <Link to="/#top" onClick={(e) => handleLinkClick(e, '#top')}>Home</Link>
            <Link to="/#services" onClick={(e) => handleLinkClick(e, '#services')}>Services</Link>
            <Link to="/#workflow" onClick={(e) => handleLinkClick(e, '#workflow')}>Workflow</Link>
            <Link to="/#pricing" onClick={(e) => handleLinkClick(e, '#pricing')}>Pricing</Link>
          </div>
          <div className="ft-col">
            <h4>Services</h4>
            <Link to="/#services" onClick={(e) => handleLinkClick(e, '#services')}>Reels Editing</Link>
            <Link to="/#services" onClick={(e) => handleLinkClick(e, '#services')}>Shorts Editing</Link>
            <Link to="/#services" onClick={(e) => handleLinkClick(e, '#services')}>Viral Clips</Link>
            <Link to="/#services" onClick={(e) => handleLinkClick(e, '#services')}>Repurposing</Link>
          </div>
          <div className="ft-col">
            <h4>Studio</h4>
            <span className="ft-addr">Madhapur, Hyderabad<br />Telangana — 500081</span>
            <a href="mailto:contact@viralcraftmedia.com" className="ft-email">contact@viralcraftmedia.com</a>
          </div>
        </div>
        <div className="ft-divider"></div>
        <div className="ft-bottom">
          <span>&copy; 2026 ViralCraftMedia. All rights reserved.</span>
          <span className="font-mono ft-badge">Hyd_Telangana_IN</span>
        </div>
      </div>
    </footer>
  );
}
