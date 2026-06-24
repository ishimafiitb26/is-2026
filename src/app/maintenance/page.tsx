export default function MaintenancePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a', // Warna background gelap elegan
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#fbbf24', // Warna kuning peringatan
        }}
      >
        System Under Maintenance
      </h1>
      
      <p
        style={{
          fontSize: '1.125rem',
          maxWidth: '600px',
          lineHeight: '1.6',
          color: '#cbd5e1',
          marginBottom: '32px',
        }}
      >
        Halo! Saat ini website sedang dalam pemeliharaan sistem oleh tim teknis. 
        Mohon hentikan sementara pengisian form atau pengumpulan tugas sampai ada arahan lebih lanjut dari panitia.
      </p>

      <div
        style={{
          padding: '16px 24px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
          Terima kasih atas kesabaran dan pengertiannya 🙏
        </p>
      </div>
    </div>
  );
}