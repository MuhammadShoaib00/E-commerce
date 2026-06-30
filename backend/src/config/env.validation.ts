/**
 * Boot-time environment validation. Fails loudly if required configuration is
 * missing or obviously unsafe, rather than silently falling back to insecure
 * defaults. Wired into ConfigModule.forRoot({ validate }).
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];

  const mongoUri = config.MONGO_URI as string | undefined;
  if (!mongoUri || !mongoUri.trim()) {
    errors.push('MONGO_URI is required');
  }

  const jwtSecret = config.JWT_SECRET as string | undefined;
  if (!jwtSecret || !jwtSecret.trim()) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters');
  }

  const port = config.PORT as string | undefined;
  if (port && Number.isNaN(Number(port))) {
    errors.push('PORT must be a number');
  }

  if (errors.length) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}\n` +
        'See backend/.env.example for the required variables.',
    );
  }

  return config;
}
