# PCGA Álvarez - Aplicación Web y Panel de Gestión (Next.js)

Módulo principal de la plataforma web corporativa y administrativa para la empresa contratista Carlos Álvarez Villar, desarrollado con Next.js (App Router), TypeScript y Tailwind CSS.

---

## 🌐 Despliegue en Producción

La plataforma se encuentra desplegada y disponible para pruebas en:
- **Frontend (Vercel):** [https://pcga-alvarez.vercel.app](https://pcga-alvarez.vercel.app/)
- **Base de Datos & Auth:** Supabase Cloud (Región sa-east-1)

---

## 🛠️ Dependencias y Librerías del Sistema

El proyecto utiliza las siguientes librerías especializadas para su funcionamiento:

- `lucide-react`: Iconografía responsiva para el panel administrativo, indicadores y tablas.
- `@supabase/supabase-js` y `@supabase/ssr`: Cliente oficial de conexión relacional a PostgreSQL, manejo de sesiones y cookies SSR, autenticación JWT y almacenamiento de archivos.
- `nodemailer` y `@types/nodemailer`: Servicio de envío automatizado de correos electrónicos para confirmación de postulaciones laborales y solicitudes de presupuesto.
- `xlsx`: Procesamiento, consolidación y exportación de planillas de asistencia mensual con formato oficial exigido por la Dirección del Trabajo (DT).

---

## 🚀 Instalación y Puesta en Marcha Local

### 1. Instalar dependencias del proyecto:
```bash
npm install
```

*(En caso de requerir instalación manual de las librerías principales):*
```bash
npm install lucide-react @supabase/supabase-js @supabase/ssr nodemailer xlsx
npm install -D @types/nodemailer
```

### 2. Configurar variables de entorno:
Crea o verifica el archivo `.env.local` en la raíz de esta aplicación:
```env
NEXT_PUBLIC_SUPABASE_URL=nuestro_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=nuestro_supabase_anon_key
EMAIL_USER=nuestro_correo@gmail.com
EMAIL_PASS=nuestro_app_password
```

### 3. Ejecutar servidor de desarrollo:
```bash
npm run dev
```

Disponible en el navegador en: [http://localhost:3000](http://localhost:3000)

---

## 📂 Estructura de Rutas Principales

- `/` (Portal Público): Presentación institucional, catálogo de maquinaria y portafolio de obras.
- `/contacto` y `/trabaja_con_nosotros`: Formularios de cotización para mandantes y postulación laboral para operarios.
- `/login`: Acceso protegido para administradores mediante autenticación JWT.
- `/admin`: Dashboard central con métricas operativas y accesos directos.
- `/admin/faenas`: Administración de obras civiles, comunas/regiones y control de estados (Activa, Suspendida, Finalizada).
- `/admin/asistencia`: Libro Digital de Asistencias, registro de jornadas y exportación de libro sellado DT.
- `/admin/finiquito_liquidaciones`: Motor de cálculo mensual de remuneraciones y propuestas de finiquito (Art. 159 y 161).
- `/admin/trabajadores`: Nómina del personal activo, antecedentes contractuales y datos previsionales.