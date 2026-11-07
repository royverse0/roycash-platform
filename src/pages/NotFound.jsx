import React from 'react';
import { ArrowLeft, Home, Layers, Mail } from 'lucide-react';

export default function NotFound({ navigate }) {
  const handleNav = (route, e) => {
    e.preventDefault();
    navigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="section-wrapper" style={{ minHeight: '65vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: '600px' }}>
        <div className="mono-text" style={{ 
          fontSize: '4.5rem', 
          fontWeight: '900', 
          color: 'var(--emerald-primary)', 
          lineHeight: '1',
          marginBottom: '16px',
          textShadow: '0 0 30px var(--emerald-glow)'
        }}>
          404
        </div>

        <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>
          Destination Not Found
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>
          The performance route or resource you are looking for has been moved, renamed, or does not exist on the RoyCash network gateway.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="#home"
            onClick={(e) => handleNav('home', e)}
            className="btn btn-primary"
          >
            <Home size={16} />
            <span>Return to Network Home</span>
          </a>

          <a
            href="#campaign-models"
            onClick={(e) => handleNav('campaign-models', e)}
            className="btn btn-secondary"
          >
            <Layers size={16} />
            <span>Campaign Models</span>
          </a>

          <a
            href="#contact"
            onClick={(e) => handleNav('contact', e)}
            className="btn btn-secondary"
          >
            <Mail size={16} />
            <span>Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  );
}
