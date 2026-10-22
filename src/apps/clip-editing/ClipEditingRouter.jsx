import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppClipEditing from '../apps/clip-editing/AppClipEditing.jsx';
import ServiceReferralHandler from '../components/shared/ServiceReferralHandler.jsx';

export default function ClipEditingRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/r/:referralCode" element={<ServiceReferralHandler serviceDefaultPath="/" />} />
        <Route path="/*" element={<AppClipEditing />} />
      </Routes>
    </Router>
  );
}
