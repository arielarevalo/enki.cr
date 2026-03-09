export function isValidSource(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Match domain.tld with optional path/query
  return /^[^\s/]+\.[^\s/]+/.test(trimmed);
}
