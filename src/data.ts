import type { BioLink, Product, ProductCollection, Profile } from './types'

export const profile: Profile = {
  id: 'rita-brown',
  name: 'Rita Brown',
  handle: '@ritabrowne',
  tagline: 'Home and lifestyle finds for calm, cozy everyday living.',
  bio: 'Sharing favorite home, lifestyle, beauty, and family finds that blend comfort, style, and simplicity.',
  avatarUrl:
    'https://ugc.production.linktr.ee/02e07ec7-f0f2-4bef-ba73-9834c3185447_IMG-9417-Facetune-28-12-2024-14-54-27.jpeg?io=true&size=avatar-v3_0',
  heroImageUrl:
    'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=85',
  location: 'Lifestyle creator',
  themeSlug: 'soft-studio',
}

export const bioLinks: BioLink[] = [
  {
    id: 'walmart-edit',
    label: 'The Rita Brown Edit',
    description: 'Walmart storefront with cozy home and lifestyle picks.',
    href: 'https://walmrt.us',
    kind: 'feature',
    icon: 'sparkles',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'shop-finds',
    label: 'Shop My Finds',
    description: 'A curated storefront for products from any shop.',
    href: '/store/shop-my-finds',
    kind: 'storefront',
    icon: 'shopping-bag',
    isActive: true,
    sortOrder: 2,
    collectionSlug: 'shop-my-finds',
  },
  {
    id: 'amazon-storefront',
    label: 'Amazon Storefront',
    description: 'Recommended products from Rita Brown on Amazon.',
    href: 'https://www.amazon.com/shop/ritabrown',
    kind: 'standard',
    icon: 'store',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Follow Rita on Instagram.',
    href: 'https://www.instagram.com/ritabrowne',
    kind: 'social',
    icon: 'instagram',
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'tiktok',
    label: 'Hi TikTok',
    description: 'Short videos, finds, and daily favorites.',
    href: 'https://www.tiktok.com/@ritabrowne',
    kind: 'social',
    icon: 'music',
    isActive: true,
    sortOrder: 5,
  },
]

export const collections: ProductCollection[] = [
  {
    id: 'shop-my-finds',
    slug: 'shop-my-finds',
    title: 'Shop My Finds',
    description:
      'Pieces Rita would save, share, and send to a friend. Add links from any store and the storefront stays polished.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85',
    isActive: true,
  },
]

export const products: Product[] = [
  {
    id: 'linen-curtains',
    collectionSlug: 'shop-my-finds',
    title: 'Airy Linen Blend Curtains',
    storeName: 'Wayfair',
    price: '$38',
    imageUrl:
      'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=85',
    href: 'https://www.wayfair.com',
    category: 'Home',
    isFavorite: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'woven-basket',
    collectionSlug: 'shop-my-finds',
    title: 'Woven Storage Basket',
    storeName: 'Target',
    price: '$24',
    imageUrl:
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=900&q=85',
    href: 'https://www.target.com',
    category: 'Organization',
    isFavorite: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'ceramic-vase',
    collectionSlug: 'shop-my-finds',
    title: 'Soft White Ceramic Vase',
    storeName: 'H&M Home',
    price: '$19',
    imageUrl:
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=85',
    href: 'https://www2.hm.com/en_us/home.html',
    category: 'Decor',
    isFavorite: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'accent-pillow',
    collectionSlug: 'shop-my-finds',
    title: 'Textured Accent Pillow',
    storeName: 'Shein',
    price: '$12',
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85',
    href: 'https://us.shein.com',
    category: 'Decor',
    isFavorite: false,
    isActive: true,
    sortOrder: 4,
  },
]
