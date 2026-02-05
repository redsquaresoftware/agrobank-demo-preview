import { draftMode } from 'next/headers';
import { fetchStrapi } from '@/lib/strapi';

type StrapiListResponse<T> = {
  data: T[];
  meta: Record<string, unknown>;
};

type Category = {
  id: number;
  attributes: {
    name?: string;
    slug?: string;
    description?: string;
    [key: string]: unknown;
  };
};

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const isDraft = draftMode().isEnabled;
  const status = typeof searchParams?.status === 'string' ? searchParams.status : isDraft ? 'draft' : 'published';
  const locale = typeof searchParams?.locale === 'string' ? searchParams.locale : undefined;

  const data = await fetchStrapi<StrapiListResponse<Category>>('/api/categories', {
    params: {
      'filters[slug][$eq]': params.slug,
      populate: '*',
      status,
      locale,
    },
  });

  const category = data.data[0];

  if (!category) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Category not found</h1>
        <p>Slug: {params.slug}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>{category.attributes.name || 'Untitled category'}</h1>
      <p>Preview status: {status}</p>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(category, null, 2)}</pre>
    </main>
  );
}
