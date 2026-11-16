'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Building2, 
  Truck, 
  ShieldCheck, 
  HardHat, 
  ArrowRight, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  X, 
  FileText,
  Hammer,
  FileSpreadsheet,
  Award,
  Users
} from 'lucide-react';

interface Obra {
  id: number;
  titulo: string;
  categoria: string;
  cliente: string;
  ubicacion: string;
  tiempo: string;
  partida: string;
  descripcion: string;
  detallesTecnicos: string[];
  imagen: string;
}

const OBRAS_DESTACADAS: Obra[] = [
  {
    id: 1,
    titulo: 'Enfierradura Estructural y Paso Superior',
    categoria: 'Obras Viales',
    cliente: 'MOP / Concesionaria',
    ubicacion: 'Quillota - La Calera',
    tiempo: '14 Meses',
    partida: 'Habilitación y montaje de enfierradura A63-42H',
    descripcion: 'Ejecución integral de enfierradura de alta densidad en cepas, estribos y losas de viaducto con tolerancias milimétricas y estricto control de curvado bajo norma NCh204.',
    detallesTecnicos: [
      'Más de 850 toneladas de acero estructural habilitado en banco propio',
      'Control de calidad por ultrasonido y verificación de tolerancias sísmicas',
      'Cumplimiento estricto de norma técnica chilena NCh204 y NCh430'
    ],
    imagen: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 2,
    titulo: 'Movimiento de Tierras y Empréstitos Industriales',
    categoria: 'Infraestructura',
    cliente: 'Consorcio Logístico Central',
    ubicacion: 'Valparaíso',
    tiempo: '8 Meses',
    partida: 'Corte masivo en roca, terraplenes y mejoramiento',
    descripcion: 'Escarpe, excavación en roca y conformación de plataformas para naves logísticas industriales con parque propio de excavadoras CAT y tolvas 8x4.',
    detallesTecnicos: [
      'Volumen de excavación: 140.000 m³ compactados al 95% Proctor modificado',
      'Flota continua de 6 excavadoras oruga y 12 camiones tolva de 20 m³',
      'Control topográfico continuo con estación total y levantamiento dron'
    ],
    imagen: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 3,
    titulo: 'Fundaciones Profundas y Muros de Contención',
    categoria: 'Obras Civiles',
    cliente: 'Constructora del Sur SpA',
    ubicacion: 'Viña del Mar / Reñaca',
    tiempo: '11 Meses',
    partida: 'Hormigón armado H-30 y enfierradura en muros pantalla',
    descripcion: 'Subcontrato integral de fundaciones profundas, muros berlinés y contención perimetral de edificio habitacional en pendiente costera.',
    detallesTecnicos: [
      '2.400 m² de muros de contención anclados y pantallas continuas',
      'Hormigonado continuo con bombas pluma de largo alcance',
      'Cero incidentes con tiempo perdido en más de 45.000 horas-hombre'
    ],
    imagen: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop'
  }
];

const HISTORIAL_CURRICULAR = [
  { nombre: 'Cimentaciones y Radier Nave Frigorífica', mandante: 'Frigoríficos Aconcagua', partida: 'Enfierradura estructural y zapatas', anio: '2023' },
  { nombre: 'Canalización y Alcantarillado Matriz', mandante: 'I. Municipalidad de Quillota', partida: 'Movimiento de tierra y canalizaciones', anio: '2022' },
  { nombre: 'Habilitación de Radier y Losa Pesada', mandante: 'Maestranza San Pedro', partida: 'Hormigón H-35 con fibra estructural', anio: '2021' },
  { nombre: 'Muros de Desnivel y Estribos Ruta F-62', mandante: 'Vialidad Regional', partida: 'Armaduras de puente y cepas', anio: '2020' },
  { nombre: 'Excavaciones para Subterráneo Edificio Portal', mandante: 'Inmobiliaria Costa', partida: 'Socavación y retiro de material con tolva', anio: '2019' },
  { nombre: 'Plataforma para Subestación Eléctrica', mandante: 'Chilquinta Energía', partida: 'Terraplenes y compactación dinámica', anio: '2018' },
];

export default function HomePage() {
  const [obraSeleccionada, setObraSeleccionada] = useState<Obra | null>(null);

  return (
    <div className="bg-[#F8FAF9] text-slate-800 min-h-screen">
      
      {/* 1. HERO INSTITUCIONAL */}
      <section className="relative bg-[#0F172A] border-b border-[#007734]/30 overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#00FF6F_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 relative h-[380px] sm:h-[480px] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/60 group">
              <Image 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200&auto=format&fit=crop"
                alt="Faenas Constructora Carlos Álvarez Villar"
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-transparent to-transparent" />
            </div>

            <div className="lg:col-span-5 lg:-ml-16 z-20 bg-[#007734] border border-[#00FF6F]/40 p-8 sm:p-10 rounded-2xl shadow-2xl text-white space-y-6 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1">
              <div className="inline-flex items-center space-x-2 bg-[#005424] border border-[#00FF6F]/40 px-3.5 py-1 rounded-full text-[#A4FFCC] text-xs font-bold uppercase tracking-wider">
                <HardHat className="w-4 h-4 text-[#00FF6F]" />
                <span>Carlos Alberto Álvarez Villar E.I.R.L.</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
                Solidez Técnica y Especialidad en Obras Civiles y Edificación
              </h1>

              <p className="text-[#A4FFCC]/90 text-sm sm:text-base leading-relaxed">
                RUT: 77.974.309-8. Más de 25 años de trayectoria en habilitación de enfierradura de alta densidad, movimientos de tierra masivos y cumplimiento laboral DT.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/contacto"
                  className="inline-flex justify-center items-center px-6 py-3.5 bg-[#00FF6F] hover:bg-[#70FFAE] text-[#004D21] font-extrabold rounded-lg transition-all duration-200 shadow-lg shadow-[#00FF6F]/20 text-sm hover:-translate-y-0.5"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  <span>Cotizar Proyecto</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
                <Link
                  href="/trabaja_con_nosotros"
                  className="inline-flex justify-center items-center px-6 py-3.5 bg-[#005424] hover:bg-[#00451e] text-white font-semibold rounded-lg transition-all duration-200 border border-[#00FF6F]/30 text-sm hover:-translate-y-0.5"
                >
                  <Users className="w-4 h-4 mr-2 text-[#00FF6F]" />
                  <span>Trabaja con Nosotros</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. BARRA DE CREDENCIALES Y RESPALDO LEGAL */}
      <section className="bg-white border-b border-slate-200 py-6 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Clock, valor: '+25 Años', sub: 'Experiencia en Obras' },
            { icon: Truck, valor: 'Maquinaria Propia', sub: 'Autonomía Operativa' },
            { icon: Building2, valor: '+350 Obras', sub: 'Proyectos Concluidos' },
            { icon: ShieldCheck, valor: 'Mutual CChC / F30-1', sub: 'Acreditación Laboral DT' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-center space-x-3 group p-2 rounded-lg transition-transform duration-200 hover:-translate-y-1">
              <div className="p-2.5 rounded-xl bg-[#007734]/10 text-[#007734] transition-colors duration-200 group-hover:bg-[#007734] group-hover:text-[#00FF6F]">
                <item.icon className="w-6 h-6 shrink-0" />
              </div>
              <div className="text-left">
                <p className="text-lg font-extrabold text-slate-900 leading-snug">{item.valor}</p>
                <p className="text-xs text-slate-500 font-medium">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. GALERÍA DE OBRAS DESTACADAS */}
      <section className="max-w-7xl mx-auto px-6 py-16 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-[#007734] font-bold text-xs uppercase tracking-wider">Portafolio Técnico</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Obras y Partidas Ejecutadas</h2>
            <p className="text-slate-600 text-sm mt-1">Selecciona cualquier proyecto para revisar su ficha técnica y parámetros estructurales.</p>
          </div>
          <Link href="/sobre_nosotros" className="text-sm font-bold text-[#007734] hover:text-[#009B43] flex items-center space-x-1.5 transition-colors">
            <span>Conocer trayectoria y certificaciones</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {OBRAS_DESTACADAS.map((obra) => (
            <article 
              key={obra.id}
              onClick={() => setObraSeleccionada(obra)}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="relative h-56 w-full overflow-hidden bg-slate-200">
                  <Image 
                    src={obra.imagen} 
                    alt={obra.titulo} 
                    fill 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <span className="absolute top-4 left-4 bg-[#007734]/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-xs">
                    {obra.categoria}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#007734] transition-colors duration-200">
                    {obra.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#007734] shrink-0" />
                    <span>{obra.ubicacion} • Mandante: <strong className="text-slate-700">{obra.cliente}</strong></span>
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {obra.descripcion}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="bg-[#A4FFCC]/30 text-[#007734] px-2.5 py-1 rounded-md font-bold">{obra.tiempo}</span>
                <span className="text-[#007734] font-bold flex items-center transition-transform duration-200 group-hover:translate-x-1">
                  Ver Ficha Técnica <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. HISTORIAL TÉCNICO CURRICULAR */}
      <section className="bg-[#EDF7F1] border-y border-[#A4FFCC]/60 py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#007734] uppercase tracking-widest">Currículum Empresarial</span>
            <h2 className="text-3xl font-extrabold text-[#004D21]">Historial Técnico de Contratos Mayores</h2>
            <p className="text-sm text-slate-600">Registro histórico de partidas entregadas con recepción conforme en la V Región y la Región Metropolitana.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#007734] text-white text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Año</th>
                    <th className="py-4 px-6">Nombre de la Faena / Obra</th>
                    <th className="py-4 px-6">Mandante / Constructora</th>
                    <th className="py-4 px-6">Partida Técnica Ejecutada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {HISTORIAL_CURRICULAR.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAF9] transition-colors duration-150">
                      <td className="py-3.5 px-6 font-bold text-[#007734] font-mono">{item.anio}</td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900">{item.nombre}</td>
                      <td className="py-3.5 px-6 text-slate-600">{item.mandante}</td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center bg-[#A4FFCC]/40 text-[#004D21] border border-[#70FFAE] px-2.5 py-0.5 rounded text-xs font-semibold">
                          {item.partida}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PARQUE DE MAQUINARIA INDUSTRIAL */}
      <section className="max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="border-b border-slate-200 pb-4">
          <span className="text-[#007734] font-bold text-xs uppercase tracking-wider">Disponibilidad Operativa</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Parque Propio de Maquinaria y Equipamiento</h2>
          <p className="text-slate-600 text-sm mt-1">Equipos preparados para movilización inmediata en la Región de Valparaíso y la zona central.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              nombre: 'Excavadora Oruga CAT 320 / 336',
              especialidad: 'Movimiento de Tierras Masivo',
              capacidad: 'Balde 1.4 m³ - Peso operativo 22 a 36 ton',
              foto: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=800&auto=format&fit=crop'
            },
            {
              nombre: 'Camiones Tolva 8x4 de 20 m³',
              especialidad: 'Transporte de Áridos y Desmonte',
              capacidad: 'Tolvas reforzadas para faena minera, urbana e industrial',
              foto: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=800&auto=format&fit=crop'
            },
            {
              nombre: 'Bancos de Doblado y Corte de Acero',
              especialidad: 'Habilitación Industrial de Enfierradura',
              capacidad: 'Curvado y doblado automatizado hasta Ø36mm (NCh204)',
              foto: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop'
            }
          ].map((maq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col group transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="relative h-44 w-full bg-slate-200 overflow-hidden">
                <Image 
                  src={maq.foto} 
                  alt={maq.nombre} 
                  fill 
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[11px] font-bold text-[#007734] uppercase tracking-wider">{maq.especialidad}</span>
                  <h4 className="font-bold text-slate-900 text-base mt-1 group-hover:text-[#007734] transition-colors">{maq.nombre}</h4>
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium">
                  {maq.capacidad}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. MODAL INTERACTIVO DE FICHA TÉCNICA */}
      {obraSeleccionada && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/75 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setObraSeleccionada(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 w-full">
              <Image 
                src={obraSeleccionada.imagen} 
                alt={obraSeleccionada.titulo} 
                fill 
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover" 
              />
              <button 
                onClick={() => setObraSeleccionada(null)} 
                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-black text-white p-2 rounded-full transition-transform hover:scale-110"
                aria-label="Cerrar ficha"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 bg-[#00FF6F] text-[#004D21] font-extrabold text-xs px-3 py-1 rounded shadow-xs">
                {obraSeleccionada.categoria}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">{obraSeleccionada.titulo}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#007734] shrink-0" />
                  <span>{obraSeleccionada.ubicacion} • Mandante: <strong className="text-slate-800">{obraSeleccionada.cliente}</strong></span>
                </p>
              </div>

              <div className="bg-[#A4FFCC]/30 border-l-4 border-[#007734] p-4 rounded-r-lg">
                <span className="text-xs font-bold uppercase text-[#007734] tracking-wider block">Partida Técnica Ejecutada:</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{obraSeleccionada.partida}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#007734]" />
                  <span>Descripción Técnica de la Faena</span>
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {obraSeleccionada.descripcion}
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Hammer className="w-4 h-4 text-[#007734]" />
                  <span>Especificaciones Clave de Control</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {obraSeleccionada.detallesTecnicos.map((det, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#007734] shrink-0 mt-0.5" />
                      <span>{det}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setObraSeleccionada(null)}
                  className="px-6 py-2.5 bg-[#007734] hover:bg-[#004D21] text-white font-bold rounded-lg text-sm transition-all"
                >
                  Cerrar Ficha Técnica
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}