import React from 'react';

export default function PodcastFooter() {
  const handleLinkClick = (e, hash) => {
    e.preventDefault();
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="ft-grid">
          <div className="ft-brand">
            <img className="ft-logo-img" src="/logoooooooooo.png" alt="ViralCraftMedia — Podcast Production" loading="lazy" decoding="async" />
            <p className="ft-tagline">Studio-Grade Podcast Audio & Multi-Cam Engineering.<br />Hyderabad, Telangana</p>
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
            <h4>Sections</h4>
            <a href="#top" onClick={(e) => handleLinkClick(e, '#top')}>Overview</a>
            <a href="#deliverables" onClick={(e) => handleLinkClick(e, '#deliverables')}>Deliverables</a>
            <a href="#samples" onClick={(e) => handleLinkClick(e, '#samples')}>Audio Engineering</a>
            <a href="#packages" onClick={(e) => handleLinkClick(e, '#packages')}>Packages</a>
            <a href="#faq" onClick={(e) => handleLinkClick(e, '#faq')}>FAQ</a>
          </div>
          <div className="ft-col">
            <h4>Capabilities</h4>
            <span>Dynamic Multi-Cam Cutting</span>
            <span>Spectral Noise Removal & Mastering</span>
            <span>Intro/Outro Music & Sound Design</span>
            <span>Social Highlight Clip Generation</span>
          </div>
          <div className="ft-col">
            <h4>Studio</h4>
            <span className="ft-addr">Madhapur, Hyderabad<br />Telangana — 500081</span>
            <a href="mailto:contact@viralcraftmedia.com" className="ft-email">contact@viralcraftmedia.com</a>
          </div>
        </div>
        <div className="ft-divider"></div>
        <div className="ft-bottom">
          <span>&copy; {new Date().getFullYear()} ViralCraftMedia Podcast Production. All rights reserved.</span>
          <span className="font-mono ft-badge">Hyd_Telangana_IN</span>
        </div>
      </div>
    </footer>
  );
}
