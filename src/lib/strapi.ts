const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

type QueryParams = Record<string, string | number | undefined>;

type FetchOptions = {
  params?: QueryParams;
};

const buildQuery = (params: QueryParams) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
};

export const fetchStrapi = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const url = new URL(path, STRAPI_API_URL);
  const query = options.params ? buildQuery(options.params) : '';
  if (query) {
    url.search = query;
  }

  const res = await fetch(url.toString(), {
    headers: {
      ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi request failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<T>;
};
