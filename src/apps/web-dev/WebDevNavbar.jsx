import React, { useState, useEffect } from 'react';

export default function WebDevNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Overview', hash: '#top' },
    { label: 'Capabilities', hash: '#capabilities' },
    { label: 'Tech Stack', hash: '#tech-stack' },
    { label: 'Projects', hash: '#portfolio' },
    { label: 'FAQ', hash: '#faq' }
  ];

  const handleLinkClick = (e, hash) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBrandClick = (e) => {
    e.preventDefault();
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  return (
    <>
      <nav className="navbar">
        <div className="nav-inner">
          <a href="#top" className="brand" onClick={handleBrandClick}>
            <img className="brand-logo" src="/logoooooooooo.png" alt="ViralCraftMedia — Web Engineering" fetchPriority="high" loading="eager" decoding="async" />
          </a>
          <div className="nav-center">
            {navLinks.map((link) => (
              <a
                key={link.hash}
                href={link.hash}
                onClick={(e) => handleLinkClick(e, link.hash)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="nav-right">
            <a href="https://www.instagram.com/viralcraftsocial" target="_blank" rel="noopener noreferrer" className="nav-instagram" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            <a href="#consultation" className="btn-nav-cta" onClick={(e) => handleLinkClick(e, '#consultation')}>
              Start Project <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
            <button type="button" className={`mobile-toggle ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(p => !p)} aria-label="Toggle menu" aria-expanded={mobileOpen}><span></span><span></span><span></span></button>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <div className={`mobile-drawer ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden={!mobileOpen}>
        <div className="mobile-drawer-inner" onClick={(e) => e.stopPropagation()}>
          {navLinks.map((link) => (
            <a
              key={link.hash}
              href={link.hash}
              onClick={(e) => handleLinkClick(e, link.hash)}
            >
              {link.label}
            </a>
          ))}
          <a href="#consultation" className="btn btn-primary mobile-cta" onClick={(e) => handleLinkClick(e, '#consultation')}>
            Start Project <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
        </div>
      </div>
    </>
  );
}
