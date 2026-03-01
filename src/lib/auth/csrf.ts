const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

export function assertCsrf(request: Request): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && !ALLOWED_FETCH_SITES.has(secFetchSite)) {
    throw new Error("CSRF validation failed");
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  const originUrl = new URL(origin);
  const requestUrl = new URL(request.url);

  if (originUrl.protocol !== requestUrl.protocol || originUrl.host !== requestUrl.host) {
    throw new Error("CSRF validation failed");
  }
}
