// ==============================================================================
// Next.js Root Layout (Pure JavaScript / JSX)
// Provides global font loading, elegant light academic styling, and consistent layout shell
// ==============================================================================

import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Shivraj 350 | International Peer-Reviewed Multidisciplinary Journal',
  description:
    'Official academic publication and peer-review platform of Shivaji College, University of Delhi. Commemorating 350 Years of Hindavi Swaraj.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-800 font-inter antialiased min-h-screen flex flex-col selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
