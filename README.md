# PCGA Álvarez - Plataforma Web Corporativa y de Gestión Administrativa
**Proyecto Capstone (002D - Grupo 5)**  
Solución web integral para la empresa contratista en enfierradura *Carlos Álvarez Villar*, orientada a la captación comercial y al control operativo de faenas, asistencias y remuneraciones conforme a la normativa laboral chilena (DT).

---

## 🛠️ Stack Tecnológico y Librerías Clave

- `Next.js` (React, TypeScript) + `Tailwind CSS`: Núcleo de la plataforma y diseño responsivo.
- `lucide-react`: Iconografía para el panel administrativo, indicadores y tablas.
- `@supabase/supabase-js` y `@supabase/ssr`: Conexión relacional a PostgreSQL, manejo de sesiones/cookies SSR, autenticación JWT y almacenamiento en buckets.
- `nodemailer` y `@types/nodemailer`: Servicio automatizado para confirmación por correo de postulaciones y cotizaciones.
- `xlsx`: Generación, procesamiento y exportación de la planilla oficial del Libro de Asistencias DT.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar repositorio y acceder a la carpeta:
```bash
git clone <URL_DEL_REPOSITORIO>
cd Capstone_002D_Grupo5
```

### 2. Instalar dependencias del proyecto:
```bash
npm install
```

*(En caso de requerir instalación manual de las dependencias clave)*:
```bash
npm install lucide-react @supabase/supabase-js @supabase/ssr nodemailer xlsx
npm install -D @types/nodemailer
```

### 3. Configuración de Variables de Entorno:
Crea un archivo `.env.local` en la raíz del proyecto (basado en `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_app_password
```

### 4. Iniciar servidor de desarrollo:
```bash
npm run dev
```

Disponible en el navegador en: [http://localhost:3000](http://localhost:3000)

---

## 📦 Módulos Principales (Hito 2)

- **Portal Público:** Portafolio técnico de obras, catálogo de maquinaria pesada, cotizaciones y formulario de postulación laboral.
- **Gestión de Faenas:** Control de obras con estados (`EN_EJECUCION`, `SUSPENDIDA`, `FINALIZADA`), desglose geográfico (comuna y región) y bloqueos operativos.
- **Libro Digital de Asistencias:** Registro de marcas diarias, jornada ordinaria/extra, inasistencias/licencias y exportación consolidada en Excel con formato y sellado DT.
- **Remuneraciones y Finiquitos:** Cálculo legal automatizado según parámetros vigentes (UF, UTM, sueldo mínimo, tasas AFP) y emisión de propuestas de finiquito (Art. 159 y 161).

---

## 👥 Equipo de Trabajo

- **Jesús Bustamante Sandoval** — Scrum Master / Arquitectura Cloud
- **Juakin Fredes Tapia** — Development Team (Backend & Base de Datos)
- **Antonia Sanhueza Parraguez** — Development Team (Frontend & UI)