import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/home', '/sessions'];
const publicRoutes = [
  '/',
  '/signup',
  '/confirm-account',
  'forgot-password',
  'reset-password',
  '/verify-mfa',
];

export default async function authMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const accessToken = req.cookies.get('acessToken')?.value;

  const isProtectedRoute = protectedRoutes.includes(pathname);
  const isPublicRoute = publicRoutes.includes(pathname);

  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  if (isPublicRoute && accessToken) {
    return NextResponse.redirect(new URL('/home', req.nextUrl));
  }

  return NextResponse.next();
}
