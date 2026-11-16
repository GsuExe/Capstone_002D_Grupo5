import Image from 'next/image';
import Link from 'next/link';
import { 
  Building2, 
  Award, 
  ShieldCheck, 
  Truck, 
  Users, 
  MapPin, 
  CheckCircle2, 
  Briefcase,
  History,
  HardHat,
  FileCheck2,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';

export default function SobreNosotrosPage() {
  return (
    <div className="bg-[#F8FAF9] text-slate-800 min-h-screen py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-14">
        
        {/* 1. HERO INSTITUCIONAL DE TRAYECTORIA */}
        <section className="bg-slate-900 text-white rounded-2xl p-8 md:p-12 shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#00FF6F_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 bg-[#007734]/40 border border-[#009B43]/60 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#A4FFCC]">
              <History className="w-4 h-4 text-[#00FF6F]" />
              <span>Carlos Alberto Álvarez Villar E.I.R.L. • RUT: 77.974.309-8</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Liderazgo Técnico y Compromiso en Obras de Construcción
            </h1>
            
            <p className="text-slate-300 text-base md:text-lg leading-relaxed">
              Durante más de 25 años hemos ejecutado partidas críticas en obras viales, edificación y movimientos masivos de tierra en la Región de Valparaíso y la zona central, respaldados por una sólida cultura de cumplimiento laboral ante la Dirección del Trabajo y los más rigurosos estándares de seguridad.
            </p>
          </div>
        </section>

        {/* 2. BASE OPERATIVA Y COBERTURA TERRITORIAL */}
        <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-xl">
                <MapPin className="w-6 h-6 text-[#007734] shrink-0" />
                <h2>Presencia Operativa y Base Central</h2>
              </div>
              <p className="text-slate-700 text-sm font-semibold">
                Sede Central y Operaciones: Viña del Mar, Región de Valparaíso, Chile.
              </p>
              <p className="text-slate-500 text-xs">
                Patio de Maquinarias y Centro de Habilitación de Acero con cobertura permanente en Quillota, Viña del Mar, Reñaca, Valparaíso y la Región Metropolitana.
              </p>
            </div>
            
            <div className="bg-emerald-50 px-8 py-5 rounded-xl border border-emerald-200 text-center min-w-[210px] shrink-0">
              <span className="block text-3xl font-extrabold text-[#007734]">+350</span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faenas Ejecutadas</span>
            </div>
          </div>
        </section>

        {/* 3. LOGROS Y NÚMEROS CLAVE */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { titulo: '+25 Años', sub: 'Continuidad en el Rubro', icono: History },
            { titulo: '+850 Ton', sub: 'Acero Estructural Habilitado', icono: Building2 },
            { titulo: '0 Incidentes', sub: 'Tasa de Siniestralidad Destacada', icono: ShieldCheck },
            { titulo: '100% Legal', sub: 'Certificación F30 y F30-1 al Día', icono: FileCheck2 },
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 text-[#007734] flex items-center justify-center border border-emerald-100">
                <item.icono className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">{item.titulo}</h3>
              <p className="text-xs text-slate-500 font-medium">{item.sub}</p>
            </div>
          ))}
        </section>

        {/* 4. INFRAESTRUCTURA Y PARQUE DE MAQUINARIA */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-[#007734] font-bold text-xs uppercase tracking-wider">Autonomía Técnica</span>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-2 mt-1">
              <Truck className="w-6 h-6 text-[#007734]" />
              <span>Infraestructura y Parque Propio</span>
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Equipamiento pesado propio para garantizar plazos y autonomía operativa sin depender de terceros.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                titulo: 'Maquinaria de Movimiento de Tierras',
                detalles: ['Excavadoras Oruga CAT 336 y 320', 'Retroexcavadoras para fundaciones y zanjas', 'Flota de camiones tolva 8x4 de 20 m³'],
                imagen: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=800&auto=format&fit=crop'
              },
              {
                titulo: 'Habilitación y Montaje de Acero',
                detalles: ['Bancos de corte y doblado automatizados', 'Curvadoras industriales hasta Ø36mm', 'Camiones pluma para descarga y montaje en faena'],
                imagen: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop'
              },
              {
                titulo: 'Logística y Apoyo Operacional',
                detalles: ['Módulos habitacionales y comedores de faena', 'Generadores trifásicos de respaldo continuo', 'Talleres móviles de mantención preventiva'],
                imagen: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=800&auto=format&fit=crop'
              }
            ].map((infra, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-lg transition-all duration-300"
              >
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <Image 
                    src={infra.imagen} 
                    alt={infra.titulo} 
                    fill 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                </div>
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-[#007734] transition-colors">{infra.titulo}</h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {infra.detalles.map((det, dIdx) => (
                      <li key={dIdx} className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#007734] shrink-0" />
                        <span>{det}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. CAPITAL HUMANO Y ESPECIALIDAD */}
        <section className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xs">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <Users className="w-6 h-6 text-[#007734]" />
            <h2 className="text-2xl font-extrabold text-slate-900">Capital Humano y Cuadrillas Calificadas</h2>
          </div>
          
          <p className="text-slate-600 text-sm leading-relaxed max-w-4xl">
            La experiencia en faena la construyen las personas. Contamos con cuadrillas estables de maestros enfierradores de primera, operadores calificados de maquinaria pesada, capataces de amplia trayectoria y expertos en prevención de riesgos dedicados a la continuidad y seguridad en obra.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center pt-2">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <span className="block font-extrabold text-2xl text-slate-900">+25</span>
              <span className="text-xs text-slate-600 font-semibold uppercase mt-1 block">Supervisores y Capataces Técnicos</span>
            </div>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <span className="block font-extrabold text-2xl text-[#007734]">100%</span>
              <span className="text-xs text-slate-600 font-semibold uppercase mt-1 block">Trazabilidad Laboral y Libro DT</span>
            </div>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <span className="block font-extrabold text-2xl text-slate-900">+180</span>
              <span className="text-xs text-slate-600 font-semibold uppercase mt-1 block">Operarios y Maestros Enrolados</span>
            </div>
          </div>
        </section>

        {/* 6. ESTÁNDARES TÉCNICOS Y SEGURIDAD */}
        <section className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xs">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-[#007734] flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Estándares Técnicos y Normativa Vigente</h2>
            <p className="text-xs text-slate-500">
              Alineados con el marco regulatorio del Ministerio de Vivienda y Urbanismo, Dirección de Vialidad y Dirección del Trabajo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="block font-bold text-slate-900 text-sm">NCh204 / NCh430</span>
              <span className="text-xs text-slate-500">Normas Chilenas de Acero Estructural y Hormigón</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="block font-bold text-slate-900 text-sm">Protocolos MINSAL</span>
              <span className="text-xs text-slate-500">Planes de Vigilancia Ocupacional y Silicosis</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="block font-bold text-slate-900 text-sm">Certificado F30 / F30-1</span>
              <span className="text-xs text-slate-500">Cumplimiento Estricto de Leyes Sociales</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 text-center space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organismo Administrador de Ley 16.744</p>
            <p className="text-sm font-semibold text-slate-900">
              Empresa adherida a la <strong className="text-[#007734]">Mutual de Seguridad CChC</strong> con tasa de siniestralidad óptima y programas permanentes de prevención.
            </p>
          </div>
        </section>

        {/* 7. CTA DIRECTO */}
        <section className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-emerald-950">¿Necesitas cotizar partidas de subcontrato o maquinaria?</h3>
            <p className="text-xs text-emerald-800">Envíanos tus especificaciones técnicas para emitir una propuesta formal ajustada a obra.</p>
          </div>
          <Link
            href="/contacto"
            className="px-6 py-3 bg-[#007734] hover:bg-[#009B43] text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#00FF6F]" />
            <span>Solicitar Cotización</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

      </div>
    </div>
  );
}