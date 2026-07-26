import React from 'react';

export default function WhatWeOffer({ sectionTag, heading, description, items }) {
  return (
    <section className="sp-deliverables" id="services">
      <div className="sp-deliverables-inner">
        <div className="sp-section-header">
          <div className="sp-section-tag">{sectionTag}</div>
          <h2>{heading}</h2>
          <p>{description}</p>
        </div>
        <div className="sp-deliverables-rail">
          <div className="sp-rail-line"></div>
          {items.map((item, i) => (
            <div key={i} className="sp-deliv-node">
              <div className="sp-deliv-index">{item.index}</div>
              <div className="sp-deliv-node-icon" style={{ background: item.color }}>
                <item.icon size={22} strokeWidth={2.5} color="#FFFFFF" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
