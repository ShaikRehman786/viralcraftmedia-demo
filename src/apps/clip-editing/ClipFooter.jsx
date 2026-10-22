import React from 'react';

export default function ClipFooter() {
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
            <img className="ft-logo-img" src="/logoooooooooo.png" alt="ViralCraftMedia — Clip Editing" loading="lazy" decoding="async" />
            <p className="ft-tagline">Viral Short-Form Video Clipping Engine.<br />Hyderabad, Telangana</p>
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
            <h4>Quick Links</h4>
            <a href="#top" onClick={(e) => handleLinkClick(e, '#top')}>Overview</a>
            <a href="#samples" onClick={(e) => handleLinkClick(e, '#samples')}>Sample Cuts</a>
            <a href="#pricing" onClick={(e) => handleLinkClick(e, '#pricing')}>Pricing & Turnaround</a>
            <a href="#workflow" onClick={(e) => handleLinkClick(e, '#workflow')}>Delivery Workflow</a>
            <a href="#consultation" onClick={(e) => handleLinkClick(e, '#consultation')}>Consultation</a>
            <a href="#faq" onClick={(e) => handleLinkClick(e, '#faq')}>FAQ</a>
          </div>
          <div className="ft-col">
            <h4>Features</h4>
            <span>Dynamic Word-by-Word Subtitles</span>
            <span>Retention Hooks & Sound Effects</span>
            <span>Color Grading & B-Roll Overlays</span>
            <span>Direct Google Drive Delivery</span>
          </div>
          <div className="ft-col">
            <h4>Studio</h4>
            <span className="ft-addr">Madhapur, Hyderabad<br />Telangana — 500081</span>
            <a href="mailto:contact@viralcraftmedia.com" className="ft-email">contact@viralcraftmedia.com</a>
          </div>
        </div>
        <div className="ft-divider"></div>
        <div className="ft-bottom">
          <span>&copy; {new Date().getFullYear()} ViralCraftMedia Clip Editing. All rights reserved.</span>
          <span className="font-mono ft-badge">Hyd_Telangana_IN</span>
        </div>
      </div>
    </footer>
  );
}
