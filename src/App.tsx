import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Home,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Loader2,
  Palette,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react'
import {
  SiDiscord,
  SiEtsy,
  SiFacebook,
  SiInstagram,
  SiLinktree,
  SiPatreon,
  SiPinterest,
  SiShopify,
  SiSnapchat,
  SiSubstack,
  SiTarget,
  SiTiktok,
  SiTwitch,
  SiWhatsapp,
  SiYoutube,
} from 'react-icons/si'
import { FaLinkedinIn, FaTelegram, FaThreads, FaXTwitter } from 'react-icons/fa6'
import './App.css'
import { bioLinks as demoLinks, collections as demoCollections, products as demoProducts, profile as demoProfile } from './data'
import {
  createBioLink,
  createProduct,
  deleteProduct,
  hasSupabaseConfig,
  loadSiteData,
  supabase,
  deleteBioLink,
  updateBioLink,
  updateCollectionSettings,
  updateProduct,
  updateProfile,
} from './supabase'
import { applyTheme, themes } from './themes'
import type { AdminDraft, BioLink, Product, ProductCollection, ProductDisplayStyle, ProductMetadata, Profile } from './types'
import { normalizeUrl } from './url'

type SiteData = {
  profile: Profile
  links: BioLink[]
  collections: ProductCollection[]
  products: Product[]
}

type AdminTab = 'links' | 'products' | 'profile' | 'appearance'

const displayStyles: Array<{ value: ProductDisplayStyle; label: string; description: string }> = [
  {
    value: 'editorial-grid',
    label: 'Editorial grid',
    description: 'Balanced two-column product cards. Best all-purpose layout.',
  },
  {
    value: 'spotlight',
    label: 'Spotlight',
    description: 'Makes the first product larger for a featured find.',
  },
  {
    value: 'compact-list',
    label: 'Compact list',
    description: 'Easy scanning when there are lots of products.',
  },
  {
    value: 'masonry',
    label: 'Masonry',
    description: 'Pinterest-style browsing with a more casual feel.',
  },
]

const iconMap = {
  sparkles: Sparkles,
  'shopping-bag': ShoppingBag,
  store: Store,
  instagram: SiInstagram,
  tiktok: SiTiktok,
  music: SiTiktok,
  youtube: SiYoutube,
  x: FaXTwitter,
  twitter: FaXTwitter,
  threads: FaThreads,
  facebook: SiFacebook,
  pinterest: SiPinterest,
  linkedin: FaLinkedinIn,
  snapchat: SiSnapchat,
  twitch: SiTwitch,
  discord: SiDiscord,
  whatsapp: SiWhatsapp,
  telegram: FaTelegram,
  substack: SiSubstack,
  patreon: SiPatreon,
  etsy: SiEtsy,
  linktree: SiLinktree,
  amazon: AmazonIcon,
  walmart: WalmartIcon,
  target: SiTarget,
  shein: SheinIcon,
  shopify: SiShopify,
  home: Home,
  link: LinkIcon,
}

const socialIconKeys = new Set([
  'instagram',
  'tiktok',
  'youtube',
  'x',
  'twitter',
  'threads',
  'facebook',
  'pinterest',
  'linkedin',
  'snapchat',
  'twitch',
  'discord',
  'whatsapp',
  'telegram',
  'substack',
  'patreon',
  'linktree',
])

function getLinkIconKey(link: Pick<BioLink, 'href' | 'icon'>) {
  const href = link.href.toLowerCase()

  if (href.includes('instagram.com')) return 'instagram'
  if (href.includes('tiktok.com')) return 'tiktok'
  if (href.includes('youtube.com') || href.includes('youtu.be')) return 'youtube'
  if (href.includes('twitter.com') || href.includes('x.com')) return 'x'
  if (href.includes('threads.net')) return 'threads'
  if (href.includes('facebook.com') || href.includes('fb.com')) return 'facebook'
  if (href.includes('pinterest.com')) return 'pinterest'
  if (href.includes('linkedin.com')) return 'linkedin'
  if (href.includes('snapchat.com')) return 'snapchat'
  if (href.includes('twitch.tv')) return 'twitch'
  if (href.includes('discord.gg') || href.includes('discord.com')) return 'discord'
  if (href.includes('wa.me') || href.includes('whatsapp.com')) return 'whatsapp'
  if (href.includes('t.me') || href.includes('telegram.me') || href.includes('telegram.org')) return 'telegram'
  if (href.includes('substack.com')) return 'substack'
  if (href.includes('patreon.com')) return 'patreon'
  if (href.includes('linktr.ee') || href.includes('linktree')) return 'linktree'
  if (href.includes('amazon.com') || href.includes('amzn.to')) return 'amazon'
  if (href.includes('walmart.com') || href.includes('walmrt.us')) return 'walmart'
  if (href.includes('target.com')) return 'target'
  if (href.includes('shein.com')) return 'shein'
  if (href.includes('etsy.com')) return 'etsy'
  if (href.includes('shopify.com') || href.includes('myshopify.com')) return 'shopify'

  return link.icon in iconMap ? link.icon : 'link'
}

function LinkIconGlyph({ link, size }: { link: Pick<BioLink, 'href' | 'icon'>; size: number }) {
  const iconKey = getLinkIconKey(link)
  const Icon = iconMap[iconKey as keyof typeof iconMap] ?? LinkIcon
  const iconSize = iconKey === 'shein' ? Math.round(size * 1.45) : size

  return <Icon size={iconSize} />
}

function AmazonIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="20"
        y="24"
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="24"
        fontWeight="900"
        textAnchor="middle"
      >
        a
      </text>
      <path
        d="M11 28c5.5 3.3 12.3 3.3 18 0"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function WalmartIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="20"
        y="28"
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="950"
        textAnchor="middle"
      >
        W
      </text>
    </svg>
  )
}

function SheinIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={Math.round(size * 2.4)}
      height={size}
      viewBox="0 0 96 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="48"
        y="27"
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="23"
        fontWeight="900"
        letterSpacing="2"
        textAnchor="middle"
      >
        SHEIN
      </text>
    </svg>
  )
}

function isSocialProfileLink(link: BioLink) {
  return socialIconKeys.has(getLinkIconKey(link))
}

const blankLinkDraft: AdminDraft = {
  label: '',
  href: '',
  description: '',
  icon: 'link',
  kind: 'standard',
  collectionSlug: '',
}

const blankProductDraft: Omit<Product, 'id' | 'sortOrder' | 'isActive'> = {
  collectionSlug: 'shop-my-finds',
  title: '',
  storeName: '',
  price: '',
  imageUrl: '',
  href: '',
  category: 'Finds',
  isFavorite: false,
}

const demoSiteData: SiteData = {
  profile: demoProfile,
  links: demoLinks,
  collections: demoCollections,
  products: demoProducts,
}

function App() {
  const [siteData, setSiteData] = useState<SiteData | null>(hasSupabaseConfig ? null : demoSiteData)
  const [usingDemoData, setUsingDemoData] = useState(!hasSupabaseConfig)

  useEffect(() => {
    let isMounted = true

    loadSiteData()
      .then((data) => {
        if (!isMounted || !data) {
          return
        }
        setSiteData(data)
        setUsingDemoData(false)
      })
      .catch((error) => {
        console.error(error)
        if (isMounted) {
          setSiteData(demoSiteData)
          setUsingDemoData(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!siteData) {
      return
    }

    applyTheme(siteData.profile.themeSlug)
  }, [siteData])

  const path = window.location.pathname
  const storefrontMatch = path.match(/^\/store\/([^/]+)/)
  const storefrontSearch = new URLSearchParams(window.location.search)

  if (!siteData) {
    return (
      <main className="site-shell loading-screen">
        <div className="loading-card">
          <span />
          <p>Loading Rita Brown...</p>
        </div>
      </main>
    )
  }

  if (path.startsWith('/admin')) {
    return (
      <Admin
        key={`${usingDemoData}-${siteData.profile.id}-${siteData.profile.themeSlug}-${siteData.links.length}`}
        data={siteData}
        usingDemoData={usingDemoData}
      />
    )
  }

  if (storefrontMatch?.[1]) {
    return (
      <Storefront
        collectionSlug={storefrontMatch[1]}
        storeSlug={storefrontSearch.get('store') ?? undefined}
        collections={siteData.collections}
        products={siteData.products}
        profile={siteData.profile}
      />
    )
  }

  return <PublicHome data={siteData} />
}

function PublicHome({
  data,
}: {
  data: SiteData
}) {
  const featuredCollection = data.collections[0]
  const featuredProducts = data.products.filter((product) => product.isActive).slice(0, 4)
  const socialLinks = data.links
    .filter((link) => link.isActive && isSocialProfileLink(link))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <main className="site-shell home-screen">
      <section className="creator-hero">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="profile-card reveal">
          <div className="profile-art">
            <img src={data.profile.heroImageUrl} alt="" />
            <div className="avatar-ring">
              <img src={data.profile.avatarUrl} alt={data.profile.name} />
            </div>
          </div>
          <p className="sync-state">{data.profile.statusText}</p>
          <h1>{data.profile.name}</h1>
          <p className="handle">{data.profile.handle}</p>
          <p className="bio">{data.profile.tagline}</p>
          {socialLinks.length ? (
            <div className="social-row" aria-label="Social links">
              {socialLinks.map((link) => (
                <a href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} key={link.id}>
                  <LinkIconGlyph link={link} size={18} />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="link-stack" aria-label="Rita Brown links">
          {data.links
            .filter((link) => link.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((link, index) => (
              <BioLinkCard key={link.id} link={link} index={index} />
            ))}
        </div>
      </section>

      {featuredCollection ? (
        <section className="store-preview">
          <div className="section-heading">
            <div>
              <p className="small-label">Curated storefront</p>
              <h2>{featuredCollection.title}</h2>
            </div>
            <a href={`/store/${featuredCollection.slug}`} className="ghost-button">
              View all
              <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="product-rail">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

function BioLinkCard({ link, index }: { link: BioLink; index: number }) {
  const isInternal = link.href.startsWith('/')
  const isFeaturedFirst = index === 0

  return (
    <a
      className={`bio-link ${link.kind} ${isFeaturedFirst ? 'featured-first' : ''}`}
      href={link.href}
      target={isInternal ? undefined : '_blank'}
      rel={isInternal ? undefined : 'noreferrer'}
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <span className="link-icon">
        <LinkIconGlyph link={link} size={20} />
      </span>
      <span className="link-copy">
        <strong>{link.label}</strong>
        <span>{link.description}</span>
      </span>
      <span className="arrow">
        <ArrowUpRight size={18} />
      </span>
    </a>
  )
}

function Storefront({
  collectionSlug,
  storeSlug,
  collections,
  products,
  profile,
}: {
  collectionSlug: string
  storeSlug?: string
  collections: ProductCollection[]
  products: Product[]
  profile: Profile
}) {
  const collection = collections.find((item) => item.slug === collectionSlug)
  const routeStoreProduct = products.find((product) => product.isActive && slugifyStoreName(product.storeName) === collectionSlug)
  const queryStoreProduct = storeSlug
    ? products.find((product) => product.isActive && slugifyStoreName(product.storeName) === storeSlug)
    : undefined
  const storeProduct = queryStoreProduct ?? (!collection ? routeStoreProduct : undefined)
  const activeStoreSlug = storeProduct ? slugifyStoreName(storeProduct.storeName) : storeSlug
  const baseCollection = collection ?? collections[0]
  const collectionProducts = products.filter((product) => {
    const matchesCollection = product.isActive && product.collectionSlug === baseCollection?.slug
    const matchesStore = activeStoreSlug ? slugifyStoreName(product.storeName) === activeStoreSlug : true

    return matchesCollection && matchesStore
  })
  const [activeCategory, setActiveCategory] = useState('All')
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(collectionProducts.map((product) => product.category)))],
    [collectionProducts],
  )
  const visibleProducts =
    activeCategory === 'All'
      ? collectionProducts
      : collectionProducts.filter((product) => product.category === activeCategory)

  if (!baseCollection || (!collection && !storeProduct)) {
    return (
      <main className="site-shell empty-state">
        <a className="back-link" href="/">
          <ArrowLeft size={17} />
          Back to links
        </a>
        <h1>Storefront coming soon</h1>
      </main>
    )
  }

  return (
    <main className="site-shell storefront-screen">
      <header className="store-header">
        <a className="back-link" href="/">
          <ArrowLeft size={17} />
          Back
        </a>
        <div className="store-hero-image">
          <img src={baseCollection.heroImageUrl} alt="" />
        </div>
        <p className="small-label">{storeProduct ? `${storeProduct.storeName} picks` : `${profile.name}'s storefront`}</p>
        <h1>{storeProduct ? `${storeProduct.storeName} Finds` : baseCollection.title}</h1>
        <p>{storeProduct ? `Shop ${storeProduct.storeName} products from ${profile.name}'s curated finds.` : baseCollection.description}</p>
      </header>

      <div className="category-tabs" aria-label="Product categories">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={category === activeCategory ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <section className={`product-grid product-grid-${baseCollection.displayStyle}`} aria-label="Products">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </main>
  )
}

function slugifyStoreName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <article className={`product-card ${compact ? 'compact' : ''}`}>
      <a href={product.href} target="_blank" rel="noreferrer" className="product-image">
        <img src={product.imageUrl} alt={product.title} />
        {product.isFavorite ? (
          <span className="favorite-badge">
            <Heart size={13} fill="currentColor" />
            Rita pick
          </span>
        ) : null}
      </a>
      <div className="product-copy">
        <span>{product.storeName}</span>
        <h3>{product.title}</h3>
        <div className="product-actions">
          <strong>{product.price || 'Shop'}</strong>
          <a href={product.href} target="_blank" rel="noreferrer">
            Shop
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </article>
  )
}

function sortBioLinks(links: BioLink[]) {
  return [...links].sort((a, b) => a.sortOrder - b.sortOrder)
}

function normalizeBioLinkOrder(links: BioLink[], movedLinkId: string) {
  const movedLink = links.find((link) => link.id === movedLinkId)

  if (!movedLink) {
    return sortBioLinks(links).map((link, index) => ({ ...link, sortOrder: index + 1 }))
  }

  const targetIndex = Math.min(Math.max(Math.round(movedLink.sortOrder || 1), 1), links.length) - 1
  const remainingLinks = links
    .filter((link) => link.id !== movedLinkId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const reorderedLinks = [
    ...remainingLinks.slice(0, targetIndex),
    movedLink,
    ...remainingLinks.slice(targetIndex),
  ]

  return reorderedLinks.map((link, index) => ({ ...link, sortOrder: index + 1 }))
}

function Admin({ data, usingDemoData }: { data: SiteData; usingDemoData: boolean }) {
  const allowPreviewAdmin = usingDemoData && isLocalPreviewHost()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignedIn, setIsSignedIn] = useState(allowPreviewAdmin)
  const [authMessage, setAuthMessage] = useState(
    allowPreviewAdmin
      ? 'Preview admin enabled until Supabase is connected.'
      : usingDemoData
        ? 'Supabase is not configured for this deployment.'
        : '',
  )
  const [profileDraft, setProfileDraft] = useState(data.profile)
  const [linkEdits, setLinkEdits] = useState(data.links)
  const [collectionEdits, setCollectionEdits] = useState(data.collections)
  const [productEdits, setProductEdits] = useState(data.products)
  const [activeTab, setActiveTab] = useState<AdminTab>('links')
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [linkDraft, setLinkDraft] = useState<AdminDraft>(blankLinkDraft)
  const [productDraft, setProductDraft] = useState(blankProductDraft)
  const [isAddingProductCategory, setIsAddingProductCategory] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const productCategoryOptions = useMemo(
    () => Array.from(new Set(productEdits.map((product) => product.category).filter(Boolean))).sort(),
    [productEdits],
  )
  const themeGroups = ['Editorial', 'Soft', 'Colorful', 'Dark', 'Minimal'].map((category) => ({
    category,
    themes: themes.filter((theme) => theme.category === category),
  }))

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('Signing in...')

    if (!supabase) {
      if (allowPreviewAdmin) {
        setIsSignedIn(true)
        setAuthMessage('Preview admin enabled. Add Supabase env vars for real auth.')
        return
      }

      setAuthMessage('Supabase is not configured. Add Cloudflare Pages environment variables and redeploy.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthMessage(error.message)
      return
    }

    setIsSignedIn(true)
    setAuthMessage('Signed in')
  }

  async function addLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveMessage('Saving link...')
    try {
      const savedLink = await createBioLink({
        label: linkDraft.label,
        href: linkDraft.href,
        description: linkDraft.description,
        icon: linkDraft.icon,
        kind: linkDraft.kind,
        collectionSlug: linkDraft.collectionSlug || undefined,
        sortOrder: linkEdits.length + 1,
      })
      const normalizedLinks = normalizeBioLinkOrder([...linkEdits, savedLink], savedLink.id)
      const savedLinks = await Promise.all(normalizedLinks.map(updateBioLink))
      setLinkDraft(blankLinkDraft)
      setLinkEdits(sortBioLinks(savedLinks))
      setEditingLinkId(savedLink.id)
      setSaveMessage('Link saved.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save link yet.')
    }
  }

  async function saveExistingLink(link: BioLink) {
    setSaveMessage(`Saving ${link.label}...`)
    try {
      const normalizedLinks = normalizeBioLinkOrder(linkEdits, link.id)
      const savedLinks = await Promise.all(normalizedLinks.map(updateBioLink))
      const savedLink = savedLinks.find((item) => item.id === link.id) ?? savedLinks[0]

      setLinkEdits(sortBioLinks(savedLinks))
      setEditingLinkId(savedLink.id)
      setSaveMessage(`${savedLink.label} saved and display order updated.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save link.')
    }
  }

  async function removeExistingLink(link: BioLink) {
    const confirmed = window.confirm(`Delete "${link.label}"? Hiding is safer if you may need it later.`)

    if (!confirmed) {
      return
    }

    setSaveMessage(`Deleting ${link.label}...`)
    try {
      await deleteBioLink(link)
      const normalizedLinks = linkEdits
        .filter((item) => item.id !== link.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item, index) => ({ ...item, sortOrder: index + 1 }))
      const savedLinks = await Promise.all(normalizedLinks.map(updateBioLink))

      setLinkEdits(sortBioLinks(savedLinks))
      setSaveMessage(`${link.label} deleted.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not delete link.')
    }
  }

  async function saveProfile(event?: { preventDefault: () => void }) {
    event?.preventDefault()
    setSaveMessage('Saving profile...')
    try {
      await updateProfile(profileDraft)
      setSaveMessage('Profile saved. Refresh to see live content.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save profile yet.')
    }
  }

  function previewTheme(themeSlug: string) {
    setProfileDraft({ ...profileDraft, themeSlug })
    applyTheme(themeSlug)
  }

  function updateLinkDraft(id: string, patch: Partial<BioLink>) {
    setLinkEdits((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function updateProductDraft(id: string, patch: Partial<Product>) {
    setProductEdits((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function updateCollectionDraft(slug: string, patch: Partial<ProductCollection>) {
    setCollectionEdits((current) => current.map((item) => (item.slug === slug ? { ...item, ...patch } : item)))
  }

  async function importProduct() {
    if (!importUrl) {
      return
    }
    setIsImporting(true)
    setSaveMessage('Reading product page...')
    const normalizedImportUrl = normalizeUrl(importUrl)

    try {
      const response = await fetch(`/api/extract-product?url=${encodeURIComponent(normalizedImportUrl)}`)
      const metadata = (await response.json()) as ProductMetadata

      if (!response.ok) {
        throw new Error(metadata.description || 'Could not read this product page.')
      }

      setProductDraft((current) => ({
        ...current,
        title: metadata.title || current.title,
        href: normalizeUrl(metadata.url || normalizedImportUrl),
        price: metadata.price || current.price,
        imageUrl: metadata.imageUrl || current.imageUrl,
        storeName: metadata.storeName || current.storeName,
      }))
      setSaveMessage('Product details imported. Review and save.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not import that product.')
    } finally {
      setIsImporting(false)
    }
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveMessage('Saving product...')
    try {
      const savedProduct = await createProduct(productDraft)
      setProductEdits((current) => [...current, savedProduct].sort((a, b) => a.sortOrder - b.sortOrder))
      setEditingProductId(savedProduct.id)
      setProductDraft(blankProductDraft)
      setIsAddingProductCategory(false)
      setImportUrl('')
      setSaveMessage(`${savedProduct.title} saved.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save product yet.')
    }
  }

  async function saveExistingProduct(product: Product) {
    setSaveMessage(`Saving ${product.title}...`)
    try {
      const savedProduct = await updateProduct(product)
      setProductEdits((current) => current.map((item) => (item.id === product.id ? savedProduct : item)))
      setEditingProductId(savedProduct.id)
      setSaveMessage(`${savedProduct.title} saved.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save product.')
    }
  }

  async function saveCollectionSettings(collection: ProductCollection) {
    setSaveMessage(`Saving ${collection.title} display...`)
    try {
      const savedCollection = await updateCollectionSettings(collection)
      setCollectionEdits((current) => current.map((item) => (item.id === collection.id ? savedCollection : item)))
      setSaveMessage(`${savedCollection.title} display saved.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save storefront display.')
    }
  }

  async function removeExistingProduct(product: Product) {
    const confirmed = window.confirm(`Delete "${product.title}"? Hiding is safer if you may need it later.`)

    if (!confirmed) {
      return
    }

    setSaveMessage(`Deleting ${product.title}...`)
    try {
      await deleteProduct(product)
      setProductEdits((current) => current.filter((item) => item.id !== product.id))
      setSaveMessage(`${product.title} deleted.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not delete product.')
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a href="/" className="back-link">
          <ArrowLeft size={17} />
          Public page
        </a>
        <div>
          <p className="small-label">Rita Brown admin</p>
          <h1>Links and storefront</h1>
          <p>Manage what visitors see without touching code or database settings.</p>
        </div>
      </header>

      {!isSignedIn ? (
        <form className="admin-panel auth-panel" onSubmit={signIn}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>
          <button className="primary-button" type="submit">
            Sign in
          </button>
          {authMessage ? <p className="form-message">{authMessage}</p> : null}
        </form>
      ) : (
        <>
          <nav className="admin-tabs" aria-label="Admin sections">
            {[
              { id: 'links' as const, label: 'Links', icon: LinkIcon },
              { id: 'products' as const, label: 'Products', icon: ShoppingBag },
              { id: 'profile' as const, label: 'Profile', icon: Camera },
              { id: 'appearance' as const, label: 'Appearance', icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon

              return (
                <button
                  type="button"
                  key={tab.id}
                  className={activeTab === tab.id ? 'active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {saveMessage ? (
            <div className="admin-status" role="status">
              {saveMessage}
            </div>
          ) : null}

          {activeTab === 'links' ? (
            <section className="admin-workspace">
              <div className="workspace-heading">
                <div>
                  <p className="small-label">Most used</p>
                  <h2>Links</h2>
                  <p>Edit the buttons visitors see on the public page. Hide a link instead of deleting it if you may need it later.</p>
                </div>
                <a href="/" className="ghost-button" target="_blank" rel="noreferrer">
                  View page
                  <ExternalLink size={15} />
                </a>
              </div>

              <div className="link-manager compact">
                {linkEdits
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((link) => {
                    const isEditing = editingLinkId === link.id

                    return (
                      <article key={link.id} className={`link-row ${link.isActive ? '' : 'is-hidden'}`}>
                        <div className="link-row-summary">
                          <span className="link-row-icon">
                            <LinkIconGlyph link={link} size={18} />
                          </span>
                          <div>
                            <strong>{link.label || 'Untitled link'}</strong>
                            <span>{link.href}</span>
                          </div>
                          <button
                            type="button"
                            className="visibility-button"
                            onClick={() => updateLinkDraft(link.id, { isActive: !link.isActive })}
                          >
                            {link.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                            {link.isActive ? 'Visible' : 'Hidden'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setEditingLinkId(isEditing ? null : link.id)}
                          >
                            {isEditing ? 'Close' : 'Edit'}
                          </button>
                        </div>

                        {isEditing ? (
                          <div className="link-edit-form">
                            <div className="field-row">
                              <label>
                                Button title
                                <input value={link.label} onChange={(event) => updateLinkDraft(link.id, { label: event.target.value })} />
                              </label>
                              <label>
                                Link URL
                                <input value={link.href} onChange={(event) => updateLinkDraft(link.id, { href: event.target.value })} />
                              </label>
                            </div>
                            <label>
                              Short description
                              <textarea value={link.description} onChange={(event) => updateLinkDraft(link.id, { description: event.target.value })} />
                            </label>
                            <details className="advanced-settings">
                              <summary>Advanced settings</summary>
                              <div className="field-row">
                                <label>
                                  Button style
                                  <select value={link.kind} onChange={(event) => updateLinkDraft(link.id, { kind: event.target.value as BioLink['kind'] })}>
                                    <option value="standard">Standard</option>
                                    <option value="feature">Featured</option>
                                    <option value="storefront">Storefront</option>
                                    <option value="social">Social</option>
                                  </select>
                                </label>
                                <label>
                                  Icon
                                  <select value={link.icon} onChange={(event) => updateLinkDraft(link.id, { icon: event.target.value })}>
                                    <option value="link">Link</option>
                                    <option value="shopping-bag">Bag</option>
                                    <option value="sparkles">Sparkles</option>
                                    <option value="store">Store</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="tiktok">TikTok</option>
                                    <option value="youtube">YouTube</option>
                                    <option value="x">X / Twitter</option>
                                    <option value="threads">Threads</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="pinterest">Pinterest</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="snapchat">Snapchat</option>
                                    <option value="twitch">Twitch</option>
                                    <option value="discord">Discord</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="telegram">Telegram</option>
                                    <option value="substack">Substack</option>
                                    <option value="patreon">Patreon</option>
                                    <option value="linktree">Linktree</option>
                                    <option value="amazon">Amazon</option>
                                    <option value="walmart">Walmart</option>
                                    <option value="target">Target</option>
                                    <option value="shein">Shein</option>
                                    <option value="etsy">Etsy</option>
                                    <option value="shopify">Shopify</option>
                                  </select>
                                </label>
                              </div>
                              <div className="field-row">
                                <label>
                                  Storefront slug
                                  <input value={link.collectionSlug ?? ''} onChange={(event) => updateLinkDraft(link.id, { collectionSlug: event.target.value || undefined })} />
                                </label>
                                <label>
                                  Display order
                                  <input type="number" value={link.sortOrder} onChange={(event) => updateLinkDraft(link.id, { sortOrder: Number(event.target.value) })} />
                                </label>
                              </div>
                              <button type="button" className="danger-button" onClick={() => removeExistingLink(link)}>
                                <Trash2 size={16} />
                                Delete permanently
                              </button>
                            </details>
                            <div className="editor-actions">
                              <button type="button" className="primary-button" onClick={() => saveExistingLink(link)}>
                                <Check size={17} />
                                Save link
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
              </div>

              <form className="admin-panel add-panel" onSubmit={addLink}>
                <div className="panel-title">
                  <Plus size={20} />
                  <h2>Add a new link</h2>
                </div>
                <div className="field-row">
                  <label>
                    Button title
                    <input value={linkDraft.label} onChange={(event) => setLinkDraft({ ...linkDraft, label: event.target.value })} required />
                  </label>
                  <label>
                    Link URL
                    <input value={linkDraft.href} onChange={(event) => setLinkDraft({ ...linkDraft, href: event.target.value })} required />
                  </label>
                </div>
                <label>
                  Short description
                  <textarea value={linkDraft.description} onChange={(event) => setLinkDraft({ ...linkDraft, description: event.target.value })} />
                </label>
                <details className="advanced-settings">
                  <summary>Advanced settings</summary>
                  <div className="field-row">
                    <label>
                      Button style
                      <select value={linkDraft.kind} onChange={(event) => setLinkDraft({ ...linkDraft, kind: event.target.value as AdminDraft['kind'] })}>
                        <option value="standard">Standard</option>
                        <option value="feature">Featured</option>
                        <option value="storefront">Storefront</option>
                        <option value="social">Social</option>
                      </select>
                    </label>
                    <label>
                      Icon
                      <select value={linkDraft.icon} onChange={(event) => setLinkDraft({ ...linkDraft, icon: event.target.value })}>
                        <option value="link">Link</option>
                        <option value="shopping-bag">Bag</option>
                        <option value="sparkles">Sparkles</option>
                        <option value="store">Store</option>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                        <option value="x">X / Twitter</option>
                        <option value="threads">Threads</option>
                        <option value="facebook">Facebook</option>
                        <option value="pinterest">Pinterest</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="snapchat">Snapchat</option>
                        <option value="twitch">Twitch</option>
                        <option value="discord">Discord</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telegram">Telegram</option>
                        <option value="substack">Substack</option>
                        <option value="patreon">Patreon</option>
                        <option value="linktree">Linktree</option>
                        <option value="amazon">Amazon</option>
                        <option value="walmart">Walmart</option>
                        <option value="target">Target</option>
                        <option value="shein">Shein</option>
                        <option value="etsy">Etsy</option>
                        <option value="shopify">Shopify</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Storefront slug
                    <input
                      value={linkDraft.collectionSlug}
                      placeholder="shop-my-finds"
                      onChange={(event) => setLinkDraft({ ...linkDraft, collectionSlug: event.target.value })}
                    />
                  </label>
                </details>
                <button className="primary-button" type="submit">
                  <Plus size={17} />
                  Add link
                </button>
              </form>
            </section>
          ) : null}

          {activeTab === 'products' ? (
            <section className="admin-workspace">
              <div className="workspace-heading">
                <div>
                  <p className="small-label">Storefront</p>
                  <h2>Products</h2>
                  <p>Edit saved products, hide old picks, or paste a new product link to create another card.</p>
                </div>
              </div>
              <section className="admin-panel storefront-settings">
                <div className="panel-title">
                  <Store size={20} />
                  <h2>Storefront display</h2>
                </div>
                {collectionEdits.map((collection) => (
                  <article className="display-style-editor" key={collection.slug}>
                    <div>
                      <strong>{collection.title}</strong>
                      <span>Choose how products appear on the public storefront.</span>
                    </div>
                    <div className="display-style-options" role="radiogroup" aria-label={`${collection.title} display style`}>
                      {displayStyles.map((style) => (
                        <button
                          type="button"
                          key={style.value}
                          className={collection.displayStyle === style.value ? 'active' : ''}
                          onClick={() => updateCollectionDraft(collection.slug, { displayStyle: style.value })}
                          aria-pressed={collection.displayStyle === style.value}
                        >
                          <span className={`display-style-preview display-style-preview-${style.value}`}>
                            <i />
                            <i />
                            <i />
                          </span>
                          <strong>{style.label}</strong>
                          <small>{style.description}</small>
                        </button>
                      ))}
                    </div>
                    <button className="primary-button" type="button" onClick={() => saveCollectionSettings(collection)}>
                      <Check size={17} />
                      Save display style
                    </button>
                  </article>
                ))}
              </section>
              <div className="link-manager compact">
                {productEdits
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((product) => (
                    <article key={product.id} className={`link-row ${product.isActive ? '' : 'is-hidden'}`}>
                      <div className="link-row-summary product-row-summary">
                        {product.imageUrl ? (
                          <img className="product-row-image" src={product.imageUrl} alt="" />
                        ) : (
                          <span className="link-row-icon">
                            <ShoppingBag size={20} />
                          </span>
                        )}
                        <div>
                          <strong>{product.title || 'Untitled product'}</strong>
                          <span>{product.storeName} {product.price ? `/ ${product.price}` : ''}</span>
                        </div>
                        <button
                          type="button"
                          className="visibility-button"
                          onClick={() => updateProductDraft(product.id, { isActive: !product.isActive })}
                        >
                          {product.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                          {product.isActive ? 'Visible' : 'Hidden'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setEditingProductId(editingProductId === product.id ? null : product.id)}
                        >
                          Edit
                        </button>
                      </div>
                      {editingProductId === product.id ? (
                        <form className="link-edit-form" onSubmit={(event) => {
                          event.preventDefault()
                          void saveExistingProduct(product)
                        }}>
                          <div className="field-row">
                            <label>
                              Product title
                              <input value={product.title} onChange={(event) => updateProductDraft(product.id, { title: event.target.value })} required />
                            </label>
                            <label>
                              Store
                              <input value={product.storeName} onChange={(event) => updateProductDraft(product.id, { storeName: event.target.value })} required />
                            </label>
                          </div>
                          <div className="field-row">
                            <label>
                              Price
                              <input value={product.price} onChange={(event) => updateProductDraft(product.id, { price: event.target.value })} />
                            </label>
                            <label>
                              Category
                              <input value={product.category} onChange={(event) => updateProductDraft(product.id, { category: event.target.value })} />
                            </label>
                          </div>
                          <details className="advanced-settings">
                            <summary>Advanced settings</summary>
                            <label>
                              Image URL
                              <input value={product.imageUrl} onChange={(event) => updateProductDraft(product.id, { imageUrl: event.target.value })} required />
                            </label>
                            <label>
                              Product URL
                              <input value={product.href} onChange={(event) => updateProductDraft(product.id, { href: event.target.value })} required />
                            </label>
                            <div className="field-row">
                              <label>
                                Collection
                                <select value={product.collectionSlug} onChange={(event) => updateProductDraft(product.id, { collectionSlug: event.target.value })}>
                                  {collectionEdits.map((collection) => (
                                    <option key={collection.slug} value={collection.slug}>
                                      {collection.title}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Display order
                                <input
                                  type="number"
                                  value={product.sortOrder}
                                  onChange={(event) => updateProductDraft(product.id, { sortOrder: Number(event.target.value) })}
                                />
                              </label>
                            </div>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={product.isFavorite}
                                onChange={(event) => updateProductDraft(product.id, { isFavorite: event.target.checked })}
                              />
                              Mark as Rita pick
                            </label>
                            <button type="button" className="danger-button" onClick={() => removeExistingProduct(product)}>
                              <Trash2 size={15} />
                              Delete permanently
                            </button>
                          </details>
                          <button className="primary-button" type="submit">
                            <Check size={17} />
                            Save changes
                          </button>
                        </form>
                      ) : null}
                    </article>
                  ))}
              </div>
              <form className="admin-panel product-builder" onSubmit={addProduct}>
                <div className="panel-title">
                  <Plus size={20} />
                  <h2>Add a new product</h2>
                </div>
                <div className="import-box primary-import">
                  <input
                    value={importUrl}
                    onChange={(event) => setImportUrl(event.target.value)}
                    placeholder="Paste product URL"
                    type="url"
                  />
                  <button type="button" className="secondary-button" onClick={importProduct} disabled={isImporting}>
                    {isImporting ? <Loader2 size={16} className="spin" /> : <Copy size={16} />}
                    Import
                  </button>
                </div>
                {productDraft.imageUrl || productDraft.title ? (
                  <div className="product-preview-row">
                    {productDraft.imageUrl ? <img src={productDraft.imageUrl} alt="" /> : <span />}
                    <div>
                      <strong>{productDraft.title || 'Imported product'}</strong>
                      <p>{productDraft.storeName || 'Store'} {productDraft.price ? `/ ${productDraft.price}` : ''}</p>
                    </div>
                  </div>
                ) : null}
                <div className="field-row">
                  <label>
                    Product title
                    <input value={productDraft.title} onChange={(event) => setProductDraft({ ...productDraft, title: event.target.value })} required />
                  </label>
                  <label>
                    Store
                    <input value={productDraft.storeName} onChange={(event) => setProductDraft({ ...productDraft, storeName: event.target.value })} required />
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    Price
                    <input value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} />
                  </label>
                  <label>
                    Category
                    <span className="category-select-stack">
                      <select
                        value={isAddingProductCategory ? '__new__' : productDraft.category}
                        onChange={(event) => {
                          if (event.target.value === '__new__') {
                            setIsAddingProductCategory(true)
                            setProductDraft({ ...productDraft, category: '' })
                            return
                          }

                          setIsAddingProductCategory(false)
                          setProductDraft({ ...productDraft, category: event.target.value })
                        }}
                      >
                        {productCategoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                        <option value="__new__">Add new category</option>
                      </select>
                      {isAddingProductCategory ? (
                        <input
                          value={productDraft.category}
                          onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })}
                          placeholder="Type new category"
                          required
                        />
                      ) : null}
                    </span>
                  </label>
                </div>
                <details className="advanced-settings">
                  <summary>Advanced settings</summary>
                  <label>
                    Image URL
                    <input value={productDraft.imageUrl} onChange={(event) => setProductDraft({ ...productDraft, imageUrl: event.target.value })} required />
                  </label>
                  <label>
                    Product URL
                    <input value={productDraft.href} onChange={(event) => setProductDraft({ ...productDraft, href: event.target.value })} required />
                  </label>
                  <label>
                    Collection
                    <select value={productDraft.collectionSlug} onChange={(event) => setProductDraft({ ...productDraft, collectionSlug: event.target.value })}>
                      {collectionEdits.map((collection) => (
                        <option key={collection.slug} value={collection.slug}>
                          {collection.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </details>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={productDraft.isFavorite}
                    onChange={(event) => setProductDraft({ ...productDraft, isFavorite: event.target.checked })}
                  />
                  Mark as Rita pick
                </label>
                <button className="primary-button" type="submit">
                  <Check size={17} />
                  Save product
                </button>
              </form>
            </section>
          ) : null}

          {activeTab === 'profile' ? (
            <section className="admin-workspace">
              <form className="admin-panel" onSubmit={saveProfile}>
                <div className="panel-title">
                  <Camera size={20} />
                  <h2>Profile</h2>
                </div>
                <div className="field-row">
                  <label>
                    Name
                    <input value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} required />
                  </label>
                  <label>
                    Handle
                    <input value={profileDraft.handle} onChange={(event) => setProfileDraft({ ...profileDraft, handle: event.target.value })} required />
                  </label>
                </div>
                <label>
                  Tagline
                  <input value={profileDraft.tagline} onChange={(event) => setProfileDraft({ ...profileDraft, tagline: event.target.value })} required />
                </label>
                <label>
                  Bio
                  <textarea value={profileDraft.bio} onChange={(event) => setProfileDraft({ ...profileDraft, bio: event.target.value })} required />
                </label>
                <label>
                  Status text
                  <input value={profileDraft.statusText} onChange={(event) => setProfileDraft({ ...profileDraft, statusText: event.target.value })} required />
                </label>
                <label>
                  Location / descriptor
                  <input value={profileDraft.location} onChange={(event) => setProfileDraft({ ...profileDraft, location: event.target.value })} required />
                </label>
                <details className="advanced-settings">
                  <summary>Images</summary>
                  <div className="field-row">
                    <label>
                      Avatar image URL
                      <input value={profileDraft.avatarUrl} onChange={(event) => setProfileDraft({ ...profileDraft, avatarUrl: event.target.value })} required />
                    </label>
                    <label>
                      Hero image URL
                      <input value={profileDraft.heroImageUrl} onChange={(event) => setProfileDraft({ ...profileDraft, heroImageUrl: event.target.value })} required />
                    </label>
                  </div>
                </details>
                <button className="primary-button" type="submit">
                  <Check size={17} />
                  Save profile
                </button>
              </form>
            </section>
          ) : null}

          {activeTab === 'appearance' ? (
            <section className="admin-workspace appearance-workspace">
              <div className="workspace-heading">
                <div>
                  <p className="small-label">Preview first</p>
                  <h2>Appearance</h2>
                  <p>Click any theme to preview it immediately. Save only when the preview looks right.</p>
                </div>
              </div>
              <div className="appearance-layout">
                <div className="admin-panel">
                  <label>
                    Current theme
                    <select value={profileDraft.themeSlug} onChange={(event) => previewTheme(event.target.value)}>
                      {themes.map((theme) => (
                        <option key={theme.slug} value={theme.slug}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="theme-picker" aria-label="Theme previews">
                    {themeGroups.map((group) => (
                      <section className="theme-group" key={group.category}>
                        <h3>{group.category}</h3>
                        <div className="theme-group-grid">
                          {group.themes.map((theme) => (
                            <button
                              type="button"
                              key={theme.slug}
                              className={theme.slug === profileDraft.themeSlug ? 'active' : ''}
                              onClick={() => previewTheme(theme.slug)}
                            >
                              <span className="theme-swatch" style={{ background: theme.colors.bodyBg }}>
                                <i style={{ background: theme.colors.featureBg }} />
                                <i style={{ background: theme.colors.accent }} />
                                <i style={{ background: theme.colors.accent3 }} />
                              </span>
                              <strong>{theme.name}</strong>
                              <small>{theme.description}</small>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                  <button className="primary-button" type="button" onClick={saveProfile}>
                    <Check size={17} />
                    Save theme
                  </button>
                </div>
                <aside className="phone-preview" aria-label="Theme preview">
                  <div className="phone-preview-card">
                    <img src={profileDraft.avatarUrl} alt="" />
                    <h3>{profileDraft.name}</h3>
                    <p>{profileDraft.handle}</p>
                    {linkEdits
                      .filter((link) => link.isActive)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .slice(0, 3)
                      .map((link) => (
                        <span key={link.id}>{link.label}</span>
                      ))}
                  </div>
                </aside>
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  )
}

function isLocalPreviewHost() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

export default App
