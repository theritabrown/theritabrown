import { createClient } from '@supabase/supabase-js'
import type { BioLink, Product, ProductCollection, ProductDisplayStyle, Profile } from './types'
import { normalizeUrl } from './url'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

const legacyLinkHrefById: Record<string, string> = {
  'walmart-edit': 'https://walmrt.us',
  'shop-finds': '/store/shop-my-finds',
  'amazon-storefront': 'https://www.amazon.com/shop/ritabrown',
  instagram: 'https://www.instagram.com/ritabrowne',
  tiktok: 'https://www.tiktok.com/@ritabrowne',
}

export async function loadSiteData() {
  if (!supabase) {
    return null
  }

  const [profileResult, linksResult, collectionsResult, productsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', 'rita-brown').single(),
    supabase.from('bio_links').select('*').order('sort_order'),
    supabase.from('product_collections').select('*').eq('is_active', true).order('created_at'),
    supabase.from('products').select('*').order('sort_order'),
  ])

  if (
    profileResult.error ||
    linksResult.error ||
    collectionsResult.error ||
    productsResult.error
  ) {
    throw new Error('Could not load Supabase content. Check table names and RLS policies.')
  }

  return {
    profile: mapProfile(profileResult.data),
    links: linksResult.data.map(mapBioLink),
    collections: collectionsResult.data.map(mapCollection),
    products: productsResult.data.map(mapProduct),
  }
}

export async function createBioLink(link: Omit<BioLink, 'id' | 'isActive'>) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data, error } = await supabase
    .from('bio_links')
    .insert({
      label: link.label,
      description: link.description,
      href: normalizeUrl(link.href),
      kind: link.kind,
      icon: link.icon,
      is_private_storefront: link.isPrivateStorefront,
      collection_slug: link.collectionSlug || null,
      is_active: true,
      sort_order: link.sortOrder,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapBioLink(data)
}

export async function updateProfile(profile: Profile) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      name: profile.name,
      handle: profile.handle,
      tagline: profile.tagline,
      bio: profile.bio,
      status_text: profile.statusText,
      avatar_url: profile.avatarUrl,
      hero_image_url: profile.heroImageUrl,
      location: profile.location,
      theme_slug: profile.themeSlug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  if (error) {
    throw error
  }
}

export async function updateBioLink(link: BioLink) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const update = {
    label: link.label,
    description: link.description,
    href: normalizeUrl(link.href),
    kind: link.kind,
    icon: link.icon,
    is_private_storefront: link.isPrivateStorefront,
    collection_slug: link.collectionSlug || null,
    is_active: link.isActive,
    sort_order: link.sortOrder,
    updated_at: new Date().toISOString(),
  }

  const query = supabase.from('bio_links').update(update).select('*')
  const lookupHref = legacyLinkHrefById[link.id] ?? link.href
  const { data, error } = isUuid(link.id)
    ? await query.eq('id', link.id)
    : await query.eq('href', lookupHref)

  if (error) {
    throw error
  }

  if (!data.length) {
    throw new Error(`No Supabase link row matched "${link.label}". Refresh and try again.`)
  }

  return mapBioLink(data[0])
}

export async function deleteBioLink(link: BioLink) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const query = supabase.from('bio_links').delete().select('id')
  const lookupHref = legacyLinkHrefById[link.id] ?? link.href
  const { data, error } = isUuid(link.id)
    ? await query.eq('id', link.id)
    : await query.eq('href', lookupHref)

  if (error) {
    throw error
  }

  if (!data.length) {
    throw new Error(`No Supabase link row matched "${link.label}". Refresh and try again.`)
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function createProduct(product: Omit<Product, 'id' | 'sortOrder' | 'isActive'>) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      collection_slug: product.collectionSlug,
      title: product.title,
      store_name: product.storeName,
      price: product.price,
      image_url: product.imageUrl,
      href: normalizeUrl(product.href),
      category: product.category,
      is_favorite: product.isFavorite,
      show_in_main_collection: product.showInMainCollection,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapProduct(data)
}

export async function updateProduct(product: Product) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      collection_slug: product.collectionSlug,
      title: product.title,
      store_name: product.storeName,
      price: product.price,
      image_url: product.imageUrl,
      href: normalizeUrl(product.href),
      category: product.category,
      is_favorite: product.isFavorite,
      show_in_main_collection: product.showInMainCollection,
      is_active: product.isActive,
      sort_order: product.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', product.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapProduct(data)
}

export async function deleteProduct(product: Product) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { error } = await supabase.from('products').delete().eq('id', product.id)

  if (error) {
    throw error
  }
}

export async function updateCollectionSettings(collection: ProductCollection) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  const { data, error } = await supabase
    .from('product_collections')
    .update({
      hero_image_url: collection.heroImageUrl,
      display_style: collection.displayStyle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', collection.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapCollection(data)
}

export async function uploadSiteImage(file: File, folder: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured yet.')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.')
  }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || mimeToExtension(file.type)
    : mimeToExtension(file.type)
  const safeFolder = folder.replace(/[^a-z0-9/-]/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
  const path = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('site-images').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('site-images').getPublicUrl(path)

  return data.publicUrl
}

function mimeToExtension(type: string) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  return 'jpg'
}

function mapProfile(row: Record<string, string>): Profile {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    tagline: row.tagline,
    bio: row.bio,
    statusText: row.status_text ?? 'Live / Live content synced',
    avatarUrl: row.avatar_url,
    heroImageUrl: row.hero_image_url,
    location: row.location,
    themeSlug: row.theme_slug ?? 'soft-studio',
  }
}

function mapBioLink(row: Record<string, string | boolean | number | null>): BioLink {
  return {
    id: String(row.id),
    label: String(row.label),
    description: String(row.description ?? ''),
    href: String(row.href),
    kind: row.kind as BioLink['kind'],
    icon: String(row.icon ?? 'link'),
    isPrivateStorefront: Boolean(row.is_private_storefront),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    collectionSlug: row.collection_slug ? String(row.collection_slug) : undefined,
  }
}

function mapCollection(row: Record<string, string | boolean | null>): ProductCollection {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description),
    heroImageUrl: String(row.hero_image_url),
    displayStyle: mapDisplayStyle(row.display_style),
    isActive: Boolean(row.is_active),
  }
}

function mapDisplayStyle(value: unknown): ProductDisplayStyle {
  return value === 'spotlight' || value === 'compact-list' || value === 'masonry'
    ? value
    : 'editorial-grid'
}

function mapProduct(row: Record<string, string | boolean | number | null>): Product {
  return {
    id: String(row.id),
    collectionSlug: String(row.collection_slug),
    title: String(row.title),
    storeName: String(row.store_name),
    price: String(row.price ?? ''),
    imageUrl: String(row.image_url),
    href: String(row.href),
    category: String(row.category ?? 'Finds'),
    isFavorite: Boolean(row.is_favorite),
    showInMainCollection: row.show_in_main_collection !== false,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
  }
}
