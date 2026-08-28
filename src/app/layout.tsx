import type { Metadata } from 'next';
import './globals.css';
import './admin/admin.css';

export const metadata: Metadata = {
  title: 'Regina Resume API',
  description: 'Backend API for Regina Septianadrah resume',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
