/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import LotkaVolterraLab from './components/LotkaVolterraLab';

export default function App() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mist)', color: 'var(--ink)' }}>
      {quotaExceeded && (
        <div
          role="alert"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 9999,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            background: '#fffbeb',
            borderBottom: '1px solid #fcd34d',
            padding: '10px 16px',
            fontSize: '13px',
            color: '#78350f',
          }}
        >
          <span>
            <strong>Google Maps:</strong> Free daily quota reached (resets at midnight Pacific
            Time). To keep building without limits, link a Google Cloud billing account.
          </span>
          <a
            href="https://console.cloud.google.com/project/_/billing/enable"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              borderRadius: '6px',
              background: '#78350f',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            Enable billing
          </a>
        </div>
      )}
      <LotkaVolterraLab />
    </div>
  );
}
