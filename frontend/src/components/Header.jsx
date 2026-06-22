import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="app-header" id="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
              <path d="M8 20L12 12H20L24 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="22" r="2" fill="white"/>
              <circle cx="20" cy="22" r="2" fill="white"/>
              <path d="M14 22H18" stroke="white" strokeWidth="2"/>
              <path d="M16 8V12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#3b82f6"/>
                  <stop offset="1" stopColor="#f97316"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="header-text">
            <h1 className="header-title">Spotter<span className="header-title-accent">ELD</span></h1>
            <span className="header-subtitle">Trip Planner & ELD Log Generator</span>
          </div>
        </div>
        <div className="header-meta">
          <span className="badge badge-green">
            <span className="status-dot"></span>
            HOS Compliant
          </span>
          <span className="header-rule-info">70hr / 8-day • Property</span>
        </div>
      </div>
    </header>
  );
}
