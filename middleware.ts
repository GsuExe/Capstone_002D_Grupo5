// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Crear una respuesta base para poder inyectarle cookies actualizadas si el token se refresca
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Instanciar el cliente de Supabase para Servidor/Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Obtener el usuario autenticado (verifica la validez y vigencia del JWT)
  const { data: { user } } = await supabase.auth.getUser();

  // Criterio 3: Bloquear el acceso a rutas /admin si no hay un JWT válido
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      // Redirige al login bloqueando el acceso directo
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Si el administrador ya está logeado e intenta entrar al /login, lo devolvemos al panel
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return response;
}

// Configurar en qué rutas debe ejecutarse este middleware para optimizar el rendimiento
export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto:
     * - Archivos estáticos (_next/static, _next/image, favicon.ico)
     * - Imágenes y assets (.*\\.(?:svg|png|jpg|jpeg|gif|webp)$)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};