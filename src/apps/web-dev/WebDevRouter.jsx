import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppWebDev from '../apps/web-dev/AppWebDev.jsx';
import ServiceReferralHandler from '../components/shared/ServiceReferralHandler.jsx';

export default function WebDevRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/r/:referralCode" element={<ServiceReferralHandler serviceDefaultPath="/" />} />
        <Route path="/*" element={<AppWebDev />} />
      </Routes>
    </Router>
  );
}
