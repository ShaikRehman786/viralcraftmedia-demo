import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const navLinks = [
    { label: 'Home', hash: '#top' },
    { label: 'Pricing', hash: '#pricing' },
    { label: 'Services', hash: '#services' },
    { label: 'Testimonials', hash: '#clients' },
    { label: 'Contact', hash: '#contact' }
  ];

  // Centralized hash navigation — deterministic, no arbitrary timeouts, same SPA mechanism for desktop and mobile
  const handleLinkClick = (e, hash) => {
    e.preventDefault();
    navigate(`/${hash}`, { replace: false });
    setMobileOpen(false);
    // Same-page hash: element already in DOM, scroll immediately (deterministic)
    // Cross-page hash (service → home#hash): home has not mounted yet, so the effect below handles scroll after route change
    if (isHome) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBrandClick = (e) => {
    if (isHome) {
      e.preventDefault();
      navigate('/#top', { replace: false });
      setMobileOpen(false);
      const el = document.querySelector('#top');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setMobileOpen(false);
    }
  };

  // Auto-scroll when landing from service pages or direct hash URL — deterministic, no timeout hack
  useEffect(() => {
    if (isHome && location.hash) {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isHome, location.hash]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Lock body scroll when drawer open (avoid background scroll stealing taps)
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  const [activeSection, setActiveSection] = useState('top');

  useEffect(() => {
    if (!isHome) return;
    const sections = ['top', 'pricing', 'services', 'clients', 'contact'];
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -50% 0px',
      threshold: 0
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isHome]);

  const isServiceActive = location.pathname.startsWith('/services/');

  return (
    <>
      <nav className="navbar">
        <div className="nav-inner">
          <Link to="/" className="brand" onClick={handleBrandClick}>
            <img className="brand-logo" src="/logoooooooooo.png" alt="ViralCraftMedia" fetchPriority="high" loading="eager" decoding="async" />
          </Link>
          <div className="nav-center">
            {navLinks.map((link) => {
              const hashId = link.hash.substring(1);
              const isActive = isHome ? (activeSection === hashId) : (link.label === 'Services' && isServiceActive);
              return (
                <Link
                  key={link.hash}
                  to={`/${link.hash}`}
                  className={isActive ? 'active' : ''}
                  onClick={(e) => handleLinkClick(e, link.hash)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="nav-right">
            <a href="https://www.instagram.com/viralcraftsocial" target="_blank" rel="noopener noreferrer" className="nav-instagram" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            <Link to="/login" className="nav-instagram" aria-label="Login" style={{ marginLeft: '12px', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} />
            </Link>
            <Link to="/#pricing" className="btn-nav-cta" onClick={(e) => handleLinkClick(e, '#pricing')}>
              Start Project <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
            <button type="button" className={`mobile-toggle ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(p => !p)} aria-label="Toggle menu" aria-expanded={mobileOpen}><span></span><span></span><span></span></button>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER — same authoritative navigate as desktop, backdrop closes, Escape closes */}
      <div className={`mobile-drawer ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden={!mobileOpen}>
        <div className="mobile-drawer-inner" onClick={(e) => e.stopPropagation()}>
          {navLinks.map((link) => (
            <Link
              key={link.hash}
              to={`/${link.hash}`}
              onClick={(e) => handleLinkClick(e, link.hash)}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/#pricing" className="btn btn-primary mobile-cta" onClick={(e) => handleLinkClick(e, '#pricing')}>
            Start Project <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </>
  );
}
