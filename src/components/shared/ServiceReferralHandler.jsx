import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, AlertCircle, PhoneCall } from 'lucide-react';

export default function ServiceReferralHandler({ serviceDefaultPath = '/' }) {
  const { referralCode } = useParams();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const trackClick = async () => {
      let visitorId = localStorage.getItem('vcm_anonymous_visitor_id');
      if (!visitorId) {
        visitorId = 'vcm-vis-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('vcm_anonymous_visitor_id', visitorId);
      } else {
        localStorage.setItem('vcm_returning_visitor', 'true');
      }

      const utmDetails = {
        utmSource: searchParams.get('utm_source') || '',
        utmMedium: searchParams.get('utm_medium') || '',
        utmCampaign: searchParams.get('utm_campaign') || '',
        utmTerm: searchParams.get('utm_term') || '',
        utmContent: searchParams.get('utm_content') || ''
      };

      const ua = navigator.userAgent;
      let browser = 'Unknown Browser';
      if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
      else if (ua.indexOf('Safari') > -1) browser = 'Safari';
      else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';

      let os = 'Unknown OS';
      if (ua.indexOf('Windows') > -1) os = 'Windows';
      else if (ua.indexOf('Mac') > -1) os = 'MacOS';
      else if (ua.indexOf('Android') > -1) os = 'Android';
      else if (ua.indexOf('iPhone') > -1) os = 'iOS';

      let device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'Mobile' : 'Desktop';

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
          localStorage.setItem('referral_partner_campaign_fallback', JSON.stringify(res.data.attribution));
          // Redirect to the service home
          window.location.href = serviceDefaultPath;
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
  }, [referralCode, searchParams, serviceDefaultPath]);

  if (expired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E0E10', color: '#FFF', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '48px 40px', textAlign: 'center' }}>
          <AlertCircle size={40} color="#F97316" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Campaign Expired</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>This referral campaign has expired. Please contact support.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E0E10', color: '#FFF', fontFamily: 'Inter, sans-serif', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '24px', padding: '48px 40px', textAlign: 'center' }}>
          <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Attribution Error</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>{error}</p>
          <a href={serviceDefaultPath} style={{ display: 'inline-block', marginTop: '16px', color: '#F97316' }}>Continue to Website</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E0E10', color: '#FFF', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Loader2 className="spinner" size={32} style={{ animation: 'spin 1.2s linear infinite', color: '#F97316' }} />
        <span>Applying referral discount & attribution...</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
