type EnvSource = Record<string, string | undefined>;

export function readRequiredEnv(name: string, source: EnvSource = process.env): string {
  const value = source[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function readOptionalEnv(
  name: string,
  fallback: string,
  source: EnvSource = process.env
): string {
  return source[name] ?? fallback;
}

export function readPortEnv(
  name: string,
  fallback: number,
  source: EnvSource = process.env
): number {
  const rawValue = source[name];

  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return value;
}
