import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Acceso Administrativo | Carlos Álvarez Villar E.I.R.L.',
  description: 'Portal de gestión interna y control de faenas',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#0F172A] text-slate-100 flex items-center justify-center">
      <main className="w-full flex justify-center items-center">
        {children}
      </main>
    </div>
  );
}