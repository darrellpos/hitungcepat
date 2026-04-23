// Simple fetcher wrapper for API calls
// Uses relative paths (compatible with Caddy gateway proxy)

export async function fetcher(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok && res.status !== 401) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }))
    console.error(`Fetcher error [${res.status}]:`, errorData.message || res.statusText)
  }

  return res
}
