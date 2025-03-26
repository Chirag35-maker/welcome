import { createCookieSessionStorage } from "@remix-run/node";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "selectedCountries",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"], // In production, use a proper secret
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getSession(request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function commitSession(session) {
  return sessionStorage.commitSession(session);
} 