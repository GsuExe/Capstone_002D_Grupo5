'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileText, Mail, HardHat, Send } from 'lucide-react';

export default function ContactoCotizacionPage() {
  const topRef = useRef<HTMLDivElement>(null);

  const [nombreCliente, setNombreCliente] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [tipoPartida, setTipoPartida] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState(false);
  const [correoConfirmado, setCorreoConfirmado] = useState('');
  const [cargando, setCargando] = useState(false);

  const resetearFormulario = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('borrador_cotizacion_v2');
    }
    setNombreCliente('');
    setEmpresa('');
    setTelefono('');
    setEmail('');
    setTipoPartida('');
    setMensaje('');
    setArchivoAdjunto(null);
    setErrores({});
  };

  // Restaurar borrador de sessionStorage de forma asíncrona para evitar cascading renders
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const guardado = sessionStorage.getItem('borrador_cotizacion_v2');
        if (guardado) {
          const d = JSON.parse(guardado);
          if (d.nombreCliente) setNombreCliente(d.nombreCliente);
          if (d.empresa) setEmpresa(d.empresa);
          if (d.telefono) setTelefono(d.telefono);
          if (d.email) setEmail(d.email);
          if (d.tipoPartida) setTipoPartida(d.tipoPartida);
          if (d.mensaje) setMensaje(d.mensaje);
        }
      } catch (e) {
        console.error('Error al restaurar borrador', e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Guardar en sessionStorage cuando cambian los valores
  useEffect(() => {
    if (enviado) return;
    const tieneDatos = nombreCliente || empresa || telefono || email || tipoPartida || mensaje;
    if (!tieneDatos) return;

    const datos = { nombreCliente, empresa, telefono, email, tipoPartida, mensaje };
    sessionStorage.setItem('borrador_cotizacion_v2', JSON.stringify(datos));
  }, [nombreCliente, empresa, telefono, email, tipoPartida, mensaje, enviado]);

  const limpiarErrorCampo = (campo: string) => {
    if (errores[campo]) {
      setErrores((prev) => {
        const nuevos = { ...prev };
        delete nuevos[campo];
        return nuevos;
      });
    }
  };

  const handleTelefonoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
    setTelefono(num);
    limpiarErrorCampo('telefono');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    limpiarErrorCampo('archivoAdjunto');
    const file = e.target.files?.[0];

    if (file) {
      const extensionesValidas = /\.(pdf|dwg|zip)$/i;
      const maxTamanoBytes = 25 * 1024 * 1024; // 25 MB

      if (!extensionesValidas.test(file.name) || file.size > maxTamanoBytes) {
        setErrores((prev) => ({
          ...prev,
          archivoAdjunto: 'El archivo no cumple con el formato o tamaño máximo permitido',
        }));
        setArchivoAdjunto(null);
        e.target.value = '';
        return;
      }
      setArchivoAdjunto(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nuevosErrores: Record<string, string> = {};

    if (!nombreCliente.trim()) {
      nuevosErrores.nombreCliente = 'Por favor, ingresa tu nombre de contacto.';
    }

    if (!telefono.trim()) {
      nuevosErrores.telefono = 'Por favor, ingresa un teléfono de contacto.';
    } else if (telefono.length !== 9 || !telefono.startsWith('9')) {
      nuevosErrores.telefono = 'Debe tener 9 dígitos y comenzar con 9 (ej: 912345678).';
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      nuevosErrores.email = 'Por favor, ingresa tu correo electrónico.';
    } else if (!regexEmail.test(email.trim())) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido.';
    }

    if (!tipoPartida) {
      nuevosErrores.tipoPartida = 'Por favor, selecciona el tipo de partida a cotizar.';
    }

    if (!mensaje.trim()) {
      nuevosErrores.mensaje = 'Por favor, describe los requerimientos o detalles de la obra.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setCargando(true);
    const destinoEmail = email.trim().toLowerCase();

    try {
      const formData = new FormData();
      if (archivoAdjunto) {
        formData.append('file', archivoAdjunto);
      }
      formData.append(
        'datos',
        JSON.stringify({
          nombre_cliente: nombreCliente.trim(),
          empresa: empresa.trim() || null,
          telefono: `+56${telefono}`,
          email: destinoEmail,
          tipo_partida: tipoPartida,
          mensaje: mensaje.trim(),
        })
      );

      const res = await fetch('/api/cotizaciones', {
        method: 'POST',
        body: formData,
      });

      const textoRespuesta = await res.text();
      let resultado: { error?: string } = {};
      try {
        resultado = textoRespuesta ? JSON.parse(textoRespuesta) : {};
      } catch {
        throw new Error(`Error en el servidor (${res.status}): ${textoRespuesta || 'Sin respuesta'}`);
      }

      if (!res.ok) {
        throw new Error(resultado.error || 'Ocurrió un error al procesar tu solicitud.');
      }

      setCorreoConfirmado(destinoEmail);
      resetearFormulario();
      setEnviado(true);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err: unknown) {
      setErrores({ 
        general: err instanceof Error ? err.message : 'Error al enviar la solicitud de cotización.' 
      });
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setCargando(false);
    }
  };

  const inputBase = "w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#007734] focus:ring-2 focus:ring-[#007734]/20 transition-all text-sm";
  const labelEstilo = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2";

  return (
    <div className="bg-[#F8FAF9] min-h-screen py-12 px-6" ref={topRef}>
      <div className="max-w-4xl mx-auto">
        
        {/* ENCABEZADO */}
        <div className="bg-slate-900 text-white rounded-t-2xl p-8 md:p-10 shadow-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#00FF6F_1px,transparent_1px)] bg-size-[16px_16px]" />
          
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-2 bg-[#007734]/40 border border-[#009B43]/60 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#A4FFCC]">
              <HardHat className="w-4 h-4 text-[#00FF6F]" />
              <span>Cubicación y Presupuestos Técnicos</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Contacto y Presupuestos</h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
              Cotiza partidas de enfierradura estructural, movimientos de tierra u obras civiles directamente. Nuestro equipo técnico evaluará tus antecedentes para emitir el presupuesto correspondiente.
            </p>
          </div>
        </div>

        {/* CONTENEDOR DEL FORMULARIO */}
        <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl p-8 md:p-10 shadow-xl">
          {enviado ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 md:p-10 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-[#007734] mx-auto" />
              <h2 className="text-2xl font-extrabold text-slate-900">Su solicitud de cotización ha sido enviada exitosamente</h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                Hemos recibido tu solicitud técnica. Nuestro departamento de cubicación y presupuestos evaluará los antecedentes.
              </p>

              <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-[#007734] px-4 py-2.5 rounded-lg text-xs font-semibold max-w-md mx-auto">
                <Mail className="w-4 h-4 text-[#007734] shrink-0" />
                <span>
                  Hemos enviado un comprobante a{' '}
                  <strong className="font-bold text-slate-900">
                    {correoConfirmado || 'tu correo electrónico'}
                  </strong>.
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setEnviado(false);
                    resetearFormulario();
                  }}
                  className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm cursor-pointer"
                >
                  Enviar otra solicitud
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {(errores.general || Object.keys(errores).length > 0) && (
                <div className="bg-red-50 border-l-4 border-red-600 text-red-900 p-4 rounded-r-lg flex items-start space-x-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <p className="text-sm font-semibold">
                    {errores.general || 'Por favor, revisa los campos requeridos marcados en rojo.'}
                  </p>
                </div>
              )}

              {/* SECCIÓN 1: DATOS DE CONTACTO */}
              <div>
                <h3 className="text-base font-bold border-b border-slate-200 pb-2 mb-6 text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#007734]" />
                  1. Información de Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelEstilo}>Nombre de Contacto *</label>
                    <input
                      type="text"
                      value={nombreCliente}
                      onChange={(e) => {
                        setNombreCliente(e.target.value);
                        limpiarErrorCampo('nombreCliente');
                      }}
                      placeholder="Ej. Juan Pérez"
                      className={`${inputBase} ${errores.nombreCliente ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                    />
                    {errores.nombreCliente && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errores.nombreCliente}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelEstilo}>Empresa o Razón Social (Opcional)</label>
                    <input
                      type="text"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Ej. Constructora Sur SpA"
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelEstilo}>Teléfono Móvil (9 dígitos) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-sm text-slate-500 font-semibold">+56</span>
                      <input
                        type="tel"
                        maxLength={9}
                        value={telefono}
                        onChange={handleTelefonoInput}
                        placeholder="912345678"
                        className={`${inputBase} pl-14 ${errores.telefono ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                      />
                    </div>
                    {errores.telefono && <p className="text-xs text-red-600 font-medium mt-1">{errores.telefono}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>Correo Electrónico *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        limpiarErrorCampo('email');
                      }}
                      placeholder="contacto@empresa.com"
                      className={`${inputBase} ${errores.email ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                    />
                    {errores.email && <p className="text-xs text-red-600 font-medium mt-1">{errores.email}</p>}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DETALLES DE LA FAENA */}
              <div>
                <h3 className="text-base font-bold border-b border-slate-200 pb-2 mb-6 text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#007734]" />
                  2. Requerimientos de la Obra
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className={labelEstilo}>Tipo de Partida a Cotizar *</label>
                    <select
                      value={tipoPartida}
                      onChange={(e) => {
                        setTipoPartida(e.target.value);
                        limpiarErrorCampo('tipoPartida');
                      }}
                      className={`${inputBase} ${errores.tipoPartida ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                    >
                      <option value="">-- Selecciona una opción --</option>
                      <option value="Enfierradura">Enfierradura</option>
                      <option value="Movimiento de Tierras y Excavación">Movimiento de Tierras y Excavación</option>
                      <option value="Obras Civiles y Hormigón">Obras Civiles y Hormigón</option>
                      <option value="Terminaciones y Albañilería">Terminaciones y Albañilería</option>
                      <option value="Subcontrato Integral de Obra">Subcontrato Integral de Obra</option>
                      <option value="Otra Especialidad">Otra Especialidad</option>
                    </select>
                    {errores.tipoPartida && <p className="text-xs text-red-600 font-medium mt-1">{errores.tipoPartida}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>Detalles del Proyecto *</label>
                    <textarea
                      rows={4}
                      value={mensaje}
                      onChange={(e) => {
                        setMensaje(e.target.value);
                        limpiarErrorCampo('mensaje');
                      }}
                      placeholder="Describe brevemente los requerimientos técnicos, cubicación estimada, ubicación de la obra y plazos de ejecución..."
                      className={`${inputBase} ${errores.mensaje ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''} resize-none`}
                    />
                    {errores.mensaje && <p className="text-xs text-red-600 font-medium mt-1">{errores.mensaje}</p>}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: PLANOS Y ESPECIFICACIONES */}
              <div>
                <h3 className="text-base font-bold border-b border-slate-200 pb-2 mb-6 text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#007734]" />
                  3. Planos y Especificaciones Técnicas (Opcional)
                </h3>
                <div>
                  <label className={labelEstilo}>Adjuntar Planos o Especificaciones (PDF, DWG o ZIP máx. 25MB)</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 bg-slate-50 text-center hover:bg-slate-100/70 transition-colors relative cursor-pointer ${
                      errores.archivoAdjunto ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.dwg,.zip"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className={`w-8 h-8 ${errores.archivoAdjunto ? 'text-red-500' : 'text-[#007734]'}`} />
                      {archivoAdjunto ? (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-slate-900 font-medium">
                          <div className="flex items-center space-x-1.5">
                            <FileText className="w-5 h-5 text-slate-700" />
                            <span>{archivoAdjunto.name}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-200 px-2.5 py-1 rounded-md font-semibold">
                            <span className="uppercase">.{archivoAdjunto.name.split('.').pop()}</span>
                            <span>•</span>
                            <span>{(archivoAdjunto.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-800">Haz clic para adjuntar o arrastra tu archivo aquí</p>
                          <p className="text-xs text-slate-500">Formatos permitidos: .pdf, .dwg, .zip (Máximo 25 MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                  {errores.archivoAdjunto && (
                    <p className="text-xs text-red-600 font-medium mt-1.5">{errores.archivoAdjunto}</p>
                  )}
                </div>
              </div>

              {/* BOTÓN DE ACCIÓN */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-4 bg-[#007734] hover:bg-[#009B43] text-white font-extrabold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {cargando ? <span>Procesando solicitud de cotización...</span> : <span>Enviar cotización</span>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}