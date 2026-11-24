import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Sends "/" (and any path without a locale) to /en or /pt, using the
// browser's Accept-Language header and a remembered choice.
export default createMiddleware(routing);

export const config = {
  // Skip the API, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
