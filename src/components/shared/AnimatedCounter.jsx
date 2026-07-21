import React, { useState, useEffect, useRef } from 'react';

export default function AnimatedCounter({ target, suffix = '', duration = 1500 }) {
  const [count, setCount] = useState(0);
  const el = useRef(null);

  useEffect(() => {
    let start = 0;
    const end = parseInt(target, 10);
    if (isNaN(end)) return;
    let observer;
    let frame;
    const startCounter = () => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        setCount(Math.floor(p * (end - start) + start));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { startCounter(); observer.disconnect(); }
    }, { threshold: 0.1 });
    if (el.current) observer.observe(el.current);
    return () => { if (observer) observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [target, duration]);

  return <span ref={el}>{count}{suffix}</span>;
}
