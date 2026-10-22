import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getReferralAttribution, clearReferralAttribution } from '../../services/referralAttribution.js';
import { 
  Code, Globe, Zap, Shield, Clock, Users, Target, Monitor, CheckCircle2, HelpCircle, Layers
} from 'lucide-react';
import WebDevNavbar from './WebDevNavbar.jsx';
import WebDevFooter from './WebDevFooter.jsx';
import AnimatedCounter from '../../components/shared/AnimatedCounter.jsx';
import { clientTestimonials } from '../../data/clientTestimonials.js';

function IconWrapper({ icon: Icon, size = 32, color = 'var(--accent)', className = '', ...props }) {
  return (
    <div
      className={`icon-wrapper ${className}`}
      style={{
        width: `${Math.max(24, Math.min(36, size))}px`,
        height: `${Math.max(24, Math.min(36, size))}px`,
        '--icon-color': color
      }}
      {...props}
    >
      <Icon size={Math.max(14, Math.min(22, size * 0.6))} color={color} strokeWidth={2.5} className="icon" />
    </div>
  );
}

export default function AppWebDev() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    document.title = "High-Performance Web Design & Full-Stack Development | ViralCraft Media";
    const metaTags = {
      description: "Build lightning-fast web applications, conversion-engineered landing pages, and scalable agency software.",
      keywords: "web development, responsive web design, react developer, full stack agency, nextjs",
      "og:title": "High-Performance Web Design & Full-Stack Development | ViralCraft Media",
      "og:description": "Build lightning-fast web applications and conversion-engineered landing pages.",
      "og:url": window.location.href,
      "og:type": "website"
    };

    Object.entries(metaTags).forEach(([key, val]) => {
      let el = document.querySelector(`meta[name="${key}"], meta[property="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(key.startsWith('og:') || key.startsWith('twitter:') ? 'property' : 'name', key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', val);
    });
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full Name is required';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    if (!email.trim()) errs.email = 'Email address is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    try {
      const referral = getReferralAttribution();
      const payload = {
        name,
        phone,
        email,
        service: 'Website Design & Development',
        budget,
        message: instructions,
        referralCode: referral?.code,
        referralCampaignId: referral?.campaignId
      };

      const res = await axios.post('/api/enquiries', payload);
      if (res.data.success) {
        setStatus('success');
        clearReferralAttribution();
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Web dev enquiry error:', err);
      setStatus('error');
    }
  };

  const faqs = [
    { q: 'What technology stack do you build with?', a: 'Modern React, Next.js, Node.js, Express, MongoDB, TailwindCSS/Vanilla CSS, and serverless architectures tailored for speed, security, and scalability.' },
    { q: 'Are your websites mobile-responsive and SEO-optimized?', a: 'Yes. Every project includes 100% responsive fluid layouts, Core Web Vitals optimization (90+ Google PageSpeed), structured JSON-LD schema, and semantic HTML5.' },
    { q: 'Can you integrate payment gateways and custom CRMs?', a: 'We build end-to-end payment workflows (Razorpay, Stripe) and connect with proprietary dashboards, WhatsApp automation, and custom databases.' },
    { q: 'What is the standard build timeline?', a: 'High-converting single-page landing sites deliver in 5-7 business days. Full multi-page platforms and web applications take 2-4 weeks depending on scope.' }
  ];

  return (
    <div className="page-wrapper" id="top">
      <WebDevNavbar />

      <main className="main-content">
        {/* HERO */}
        <section className="hero-section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', paddingTop: '100px' }}>
          <div className="container">
            <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
              <div className="sec-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <IconWrapper icon={Code} size={24} />
                <span>Full-Stack Web Engineering</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '24px' }}>
                Web Applications Built for <span style={{ color: 'var(--accent, #F97316)' }}>Sub-Second Speed & Conversions</span>
              </h1>
              <p style={{ fontSize: '1.2rem', color: '#64748B', lineHeight: 1.6, marginBottom: '36px' }}>
                Elevate your brand with bespoke digital experiences. We engineer high-performance web applications, interactive funnels, and enterprise client portals.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#consultation" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  Start Web Project
                </a>
                <a href="#capabilities" className="btn btn-ghost" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  Explore Capabilities
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', textAlign: 'center' }}>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  &lt;<AnimatedCounter end={1} duration={800} />s
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Average Load Latency</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={98} duration={1400} />/100
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Google PageSpeed Score</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={100} duration={1200} />%
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Responsive Across Devices</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={50} duration={1400} />+
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Production Deployments</p>
              </div>
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="section" id="capabilities">
          <div className="container">
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Our Capabilities</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Modern Web Architecture</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              {[
                { icon: Globe, title: 'High-Converting Landing Pages', desc: 'Crafted with laser focus on value proposition clarity, social proof, and seamless mobile call-to-action funnels.' },
                { icon: Code, title: 'Custom Full-Stack Web Apps', desc: 'React, Node, Express, and MongoDB architectures designed with clean code, role-based auth, and scalable databases.' },
                { icon: Zap, title: 'Payment & API Integrations', desc: 'Direct integrations with Razorpay, Stripe, email automation, WhatsApp webhooks, and third-party CRMs.' },
                { icon: Shield, title: 'Enterprise Security & SEO', desc: 'CSP headers, CSRF protection, SSL hardening, canonical links, and structured metadata for search indexing.' }
              ].map((item) => (
                <div key={item.title} style={{ padding: '32px', background: 'rgba(255, 255, 255, 0.025)', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <IconWrapper icon={item.icon} size={32} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '20px', marginBottom: '10px' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONSULTATION */}
        <section className="section" id="consultation" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Let's Build</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Request a Web Project Proposal</h2>
              <p style={{ color: '#64748B', maxWidth: '580px', margin: '12px auto 0' }}>
                Tell us about your brand vision, feature requirements, and timeline. We will deliver an architectural roadmap and exact estimate.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '40px' }}>
              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle2 size={64} color="#10B981" style={{ margin: '0 auto 24px' }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Proposal Request Sent!</h3>
                  <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px' }}>
                    Thank you, {name}. Our engineering lead will review your specifications and contact you with next steps.
                  </p>
                  <button onClick={() => setStatus('')} className="btn btn-ghost" style={{ padding: '12px 28px' }}>
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Your Name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Siddharth Rao"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {errors.name && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.name}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>WhatsApp / Phone *</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {errors.phone && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.phone}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="siddharth@startup.com"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {errors.email && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.email}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Estimated Budget</label>
                      <select
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: '#0e0e10' }}
                      >
                        <option value="">Select budget range...</option>
                        <option value="₹25k - ₹50k">₹25,000 - ₹50,000 (Landing Page)</option>
                        <option value="₹50k - ₹1.5 Lakh">₹50,000 - ₹1,50,000 (Full Platform)</option>
                        <option value="₹1.5 Lakh+">₹1,50,000+ (Custom Web App / CRM)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Project Overview & Core Features</label>
                    <textarea
                      rows="3"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Outline your pages, target audience, reference sites, or special functionality required..."
                      className="input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 700 }}
                  >
                    {status === 'submitting' ? 'Submitting Request...' : 'Get Architectural Roadmap'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq">
          <div className="container" style={{ maxWidth: '800px' }}>
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Support</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Frequently Asked Questions</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {faqs.map((f, idx) => (
                <div
                  key={f.q}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '14px',
                    padding: '20px 24px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                    <span>{f.q}</span>
                    <HelpCircle size={20} color={activeFaq === idx ? 'var(--accent, #F97316)' : '#64748B'} />
                  </div>
                  {activeFaq === idx && (
                    <p style={{ marginTop: '14px', color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      {f.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <WebDevFooter />
    </div>
  );
}
