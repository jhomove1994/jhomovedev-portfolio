/** A readable link label from a URL: no scheme, no leading `www.`, no query, hash or trailing slash. */
export function displayUrl(value: string): string {
  try {
    const { host, pathname } = new URL(value);
    return `${host.replace(/^www\./, '')}${pathname}`.replace(/\/+$/, '');
  } catch {
    return value;
  }
}
