'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileText, Mail, HardHat } from 'lucide-react';

function validarRutChileno(rutCompleto: string): boolean {
  const limpio = rutCompleto.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const resto = suma % 11;
  const dvEsperado = 11 - resto;

  let dvCalculado = '';
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();

  return dv === dvCalculado;
}

function formatearRut(valor: string): string {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length <= 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conPuntos}-${dv}`;
}

function validarEdadLaboral(fechaStr: string): { valido: boolean; mensaje?: string } {
  if (!fechaStr) return { valido: false, mensaje: 'Por favor, ingresa tu fecha de nacimiento.' };
  
  const nacimiento = new Date(fechaStr);
  const hoy = new Date();
  
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  if (edad < 18) {
    return { valido: false, mensaje: 'Debes ser mayor de 18 años para postular a faena.' };
  }
  if (edad > 75) {
    return { valido: false, mensaje: 'Ingresa una fecha de nacimiento válida.' };
  }
  return { valido: true };
}

export default function TrabajaConNosotrosPage() {
  const topRef = useRef<HTMLDivElement>(null);

  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudadComuna, setCiudadComuna] = useState('');

  const [afp, setAfp] = useState('');
  const [cotizaActualmente, setCotizaActualmente] = useState('');
  const [sistemaSalud, setSistemaSalud] = useState('');

  const [archivoCV, setArchivoCV] = useState<File | null>(null);

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState(false);
  const [correoConfirmado, setCorreoConfirmado] = useState('');
  const [cargando, setCargando] = useState(false);

  const resetearFormulario = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('borrador_postulacion');
    }
    setNombre('');
    setRut('');
    setFechaNacimiento('');
    setNacionalidad('');
    setEstadoCivil('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setCiudadComuna('');
    setAfp('');
    setCotizaActualmente('');
    setSistemaSalud('');
    setArchivoCV(null);
    setErrores({});
  };

  // Restaurar borrador de sessionStorage de forma asíncrona para evitar cascading renders
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const guardado = sessionStorage.getItem('borrador_postulacion');
        if (guardado) {
          const d = JSON.parse(guardado);
          if (d.nombre) setNombre(d.nombre);
          if (d.rut) setRut(d.rut);
          if (d.fechaNacimiento) setFechaNacimiento(d.fechaNacimiento);
          if (d.nacionalidad) setNacionalidad(d.nacionalidad);
          if (d.estadoCivil) setEstadoCivil(d.estadoCivil);
          if (d.telefono) setTelefono(d.telefono);
          if (d.email) setEmail(d.email);
          if (d.direccion) setDireccion(d.direccion);
          if (d.ciudadComuna) setCiudadComuna(d.ciudadComuna);
          if (d.afp) setAfp(d.afp);
          if (d.cotizaActualmente) setCotizaActualmente(d.cotizaActualmente);
          if (d.sistemaSalud) setSistemaSalud(d.sistemaSalud);
        }
      } catch (e) {
        console.error('Error al restaurar borrador', e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Guardar borrador reactivamente
  useEffect(() => {
    if (enviado) return;

    const tieneDatos = nombre || rut || fechaNacimiento || nacionalidad || direccion || email || telefono;
    if (!tieneDatos) return;

    const datosBorrador = {
      nombre, rut, fechaNacimiento, nacionalidad, estadoCivil,
      telefono, email, direccion, ciudadComuna, afp,
      cotizaActualmente, sistemaSalud
    };
    sessionStorage.setItem('borrador_postulacion', JSON.stringify(datosBorrador));
  }, [nombre, rut, fechaNacimiento, nacionalidad, estadoCivil, telefono, email, direccion, ciudadComuna, afp, cotizaActualmente, sistemaSalud, enviado]);

  const limpiarErrorCampo = (campo: string) => {
    if (errores[campo]) {
      setErrores((prev) => {
        const nuevos = { ...prev };
        delete nuevos[campo];
        return nuevos;
      });
    }
  };

  const handleRutInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRut(formatearRut(e.target.value));
    limpiarErrorCampo('rut');
  };

  const handleTelefonoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
    setTelefono(num);
    limpiarErrorCampo('telefono');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    limpiarErrorCampo('archivoCV');
    const file = e.target.files?.[0];

    if (file) {
      const extensionesValidas = /\.(pdf|docx|doc)$/i;
      const maxTamanoBytes = 10 * 1024 * 1024; // 10 MB exactos

      if (!extensionesValidas.test(file.name) || file.size > maxTamanoBytes) {
        setErrores((prev) => ({
          ...prev,
          archivoCV: 'Formato no permitido. Solo se aceptan archivos en PDF o Word de hasta 10 MB'
        }));
        setArchivoCV(null);
        e.target.value = '';
        return;
      }

      setArchivoCV(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nuevosErrores: Record<string, string> = {};

    const regexSoloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    if (!nombre.trim()) {
      nuevosErrores.nombre = 'Por favor, ingresa tu nombre completo.';
    } else if (!regexSoloLetras.test(nombre.trim())) {
      nuevosErrores.nombre = 'El nombre no debe contener números ni caracteres especiales.';
    } else if (nombre.trim().split(/\s+/).length < 2) {
      nuevosErrores.nombre = 'Por favor, ingresa al menos un nombre y un apellido.';
    }

    if (!rut.trim()) {
      nuevosErrores.rut = 'Por favor, ingresa el RUT.';
    } else if (!validarRutChileno(rut)) {
      nuevosErrores.rut = 'El RUT ingresado no es válido (revisa el dígito verificador).';
    }

    if (!fechaNacimiento) {
      nuevosErrores.fechaNacimiento = 'Por favor, selecciona tu fecha de nacimiento.';
    } else {
      const resEdad = validarEdadLaboral(fechaNacimiento);
      if (!resEdad.valido) {
        nuevosErrores.fechaNacimiento = resEdad.mensaje || 'Fecha inválida.';
      }
    }

    if (!nacionalidad.trim()) {
      nuevosErrores.nacionalidad = 'Por favor, ingresa tu nacionalidad.';
    } else if (!regexSoloLetras.test(nacionalidad.trim())) {
      nuevosErrores.nacionalidad = 'La nacionalidad solo debe contener letras.';
    }

    if (!estadoCivil) {
      nuevosErrores.estadoCivil = 'Por favor, selecciona tu estado civil.';
    }

    if (!telefono) {
      nuevosErrores.telefono = 'Por favor, ingresa tu teléfono.';
    } else if (telefono.length !== 9 || !telefono.startsWith('9')) {
      nuevosErrores.telefono = 'Debe tener 9 dígitos y comenzar con 9 (ej: 912345678).';
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      nuevosErrores.email = 'Por favor, ingresa tu correo electrónico.';
    } else if (!regexEmail.test(email.trim())) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido.';
    }

    if (!direccion.trim()) {
      nuevosErrores.direccion = 'Por favor, ingresa tu dirección.';
    } else if (direccion.trim().length < 5) {
      nuevosErrores.direccion = 'Ingresa una dirección completa (calle y número).';
    }

    if (!ciudadComuna.trim()) {
      nuevosErrores.ciudadComuna = 'Por favor, ingresa tu comuna o ciudad.';
    } else if (!regexSoloLetras.test(ciudadComuna.trim())) {
      nuevosErrores.ciudadComuna = 'La comuna no debe contener números.';
    }

    if (!afp) nuevosErrores.afp = 'Por favor, selecciona tu AFP.';
    if (!cotizaActualmente) nuevosErrores.cotizaActualmente = 'Por favor, selecciona una opción.';
    if (!sistemaSalud) nuevosErrores.sistemaSalud = 'Por favor, selecciona tu sistema de salud.';

    if (!archivoCV) {
      nuevosErrores.archivoCV = 'Es obligatorio adjuntar tu Currículum Vitae en PDF o Word para postular.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setCargando(true);
    const correoEnviadoDestino = email.trim().toLowerCase();

    try {
      const formData = new FormData();
      formData.append('file', archivoCV!);
      formData.append('rut', rut.trim());
      formData.append(
        'datos',
        JSON.stringify({
          rut: rut.trim(),
          nombre_completo: nombre.trim(),
          email: correoEnviadoDestino,
          telefono: `+56${telefono}`,
          fecha_nacimiento: fechaNacimiento,
          nacionalidad: nacionalidad.trim(),
          estado_civil: estadoCivil,
          direccion: direccion.trim(),
          ciudad_comuna: ciudadComuna.trim(),
          afp: afp,
          cotiza_actualmente: cotizaActualmente,
          sistema_salud: sistemaSalud,
        })
      );

      const respuesta = await fetch('/api/postulaciones', {
        method: 'POST',
        body: formData,
      });

      const textoRespuesta = await respuesta.text();
      let resultado: { error?: string } = {};
      try {
        resultado = textoRespuesta ? JSON.parse(textoRespuesta) : {};
      } catch {
        throw new Error(`Error en el servidor (${respuesta.status}): ${textoRespuesta || 'Sin respuesta'}`);
      }

      if (!respuesta.ok) {
        throw new Error(resultado.error || 'Ocurrió un error al enviar la postulación.');
      }

      setCorreoConfirmado(correoEnviadoDestino);
      resetearFormulario();
      setEnviado(true);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err: unknown) {
      setErrores({ 
        general: err instanceof Error ? err.message : 'Ocurrió un error al procesar tu postulación.' 
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
              <span>Procesos de Selección en Faena</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Trabaja con Nosotros</h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
              Únete a nuestro equipo operativo. Completa tus antecedentes para ingresar a los procesos de selección y contratos activos de la constructora.
            </p>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl p-8 md:p-10 shadow-xl">
          {enviado ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 md:p-10 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-[#007734] mx-auto" />
              <h2 className="text-2xl font-extrabold text-slate-900">Postulación recibida exitosamente</h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                Tus datos y currículum han sido registrados exitosamente en nuestro sistema de postulaciones.
              </p>

              <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-[#007734] px-4 py-2.5 rounded-lg text-xs font-semibold max-w-md mx-auto">
                <Mail className="w-4 h-4 text-[#007734] shrink-0" />
                <span>
                  Hemos enviado un comprobante de confirmación a{' '}
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
                  Enviar otra postulación
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {(errores.general || Object.keys(errores).length > 0) && (
                <div className="bg-red-50 border-l-4 border-red-600 text-red-900 p-4 rounded-r-lg flex items-start space-x-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <p className="text-sm font-semibold">
                    {errores.general || 'Por favor, revisa los campos marcados en rojo antes de continuar.'}
                  </p>
                </div>
              )}

              {/* SECCIÓN 1: DATOS PERSONALES */}
              <div>
                <h3 className="text-base font-bold border-b border-slate-200 pb-2 mb-6 text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#007734]" />
                  1. Datos Personales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelEstilo}>Nombre Completo *</label>
                    <input 
                      type="text" 
                      value={nombre} 
                      onChange={(e) => {
                        setNombre(e.target.value);
                        limpiarErrorCampo('nombre');
                      }} 
                      placeholder="Juan Alberto Pérez González" 
                      className={`${inputBase} ${errores.nombre ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`} 
                    />
                    {errores.nombre && <p className="text-xs text-red-600 font-medium mt-1">{errores.nombre}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>RUT del Trabajador *</label>
                    <input 
                      type="text" 
                      maxLength={12} 
                      value={rut} 
                      onChange={handleRutInput} 
                      placeholder="12.345.678-K" 
                      className={`${inputBase} ${errores.rut ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`} 
                    />
                    {errores.rut && <p className="text-xs text-red-600 font-medium mt-1">{errores.rut}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>Fecha de Nacimiento *</label>
                    <input 
                      type="date" 
                      value={fechaNacimiento} 
                      onChange={(e) => {
                        setFechaNacimiento(e.target.value);
                        limpiarErrorCampo('fechaNacimiento');
                      }} 
                      className={`${inputBase} ${errores.fechaNacimiento ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`} 
                    />
                    {errores.fechaNacimiento && <p className="text-xs text-red-600 font-medium mt-1">{errores.fechaNacimiento}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>Nacionalidad *</label>
                    <input 
                      type="text" 
                      value={nacionalidad} 
                      onChange={(e) => {
                        setNacionalidad(e.target.value);
                        limpiarErrorCampo('nacionalidad');
                      }} 
                      placeholder="Chilena" 
                      className={`${inputBase} ${errores.nacionalidad ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`} 
                    />
                    {errores.nacionalidad && <p className="text-xs text-red-600 font-medium mt-1">{errores.nacionalidad}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>Estado Civil *</label>
                    <select 
                      value={estadoCivil} 
                      onChange={(e) => {
                        setEstadoCivil(e.target.value);
                        limpiarErrorCampo('estadoCivil');
                      }} 
                      className={`${inputBase} ${errores.estadoCivil ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Soltero/a">Soltero/a</option>
                      <option value="Casado/a">Casado/a</option>
                      <option value="Divorciado/a">Divorciado/a</option>
                      <option value="Viudo/a">Viudo/a</option>
                    </select>
                    {errores.estadoCivil && <p className="text-xs text-red-600 font-medium mt-1">{errores.estadoCivil}</p>}
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

                  <div className="md:col-span-2">
                    <label className={labelEstilo}>Correo Electrónico *</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => {
                        setEmail(e.target.value);
                        limpiarErrorCampo('email');
                      }} 
                      placeholder="juan.perez@correo.cl" 
                      className={`${inputBase} ${errores.email ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`} 
                    />
                    {errores.email && <p className="text-xs text-red-600 font-medium mt-1">{errores.email}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>Dirección Completa *</label>
                    <input 
                      type="text" 
                      value={direccion} 
                      onChange={(e) => {
                        setDireccion(e.target.value);
                        limpiarErrorCampo('direccion');
                      }} 
                      placeholder="Av. Los Aromos 1234, Block B" 
                      className={`${inputBase} ${errores.direccion ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`} 
                    />
                    {errores.direccion && <p className="text-xs text-red-600 font-medium mt-1">{errores.direccion}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>Ciudad / Comuna *</label>
                    <input 
                      type="text" 
                      value={ciudadComuna} 
                      onChange={(e) => {
                        setCiudadComuna(e.target.value);
                        limpiarErrorCampo('ciudadComuna');
                      }} 
                      placeholder="Villa Alemana" 
                      className={`${inputBase} ${errores.ciudadComuna ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`} 
                    />
                    {errores.ciudadComuna && <p className="text-xs text-red-600 font-medium mt-1">{errores.ciudadComuna}</p>}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: PREVISIÓN Y SALUD */}
              <div>
                <h3 className="text-base font-bold border-b border-slate-200 pb-2 mb-6 text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#007734]" />
                  2. Previsión y Salud
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelEstilo}>Sistema Previsional AFP *</label>
                    <select 
                      value={afp} 
                      onChange={(e) => {
                        setAfp(e.target.value);
                        limpiarErrorCampo('afp');
                      }} 
                      className={`${inputBase} ${errores.afp ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                    >
                      <option value="">-- Seleccionar AFP --</option>
                      <option value="Capital">Capital</option>
                      <option value="Cuprum">Cuprum</option>
                      <option value="Habitat">Habitat</option>
                      <option value="PlanVital">PlanVital</option>
                      <option value="ProVida">ProVida</option>
                      <option value="Modelo">Modelo</option>
                      <option value="Uno">Uno (AFP Uno)</option>
                      <option value="No afiliado">No afiliado aún</option>
                    </select>
                    {errores.afp && <p className="text-xs text-red-600 font-medium mt-1">{errores.afp}</p>}
                  </div>

                  <div>
                    <label className={labelEstilo}>¿Cotiza Actualmente? *</label>
                    <select 
                      value={cotizaActualmente} 
                      onChange={(e) => {
                        setCotizaActualmente(e.target.value);
                        limpiarErrorCampo('cotizaActualmente');
                      }} 
                      className={`${inputBase} ${errores.cotizaActualmente ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="Si">Sí</option>
                      <option value="No">No</option>
                    </select>
                    {errores.cotizaActualmente && <p className="text-xs text-red-600 font-medium mt-1">{errores.cotizaActualmente}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelEstilo}>Sistema de Salud *</label>
                    <select 
                      value={sistemaSalud} 
                      onChange={(e) => {
                        setSistemaSalud(e.target.value);
                        limpiarErrorCampo('sistemaSalud');
                      }} 
                      className={`${inputBase} ${errores.sistemaSalud ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                    >
                      <option value="">-- Seleccionar Sistema de Salud --</option>
                      <option value="FONASA Tramo A">FONASA Tramo A</option>
                      <option value="FONASA Tramo B">FONASA Tramo B</option>
                      <option value="FONASA Tramo C">FONASA Tramo C</option>
                      <option value="FONASA Tramo D">FONASA Tramo D</option>
                      <option value="Banmédica">Banmédica</option>
                      <option value="Colmena">Colmena</option>
                      <option value="Cruz Blanca">Cruz Blanca</option>
                      <option value="Consalud">Consalud</option>
                      <option value="Esencial">Esencial</option>
                      <option value="MásVida">MásVida</option>
                      <option value="Vida Tres">Vida Tres</option>
                      <option value="Otra ISAPRE">Otra ISAPRE</option>
                    </select>
                    {errores.sistemaSalud && <p className="text-xs text-red-600 font-medium mt-1">{errores.sistemaSalud}</p>}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: CURRÍCULUM VITAE */}
              <div>
                <h3 className="text-base font-bold border-b border-slate-200 pb-2 mb-6 text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#007734]" />
                  3. Currículum Vitae
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className={labelEstilo}>Adjuntar Currículum (PDF / Word máx. 10MB) *</label>
                    <div className={`border-2 border-dashed rounded-xl p-8 bg-slate-50 text-center hover:bg-slate-100/70 transition-colors relative cursor-pointer ${
                      errores.archivoCV ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                    }`}>
                      <input 
                        type="file" 
                        accept=".pdf,.docx,.doc" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      />
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className={`w-8 h-8 ${errores.archivoCV ? 'text-red-500' : 'text-[#007734]'}`} />
                        {archivoCV ? (
                          <div className="flex items-center space-x-2 text-slate-900 font-medium">
                            <FileText className="w-5 h-5 text-slate-700" />
                            <span>{archivoCV.name}</span>
                            <span className="text-xs text-slate-500">
                              ({(archivoCV.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-800">Haz clic para adjuntar o arrastra tu archivo aquí</p>
                            <p className="text-xs text-slate-500">Formatos admitidos: .pdf, .docx, .doc (Máximo 10MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                    {errores.archivoCV && <p className="text-xs text-red-600 font-medium mt-1.5">{errores.archivoCV}</p>}
                  </div>
                </div>
              </div>

              {/* BOTÓN DE ENVÍO */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-4 bg-[#007734] hover:bg-[#009B43] text-white font-extrabold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  {cargando ? <span>Subiendo currículum y registrando postulación...</span> : <span>Enviar Postulación</span>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}