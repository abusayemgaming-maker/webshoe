import { SHOES } from './shoes.js';

const publishStateById = {
  '1': 'Published',
  '2': 'Draft',
  '3': 'Published',
  '4': 'Published',
  '5': 'Archived',
  '6': 'Draft',
  '7': 'Draft',
  '8': 'Published',
};

const quantityByStockStatus = {
  'In stock': 36,
  'Low stock': 7,
  Waitlist: 0,
};

export const DEFAULT_STOREFRONT_CONTENT = {
  hero: {
    stripText: 'Free shipping over $300 · 14-day size exchange · new arrivals weekly',
    eyebrow: 'Curated sneaker boutique',
    headline: 'Modern sneakers with premium finish and easy everyday wear.',
    description:
      'Explore a tighter edit of standout pairs, from clean runners to bold statement styles. Every product page includes clear sizing, delivery timing, and saved-item support.',
    primaryCtaLabel: 'Shop collection',
    secondaryCtaLabel: 'Why shop here',
  },
  featuredDrop: {
    productId: '6',
    fallbackName: 'Next featured drop',
    fallbackBody: 'A new premium pair is arriving soon. Stay tuned for the next release.',
    actionLabel: 'View product',
  },
  trust: {
    eyebrow: 'Why shop here',
    headline: 'Designed to feel clear, calm, and premium from the first click.',
    items: [
      {
        title: 'Curated Selection',
        body: 'A focused edit of modern runners, low tops, and statement pairs chosen for style, comfort, and everyday wear.',
        eyebrow: 'Selection',
      },
      {
        title: 'Clear Delivery',
        body: 'Shipping timelines are easy to understand, with express options available at checkout for the pairs that need to arrive fast.',
        eyebrow: 'Delivery',
      },
      {
        title: 'Easy Support',
        body: 'Size guidance, saved items, and simple post-purchase support make the store feel calm, helpful, and easy to trust.',
        eyebrow: 'Support',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    headline: 'Questions we hear most.',
    items: [
      {
        question: 'How long does shipping take?',
        answer:
          'Standard delivery usually arrives in 2 to 4 business days. Express delivery is available at checkout for faster dispatch.',
      },
      {
        question: 'Can I exchange for another size?',
        answer: 'Yes. Eligible pairs include a 14-day size exchange so you can shop with more confidence.',
      },
      {
        question: 'Can I save styles for later?',
        answer: 'Yes. Tap the heart on any product card to save it and review it later in your account area.',
      },
      {
        question: 'What comes with each order?',
        answer:
          'Every order includes secure packaging, order tracking, and simple support if you need help after delivery.',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to choose your pair?',
    headline: 'Clean silhouettes, fast delivery, and easy size support across the full collection.',
    buttonLabel: 'Open bag',
    chips: ['New arrivals', 'Best sellers', 'Shipping', 'Returns', 'Contact'],
  },
  shipping: {
    title: 'Shipping',
    message: 'Standard delivery arrives in 2-4 business days, with express dispatch available at checkout.',
  },
  returns: {
    title: 'Returns',
    message: 'Need a different size? Eligible pairs include a 14-day size exchange window.',
  },
  updatedAt: null,
};

const ORDER_SEED = [
  {
    id: 'WS-1048',
    createdAt: '2026-03-22T10:24:00.000Z',
    status: 'Processing',
    itemCount: 2,
    subtotal: 575,
    shippingFee: 36,
    total: 611,
    updatedAt: null,
    contact: {
      name: 'Ariana Walker',
      email: 'ariana.walker@example.com',
      phone: '+1 415 555 0198',
      city: 'San Francisco',
      country: 'USA',
      shippingAddress: '188 Mission St, Apt 52',
      deliveryMethod: 'Express',
      notes: 'Please ring front desk before delivery.',
    },
    lineItems: [
      {
        id: 'ws-1048-li-1',
        productId: '1',
        productName: 'Phantom Velocity X',
        size: 'US 10',
        quantity: 1,
        unitPrice: 295,
        lineTotal: 295,
      },
      {
        id: 'ws-1048-li-2',
        productId: '4',
        productName: 'Zenith Void Runner',
        size: 'US 9',
        quantity: 1,
        unitPrice: 280,
        lineTotal: 280,
      },
    ],
  },
  {
    id: 'WS-1047',
    createdAt: '2026-03-21T15:42:00.000Z',
    status: 'Pending',
    itemCount: 1,
    subtotal: 240,
    shippingFee: 14,
    total: 254,
    updatedAt: null,
    contact: {
      name: 'Daniel Park',
      email: 'daniel.park@example.com',
      phone: '+1 312 555 0126',
      city: 'Chicago',
      country: 'USA',
      shippingAddress: '451 W Belmont Ave',
      deliveryMethod: 'Standard',
      notes: 'Leave at side entrance if unavailable.',
    },
    lineItems: [
      {
        id: 'ws-1047-li-1',
        productId: '2',
        productName: 'Aero-Core Prototype',
        size: 'US 9',
        quantity: 1,
        unitPrice: 240,
        lineTotal: 240,
      },
    ],
  },
  {
    id: 'WS-1046',
    createdAt: '2026-03-20T07:18:00.000Z',
    status: 'Shipped',
    itemCount: 3,
    subtotal: 735,
    shippingFee: 36,
    total: 771,
    updatedAt: null,
    contact: {
      name: 'Nora Martinez',
      email: 'nora.martinez@example.com',
      phone: '+1 786 555 0161',
      city: 'Miami',
      country: 'USA',
      shippingAddress: '92 Biscayne Blvd',
      deliveryMethod: 'Express',
      notes: 'Customer requested SMS delivery alert.',
    },
    lineItems: [
      {
        id: 'ws-1046-li-1',
        productId: '3',
        productName: 'Cyber-Dunk Catalyst',
        size: 'US 10',
        quantity: 1,
        unitPrice: 185,
        lineTotal: 185,
      },
      {
        id: 'ws-1046-li-2',
        productId: '6',
        productName: 'Titanium Trek High',
        size: 'US 11',
        quantity: 1,
        unitPrice: 350,
        lineTotal: 350,
      },
      {
        id: 'ws-1046-li-3',
        productId: '5',
        productName: 'Prism Flux Low',
        size: 'US 8',
        quantity: 1,
        unitPrice: 200,
        lineTotal: 200,
      },
    ],
  },
  {
    id: 'WS-1045',
    createdAt: '2026-03-18T19:06:00.000Z',
    status: 'Delivered',
    itemCount: 1,
    subtotal: 295,
    shippingFee: 13,
    total: 308,
    updatedAt: null,
    contact: {
      name: 'Samuel Greene',
      email: 'samuel.greene@example.com',
      phone: '+1 646 555 0183',
      city: 'New York',
      country: 'USA',
      shippingAddress: '77 Hudson Yards',
      deliveryMethod: 'Standard',
      notes: 'Delivered to building concierge.',
    },
    lineItems: [
      {
        id: 'ws-1045-li-1',
        productId: '1',
        productName: 'Phantom Velocity X',
        size: 'US 9',
        quantity: 1,
        unitPrice: 295,
        lineTotal: 295,
      },
    ],
  },
];

export const createSeedProducts = () =>
  SHOES.map((shoe) => ({
    id: shoe.id,
    name: shoe.name,
    brand: shoe.brand,
    category: shoe.category,
    colorway: shoe.colorway,
    price: shoe.price,
    compareAtPrice: shoe.compareAtPrice ?? 0,
    stockStatus: shoe.stockStatus,
    quantityOnHand: quantityByStockStatus[shoe.stockStatus] ?? 0,
    sizes: [...shoe.sizes],
    materials: [...shoe.materials],
    shortBlurb: shoe.shortBlurb,
    description: shoe.description,
    image: shoe.image,
    modelUrl: shoe.modelUrl,
    shippingNote: shoe.shippingNote,
    featuredNote: shoe.featuredNote,
    accentColor: shoe.accentColor,
    hypeScore: shoe.hypeScore,
    isNew: Boolean(shoe.isNew),
    publishState: publishStateById[shoe.id] ?? 'Draft',
    updatedAt: null,
  }));

export const createSeedOrders = () =>
  ORDER_SEED.map((order) => ({
    ...order,
    contact: { ...order.contact },
    lineItems: order.lineItems.map((lineItem) => ({ ...lineItem })),
  }));
