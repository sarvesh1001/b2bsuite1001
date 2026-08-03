// apps/web/src/pages/_app.tsx
import '../styles/globals.css';      // already there
import '../styles/css/qr-login.css';  // ✅ add
import '../styles/css/dashboard.css'; // ✅ add

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;