// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

let serverProcess: ChildProcessWithoutNullStreams | null = null;
let serverOutput = '';
let tempDir = '';
let baseUrl = '';
let exitPromise: Promise<number | null> | null = null;

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'webshoe-backend-'));
  const port = 4300 + Math.floor(Math.random() * 200);
  baseUrl = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, ['backend/src/server.js'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      CORS_ORIGIN: 'http://127.0.0.1:3000',
      CATALOG_FILE: path.join(tempDir, 'catalog.json'),
      STOREFRONT_CONTENT_FILE: path.join(tempDir, 'storefront-content.json'),
      ORDERS_FILE: path.join(tempDir, 'orders.json'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  serverProcess.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });

  exitPromise = new Promise((resolve, reject) => {
    serverProcess?.once('error', reject);
    serverProcess?.once('exit', resolve);
  });

  await waitForHealth();
}, 20_000);

afterAll(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }

  if (exitPromise) {
    await Promise.race([
      exitPromise,
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }

  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe('backend server integration', () => {
  it('supports admin catalog mutations and storefront content sync', async () => {
    const seededCatalog = await requestJson<Array<{ id: string }>>('/api/admin/shoes');
    expect(seededCatalog.status).toBe(200);
    expect(seededCatalog.body.length).toBeGreaterThanOrEqual(8);

    const productId = 'integration-backend-prod';
    const draftProduct = {
      id: productId,
      name: 'Integration Backend Runner',
      brand: 'Signal Lab',
      category: 'Performance',
      colorway: 'Black / Volt',
      price: 229,
      compareAtPrice: 269,
      stockStatus: 'In stock',
      quantityOnHand: 18,
      sizes: ['US 9', 'US 10'],
      materials: ['Mesh upper', 'Foam carrier'],
      shortBlurb: 'Integration backend catalog draft.',
      description:
        'Integration backend catalog draft used to confirm real admin and storefront alignment.',
      image: 'https://example.com/integration-backend-runner.jpg',
      modelUrl: 'https://example.com/integration-backend-runner.glb',
      shippingNote: 'Ships in 24 hours.',
      featuredNote: 'Backend integration feature.',
      accentColor: '#111827',
      hypeScore: 88,
      isNew: true,
      publishState: 'Draft',
      updatedAt: new Date().toISOString(),
    };

    const createdDraft = await requestJson<typeof draftProduct>('/api/admin/shoes', {
      method: 'POST',
      body: draftProduct,
    });
    expect(createdDraft.status).toBe(201);
    expect(createdDraft.body.id).toBe(productId);
    expect(createdDraft.body.publishState).toBe('Draft');

    const hiddenStorefrontProduct = await requestJson<{ message: string }>(`/api/shoes/${productId}`);
    expect(hiddenStorefrontProduct.status).toBe(404);

    const publishedProduct = await requestJson<typeof draftProduct>(
      `/api/admin/shoes/${productId}/publish-state`,
      {
        method: 'POST',
        body: { publishState: 'Published' },
      }
    );
    expect(publishedProduct.status).toBe(200);
    expect(publishedProduct.body.publishState).toBe('Published');

    const storefrontProduct = await requestJson<typeof draftProduct>(`/api/shoes/${productId}`);
    expect(storefrontProduct.status).toBe(200);
    expect(storefrontProduct.body.id).toBe(productId);

    const duplicatedProduct = await requestJson<typeof draftProduct>(
      `/api/admin/shoes/${productId}/duplicate`,
      {
        method: 'POST',
        body: {},
      }
    );
    expect(duplicatedProduct.status).toBe(201);
    expect(duplicatedProduct.body.id).not.toBe(productId);
    expect(duplicatedProduct.body.publishState).toBe('Draft');

    const initialContent = await requestJson<{
      hero: { headline: string };
      featuredDrop: { productId: string };
    }>('/api/storefront-content');
    expect(initialContent.status).toBe(200);

    const savedContent = await requestJson<{
      hero: { headline: string };
      featuredDrop: { productId: string };
    }>('/api/admin/storefront-content', {
      method: 'POST',
      body: {
        ...initialContent.body,
        hero: {
          ...initialContent.body.hero,
          headline: 'Integration backend hero headline',
        },
        featuredDrop: {
          ...initialContent.body.featuredDrop,
          productId,
        },
      },
    });
    expect(savedContent.status).toBe(200);
    expect(savedContent.body.hero.headline).toBe('Integration backend hero headline');
    expect(savedContent.body.featuredDrop.productId).toBe(productId);

    const refreshedContent = await requestJson<{
      hero: { headline: string };
      featuredDrop: { productId: string };
    }>('/api/storefront-content');
    expect(refreshedContent.body.hero.headline).toBe('Integration backend hero headline');
    expect(refreshedContent.body.featuredDrop.productId).toBe(productId);
  });

  it('supports order submission and admin status updates', async () => {
    const orderSnapshot = {
      id: 'WS-INTEGRATION-1',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: '1',
          lineId: 'ws-integration-line-1',
          name: 'Phantom Velocity X',
          brand: 'VeloSnak Elite',
          category: 'Performance',
          price: 295,
          compareAtPrice: 340,
          image: 'https://example.com/phantom-velocity.jpg',
          description: 'Integration order snapshot line item.',
          shortBlurb: 'Integration line item.',
          colorway: 'Midnight / Cyan Spark',
          hypeScore: 97,
          accentColor: '#00f2ff',
          modelUrl: 'https://example.com/phantom-velocity.glb',
          sizes: ['US 9', 'US 10'],
          materials: ['Prime-knit upper', 'Nitro foam midsole'],
          stockStatus: 'In stock',
          shippingNote: 'Ships within 24 hours.',
          featuredNote: 'Integration feature note.',
          quantity: 1,
          selectedSize: 'US 9',
        },
      ],
      subtotal: 295,
      shipping: 18,
      total: 313,
      contact: {
        name: 'Integration Tester',
        email: 'integration@example.com',
        city: 'Dhaka',
        country: 'Bangladesh',
        delivery: 'Standard',
        notes: 'Integration order note.',
      },
    };

    const createdOrder = await requestJson<{
      id: string;
      contact: { name: string };
    }>('/api/orders', {
      method: 'POST',
      body: orderSnapshot,
    });
    expect(createdOrder.status).toBe(201);
    expect(createdOrder.body.id).toBe(orderSnapshot.id);
    expect(createdOrder.body.contact.name).toBe('Integration Tester');

    const createdOrderDetail = await requestJson<{
      id: string;
      status: string;
      contact: { deliveryMethod: string };
      lineItems: Array<{ productId: string }>;
    }>(`/api/admin/orders/${orderSnapshot.id}`);
    expect(createdOrderDetail.status).toBe(200);
    expect(createdOrderDetail.body.status).toBe('Pending');
    expect(createdOrderDetail.body.contact.deliveryMethod).toBe('Standard');
    expect(createdOrderDetail.body.lineItems[0]?.productId).toBe('1');

    const updatedOrder = await requestJson<{ id: string; status: string }>(
      `/api/admin/orders/${orderSnapshot.id}/status`,
      {
        method: 'POST',
        body: { status: 'Shipped' },
      }
    );
    expect(updatedOrder.status).toBe(200);
    expect(updatedOrder.body.status).toBe('Shipped');

    const orderList = await requestJson<Array<{ id: string; status: string }>>('/api/admin/orders');
    expect(orderList.status).toBe(200);
    expect(orderList.body.some((order) => order.id === orderSnapshot.id && order.status === 'Shipped')).toBe(true);
  });
});

async function waitForHealth() {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (serverProcess?.exitCode != null) {
      throw new Error(`Backend server exited before health check succeeded.\n${serverOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the deadline.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for backend health check.\n${serverOutput}`);
}

async function requestJson<T>(
  route: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
  } = {}
) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return {
    status: response.status,
    body: (await response.json()) as T,
  };
}
