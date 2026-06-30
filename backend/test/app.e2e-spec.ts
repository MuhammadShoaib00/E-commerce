import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Order } from '../src/orders/schemas/order.schema';
import { Cart } from '../src/cart/schemas/cart.schema';
import { Product } from '../src/products/schemas/product.schema';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth & Products (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let accessToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGO_URI = mongod.getUri();
    process.env.JWT_SECRET = 'e2e-test-secret-key-0123456789';
    delete process.env.STRIPE_SECRET_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
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
        .send({
          name: 'E2E User',
          email: 'e2e@test.com',
          password: 'Password123',
        })
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

    it('returns 400 (not 500) for a malformed category id', () =>
      request(app.getHttpServer())
        .get('/api/products?category=not-a-valid-id')
        .expect(400));
  });

  describe('Order ownership', () => {
    it("does not let one customer read another customer's order", async () => {
      // User A (e2e@test.com) is already signed up. Find their id.
      const meA = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const userAId = meA.body.data._id;

      // Seed an order owned by A directly via the model.
      const orderModel = app.get<Model<Order>>(getModelToken(Order.name));
      const order = await orderModel.create({
        userId: new Types.ObjectId(userAId),
        items: [
          {
            productId: new Types.ObjectId(),
            name: 'Widget',
            price: 1000,
            quantity: 1,
          },
        ],
        totalAmount: 1000,
        status: 'pending',
        paymentRef: 'mock_e2e',
        shippingAddress: {},
      });

      // User B signs up and must NOT be able to read A's order.
      const signupB = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          name: 'User B',
          email: 'userb@test.com',
          password: 'Password123',
        })
        .expect(201);
      const tokenB = signupB.body.data.accessToken;

      await request(app.getHttpServer())
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      // Owner A can read it.
      await request(app.getHttpServer())
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /api/orders/checkout', () => {
    it('creates the order, decrements stock, and clears the cart in a Mongo transaction', async () => {
      const meA = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const userAId = meA.body.data._id;

      const productModel = app.get<Model<Product>>(getModelToken(Product.name));
      const cartModel = app.get<Model<Cart>>(getModelToken(Cart.name));
      const product = await productModel.create({
        name: 'Transactional Widget',
        description: 'E2E transaction product',
        price: 1500,
        imageUrl: 'https://example.com/widget.png',
        stockQuantity: 5,
      });
      await cartModel.create({
        userId: new Types.ObjectId(userAId),
        items: [{ productId: product._id, quantity: 2 }],
      });

      const res = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ street: '1 Test St', city: 'London', country: 'UK' })
        .expect(201);

      expect(res.body.data.totalAmount).toBe(3000);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.paymentRef).toMatch(/^mock_/);

      const updatedProduct = await productModel
        .findById(product._id)
        .lean()
        .exec();
      expect(updatedProduct?.stockQuantity).toBe(3);
      await expect(
        cartModel
          .findOne({ userId: new Types.ObjectId(userAId) })
          .lean()
          .exec(),
      ).resolves.toBeNull();
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
