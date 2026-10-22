import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppPodcastEditing from '../apps/podcast-editing/AppPodcastEditing.jsx';
import ServiceReferralHandler from '../components/shared/ServiceReferralHandler.jsx';

export default function PodcastEditingRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/r/:referralCode" element={<ServiceReferralHandler serviceDefaultPath="/" />} />
        <Route path="/*" element={<AppPodcastEditing />} />
      </Routes>
    </Router>
  );
}
