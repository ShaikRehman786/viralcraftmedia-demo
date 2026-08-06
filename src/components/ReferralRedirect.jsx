import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, AlertCircle, PhoneCall } from 'lucide-react';

export default function ReferralRedirect() {
  const { referralCode } = useParams();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const trackClick = async () => {
      // 1. Generate or retrieve a persistent anonymous Visitor ID
      let visitorId = localStorage.getItem('vcm_anonymous_visitor_id');
      if (!visitorId) {
        visitorId = 'vcm-vis-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('vcm_anonymous_visitor_id', visitorId);
      } else {
        // Mark as returning visitor
        localStorage.setItem('vcm_returning_visitor', 'true');
      }

      // 2. Extract UTM parameters
      const utmDetails = {
        utmSource: searchParams.get('utm_source') || '',
        utmMedium: searchParams.get('utm_medium') || '',
        utmCampaign: searchParams.get('utm_campaign') || '',
        utmTerm: searchParams.get('utm_term') || '',
        utmContent: searchParams.get('utm_content') || ''
      };

      // 3. Extract browser and system metadata
      const ua = navigator.userAgent;
      let browser = 'Unknown Browser';
      if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
      else if (ua.indexOf('Safari') > -1) browser = 'Safari';
      else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
      else if (ua.indexOf('MSIE') > -1 || !!document.documentMode) browser = 'IE';

      let os = 'Unknown OS';
      if (ua.indexOf('Windows') > -1) os = 'Windows';
      else if (ua.indexOf('Mac') > -1) os = 'MacOS';
      else if (ua.indexOf('X11') > -1) os = 'Linux';
      else if (ua.indexOf('Android') > -1) os = 'Android';
      else if (ua.indexOf('iPhone') > -1) os = 'iOS';

      let device = 'Desktop';
      if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
        device = 'Mobile';
      }

      const trackingPayload = {
        visitorId,
        landingPage: window.location.pathname + window.location.search,
        referrer: document.referrer || '',
        browser,
        device,
        os,
        ...utmDetails
      };

      try {
        const res = await axios.post(`/api/partners/campaigns/track/${referralCode}`, trackingPayload);
        
        if (res.data.success) {
          // Store fallback in localStorage for booking form integration
          localStorage.setItem('referral_partner_campaign_fallback', JSON.stringify(res.data.attribution));
          
          // Redirect to designated landing page (or home)
          const targetUrl = res.data.landingPage || '/';
          window.location.href = targetUrl;
        }
      } catch (err) {
        if (err.response?.status === 410 || err.response?.data?.expired) {
          setExpired(true);
        } else {
          setError(err.response?.data?.error || 'Unable to resolve referral link.');
        }
      }
    };

    if (referralCode) {
      trackClick();
    }
  }, [referralCode, searchParams]);

  if (expired) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0E0E10',
        color: '#FFF',
        fontFamily: 'Inter, sans-serif',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '24px',
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(249, 115, 22, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F97316'
          }}>
            <AlertCircle size={32} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 850, letterSpacing: '-0.5px', margin: 0 }}>Campaign Expired</h2>
            <p style={{ fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: '1.5' }}>
              This referral campaign has expired. Please contact ViralCraftMedia.
            </p>
          </div>
          <a href="mailto:support@viralcraftmedia.com" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'var(--accent, #F97316)',
            color: '#FFF',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 600,
            borderRadius: '12px',
            marginTop: '8px',
            transition: 'opacity 0.2s'
          }} onMouseEnter={e => e.target.style.opacity = 0.9} onMouseLeave={e => e.target.style.opacity = 1}>
            <PhoneCall size={16} /> Contact Support
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0E0E10',
        color: '#FFF',
        fontFamily: 'Inter, sans-serif',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(239, 68, 68, 0.1)',
          borderRadius: '24px',
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444'
          }}>
            <AlertCircle size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0' }}>Attribution Error</h2>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
              {error}
            </p>
          </div>
          <a href="/" style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#FFF',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 500,
            borderRadius: '12px',
            marginTop: '8px'
          }}>
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0E0E10',
      color: '#FFF',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Loader2 className="spinner" size={32} style={{ animation: 'spin 1.2s linear infinite', color: '#F97316' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
          Redirecting to landing page...
        </span>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
