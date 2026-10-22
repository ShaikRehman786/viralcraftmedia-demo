import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getReferralAttribution, clearReferralAttribution } from '../../services/referralAttribution.js';
import { 
  Scissors, Zap, Shield, Clock, UploadCloud, DownloadCloud, Layers, Play, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';
import ClipNavbar from './ClipNavbar.jsx';
import ClipFooter from './ClipFooter.jsx';
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

export default function AppClipEditing() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selection, setSelection] = useState(null);
  const [customQty, setCustomQty] = useState('');
  const [price, setPrice] = useState(1099);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [_payId, setPayId] = useState('');
  const [vcmId, setVcmId] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);

  // Consultation state
  const [consultName, setConsultName] = useState('');
  const [consultEmail, setConsultEmail] = useState('');
  const [consultPhone, setConsultPhone] = useState('');
  const [consultBudget, setConsultBudget] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultStatus, setConsultStatus] = useState('');
  const [consultErrors, setConsultErrors] = useState({});

  const handleConsultationSubmit = async (e) => {
    e.preventDefault();
    const cErrs = {};
    if (!consultName.trim()) cErrs.name = 'Full Name is required';
    if (!consultPhone.trim()) cErrs.phone = 'WhatsApp Phone is required';
    else if (!/^\+?[0-9\s-]{8,20}$/.test(consultPhone.trim())) cErrs.phone = 'Valid phone format required';
    if (!consultEmail.trim()) cErrs.email = 'Email address is required';
    setConsultErrors(cErrs);
    if (Object.keys(cErrs).length > 0) return;

    setConsultStatus('submitting');
    try {
      const referral = getReferralAttribution();
      const payload = {
        name: consultName,
        email: consultEmail,
        phone: consultPhone,
        service: 'Clip Editing',
        serviceCategory: 'Clip Editing',
        budget: consultBudget ? Number(consultBudget) : undefined,
        description: `Clip Editing Consultation:\n${consultNotes}`,
        message: consultNotes,
        referralCode: referral?.code,
        referralCampaignId: referral?.campaignId,
        referralDetails: referral
      };
      const res = await axios.post('/api/enquiries', payload);
      if (res.data.success) {
        setConsultStatus('success');
        clearReferralAttribution();
      } else {
        setConsultStatus('error');
      }
    } catch (err) {
      console.error('Consultation enquiry error:', err);
      setConsultStatus('error');
    }
  };

  const jobs = selection === '9+' ? (parseInt(customQty, 10) || 10) : (parseInt(selection, 10) || 1);

  useEffect(() => {
    const calculatePricing = (count) => {
      if (count === 1) return 1099;
      if (count >= 2 && count <= 4) return count * 899;
      if (count === 5) return 3995;
      return count * 699;
    };
    setPrice(calculatePricing(jobs));
  }, [jobs]);

  useEffect(() => {
    document.title = "Viral Short-Form Video Clipping Engine | ViralCraft Media";
    const metaTags = {
      description: "Convert long webinars, interviews, and streams into high-retention short vertical clips. 48-hour delivery. Direct Drive integration.",
      keywords: "vertical clipping, youtube shorts, instagram reels, video editing, viral clips",
      "og:title": "Viral Short-Form Video Clipping Engine | ViralCraft Media",
      "og:description": "Convert long webinars, interviews, and streams into high-retention short vertical clips. 48-hour delivery.",
      "og:url": window.location.href,
      "og:type": "website",
      "twitter:card": "summary_large_image"
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
    if (!phone.trim()) errs.phone = 'WhatsApp Phone is required';
    else if (!/^\+?[0-9\s-]{8,20}$/.test(phone.trim())) errs.phone = 'Valid phone format required';
    if (!link.trim()) errs.link = 'Source Video URL is required';
    else {
      try { new URL(link); } catch (_) { errs.link = 'Please enter a valid URL'; }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('processing');
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      setStatus('error');
      alert('Razorpay SDK failed to load. Please check your connection.');
      return;
    }

    try {
      const referral = getReferralAttribution();
      const orderPayload = {
        amount: price,
        service: 'Clip Editing',
        clientName: name,
        clientPhone: phone,
        clientPlatform: platform,
        videoUrl: link,
        instructions,
        packageSize: selection === '9+' ? `${customQty} Clips` : `${jobs} Clip${jobs > 1 ? 's' : ''}`
      };

      if (referral && referral.code) {
        orderPayload.referralCode = referral.code;
        orderPayload.referralCampaignId = referral.campaignId;
      }

      const orderRes = await axios.post('/api/create-order', orderPayload);
      const { id: order_id, currency, amount } = orderRes.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
        amount,
        currency,
        name: 'ViralCraftMedia',
        description: `Order for ${orderPayload.packageSize}`,
        image: '/logoooooooooo.png',
        order_id,
        handler: async function (response) {
          try {
            setStatus('verifying');
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...orderPayload
            };

            const verifyRes = await axios.post('/api/verify-payment', verifyPayload);
            if (verifyRes.data.success) {
              setPayId(response.razorpay_payment_id);
              setVcmId(verifyRes.data.vcmId || '');
              setPdfBase64(verifyRes.data.pdfBase64 || '');
              setStatus('success');
              clearReferralAttribution();
            } else {
              setStatus('failed');
            }
          } catch (err) {
            console.error('Verification error:', err);
            setStatus('failed');
          }
        },
        prefill: {
          name,
          contact: phone
        },
        theme: {
          color: '#F97316'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      paymentObject.on('payment.failed', function () {
        setStatus('failed');
      });
    } catch (err) {
      console.error('Payment creation error:', err);
      setStatus('error');
    }
  };

  const handleDownloadInvoice = () => {
    if (!pdfBase64) return;
    const linkSource = `data:application/pdf;base64,${pdfBase64}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = `Invoice-${vcmId || 'VCM'}.pdf`;
    downloadLink.click();
  };

  const faqs = [
    { q: 'How long does delivery take?', a: 'Standard turnaround is 48 hours for up to 5 clips. Batches of 10+ clips are delivered in 72-96 hours with staged milestone previews.' },
    { q: 'What is included with each clip?', a: 'Each clip receives full hook optimization, vertical re-framing (9:16), animated dynamic captions, color grading, sound design, and viral pacing.' },
    { q: 'How do I send my source footage?', a: 'Paste any Google Drive, Dropbox, YouTube, or Loom link in the order form. We pull the raw footage directly from your link.' },
    { q: 'Are revisions included?', a: 'Yes! We provide 2 rounds of free revisions on every clip to fine-tune pacing, captions, and graphics until you are completely satisfied.' }
  ];

  return (
    <div className="page-wrapper" id="top">
      <ClipNavbar />

      <main className="main-content">
        {/* HERO SECTION */}
        <section className="hero-section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', paddingTop: '100px' }}>
          <div className="container">
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              <div className="sec-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <IconWrapper icon={Scissors} size={24} />
                <span>Specialized Short-Form Clipping</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '24px' }}>
                Turn Long Videos Into <span style={{ color: 'var(--accent, #F97316)' }}>Viral Shorts & Reels</span>
              </h1>
              <p style={{ fontSize: '1.2rem', color: '#64748B', lineHeight: 1.6, marginBottom: '36px' }}>
                We extract the most captivating hooks from your interviews, webinars, and streams. Handcrafted with retention-first pacing, sound effects, and animated subtitles.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#pricing" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  Calculate Price & Order
                </a>
                <a href="#samples" className="btn btn-ghost" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  View Work Samples
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW METRICS */}
        <section className="section" style={{ background: 'rgba(255, 255, 255, 0.02)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', textAlign: 'center' }}>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={48} duration={1200} />h
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Average Turnaround</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={100} duration={1400} />%
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Retention Engineered</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={50000} duration={1600} />+
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Clips Produced</p>
              </div>
              <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent, #F97316)', margin: 0 }}>
                  <AnimatedCounter end={99} duration={1400} />.4%
                </h3>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.95rem' }}>Client Satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* SAMPLE SHOWCASE */}
        <section className="section" id="samples">
          <div className="container">
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Portfolio</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Built for 60%+ Retention</h2>
              <p style={{ color: '#64748B', maxWidth: '600px', margin: '12px auto 0' }}>
                Every cut is analyzed to keep viewers watching through the 3-second hook drop-off point.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              {['Long-Form Hook Repurposing', 'Keynote & Webinar Snippet', 'Founder Story Reel'].map((title, i) => (
                <div key={title} className="card" style={{ padding: '24px', borderRadius: '18px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ height: '360px', background: '#0a0a0c', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <Play size={48} color="var(--accent, #F97316)" style={{ opacity: 0.8 }} />
                    <span style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#fff' }}>Sample 0{i + 1}</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '20px', marginBottom: '8px' }}>{title}</h3>
                  <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5 }}>Optimized with dynamic animated fonts, sound cues, and b-roll inserts.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING & ORDER FORM */}
        <section className="section" id="pricing" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
          <div className="container">
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Order Portal</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Interactive Pricing Calculator</h2>
              <p style={{ color: '#64748B', maxWidth: '600px', margin: '12px auto 0' }}>
                Select your package, review instant pricing, and check out securely via Razorpay.
              </p>
            </div>

            <div style={{ maxWidth: '840px', margin: '0 auto', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '40px' }}>
              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle2 size={64} color="#10B981" style={{ margin: '0 auto 24px' }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Order Placed Successfully!</h3>
                  <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px' }}>
                    Thank you, {name}. Your video clipping project is confirmed. Our team has received your instructions and will begin editing immediately.
                  </p>
                  {vcmId && (
                    <div style={{ display: 'inline-block', background: 'rgba(255, 255, 255, 0.05)', padding: '10px 20px', borderRadius: '10px', marginBottom: '24px', fontFamily: 'monospace' }}>
                      Order ID: <strong>{vcmId}</strong>
                    </div>
                  )}
                  <div>
                    {pdfBase64 && (
                      <button onClick={handleDownloadInvoice} className="btn btn-primary" style={{ padding: '12px 28px', marginRight: '12px' }}>
                        Download Tax Invoice
                      </button>
                    )}
                    <button onClick={() => setStatus('')} className="btn btn-ghost" style={{ padding: '12px 28px' }}>
                      Order More Clips
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePayment}>
                  {/* Step 1: Package Size */}
                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>
                      1. Select Clip Quantity:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                      {['1', '3', '5', '9+'].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => { setSelection(qty); if (qty !== '9+') setCustomQty(''); }}
                          style={{
                            padding: '16px 12px',
                            borderRadius: '12px',
                            border: selection === qty ? '2px solid var(--accent, #F97316)' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: selection === qty ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{qty === '9+' ? 'Custom' : `${qty} Clip${qty > 1 ? 's' : ''}`}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
                            {qty === '1' ? '₹1,099' : qty === '3' ? '₹899 / clip' : qty === '5' ? '₹799 / clip' : '₹699 / clip'}
                          </div>
                        </button>
                      ))}
                    </div>

                    {selection === '9+' && (
                      <div style={{ marginTop: '16px' }}>
                        <input
                          type="number"
                          min="9"
                          max="100"
                          value={customQty}
                          onChange={(e) => setCustomQty(e.target.value)}
                          placeholder="Enter quantity (e.g. 15)"
                          className="input"
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Pricing Summary Box */}
                  <div style={{ background: 'rgba(249, 115, 22, 0.06)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '14px', padding: '20px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Investment:</span>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>₹{price.toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>Includes 48-hr Turnaround</span>
                      <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>2 Free Revisions per clip</div>
                    </div>
                  </div>

                  {/* Step 2: Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Your Name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {errors.name && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.name}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>WhatsApp Number *</label>
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

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Source Video Link (Drive, YouTube, Dropbox) *</label>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                    />
                    {errors.link && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.link}</span>}
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Editing Notes / Timestamps (Optional)</label>
                    <textarea
                      rows="3"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Specify hooks, favorite segments, branding guidelines, or style preferences..."
                      className="input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'processing' || status === 'verifying'}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 700 }}
                  >
                    {status === 'processing' ? 'Connecting to Razorpay...' : status === 'verifying' ? 'Verifying Payment...' : `Proceed to Pay ₹${price.toLocaleString('en-IN')}`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* WORKFLOW STEPS */}
        <section className="section" id="workflow">
          <div className="container">
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Production Process</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>From Raw Footage to Viral Hook in 4 Steps</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
              {[
                { step: '01', title: 'Submit Link', desc: 'Share your raw link with instructions and timestamps.' },
                { step: '02', title: 'Hook Extraction', desc: 'We extract the top 1% high-retention segments.' },
                { step: '03', title: 'VCM Engine Edit', desc: 'Add motion subtitles, sfx, zoom pulses, and graphics.' },
                { step: '04', title: 'Drive Delivery', desc: 'Full 1080x1920 ready-to-post vertical MP4 delivery.' }
              ].map((s) => (
                <div key={s.step} style={{ padding: '28px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent, #F97316)', marginBottom: '12px' }}>{s.step}</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{s.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONSULTATION SECTION (CLIP EDITING ONLY) */}
        <section className="section" id="consultation" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Direct Studio Access</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Book a Video Clipping Consultation</h2>
              <p style={{ color: '#64748B', maxWidth: '580px', margin: '12px auto 0' }}>
                Need custom volume editing, recurring monthly retainer clips, or bespoke editing style guidelines? Tell us about your channels.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '40px' }}>
              {consultStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle2 size={64} color="#10B981" style={{ margin: '0 auto 24px' }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Consultation Request Sent!</h3>
                  <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px' }}>
                    Thank you, {consultName}. Our lead video editor will review your channel and contact you directly via WhatsApp within 12 hours.
                  </p>
                  <button onClick={() => setConsultStatus('')} className="btn btn-ghost" style={{ padding: '12px 28px' }}>
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConsultationSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Your Name *</label>
                      <input
                        type="text"
                        value={consultName}
                        onChange={(e) => setConsultName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {consultErrors.name && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{consultErrors.name}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>WhatsApp Number *</label>
                      <input
                        type="text"
                        value={consultPhone}
                        onChange={(e) => setConsultPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {consultErrors.phone && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{consultErrors.phone}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Email Address *</label>
                      <input
                        type="email"
                        value={consultEmail}
                        onChange={(e) => setConsultEmail(e.target.value)}
                        placeholder="rahul@creator.com"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {consultErrors.email && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{consultErrors.email}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Estimated Monthly Budget (Optional)</label>
                      <input
                        type="number"
                        value={consultBudget}
                        onChange={(e) => setConsultBudget(e.target.value)}
                        placeholder="e.g. 15000"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Channel Links & Special Instructions</label>
                    <textarea
                      rows="3"
                      value={consultNotes}
                      onChange={(e) => setConsultNotes(e.target.value)}
                      placeholder="Share your Instagram or YouTube link and desired editing style..."
                      className="input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={consultStatus === 'submitting'}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 700 }}
                  >
                    {consultStatus === 'submitting' ? 'Submitting Request...' : 'Book Free Video Clipping Consultation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="section" id="faq" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
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

      <ClipFooter />
    </div>
  );
}
