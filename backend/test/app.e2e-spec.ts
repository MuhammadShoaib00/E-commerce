import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth & Products (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let accessToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    process.env.JWT_SECRET = 'e2e-test-secret-key-0123456789';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    const conn = app.get<Connection>(getConnectionToken());
    await conn.close();
    await app.close();
    await mongod.stop();
  });

  describe('POST /api/auth/signup', () => {
    it('creates a customer and returns accessToken + user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ name: 'E2E User', email: 'e2e@test.com', password: 'Password123' })
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe('e2e@test.com');
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('returns 409 for duplicate email', () =>
      request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ name: 'Dup', email: 'e2e@test.com', password: 'Password123' })
        .expect(409));
  });

  describe('POST /api/auth/login', () => {
    it('returns token for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'e2e@test.com', password: 'Password123' })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      accessToken = res.body.data.accessToken;
    });

    it('returns 401 for wrong password', () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'e2e@test.com', password: 'WrongPass99' })
        .expect(401));
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', () =>
      request(app.getHttpServer()).get('/api/auth/me').expect(401));

    it('returns user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe('e2e@test.com');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /api/products', () => {
    it('returns paginated list on public route (no token needed)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .expect(200);

      expect(res.body.data).toHaveProperty('items');
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/admin/analytics', () => {
    it('returns 401 without token', () =>
      request(app.getHttpServer()).get('/api/admin/analytics').expect(401));

    it('returns 403 for customer token (not admin)', () =>
      request(app.getHttpServer())
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403));
  });
});
