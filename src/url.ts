const schemePattern = /^[a-z][a-z0-9+.-]*:/i

export function normalizeUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed || schemePattern.test(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  if (trimmed.startsWith('/')) {
    return trimmed
  }

  return `https://${trimmed}`
}
