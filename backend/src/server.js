import { randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSeedOrders,
  createSeedProducts,
  DEFAULT_STOREFRONT_CONTENT,
} from './data/seedState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnvFile(path.join(__dirname, '../.env'));

const PRODUCT_PUBLISH_STATES = new Set(['Draft', 'Published', 'Archived']);
const STOCK_STATUSES = new Set(['In stock', 'Low stock', 'Waitlist']);
const ORDER_STATUSES = new Set(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']);
const DELIVERY_METHODS = new Set(['Standard', 'Express']);

const config = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 4000),
  catalogFile: resolveDataFile(process.env.CATALOG_FILE, '../data/catalog.json'),
  storefrontContentFile: resolveDataFile(
    process.env.STOREFRONT_CONTENT_FILE,
    '../data/storefront-content.json'
  ),
  ordersFile: resolveDataFile(process.env.ORDERS_FILE, '../data/orders.json'),
  adminApiKey: (process.env.ADMIN_API_KEY || '').trim(),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const setCorsHeaders = (request, response) => {
  const requestOrigin = request.headers.origin;
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (!requestOrigin) {
    return;
  }

  if (isAllowedOrigin(requestOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin);
    response.setHeader('Vary', 'Origin');
  }
};

const readRequestBody = async (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    request.on('error', reject);
  });

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

const readFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeList = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item, index, list) => item.length > 0 && list.indexOf(item) === index)
    : [];

const resolveDefaultShippingNote = (stockStatus) => {
  if (stockStatus === 'In stock') {
    return 'Ships within 24 hours.';
  }
  if (stockStatus === 'Low stock') {
    return 'Low-stock sizes ship within 48 hours.';
  }
  return 'The next batch ships next week.';
};

const resolveDefaultFeaturedNote = ({ shortBlurb, description }) => {
  if (shortBlurb.trim().length > 0) {
    return shortBlurb.trim();
  }
  if (description.trim().length > 0) {
    return description.trim().slice(0, 120);
  }
  return 'Limited release pair ready for next merchandising cycle.';
};

const toStorefrontProductView = (product) => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
  category: product.category,
  colorway: product.colorway,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  stockStatus: product.stockStatus,
  sizes: [...product.sizes],
  materials: [...product.materials],
  shortBlurb: product.shortBlurb,
  description: product.description,
  image: product.image,
  modelUrl: product.modelUrl,
  shippingNote: product.shippingNote,
  featuredNote: product.featuredNote,
  accentColor: product.accentColor,
  hypeScore: product.hypeScore,
  isNew: Boolean(product.isNew),
  publishState: product.publishState,
});

const createDraftProductId = (products) => {
  const existingIds = new Set(products.map((product) => product.id));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const nextId = `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (!existingIds.has(nextId)) {
      return nextId;
    }
  }

  return `prod-fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const createUniqueOrderId = (orders, desiredId) => {
  if (!orders.some((order) => order.id === desiredId)) {
    return desiredId;
  }

  let suffix = 2;
  let nextId = `${desiredId}-${suffix}`;
  while (orders.some((order) => order.id === nextId)) {
    suffix += 1;
    nextId = `${desiredId}-${suffix}`;
  }

  return nextId;
};

const loadSeededJsonFile = async (filePath, seedFactory, isValid, options = {}) => {
  const { seedWhenEmptyArray = false } = options;

  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (
      isValid(parsed) &&
      !(seedWhenEmptyArray && Array.isArray(parsed) && parsed.length === 0)
    ) {
      return cloneValue(parsed);
    }
  } catch {
    // Seeded below.
  }

  const seededValue = seedFactory();
  await persistJsonFile(filePath, seededValue);
  return cloneValue(seededValue);
};

const persistJsonFile = async (filePath, value) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
};

const loadCatalog = async () =>
  loadSeededJsonFile(config.catalogFile, createSeedProducts, Array.isArray);

const saveCatalog = async (products) => {
  await persistJsonFile(config.catalogFile, products);
  return cloneValue(products);
};

const isStorefrontContentSnapshot = (value) => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.hero) &&
    isRecord(value.featuredDrop) &&
    isRecord(value.trust) &&
    isRecord(value.faq) &&
    isRecord(value.cta) &&
    isRecord(value.shipping) &&
    isRecord(value.returns)
  );
};

const loadStorefrontContent = async () =>
  loadSeededJsonFile(
    config.storefrontContentFile,
    () => cloneValue(DEFAULT_STOREFRONT_CONTENT),
    isStorefrontContentSnapshot
  );

const saveStorefrontContent = async (content) => {
  await persistJsonFile(config.storefrontContentFile, content);
  return cloneValue(content);
};

const loadOrders = async () =>
  loadSeededJsonFile(config.ordersFile, createSeedOrders, Array.isArray, {
    seedWhenEmptyArray: true,
  });

const saveOrders = async (orders) => {
  await persistJsonFile(config.ordersFile, orders);
  return cloneValue(orders);
};

const normalizeProductPayload = (payload, options = {}) => {
  if (!isRecord(payload)) {
    return { error: 'Product payload is required.' };
  }

  const existingProduct = options.existingProduct ?? null;
  const expectedId = options.expectedId ?? null;
  const payloadId = normalizeText(readString(payload.id), 80);
  const productId = expectedId ? normalizeText(expectedId, 80) : payloadId;

  if (!productId) {
    return { error: 'Product id is required.' };
  }

  if (expectedId && payloadId && payloadId !== expectedId) {
    return { error: 'Product id in payload does not match request path.' };
  }

  const stockStatus = STOCK_STATUSES.has(payload.stockStatus)
    ? payload.stockStatus
    : existingProduct?.stockStatus ?? 'In stock';
  const publishState = PRODUCT_PUBLISH_STATES.has(payload.publishState)
    ? payload.publishState
    : existingProduct?.publishState ?? 'Draft';
  const shortBlurb = normalizeText(readString(payload.shortBlurb, existingProduct?.shortBlurb ?? ''), 500);
  const description = normalizeText(
    readString(payload.description, existingProduct?.description ?? ''),
    4000
  );

  const nextProduct = {
    id: productId,
    name: normalizeText(readString(payload.name, existingProduct?.name ?? ''), 160),
    brand: normalizeText(readString(payload.brand, existingProduct?.brand ?? ''), 160),
    category: normalizeText(readString(payload.category, existingProduct?.category ?? ''), 160),
    colorway: normalizeText(readString(payload.colorway, existingProduct?.colorway ?? ''), 160),
    price: Math.max(0, readFiniteNumber(payload.price, existingProduct?.price ?? 0)),
    compareAtPrice: Math.max(
      0,
      readFiniteNumber(payload.compareAtPrice, existingProduct?.compareAtPrice ?? 0)
    ),
    stockStatus,
    quantityOnHand: Math.max(
      0,
      Math.trunc(
        readFiniteNumber(payload.quantityOnHand, existingProduct?.quantityOnHand ?? 0)
      )
    ),
    sizes: normalizeList(payload.sizes).length > 0 ? normalizeList(payload.sizes) : [...(existingProduct?.sizes ?? [])],
    materials:
      normalizeList(payload.materials).length > 0
        ? normalizeList(payload.materials)
        : [...(existingProduct?.materials ?? [])],
    shortBlurb,
    description,
    image: normalizeText(readString(payload.image, existingProduct?.image ?? ''), 1200),
    modelUrl: normalizeText(readString(payload.modelUrl, existingProduct?.modelUrl ?? ''), 1200),
    shippingNote:
      normalizeText(readString(payload.shippingNote, existingProduct?.shippingNote ?? ''), 240) ||
      resolveDefaultShippingNote(stockStatus),
    featuredNote:
      normalizeText(readString(payload.featuredNote, existingProduct?.featuredNote ?? ''), 240) ||
      resolveDefaultFeaturedNote({ shortBlurb, description }),
    accentColor:
      normalizeText(readString(payload.accentColor, existingProduct?.accentColor ?? '#d4af37'), 32) ||
      '#d4af37',
    hypeScore: Math.max(0, Math.min(100, Math.round(readFiniteNumber(payload.hypeScore, existingProduct?.hypeScore ?? 80)))),
    isNew: typeof payload.isNew === 'boolean' ? payload.isNew : existingProduct?.isNew ?? true,
    publishState,
    updatedAt: new Date().toISOString(),
  };

  if (nextProduct.sizes.length === 0) {
    nextProduct.sizes = [...(existingProduct?.sizes ?? [])];
  }
  if (nextProduct.materials.length === 0) {
    nextProduct.materials = [...(existingProduct?.materials ?? [])];
  }
  if (nextProduct.quantityOnHand === 0 && !('quantityOnHand' in payload) && existingProduct == null) {
    nextProduct.quantityOnHand = nextProduct.stockStatus === 'In stock' ? 36 : nextProduct.stockStatus === 'Low stock' ? 7 : 0;
  }

  return { value: nextProduct };
};

const normalizeStorefrontContentPayload = (payload, currentContent) => {
  if (!isRecord(payload)) {
    return { error: 'Storefront content payload is required.' };
  }

  const hero = isRecord(payload.hero) ? payload.hero : {};
  const featuredDrop = isRecord(payload.featuredDrop) ? payload.featuredDrop : {};
  const trust = isRecord(payload.trust) ? payload.trust : {};
  const faq = isRecord(payload.faq) ? payload.faq : {};
  const cta = isRecord(payload.cta) ? payload.cta : {};
  const shipping = isRecord(payload.shipping) ? payload.shipping : {};
  const returns = isRecord(payload.returns) ? payload.returns : {};
  const trustItems = Array.isArray(trust.items) ? trust.items : [];
  const faqItems = Array.isArray(faq.items) ? faq.items : [];
  const ctaChips = Array.isArray(cta.chips) ? cta.chips : [];

  return {
    value: {
      hero: {
        stripText: normalizeText(readString(hero.stripText, currentContent.hero.stripText), 240),
        eyebrow: normalizeText(readString(hero.eyebrow, currentContent.hero.eyebrow), 120),
        headline: normalizeText(readString(hero.headline, currentContent.hero.headline), 240),
        description: normalizeText(
          readString(hero.description, currentContent.hero.description),
          1200
        ),
        primaryCtaLabel: normalizeText(
          readString(hero.primaryCtaLabel, currentContent.hero.primaryCtaLabel),
          80
        ),
        secondaryCtaLabel: normalizeText(
          readString(hero.secondaryCtaLabel, currentContent.hero.secondaryCtaLabel),
          80
        ),
      },
      featuredDrop: {
        productId: normalizeText(readString(featuredDrop.productId, currentContent.featuredDrop.productId), 80),
        fallbackName: normalizeText(
          readString(featuredDrop.fallbackName, currentContent.featuredDrop.fallbackName),
          160
        ),
        fallbackBody: normalizeText(
          readString(featuredDrop.fallbackBody, currentContent.featuredDrop.fallbackBody),
          600
        ),
        actionLabel: normalizeText(
          readString(featuredDrop.actionLabel, currentContent.featuredDrop.actionLabel),
          80
        ),
      },
      trust: {
        eyebrow: normalizeText(readString(trust.eyebrow, currentContent.trust.eyebrow), 120),
        headline: normalizeText(readString(trust.headline, currentContent.trust.headline), 240),
        items: currentContent.trust.items.map((item, index) => {
          const nextItem = isRecord(trustItems[index]) ? trustItems[index] : {};
          return {
            eyebrow: normalizeText(readString(nextItem.eyebrow, item.eyebrow), 120),
            title: normalizeText(readString(nextItem.title, item.title), 160),
            body: normalizeText(readString(nextItem.body, item.body), 600),
          };
        }),
      },
      faq: {
        eyebrow: normalizeText(readString(faq.eyebrow, currentContent.faq.eyebrow), 120),
        headline: normalizeText(readString(faq.headline, currentContent.faq.headline), 240),
        items: currentContent.faq.items.map((item, index) => {
          const nextItem = isRecord(faqItems[index]) ? faqItems[index] : {};
          return {
            question: normalizeText(readString(nextItem.question, item.question), 200),
            answer: normalizeText(readString(nextItem.answer, item.answer), 800),
          };
        }),
      },
      cta: {
        eyebrow: normalizeText(readString(cta.eyebrow, currentContent.cta.eyebrow), 120),
        headline: normalizeText(readString(cta.headline, currentContent.cta.headline), 240),
        buttonLabel: normalizeText(readString(cta.buttonLabel, currentContent.cta.buttonLabel), 80),
        chips: currentContent.cta.chips.map((chip, index) =>
          normalizeText(readString(ctaChips[index], chip), 80)
        ),
      },
      shipping: {
        title: normalizeText(readString(shipping.title, currentContent.shipping.title), 120),
        message: normalizeText(readString(shipping.message, currentContent.shipping.message), 400),
      },
      returns: {
        title: normalizeText(readString(returns.title, currentContent.returns.title), 120),
        message: normalizeText(readString(returns.message, currentContent.returns.message), 400),
      },
      updatedAt: new Date().toISOString(),
    },
  };
};

const normalizeOrderSnapshotPayload = (payload, existingOrders) => {
  if (!isRecord(payload)) {
    return { error: 'Order payload is required.' };
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (rawItems.length === 0) {
    return { error: 'Order must include at least one item.' };
  }

  const rawContact = isRecord(payload.contact) ? payload.contact : null;
  if (!rawContact) {
    return { error: 'Order contact details are required.' };
  }

  const contact = {
    name: normalizeText(readString(rawContact.name), 120),
    email: normalizeText(readString(rawContact.email), 160).toLowerCase(),
    city: normalizeText(readString(rawContact.city), 120),
    country: normalizeText(readString(rawContact.country), 120),
    delivery: normalizeText(readString(rawContact.delivery), 40),
    notes: normalizeText(readString(rawContact.notes), 300),
  };

  for (const [field, value] of Object.entries(contact)) {
    if (field === 'notes') {
      continue;
    }

    if (!value) {
      return { error: `Contact field "${field}" is required.` };
    }
  }

  if (!isValidEmail(contact.email)) {
    return { error: 'Contact email must be a valid email address.' };
  }

  if (!DELIVERY_METHODS.has(contact.delivery)) {
    return { error: 'Delivery must be either "Standard" or "Express".' };
  }

  const items = [];

  for (const [index, rawItem] of rawItems.entries()) {
    if (!isRecord(rawItem)) {
      return { error: `Order item ${index + 1} is invalid.` };
    }

    const quantity = Math.trunc(readFiniteNumber(rawItem.quantity, 0));
    if (quantity < 1 || quantity > 10) {
      return { error: `Quantity for order item ${index + 1} must be between 1 and 10.` };
    }

    const selectedSize = normalizeText(readString(rawItem.selectedSize), 40);
    if (!selectedSize) {
      return { error: `Selected size is required for order item ${index + 1}.` };
    }

    items.push({
      id: normalizeText(readString(rawItem.id), 80),
      lineId:
        normalizeText(readString(rawItem.lineId), 120) ||
        `${normalizeText(readString(rawItem.id), 80) || `line-${index + 1}`}-${selectedSize
          .replace(/\s+/g, '-')
          .toLowerCase()}`,
      name: normalizeText(readString(rawItem.name), 160),
      brand: normalizeText(readString(rawItem.brand), 160),
      category: normalizeText(readString(rawItem.category), 160),
      price: Math.max(0, readFiniteNumber(rawItem.price, 0)),
      compareAtPrice: Math.max(0, readFiniteNumber(rawItem.compareAtPrice, 0)),
      image: normalizeText(readString(rawItem.image), 1200),
      description: normalizeText(readString(rawItem.description), 4000),
      shortBlurb: normalizeText(readString(rawItem.shortBlurb), 500),
      colorway: normalizeText(readString(rawItem.colorway), 160),
      hypeScore: Math.max(0, Math.min(100, Math.round(readFiniteNumber(rawItem.hypeScore, 0)))),
      accentColor: normalizeText(readString(rawItem.accentColor, '#d4af37'), 32) || '#d4af37',
      modelUrl: normalizeText(readString(rawItem.modelUrl), 1200),
      sizes: normalizeList(rawItem.sizes),
      materials: normalizeList(rawItem.materials),
      stockStatus: STOCK_STATUSES.has(rawItem.stockStatus) ? rawItem.stockStatus : 'In stock',
      shippingNote: normalizeText(readString(rawItem.shippingNote), 240),
      featuredNote: normalizeText(readString(rawItem.featuredNote), 240),
      quantity,
      selectedSize,
    });
  }

  const subtotalFromItems = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const shipping = Math.max(0, readFiniteNumber(payload.shipping, contact.delivery === 'Express' ? 32 : 18));
  const subtotal = Math.max(0, readFiniteNumber(payload.subtotal, subtotalFromItems));
  const total = Math.max(0, readFiniteNumber(payload.total, subtotal + shipping));
  const desiredId = normalizeText(readString(payload.id), 80) || buildOrderId();
  const snapshotId = createUniqueOrderId(existingOrders, desiredId);
  const createdAt = normalizeText(readString(payload.createdAt), 80) || new Date().toISOString();

  const snapshot = {
    id: snapshotId,
    createdAt,
    items,
    subtotal,
    shipping,
    total,
    contact,
  };

  return {
    value: {
      snapshot,
      orderRecord: toSharedOrderRecord(snapshot),
    },
  };
};

const toSharedOrderRecord = (snapshot) => ({
  id: snapshot.id,
  createdAt: snapshot.createdAt,
  status: 'Pending',
  itemCount: snapshot.items.reduce((total, item) => total + item.quantity, 0),
  subtotal: snapshot.subtotal,
  shippingFee: snapshot.shipping,
  total: snapshot.total,
  updatedAt: null,
  contact: {
    name: snapshot.contact.name,
    email: snapshot.contact.email,
    phone: '',
    city: snapshot.contact.city,
    country: snapshot.contact.country,
    shippingAddress: '',
    deliveryMethod: snapshot.contact.delivery,
    notes: snapshot.contact.notes,
  },
  lineItems: snapshot.items.map((item) => ({
    id: item.lineId,
    productId: item.id,
    productName: item.name,
    size: item.selectedSize,
    quantity: item.quantity,
    unitPrice: item.price,
    lineTotal: item.price * item.quantity,
  })),
});

const listStorefrontProducts = (products, url) => {
  const brand = url.searchParams.get('brand');
  const isNewArrivalsFilter = url.searchParams.get('newArrivals');
  const query = url.searchParams.get('q');

  let result = products
    .filter((product) => product.publishState === 'Published')
    .map(toStorefrontProductView);

  if (brand && brand !== 'All') {
    result = result.filter((product) => product.brand === brand);
  }

  if (isNewArrivalsFilter === 'true') {
    result = result.filter((product) => Boolean(product.isNew));
  }

  if (query) {
    const normalizedQuery = query.toLowerCase();
    result = result.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        product.colorway.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  return result;
};

const server = createServer(async (request, response) => {
  setCorsHeaders(request, response);

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const { pathname } = url;

  try {
    if (request.method === 'GET' && pathname === '/api/health') {
      sendJson(response, 200, {
        ok: true,
        service: 'velosnak-backend',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (request.method === 'GET' && pathname === '/api/storefront-content') {
      sendJson(response, 200, await loadStorefrontContent());
      return;
    }

    if (request.method === 'GET' && pathname === '/api/shoes') {
      sendJson(response, 200, listStorefrontProducts(await loadCatalog(), url));
      return;
    }

    const storefrontShoeMatch = pathname.match(/^\/api\/shoes\/([^/]+)$/);
    if (request.method === 'GET' && storefrontShoeMatch) {
      const productId = decodeURIComponent(storefrontShoeMatch[1]);
      const product = (await loadCatalog()).find(
        (candidate) => candidate.id === productId && candidate.publishState === 'Published'
      );

      if (!product) {
        sendJson(response, 404, { message: 'Shoe not found.' });
        return;
      }

      sendJson(response, 200, toStorefrontProductView(product));
      return;
    }

    const adminRoute = pathname.startsWith('/api/admin/');
    if (adminRoute) {
      const accessError = requireAdminAccess(request);
      if (accessError) {
        sendJson(response, accessError.statusCode, { message: accessError.message });
        return;
      }
    }

    const isLegacyAdminOrderRead =
      request.method === 'GET' &&
      (pathname === '/api/orders' || /^\/api\/orders\/[^/]+$/.test(pathname));
    if (isLegacyAdminOrderRead) {
      const accessError = requireAdminAccess(request);
      if (accessError) {
        sendJson(response, accessError.statusCode, { message: accessError.message });
        return;
      }
    }

    if (request.method === 'GET' && pathname === '/api/admin/shoes') {
      sendJson(response, 200, await loadCatalog());
      return;
    }

    const adminShoeDuplicateMatch = pathname.match(/^\/api\/admin\/shoes\/([^/]+)\/duplicate$/);
    if (request.method === 'POST' && adminShoeDuplicateMatch) {
      const productId = decodeURIComponent(adminShoeDuplicateMatch[1]);
      const products = await loadCatalog();
      const existingProduct = products.find((product) => product.id === productId);

      if (!existingProduct) {
        sendJson(response, 404, { message: 'Product not found.' });
        return;
      }

      const duplicatedProduct = {
        ...cloneValue(existingProduct),
        id: createDraftProductId(products),
        name: `${existingProduct.name} Copy`,
        publishState: 'Draft',
        updatedAt: new Date().toISOString(),
      };

      products.push(duplicatedProduct);
      await saveCatalog(products);
      sendJson(response, 201, duplicatedProduct);
      return;
    }

    const adminShoePublishStateMatch = pathname.match(/^\/api\/admin\/shoes\/([^/]+)\/publish-state$/);
    if (request.method === 'POST' && adminShoePublishStateMatch) {
      const productId = decodeURIComponent(adminShoePublishStateMatch[1]);
      const payload = await readRequestBody(request);
      const publishState = PRODUCT_PUBLISH_STATES.has(payload.publishState)
        ? payload.publishState
        : null;

      if (!publishState) {
        sendJson(response, 400, { message: 'A valid publishState is required.' });
        return;
      }

      const products = await loadCatalog();
      const targetIndex = products.findIndex((product) => product.id === productId);

      if (targetIndex === -1) {
        sendJson(response, 404, { message: 'Product not found.' });
        return;
      }

      const updatedProduct = {
        ...products[targetIndex],
        publishState,
        updatedAt: new Date().toISOString(),
      };
      products[targetIndex] = updatedProduct;
      await saveCatalog(products);
      sendJson(response, 200, updatedProduct);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/admin/shoes') {
      const payload = await readRequestBody(request);
      const normalized = normalizeProductPayload(payload);
      if (normalized.error) {
        sendJson(response, 400, { message: normalized.error });
        return;
      }

      const products = await loadCatalog();
      const targetIndex = products.findIndex((product) => product.id === normalized.value.id);
      if (targetIndex !== -1) {
        sendJson(response, 409, { message: 'A product with this id already exists.' });
        return;
      }

      products.push(normalized.value);
      await saveCatalog(products);
      sendJson(response, 201, normalized.value);
      return;
    }

    const adminShoeDetailMatch = pathname.match(/^\/api\/admin\/shoes\/([^/]+)$/);
    if (request.method === 'GET' && adminShoeDetailMatch) {
      const productId = decodeURIComponent(adminShoeDetailMatch[1]);
      const product = (await loadCatalog()).find((candidate) => candidate.id === productId);

      if (!product) {
        sendJson(response, 404, { message: 'Product not found.' });
        return;
      }

      sendJson(response, 200, product);
      return;
    }

    if (request.method === 'POST' && adminShoeDetailMatch) {
      const productId = decodeURIComponent(adminShoeDetailMatch[1]);
      const payload = await readRequestBody(request);
      const products = await loadCatalog();
      const targetIndex = products.findIndex((product) => product.id === productId);

      if (targetIndex === -1) {
        sendJson(response, 404, { message: 'Product not found.' });
        return;
      }

      const normalized = normalizeProductPayload(payload, {
        expectedId: productId,
        existingProduct: products[targetIndex],
      });
      if (normalized.error) {
        sendJson(response, 400, { message: normalized.error });
        return;
      }

      products[targetIndex] = normalized.value;
      await saveCatalog(products);
      sendJson(response, 200, normalized.value);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/admin/storefront-content') {
      const payload = await readRequestBody(request);
      const currentContent = await loadStorefrontContent();
      const normalized = normalizeStorefrontContentPayload(payload, currentContent);

      if (normalized.error) {
        sendJson(response, 400, { message: normalized.error });
        return;
      }

      const savedContent = await saveStorefrontContent(normalized.value);
      sendJson(response, 200, savedContent);
      return;
    }

    if (request.method === 'GET' && (pathname === '/api/admin/orders' || pathname === '/api/orders')) {
      sendJson(response, 200, await loadOrders());
      return;
    }

    const adminOrderStatusMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
    if (request.method === 'POST' && adminOrderStatusMatch) {
      const orderId = decodeURIComponent(adminOrderStatusMatch[1]);
      const payload = await readRequestBody(request);
      const nextStatus = ORDER_STATUSES.has(payload.status) ? payload.status : null;

      if (!nextStatus) {
        sendJson(response, 400, { message: 'A valid order status is required.' });
        return;
      }

      const orders = await loadOrders();
      const targetIndex = orders.findIndex((order) => order.id === orderId);
      if (targetIndex === -1) {
        sendJson(response, 404, { message: 'Order not found.' });
        return;
      }

      const updatedOrder = {
        ...orders[targetIndex],
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      orders[targetIndex] = updatedOrder;
      await saveOrders(orders);
      sendJson(response, 200, updatedOrder);
      return;
    }

    const adminOrderDetailMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
    const legacyOrderDetailMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
    const orderDetailMatch = adminOrderDetailMatch ?? legacyOrderDetailMatch;
    if (request.method === 'GET' && orderDetailMatch) {
      const orderId = decodeURIComponent(orderDetailMatch[1]);
      const order = (await loadOrders()).find((candidate) => candidate.id === orderId);

      if (!order) {
        sendJson(response, 404, { message: 'Order not found.' });
        return;
      }

      sendJson(response, 200, order);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/orders') {
      const orders = await loadOrders();
      const normalized = normalizeOrderSnapshotPayload(await readRequestBody(request), orders);

      if (normalized.error) {
        sendJson(response, 400, { message: normalized.error });
        return;
      }

      orders.unshift(normalized.value.orderRecord);
      await saveOrders(orders);
      sendJson(response, 201, normalized.value.snapshot);
      return;
    }

    sendJson(response, 404, { message: 'Endpoint not found.' });
  } catch (error) {
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : 'Unexpected backend error.';
    sendJson(response, 500, { message });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Velosnak backend listening on http://${config.host}:${config.port}`);
  console.log(`Allowed CORS origins: ${config.corsOrigins.join(', ')}`);
});

function resolveDataFile(rawValue, fallbackRelativePath) {
  if (!rawValue || rawValue.trim().length === 0) {
    return path.join(__dirname, fallbackRelativePath);
  }

  return path.isAbsolute(rawValue)
    ? rawValue
    : path.resolve(path.join(__dirname, '..'), rawValue);
}

function loadEnvFile(envFilePath) {
  if (!existsSync(envFilePath)) {
    return;
  }

  const content = readFileSync(envFilePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value.replace(/\\n/g, '\n');
  }
}

function normalizeText(value, maxLength = 120) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildOrderId() {
  return `VS-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function requireAdminAccess(request) {
  if (!config.adminApiKey) {
    return null;
  }

  const providedKey = getSingleHeaderValue(request.headers['x-admin-key']);
  if (!providedKey || !safeEqual(providedKey, config.adminApiKey)) {
    return {
      statusCode: 401,
      message: 'Admin access is required.',
    };
  }

  return null;
}

function getSingleHeaderValue(headerValue) {
  if (Array.isArray(headerValue)) {
    return headerValue[0] || '';
  }

  return typeof headerValue === 'string' ? headerValue : '';
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAllowedOrigin(requestOrigin) {
  const allowAllOrigins = config.corsOrigins.includes('*');
  if (allowAllOrigins || config.corsOrigins.includes(requestOrigin)) {
    return true;
  }

  try {
    const originUrl = new URL(requestOrigin);
    return isLoopbackHost(originUrl.hostname) || isPrivateNetworkHost(originUrl.hostname);
  } catch {
    return false;
  }
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function isPrivateNetworkHost(hostname) {
  const match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return false;
  }

  const firstOctet = Number(match[1]);
  const secondOctet = Number(match[2]);

  return (
    firstOctet === 10 ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168)
  );
}
