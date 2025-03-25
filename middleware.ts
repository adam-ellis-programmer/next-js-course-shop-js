import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/', '/products(.*)', '/about'])
const isAdminRoute = createRouteMatcher(['/admin(.*)'])

// rest of the routes will now be restricted
export default clerkMiddleware((auth, req) => {
  //   console.log('AUTH-USER-->', auth().userId)
  const isAdminUser = auth().userId === process.env.ADMIN_USER_ID

  // protect admin routes
  if (isAdminRoute(req) && !isAdminUser) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  // protect all routes that are not public
  if (!isPublicRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
