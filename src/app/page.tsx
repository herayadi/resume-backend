export default function Home() {
  return (
    <main className="api-home">
      <h1>Regina Resume API</h1>
      <p>The API service is running.</p>
      <ul>
        <li><a href="/api/health"><code>GET /api/health</code></a></li>
        <li><a href="/api/v1/resume"><code>GET /api/v1/resume</code></a></li>
        <li><a href="/admin"><code>Admin CMS</code></a></li>
      </ul>
    </main>
  );
}
