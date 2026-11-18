let defaultApiBase = '';

export function setDefaultApiBase(base: string): void {
  defaultApiBase = base.replace(/\/$/, '');
}

export function getDefaultApiBase(): string {
  return defaultApiBase;
}

export function resolveApiBase(apiBase = ''): string {
  return (apiBase || defaultApiBase).replace(/\/$/, '');
}
