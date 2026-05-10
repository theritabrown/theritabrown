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
  Music2,
  Palette,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react'
import './App.css'
import { bioLinks as demoLinks, collections as demoCollections, products as demoProducts, profile as demoProfile } from './data'
import {
  createBioLink,
  createProduct,
  hasSupabaseConfig,
  loadSiteData,
  supabase,
  deleteBioLink,
  updateBioLink,
  updateProfile,
} from './supabase'
import { themes, themeStyle } from './themes'
import type { AdminDraft, BioLink, Product, ProductCollection, ProductMetadata, Profile } from './types'

type SiteData = {
  profile: Profile
  links: BioLink[]
  collections: ProductCollection[]
  products: Product[]
}

const iconMap = {
  sparkles: Sparkles,
  'shopping-bag': ShoppingBag,
  store: Store,
  instagram: Camera,
  music: Music2,
  home: Home,
  link: LinkIcon,
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

function App() {
  const [siteData, setSiteData] = useState<SiteData>({
    profile: demoProfile,
    links: demoLinks,
    collections: demoCollections,
    products: demoProducts,
  })
  const [status, setStatus] = useState(
    hasSupabaseConfig ? 'Loading creator edit...' : 'Preview mode with demo data',
  )
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
        setStatus('Live content synced')
      })
      .catch((error) => {
        console.error(error)
        if (isMounted) {
          setUsingDemoData(true)
          setStatus('Preview mode with demo data')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const variables = themeStyle(siteData.profile.themeSlug)

    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, String(value))
    })

    document.documentElement.dataset.theme = siteData.profile.themeSlug
  }, [siteData.profile.themeSlug])

  const path = window.location.pathname
  const storefrontMatch = path.match(/^\/store\/([^/]+)/)

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
        collections={siteData.collections}
        products={siteData.products}
        profile={siteData.profile}
      />
    )
  }

  return <PublicHome data={siteData} status={status} usingDemoData={usingDemoData} />
}

function PublicHome({
  data,
  status,
  usingDemoData,
}: {
  data: SiteData
  status: string
  usingDemoData: boolean
}) {
  const featuredCollection = data.collections[0]
  const featuredProducts = data.products.slice(0, 4)

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
          <p className="sync-state">{usingDemoData ? 'Preview' : 'Live'} / {status}</p>
          <h1>{data.profile.name}</h1>
          <p className="handle">{data.profile.handle}</p>
          <p className="bio">{data.profile.tagline}</p>
          <div className="social-row" aria-label="Social links">
            <a href="https://www.instagram.com/ritabrowne" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Camera size={18} />
            </a>
            <a href="https://www.tiktok.com/@ritabrowne" target="_blank" rel="noreferrer" aria-label="TikTok">
              <Music2 size={18} />
            </a>
            <a href="/admin" aria-label="Admin">
              <Store size={18} />
            </a>
          </div>
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
  const Icon = iconMap[link.icon as keyof typeof iconMap] ?? LinkIcon
  const isInternal = link.href.startsWith('/')

  return (
    <a
      className={`bio-link ${link.kind}`}
      href={link.href}
      target={isInternal ? undefined : '_blank'}
      rel={isInternal ? undefined : 'noreferrer'}
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <span className="link-icon">
        <Icon size={20} />
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
  collections,
  products,
  profile,
}: {
  collectionSlug: string
  collections: ProductCollection[]
  products: Product[]
  profile: Profile
}) {
  const collection = collections.find((item) => item.slug === collectionSlug) ?? collections[0]
  const collectionProducts = products.filter((product) => product.collectionSlug === collection?.slug)
  const [activeCategory, setActiveCategory] = useState('All')
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(collectionProducts.map((product) => product.category)))],
    [collectionProducts],
  )
  const visibleProducts =
    activeCategory === 'All'
      ? collectionProducts
      : collectionProducts.filter((product) => product.category === activeCategory)

  if (!collection) {
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
          <img src={collection.heroImageUrl} alt="" />
        </div>
        <p className="small-label">{profile.name}'s storefront</p>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
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

      <section className="product-grid" aria-label="Products">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </main>
  )
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

function Admin({ data, usingDemoData }: { data: SiteData; usingDemoData: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignedIn, setIsSignedIn] = useState(usingDemoData)
  const [authMessage, setAuthMessage] = useState(usingDemoData ? 'Preview admin enabled until Supabase is connected.' : '')
  const [profileDraft, setProfileDraft] = useState(data.profile)
  const [linkEdits, setLinkEdits] = useState(data.links)
  const [linkDraft, setLinkDraft] = useState<AdminDraft>(blankLinkDraft)
  const [productDraft, setProductDraft] = useState(blankProductDraft)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('Signing in...')

    if (!supabase) {
      setIsSignedIn(true)
      setAuthMessage('Preview admin enabled. Add Supabase env vars for real auth.')
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
      await createBioLink({
        label: linkDraft.label,
        href: linkDraft.href,
        description: linkDraft.description,
        icon: linkDraft.icon,
        kind: linkDraft.kind,
        collectionSlug: linkDraft.collectionSlug || undefined,
      })
      setLinkDraft(blankLinkDraft)
      setSaveMessage('Link saved. Refresh to see live content.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save link yet.')
    }
  }

  async function saveExistingLink(link: BioLink) {
    setSaveMessage(`Saving ${link.label}...`)
    try {
      await updateBioLink(link)
      setSaveMessage(`${link.label} saved.`)
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
      await deleteBioLink(link.id)
      setLinkEdits((current) => current.filter((item) => item.id !== link.id))
      setSaveMessage(`${link.label} deleted.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not delete link.')
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveMessage('Saving profile...')
    try {
      await updateProfile(profileDraft)
      setSaveMessage('Profile saved. Refresh to see live content.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save profile yet.')
    }
  }

  async function importProduct() {
    if (!importUrl) {
      return
    }
    setIsImporting(true)
    setSaveMessage('Reading product page...')

    try {
      const response = await fetch(`/.netlify/functions/extract-product?url=${encodeURIComponent(importUrl)}`)
      const metadata = (await response.json()) as ProductMetadata

      if (!response.ok) {
        throw new Error(metadata.description || 'Could not read this product page.')
      }

      setProductDraft((current) => ({
        ...current,
        title: metadata.title || current.title,
        href: metadata.url || importUrl,
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
      await createProduct(productDraft)
      setProductDraft(blankProductDraft)
      setImportUrl('')
      setSaveMessage('Product saved. Refresh to see live content.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save product yet.')
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
          <p>Add Linktree-style buttons and product cards from any shop URL.</p>
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
        <div className="admin-grid">
          <form className="admin-panel admin-panel-wide" onSubmit={saveProfile}>
            <div className="panel-title">
              <Camera size={20} />
              <h2>Edit profile</h2>
            </div>
            <div className="field-row">
              <label>
                Name
                <input
                  value={profileDraft.name}
                  onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Handle
                <input
                  value={profileDraft.handle}
                  onChange={(event) => setProfileDraft({ ...profileDraft, handle: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Tagline
              <input
                value={profileDraft.tagline}
                onChange={(event) => setProfileDraft({ ...profileDraft, tagline: event.target.value })}
                required
              />
            </label>
            <label>
              Bio
              <textarea
                value={profileDraft.bio}
                onChange={(event) => setProfileDraft({ ...profileDraft, bio: event.target.value })}
                required
              />
            </label>
            <div className="field-row">
              <label>
                Avatar image URL
                <input
                  value={profileDraft.avatarUrl}
                  onChange={(event) => setProfileDraft({ ...profileDraft, avatarUrl: event.target.value })}
                  required
                />
              </label>
              <label>
                Hero image URL
                <input
                  value={profileDraft.heroImageUrl}
                  onChange={(event) => setProfileDraft({ ...profileDraft, heroImageUrl: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Theme
              <select
                value={profileDraft.themeSlug}
                onChange={(event) => setProfileDraft({ ...profileDraft, themeSlug: event.target.value })}
              >
                {themes.map((theme) => (
                  <option key={theme.slug} value={theme.slug}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="theme-picker" aria-label="Theme previews">
              {themes.map((theme) => (
                <button
                  type="button"
                  key={theme.slug}
                  className={theme.slug === profileDraft.themeSlug ? 'active' : ''}
                  onClick={() => setProfileDraft({ ...profileDraft, themeSlug: theme.slug })}
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
            <label>
              Location / descriptor
              <input
                value={profileDraft.location}
                onChange={(event) => setProfileDraft({ ...profileDraft, location: event.target.value })}
                required
              />
            </label>
            <button className="primary-button" type="submit">
              <Check size={17} />
              Save profile
            </button>
          </form>

          <section className="admin-panel admin-panel-wide">
            <div className="panel-title">
              <Palette size={20} />
              <h2>Manage existing links</h2>
            </div>
            <div className="link-manager">
              {linkEdits
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((link) => (
                  <article key={link.id} className={`link-editor ${link.isActive ? '' : 'is-hidden'}`}>
                    <div className="link-editor-head">
                      <div>
                        <strong>{link.label || 'Untitled link'}</strong>
                        <span>{link.isActive ? 'Visible on public page' : 'Hidden from public page'}</span>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={link.isActive ? 'Hide link' : 'Show link'}
                        onClick={() =>
                          setLinkEdits((current) =>
                            current.map((item) =>
                              item.id === link.id ? { ...item, isActive: !item.isActive } : item,
                            ),
                          )
                        }
                      >
                        {link.isActive ? <Eye size={17} /> : <EyeOff size={17} />}
                      </button>
                    </div>
                    <div className="field-row">
                      <label>
                        Label
                        <input
                          value={link.label}
                          onChange={(event) =>
                            setLinkEdits((current) =>
                              current.map((item) =>
                                item.id === link.id ? { ...item, label: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        URL
                        <input
                          value={link.href}
                          onChange={(event) =>
                            setLinkEdits((current) =>
                              current.map((item) =>
                                item.id === link.id ? { ...item, href: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Description
                      <textarea
                        value={link.description}
                        onChange={(event) =>
                          setLinkEdits((current) =>
                            current.map((item) =>
                              item.id === link.id ? { ...item, description: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <div className="field-row">
                      <label>
                        Type
                        <select
                          value={link.kind}
                          onChange={(event) =>
                            setLinkEdits((current) =>
                              current.map((item) =>
                                item.id === link.id
                                  ? { ...item, kind: event.target.value as BioLink['kind'] }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="standard">Standard</option>
                          <option value="feature">Featured</option>
                          <option value="storefront">Storefront</option>
                          <option value="social">Social</option>
                        </select>
                      </label>
                      <label>
                        Icon
                        <select
                          value={link.icon}
                          onChange={(event) =>
                            setLinkEdits((current) =>
                              current.map((item) =>
                                item.id === link.id ? { ...item, icon: event.target.value } : item,
                              ),
                            )
                          }
                        >
                          <option value="link">Link</option>
                          <option value="shopping-bag">Bag</option>
                          <option value="sparkles">Sparkles</option>
                          <option value="store">Store</option>
                          <option value="instagram">Instagram</option>
                          <option value="music">Music</option>
                        </select>
                      </label>
                    </div>
                    <div className="field-row">
                      <label>
                        Storefront slug
                        <input
                          value={link.collectionSlug ?? ''}
                          onChange={(event) =>
                            setLinkEdits((current) =>
                              current.map((item) =>
                                item.id === link.id
                                  ? { ...item, collectionSlug: event.target.value || undefined }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Sort order
                        <input
                          type="number"
                          value={link.sortOrder}
                          onChange={(event) =>
                            setLinkEdits((current) =>
                              current.map((item) =>
                                item.id === link.id
                                  ? { ...item, sortOrder: Number(event.target.value) }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <div className="editor-actions">
                      <button type="button" className="primary-button" onClick={() => saveExistingLink(link)}>
                        <Check size={17} />
                        Save changes
                      </button>
                      <button type="button" className="secondary-button" onClick={() => removeExistingLink(link)}>
                        <Trash2 size={17} />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <form className="admin-panel" onSubmit={addLink}>
            <div className="panel-title">
              <LinkIcon size={20} />
              <h2>Add a bio link</h2>
            </div>
            <label>
              Label
              <input value={linkDraft.label} onChange={(event) => setLinkDraft({ ...linkDraft, label: event.target.value })} required />
            </label>
            <label>
              URL
              <input value={linkDraft.href} onChange={(event) => setLinkDraft({ ...linkDraft, href: event.target.value })} required />
            </label>
            <label>
              Description
              <textarea value={linkDraft.description} onChange={(event) => setLinkDraft({ ...linkDraft, description: event.target.value })} />
            </label>
            <div className="field-row">
              <label>
                Type
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
                  <option value="music">Music</option>
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
            <button className="primary-button" type="submit">
              <Plus size={17} />
              Save link
            </button>
          </form>

          <form className="admin-panel" onSubmit={addProduct}>
            <div className="panel-title">
              <ShoppingBag size={20} />
              <h2>Add storefront product</h2>
            </div>
            <div className="import-box">
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
            <label>
              Product title
              <input value={productDraft.title} onChange={(event) => setProductDraft({ ...productDraft, title: event.target.value })} required />
            </label>
            <div className="field-row">
              <label>
                Store
                <input value={productDraft.storeName} onChange={(event) => setProductDraft({ ...productDraft, storeName: event.target.value })} required />
              </label>
              <label>
                Price
                <input value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} />
              </label>
            </div>
            <label>
              Image URL
              <input value={productDraft.imageUrl} onChange={(event) => setProductDraft({ ...productDraft, imageUrl: event.target.value })} required />
            </label>
            <label>
              Product URL
              <input value={productDraft.href} onChange={(event) => setProductDraft({ ...productDraft, href: event.target.value })} required />
            </label>
            <div className="field-row">
              <label>
                Category
                <input value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })} />
              </label>
              <label>
                Collection
                <select value={productDraft.collectionSlug} onChange={(event) => setProductDraft({ ...productDraft, collectionSlug: event.target.value })}>
                  {data.collections.map((collection) => (
                    <option key={collection.slug} value={collection.slug}>
                      {collection.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
        </div>
      )}

      <section className="admin-panel admin-preview">
        <div className="panel-title">
          <Store size={20} />
          <h2>Content snapshot</h2>
        </div>
        <div className="snapshot-list">
          {linkEdits.slice(0, 4).map((link) => (
            <span key={link.id}>{link.label}</span>
          ))}
        </div>
        <div className="snapshot-list">
          {data.products.slice(0, 4).map((product) => (
            <span key={product.id}>{product.title}</span>
          ))}
        </div>
        {saveMessage ? <p className="form-message">{saveMessage}</p> : null}
      </section>
    </main>
  )
}

export default App
