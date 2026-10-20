import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, HardHat, ArrowRight } from 'lucide-react';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Carlos Alberto Álvarez Villar | Contratista en Construcción E.I.R.L.',
  description: 'Especialistas en enfierradura estructural, obras viales, civiles y arriendo de maquinaria en la Región de Valparaíso y Metropolitana.',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-800">
      
      {/* Topbar discreta en gris pizarra técnico con detalles verdes */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
              <HardHat className="w-3.5 h-3.5 text-[#009B43]" />
              Más de 25 Años de Experiencia en Faena
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-400">Viña del Mar, Región de Valparaíso</span>
          </div>
          <div className="flex items-center space-x-4">
            <a 
              href="mailto:pcga.alvarez.test@gmail.com" 
              className="hover:text-white transition-colors flex items-center gap-1.5 text-slate-300"
            >
              <Mail className="w-3.5 h-3.5 text-[#009B43]" />
              <span className="hidden md:inline">pcga.alvarez.test@gmail.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Header en blanco limpio con acentos verde corporativo */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-20 px-6 lg:px-8">
          
          {/* Logo y Razón Social */}
          <Link href="/" className="flex items-center space-x-3 group py-2">
            <div className="bg-slate-50 p-1 h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center shrink-0 rounded-xl border border-slate-200 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <img 
                src="/logo-alvarez.svg" 
                alt="Logo Carlos Álvarez Villar" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight leading-none text-slate-900 group-hover:text-[#007734] transition-colors">
                Carlos Alberto Álvarez Villar
              </span>
              <span className="text-xs font-semibold text-[#007734] mt-1 tracking-wide uppercase">
                Contratista en Construcción E.I.R.L.
              </span>
            </div>
          </Link>

          {/* Menú Desktop con botón de contraste */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold">
            <Link 
              href="/sobre_nosotros" 
              className="text-slate-600 hover:text-[#007734] transition-colors"
            >
              Sobre Nosotros
            </Link>
            <Link 
              href="/trabaja_con_nosotros" 
              className="text-slate-600 hover:text-[#007734] transition-colors"
            >
              Trabaja con Nosotros
            </Link>
            <Link 
              href="/contacto" 
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#007734] hover:bg-[#009B43] text-white font-bold rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Cotizar Obra</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </nav>

        </div>
      </header>

      {/* Contenido */}
      <main className="flex-grow">{children}</main>

      {/* Footer sobrio en gris oscuro con acento verde */}
      <footer className="bg-slate-900 text-slate-300 border-t-4 border-[#007734] py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#009B43]" />
              <h2 className="text-xl font-extrabold text-white">
                Carlos Álvarez Villar E.I.R.L.
              </h2>
            </div>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Especialistas con más de 25 años de trayectoria continua en subcontrato de enfierradura de alta exigencia, movimientos de tierra masivos y faenas civiles de gran envergadura.
            </p>
            <p className="text-xs text-[#70FFAE]">
              Adheridos a la Mutual de Seguridad CChC • Cobertura en Región de Valparaíso y Metropolitana.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Enlaces Rápidos</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
              </li>
              <li>
                <Link href="/sobre_nosotros" className="hover:text-white transition-colors">Sobre Nosotros y Maquinaria</Link>
              </li>
              <li>
                <Link href="/trabaja_con_nosotros" className="hover:text-white transition-colors">Trabaja con Nosotros</Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-white transition-colors">Contacto y Presupuestos</Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Contacto Directo</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <a 
                href="mailto:ma.alvarezgonzalez@hotmail.com" 
                className="hover:text-white transition-colors flex items-center space-x-2"
              >
                <Mail className="w-4 h-4 text-[#009B43] shrink-0" />
                <span className="truncate">pcga.alvarez.test@gmail.com</span>
              </a>
              <p className="text-xs text-slate-500 pt-1">
                Atención técnica y recepción de proyectos de lunes a viernes.
              </p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Carlos Alberto Álvarez Villar E.I.R.L. Todos los derechos reservados.</p>
          <p className="text-slate-400">Portal Corporativo de Faenas y Maquinaria</p>
        </div>
      </footer>

    </div>
  );
}