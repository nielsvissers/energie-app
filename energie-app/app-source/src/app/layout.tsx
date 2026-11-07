// src/app/layout.tsx
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Energie Monitor Dashboard',
  description: 'Beheer je energieverbruik, facturen en batterijsimulaties',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen font-sans antialiased">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}