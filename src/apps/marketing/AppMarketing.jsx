import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getReferralAttribution, clearReferralAttribution } from '../../services/referralAttribution.js';
import { 
  BarChart3, Target, Users, TrendingUp, CheckCircle2, HelpCircle, ArrowUpRight, Zap, Shield
} from 'lucide-react';
import MarketingNavbar from './MarketingNavbar.jsx';
import MarketingFooter from './MarketingFooter.jsx';
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

export default function AppMarketing() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    document.title = "Organic Growth & Social Media Marketing | ViralCraft Media";
    const metaTags = {
      description: "Scale brand reach and inbound leads with high-retention content strategy, viral script hooks, and data-backed channel pacing.",
      keywords: "social media marketing, organic growth, branding strategy, content calendar",
      "og:title": "Organic Growth & Social Media Marketing | ViralCraft Media",
      "og:description": "Scale brand reach and inbound leads with high-retention content strategy and viral script hooks.",
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
        service: 'Social Media Marketing',
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
      console.error('Marketing enquiry error:', err);
      setStatus('error');
    }
  };

  const faqs = [
    { q: 'How does your organic growth system work?', a: 'We analyze your target audience, identify trending industry sub-topics, write high-hook retention scripts, produce the video assets, and manage daily posting rhythms.' },
    { q: 'What platforms do you focus on?', a: 'Instagram Reels, YouTube Shorts, LinkedIn Video, and TikTok. We syndicate a unified brand narrative formatted natively for each algorithm.' },
    { q: 'Do you guarantee view counts or followers?', a: 'We guarantee strict algorithmic execution: proven retention hook structures, high average view duration (AVD), and consistent posting volume, which mathematically maximizes compounding organic reach.' },
    { q: 'What is the minimum retainer commitment?', a: 'Our organic growth retainers typically run on 3-month sprints to allow algorithmic authority and audience compounding to fully kick in.' }
  ];

  return (
    <div className="page-wrapper" id="top">
      <MarketingNavbar />

      <main className="main-content">
        {/* HERO */}
        <section className="hero-section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', paddingTop: '100px' }}>
          <div className="container">
            <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
              <div className="sec-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <IconWrapper icon={TrendingUp} size={24} />
                <span>Organic Distribution Engine</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '24px' }}>
                Turn Content Into a <span style={{ color: 'var(--accent, #F97316)' }}>Compounding Growth Flywheel</span>
              </h1>
              <p style={{ fontSize: '1.2rem', color: '#64748B', lineHeight: 1.6, marginBottom: '36px' }}>
                Stop relying on unpredictable boosts. We build predictable organic pipelines through retention-engineered short-form videos and multi-platform syndication.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#consultation" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  Request Growth Audit
                </a>
                <a href="#framework" className="btn btn-ghost" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  View Growth Framework
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
                  <AnimatedCounter end={12} duration={1200} />M+
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Organic Views Generated</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={340} duration={1400} />%
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Average Inbound Lead Lift</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={85} duration={1400} />%
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Average Retention Rate</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={4} duration={1000} />x
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Multi-Platform Syndication</p>
              </div>
            </div>
          </div>
        </section>

        {/* FRAMEWORK */}
        <section className="section" id="framework">
          <div className="container">
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Execution Strategy</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>The 4-Pillar Organic Engine</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              {[
                { icon: Target, title: 'Audience & Hook Ideation', desc: 'Identify high-intent search queries and niche curiosity gaps. Write scripts that stop scrolling in the first 1.5 seconds.' },
                { icon: Zap, title: 'High-Retention Video Editing', desc: 'Transform raw A-roll into highly visual video stories with punch-ins, sound design, and kinetic typography.' },
                { icon: BarChart3, title: 'Algorithmic Pacing & Scheduling', desc: 'Post at peak user activity windows with optimized captions, hashtags, and engagement prompts to trigger discovery.' },
                { icon: Users, title: 'Lead Funnel Capture', desc: 'Guide active commenters into automated direct message funnels and landing page conversions.' }
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

        {/* ENQUIRY */}
        <section className="section" id="consultation" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Scale Your Reach</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Request a Growth Strategy Audit</h2>
              <p style={{ color: '#64748B', maxWidth: '580px', margin: '12px auto 0' }}>
                Share your active profiles and target client persona. We will audit your current content funnel and present an actionable growth roadmap.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '40px' }}>
              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle2 size={64} color="#10B981" style={{ margin: '0 auto 24px' }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Audit Request Received!</h3>
                  <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px' }}>
                    Thank you, {name}. Our social media growth team will analyze your brand and send you custom recommendations.
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
                        placeholder="e.g. Ananya Patel"
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
                        placeholder="ananya@brand.com"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {errors.email && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.email}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Monthly Budget Range</label>
                      <select
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: '#0e0e10' }}
                      >
                        <option value="">Select range...</option>
                        <option value="₹25k - ₹50k">₹25,000 - ₹50,000 / month</option>
                        <option value="₹50k - ₹1 Lakh">₹50,000 - ₹1,00,000 / month</option>
                        <option value="₹1 Lakh+">₹1,00,000+ / month</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Social Profiles & Target Audience</label>
                    <textarea
                      rows="3"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Share your Instagram / YouTube / LinkedIn handle and core business goal..."
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
                    {status === 'submitting' ? 'Submitting Request...' : 'Get Inbound Growth Strategy'}
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

      <MarketingFooter />
    </div>
  );
}
