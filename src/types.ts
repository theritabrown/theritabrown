export type LinkKind = 'social' | 'feature' | 'storefront' | 'standard'

export type ProductDisplayStyle = 'editorial-grid' | 'spotlight' | 'compact-list' | 'masonry'

export type Profile = {
  id: string
  name: string
  handle: string
  tagline: string
  bio: string
  statusText: string
  avatarUrl: string
  heroImageUrl: string
  location: string
  themeSlug: string
}

export type BioLink = {
  id: string
  label: string
  description: string
  href: string
  kind: LinkKind
  icon: string
  isActive: boolean
  sortOrder: number
  collectionSlug?: string
}

export type ProductCollection = {
  id: string
  slug: string
  title: string
  description: string
  heroImageUrl: string
  displayStyle: ProductDisplayStyle
  isActive: boolean
}

export type Product = {
  id: string
  collectionSlug: string
  title: string
  storeName: string
  price: string
  imageUrl: string
  href: string
  category: string
  isFavorite: boolean
  showInMainCollection: boolean
  isActive: boolean
  sortOrder: number
}

export type ProductMetadata = {
  title: string
  description: string
  price: string
  imageUrl: string
  storeName: string
  url: string
}

export type AdminDraft = {
  label: string
  href: string
  description: string
  icon: string
  kind: LinkKind
  collectionSlug: string
}
