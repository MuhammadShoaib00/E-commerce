import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/ecommerce';
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Inline schemas (avoids NestJS DI; mirrors the app schemas exactly)
// ---------------------------------------------------------------------------

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  },
  { timestamps: true },
);

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
  },
  { timestamps: true },
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }, // stored in cents
    imageUrl: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

const CartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const CartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true },
);

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentRef: { type: String, required: true },
    shippingAddress: {
      street: String,
      city: String,
      country: String,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

async function seed() {
  console.log('Connecting to MongoDB at', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  const UserModel = mongoose.model('User', UserSchema);
  const CategoryModel = mongoose.model('Category', CategorySchema);
  const ProductModel = mongoose.model('Product', ProductSchema);
  const CartModel = mongoose.model('Cart', CartSchema);
  const OrderModel = mongoose.model('Order', OrderSchema);

  // Clear all collections (idempotent)
  await Promise.all([
    UserModel.deleteMany({}),
    CategoryModel.deleteMany({}),
    ProductModel.deleteMany({}),
    CartModel.deleteMany({}),
    OrderModel.deleteMany({}),
  ]);
  console.log('Cleared existing data.');

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const [adminHash, customerHash, customer2Hash] = await Promise.all([
    bcrypt.hash('Admin@123', BCRYPT_ROUNDS),
    bcrypt.hash('Customer@123', BCRYPT_ROUNDS),
    bcrypt.hash('Jane@123', BCRYPT_ROUNDS),
  ]);

  const [admin, customer, customer2] = await Promise.all([
    UserModel.create({ email: 'admin@shop.com', passwordHash: adminHash, name: 'Admin User', role: 'admin' }),
    UserModel.create({ email: 'customer@shop.com', passwordHash: customerHash, name: 'Alex Johnson', role: 'customer' }),
    UserModel.create({ email: 'jane@shop.com', passwordHash: customer2Hash, name: 'Jane Smith', role: 'customer' }),
  ]);
  console.log('Created 3 users (1 admin, 2 customers).');

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  const categories = await CategoryModel.insertMany([
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Books', slug: 'books' },
    { name: 'Home & Garden', slug: 'home-garden' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Beauty', slug: 'beauty' },
    { name: 'Toys & Games', slug: 'toys-games' },
  ]);

  const [electronics, clothing, books, homeGarden, sports, beauty, toys] =
    categories;
  console.log(`Created ${categories.length} categories.`);

  // -------------------------------------------------------------------------
  // Products (prices in cents)
  // -------------------------------------------------------------------------
  const products = await ProductModel.insertMany([
    // Electronics
    {
      name: 'Wireless Noise-Cancelling Headphones',
      description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio for music and calls.',
      price: 19999,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      category: electronics._id,
      stockQuantity: 45,
    },
    {
      name: 'Mechanical Keyboard',
      description: 'Compact tenkeyless mechanical keyboard with Cherry MX switches, RGB backlighting, and PBT keycaps.',
      price: 12999,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
      category: electronics._id,
      stockQuantity: 30,
    },
    {
      name: '4K Webcam',
      description: 'Ultra HD webcam with autofocus, built-in stereo mic, and wide-angle lens — perfect for remote work and streaming.',
      price: 8999,
      imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=500',
      category: electronics._id,
      stockQuantity: 22,
    },
    {
      name: 'Portable Bluetooth Speaker',
      description: 'Waterproof portable speaker with 360° sound, 24-hour playtime, and rugged design for outdoor adventures.',
      price: 7499,
      imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
      category: electronics._id,
      stockQuantity: 60,
    },
    {
      name: 'Smart LED Desk Light',
      description: 'App-controlled LED desk light with 16 million colors, sync-to-music mode, and USB-C power delivery.',
      price: 5999,
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500',
      category: electronics._id,
      stockQuantity: 35,
    },
    // Clothing
    {
      name: 'Classic Oxford Button-Down Shirt',
      description: 'Timeless slim-fit Oxford shirt in 100% cotton. Available in multiple colors, wrinkle-resistant finish.',
      price: 4999,
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
      category: clothing._id,
      stockQuantity: 120,
    },
    {
      name: 'Premium Slim-Fit Chinos',
      description: 'Versatile stretch chinos with a modern slim fit. Wear them to the office or weekend outings.',
      price: 6499,
      imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500',
      category: clothing._id,
      stockQuantity: 80,
    },
    {
      name: 'Lightweight Running Jacket',
      description: 'Wind and water-resistant running jacket with reflective strips, packable design, and breathable mesh lining.',
      price: 8999,
      imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500',
      category: clothing._id,
      stockQuantity: 40,
    },
    {
      name: 'Merino Wool Crew-Neck Sweater',
      description: 'Soft, itch-free merino wool sweater. Temperature-regulating, machine washable, and naturally odor-resistant.',
      price: 7999,
      imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500',
      category: clothing._id,
      stockQuantity: 55,
    },
    // Books
    {
      name: 'The Art of Clean Code',
      description: 'A practical guide to writing readable, maintainable software. Essential reading for every developer.',
      price: 2999,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
      category: books._id,
      stockQuantity: 200,
    },
    {
      name: 'System Design Interview',
      description: "An insider's guide to large-scale system design. Covers distributed systems, databases, and scalability patterns.",
      price: 3499,
      imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=500',
      category: books._id,
      stockQuantity: 150,
    },
    {
      name: 'Deep Work',
      description: "Rules for focused success in a distracted world. Cal Newport's manifesto for professional excellence.",
      price: 1999,
      imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500',
      category: books._id,
      stockQuantity: 175,
    },
    {
      name: 'Atomic Habits',
      description: 'An easy and proven way to build good habits and break bad ones. Over 10 million copies sold.',
      price: 1799,
      imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500',
      category: books._id,
      stockQuantity: 180,
    },
    // Home & Garden
    {
      name: 'Ergonomic Desk Lamp',
      description: 'LED desk lamp with adjustable color temperature, touch dimming, USB charging port, and eye-care technology.',
      price: 5499,
      imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500',
      category: homeGarden._id,
      stockQuantity: 55,
    },
    {
      name: 'Indoor Plant Starter Kit',
      description: 'Everything you need to grow herbs and succulents indoors. Includes pots, soil, seeds, and a care guide.',
      price: 3299,
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500',
      category: homeGarden._id,
      stockQuantity: 90,
    },
    {
      name: 'Scented Soy Candle Set',
      description: 'Set of 4 hand-poured soy wax candles in seasonal scents. Clean burn, 45 hours per candle.',
      price: 2899,
      imageUrl: 'https://images.unsplash.com/photo-1608181831718-c9fbb3e0e21a?w=500',
      category: homeGarden._id,
      stockQuantity: 110,
    },
    // Sports
    {
      name: 'Yoga Mat Pro',
      description: 'Extra-thick non-slip yoga mat with alignment lines, carrying strap, and eco-friendly TPE material.',
      price: 4799,
      imageUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=500',
      category: sports._id,
      stockQuantity: 70,
    },
    {
      name: 'Adjustable Resistance Bands Set',
      description: 'Set of 5 resistance bands for strength training, physiotherapy, and stretching. Includes door anchor and carry bag.',
      price: 2499,
      imageUrl: 'https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?w=500',
      category: sports._id,
      stockQuantity: 100,
    },
    {
      name: 'Smart Water Bottle',
      description: 'Vacuum-insulated stainless steel bottle with hydration reminders, temperature display, and 24-hour cold retention.',
      price: 3999,
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500',
      category: sports._id,
      stockQuantity: 85,
    },
    {
      name: 'Running Shoe Insoles',
      description: 'Orthopedic gel insoles with arch support and shock absorption. Fits all running shoe sizes.',
      price: 1999,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
      category: sports._id,
      stockQuantity: 140,
    },
    // More Electronics
    {
      name: 'Wireless Charging Pad',
      description: 'Slim 15W Qi wireless charger with anti-slip surface and over-temperature protection. Charges through most cases.',
      price: 2999,
      imageUrl: 'https://images.unsplash.com/photo-1591290619762-c588edddc7ee?w=500',
      category: electronics._id,
      stockQuantity: 75,
    },
    {
      name: 'Smartwatch Series X',
      description: 'Fitness-focused smartwatch with heart-rate, SpO2, GPS, and a 7-day battery. Always-on AMOLED display.',
      price: 24999,
      imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
      category: electronics._id,
      stockQuantity: 38,
    },
    {
      name: 'USB-C Hub 7-in-1',
      description: 'Expand one USB-C port into HDMI 4K, 3× USB-A, SD/microSD, and 100W passthrough charging.',
      price: 4599,
      imageUrl: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500',
      category: electronics._id,
      stockQuantity: 64,
    },
    // More Clothing
    {
      name: 'Canvas Low-Top Sneakers',
      description: 'Everyday canvas sneakers with a cushioned footbed and durable vulcanised rubber sole.',
      price: 5499,
      imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500',
      category: clothing._id,
      stockQuantity: 90,
    },
    {
      name: 'Leather Weekender Bag',
      description: 'Full-grain leather duffel with a padded laptop sleeve and detachable shoulder strap. Carry-on friendly.',
      price: 13999,
      imageUrl: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=500',
      category: clothing._id,
      stockQuantity: 25,
    },
    {
      name: 'Classic Aviator Sunglasses',
      description: 'Polarised aviators with UV400 protection and a lightweight metal frame. Includes a hard case.',
      price: 3499,
      imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
      category: clothing._id,
      stockQuantity: 110,
    },
    // More Books
    {
      name: 'Pragmatic Thinking & Learning',
      description: 'Refactor your wetware — practical techniques to learn faster and think more effectively as a developer.',
      price: 2799,
      imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500',
      category: books._id,
      stockQuantity: 95,
    },
    {
      name: 'The Pragmatic Programmer',
      description: 'Your journey to mastery. Timeless tips on craftsmanship, automation, and pragmatic software design.',
      price: 3999,
      imageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500',
      category: books._id,
      stockQuantity: 130,
    },
    // More Home & Garden
    {
      name: 'Ceramic Pour-Over Coffee Set',
      description: 'Hand-glazed ceramic dripper with a matching 600ml carafe. Brews a clean, balanced cup.',
      price: 4299,
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500',
      category: homeGarden._id,
      stockQuantity: 60,
    },
    {
      name: 'Linen Throw Blanket',
      description: 'Stonewashed 100% linen throw — breathable, soft, and gets better with every wash. 130×170cm.',
      price: 5999,
      imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?w=500',
      category: homeGarden._id,
      stockQuantity: 48,
    },
    // More Sports
    {
      name: 'Adjustable Dumbbell 24kg',
      description: 'Space-saving adjustable dumbbell — dial from 2.5kg to 24kg in seconds. Sold individually.',
      price: 17999,
      imageUrl: 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=500',
      category: sports._id,
      stockQuantity: 30,
    },
    {
      name: 'Insulated Sports Backpack',
      description: '28L weatherproof backpack with an insulated cooler pocket, laptop sleeve, and ventilated back panel.',
      price: 6999,
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
      category: sports._id,
      stockQuantity: 52,
    },
    // Beauty
    {
      name: 'Vitamin C Brightening Serum',
      description: '15% vitamin C with hyaluronic acid and vitamin E. Brightens, hydrates, and evens skin tone. 30ml.',
      price: 2899,
      imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      category: beauty._id,
      stockQuantity: 120,
    },
    {
      name: 'Bamboo Charcoal Face Mask Set',
      description: 'Set of 5 detoxifying sheet masks that purify pores and leave skin refreshed and soft.',
      price: 1599,
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
      category: beauty._id,
      stockQuantity: 160,
    },
    {
      name: 'Natural Bristle Hair Brush',
      description: 'Boar-bristle paddle brush that distributes natural oils for smoother, shinier, healthier hair.',
      price: 2199,
      imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=500',
      category: beauty._id,
      stockQuantity: 85,
    },
    // Toys & Games
    {
      name: 'Wooden Building Blocks (100 pc)',
      description: 'Smooth, non-toxic hardwood blocks in vivid colours. Endless open-ended play for ages 3+.',
      price: 3299,
      imageUrl: 'https://images.unsplash.com/photo-1558877385-09c4d5ca64f6?w=500',
      category: toys._id,
      stockQuantity: 100,
    },
    {
      name: 'Strategy Board Game',
      description: 'Award-winning tile-laying strategy game for 2–5 players. 30–45 minutes per game.',
      price: 4499,
      imageUrl: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=500',
      category: toys._id,
      stockQuantity: 70,
    },
    {
      name: '1000-Piece Jigsaw Puzzle',
      description: 'Premium linen-finish 1000-piece puzzle with a stunning landscape. Random-cut, no two pieces alike.',
      price: 1899,
      imageUrl: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=500',
      category: toys._id,
      stockQuantity: 140,
    },
  ]);
  console.log(`Created ${products.length} products.`);

  // Build a lookup map for easy reference
  const byName = (name: string) => products.find((p) => p.name === name)!;

  const headphones = byName('Wireless Noise-Cancelling Headphones');
  const keyboard = byName('Mechanical Keyboard');
  const webcam = byName('4K Webcam');
  const speaker = byName('Portable Bluetooth Speaker');
  const led = byName('Smart LED Desk Light');
  const shirt = byName('Classic Oxford Button-Down Shirt');
  const chinos = byName('Premium Slim-Fit Chinos');
  const jacket = byName('Lightweight Running Jacket');
  const sweater = byName('Merino Wool Crew-Neck Sweater');
  const cleanCode = byName('The Art of Clean Code');
  const systemDesign = byName('System Design Interview');
  const deepWork = byName('Deep Work');
  const atomicHabits = byName('Atomic Habits');
  const lamp = byName('Ergonomic Desk Lamp');
  const plantKit = byName('Indoor Plant Starter Kit');
  const candles = byName('Scented Soy Candle Set');
  const yogaMat = byName('Yoga Mat Pro');
  const bands = byName('Adjustable Resistance Bands Set');
  const bottle = byName('Smart Water Bottle');
  const insoles = byName('Running Shoe Insoles');

  // -------------------------------------------------------------------------
  // Orders  (snapshot name + price from product; decrement stock manually)
  // Spread across statuses and dates for realistic analytics
  // -------------------------------------------------------------------------

  const makeOrder = (
    userId: mongoose.Types.ObjectId,
    items: Array<{ product: any; qty: number }>,
    status: string,
    paymentRef: string,
    shippingAddress = { street: '123 Main St', city: 'London', country: 'UK' },
  ) => {
    const orderItems = items.map(({ product, qty }) => ({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: qty,
    }));
    const totalAmount = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
    return { userId, items: orderItems, totalAmount, status, paymentRef, shippingAddress };
  };

  const ordersToCreate = [
    // --- customer (Alex) — electronics affinity ---
    makeOrder(customer._id, [{ product: headphones, qty: 1 }, { product: keyboard, qty: 1 }], 'delivered', 'mock_seed_001'),
    makeOrder(customer._id, [{ product: webcam, qty: 1 }], 'delivered', 'mock_seed_002'),
    makeOrder(customer._id, [{ product: speaker, qty: 2 }], 'shipped', 'mock_seed_003'),
    makeOrder(customer._id, [{ product: cleanCode, qty: 1 }, { product: systemDesign, qty: 1 }], 'delivered', 'mock_seed_004'),
    makeOrder(customer._id, [{ product: yogaMat, qty: 1 }, { product: bands, qty: 1 }], 'processing', 'mock_seed_005'),
    makeOrder(customer._id, [{ product: deepWork, qty: 1 }], 'pending', 'mock_seed_006'),
    // --- customer2 (Jane) — clothing + home affinity ---
    makeOrder(customer2._id, [{ product: shirt, qty: 2 }, { product: chinos, qty: 1 }], 'delivered', 'mock_seed_007'),
    makeOrder(customer2._id, [{ product: lamp, qty: 1 }, { product: candles, qty: 1 }], 'delivered', 'mock_seed_008'),
    makeOrder(customer2._id, [{ product: sweater, qty: 1 }], 'shipped', 'mock_seed_009'),
    makeOrder(customer2._id, [{ product: jacket, qty: 1 }], 'delivered', 'mock_seed_010'),
    makeOrder(customer2._id, [{ product: plantKit, qty: 2 }], 'processing', 'mock_seed_011'),
    makeOrder(customer2._id, [{ product: atomicHabits, qty: 1 }, { product: deepWork, qty: 1 }], 'delivered', 'mock_seed_012'),
    makeOrder(customer2._id, [{ product: bottle, qty: 1 }, { product: insoles, qty: 1 }], 'cancelled', 'mock_seed_013'),
    // --- additional mixed orders for analytics variety ---
    makeOrder(customer._id, [{ product: led, qty: 1 }], 'delivered', 'mock_seed_014'),
    makeOrder(customer2._id, [{ product: keyboard, qty: 1 }, { product: led, qty: 1 }], 'shipped', 'mock_seed_015'),
  ];

  await OrderModel.insertMany(ordersToCreate);
  console.log(`Created ${ordersToCreate.length} orders across 2 customers.`);

  // Decrement stock to reflect fulfilled orders (delivered + shipped + processing)
  const stockDeductions: Record<string, number> = {};
  for (const order of ordersToCreate) {
    if (['pending', 'cancelled'].includes(order.status)) continue;
    for (const item of order.items) {
      const key = item.productId.toString();
      stockDeductions[key] = (stockDeductions[key] ?? 0) + item.quantity;
    }
  }
  await Promise.all(
    Object.entries(stockDeductions).map(([id, qty]) =>
      ProductModel.updateOne({ _id: id }, { $inc: { stockQuantity: -qty } }),
    ),
  );
  console.log('Decremented stock for fulfilled orders.');

  // -------------------------------------------------------------------------
  // Cart — seed a pre-filled cart for the customer (Alex)
  // -------------------------------------------------------------------------
  await CartModel.create({
    userId: customer._id,
    items: [
      { productId: keyboard._id, quantity: 1 },
      { productId: cleanCode._id, quantity: 2 },
    ],
  });
  console.log('Created sample cart for customer (Alex).');

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  await mongoose.disconnect();

  console.log('\n=== Seed complete! ===');
  console.log('');
  console.log('  Admin:      admin@shop.com       / Admin@123');
  console.log('  Customer 1: customer@shop.com    / Customer@123  (electronics/books fan, cart pre-filled)');
  console.log('  Customer 2: jane@shop.com        / Jane@123      (clothing/home fan)');
  console.log('');
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Products:   ${products.length}`);
  console.log(`  Orders:     ${ordersToCreate.length}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
