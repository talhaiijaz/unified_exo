import { NextRequest, NextResponse } from "next/server"

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Nanotech Portal", charset="UTF-8"',
    },
  })
}

export function middleware(request: NextRequest) {
  const expectedUser = process.env.SITE_BASIC_AUTH_USER
  const expectedPassword = process.env.SITE_BASIC_AUTH_PASSWORD

  if (!expectedUser || !expectedPassword) {
    return NextResponse.next()
  }

  const header = request.headers.get("authorization")
  if (!header?.startsWith("Basic ")) {
    return unauthorized()
  }

  let decoded = ""
  try {
    decoded = atob(header.slice("Basic ".length))
  } catch {
    return unauthorized()
  }

  const separator = decoded.indexOf(":")
  if (separator === -1) {
    return unauthorized()
  }

  const user = decoded.slice(0, separator)
  const password = decoded.slice(separator + 1)

  if (user !== expectedUser || password !== expectedPassword) {
    return unauthorized()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
}
