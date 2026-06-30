export default () => ({
  port: parseInt(process.env.PORT ?? '4001', 10),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/ecommerce',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Stripe test-mode secret key. When unset, payments fall back to a mock.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  currency: process.env.CURRENCY ?? 'usd',
});
