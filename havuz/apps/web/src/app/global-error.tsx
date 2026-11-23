'use client';

/** Kök düzen dahil her şey çöktüğünde gösterilen son çare sayfası (kendi html/body'si olur). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100dvh', margin: 0, background: '#f6f7f4', color: '#0d1a14' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Havuz şu an yanıt veremiyor</h1>
          <p style={{ color: '#55625b' }}>Beklenmeyen bir hata oluştu. Birkaç saniye sonra tekrar deneyin.</p>
          {error.digest && <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#8a958f' }}>Hata kodu: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 16, padding: '10px 16px', borderRadius: 12, border: 0, background: '#0a7356', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
