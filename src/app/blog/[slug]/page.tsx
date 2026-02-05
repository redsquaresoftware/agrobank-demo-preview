import { draftMode } from 'next/headers';
import { Fraunces, Manrope } from 'next/font/google';
import { fetchStrapi } from '@/lib/strapi';
import RichText from './RichText';
import styles from './page.module.css';

type StrapiListResponse<T> = {
  data: T[];
  meta: Record<string, unknown>;
};

type MediaAsset = {
  url?: string;
  alternativeText?: string | null;
  caption?: string | null;
  name?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, { url?: string } | undefined>;
  mime?: string | null;
  attributes?: MediaAsset;
  data?: MediaAsset | MediaAsset[] | null;
};

type MediaBlock = {
  __component: 'shared.media';
  file?: MediaAsset | { data?: MediaAsset | MediaAsset[] | null } | null;
};

type QuoteBlock = {
  __component: 'shared.quote';
  title?: string | null;
  body?: string | null;
};

type RichTextBlock = {
  __component: 'shared.rich-text';
  body?: string | null;
};

type SliderBlock = {
  __component: 'shared.slider';
  files?: MediaAsset[] | { data?: MediaAsset[] | null } | null;
};

type UnknownBlock = {
  __component?: string | null;
  [key: string]: unknown;
};

type Block = MediaBlock | QuoteBlock | RichTextBlock | SliderBlock | UnknownBlock;

type Author = {
  name?: string;
  email?: string;
  avatar?: MediaAsset | { data?: MediaAsset | null } | null;
};

type Category = {
  name?: string;
  slug?: string;
  description?: string;
};

type SeoEntry = {
  metaTitle?: string;
  metaDescription?: string;
  shareImage?: MediaAsset | { data?: MediaAsset | null } | null;
};

type Article = {
  id?: number | string;
  documentId?: string;
  title?: string;
  description?: string;
  slug?: string;
  cover?: MediaAsset | { data?: MediaAsset | null } | null;
  author?: unknown;
  category?: unknown;
  blocks?: Block[] | null;
  seo?: SeoEntry[] | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  attributes?: Article;
  [key: string]: unknown;
};

export const dynamic = 'force-dynamic';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';

const withBaseUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${STRAPI_API_URL}${url}`;
};

const extractMediaItems = (value: unknown): MediaAsset[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => extractMediaItems(item))
      .flat()
      .filter(Boolean) as MediaAsset[];
  }

  if (typeof value === 'string') {
    return [{ url: value }];
  }

  if (typeof value === 'object') {
    const record = value as MediaAsset;

    if (record.attributes) {
      return [record.attributes];
    }

    if (record.data) {
      return extractMediaItems(record.data);
    }

    if ('url' in record || 'formats' in record) {
      return [record];
    }
  }

  return [];
};

const getMediaUrl = (asset?: MediaAsset | null) => {
  if (!asset) return null;
  const url = asset.formats?.large?.url || asset.formats?.medium?.url || asset.url;
  return withBaseUrl(url || null);
};

const getEntityAttributes = <T extends Record<string, unknown>>(entity: unknown): T | null => {
  if (!entity || typeof entity !== 'object') return null;
  const record = entity as Record<string, unknown>;
  if ('attributes' in record && record.attributes && typeof record.attributes === 'object') {
    return record.attributes as T;
  }
  return record as T;
};

const getRelation = <T extends Record<string, unknown>>(value: unknown): T | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  if ('data' in record) {
    const data = (record as { data?: unknown }).data;
    if (!data || Array.isArray(data)) {
      return null;
    }
    return getEntityAttributes<T>(data);
  }

  return getEntityAttributes<T>(record);
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default async function BlogArticlePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const isDraft = draftMode().isEnabled;
  const status = typeof searchParams?.status === 'string' ? searchParams.status : isDraft ? 'draft' : 'published';
  const locale = typeof searchParams?.locale === 'string' ? searchParams.locale : undefined;

  const data = await fetchStrapi<StrapiListResponse<Article>>('/api/articles', {
    params: {
      'filters[slug][$eq]': params.slug,
      populate: '*',
      status,
      locale,
    },
  });

  const article = data.data[0];

  if (!article) {
    return (
      <main className={`${manrope.className} ${styles.page}`}>
        <div className={styles.shell}>
          <h1>Article not found</h1>
          <p>Slug: {params.slug}</p>
        </div>
      </main>
    );
  }

  const articleData = getEntityAttributes<Article>(article) || {};
  const author = getRelation<Author>(articleData.author);
  const category = getRelation<Category>(articleData.category);
  const blocks = Array.isArray(articleData.blocks) ? articleData.blocks : [];
  const seoEntries = Array.isArray(articleData.seo) ? articleData.seo : [];
  const coverAsset = extractMediaItems(articleData.cover ?? null)[0];
  const coverUrl = getMediaUrl(coverAsset);
  const authorAvatar = extractMediaItems(author?.avatar ?? null)[0];
  const authorAvatarUrl = getMediaUrl(authorAvatar);
  const statusLabel = status === 'draft' ? 'Draft preview' : 'Published';
  const publishedAt = formatDate(articleData.publishedAt);
  const updatedAt = formatDate(articleData.updatedAt);

  return (
    <main className={`${manrope.className} ${styles.page} ${status === 'draft' ? styles.draft : ''}`}>
      <div className={styles.grain} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>AgroBank Journal</span>
          <h1 className={`${fraunces.className} ${styles.title}`}>{articleData.title || 'Untitled article'}</h1>
          {articleData.description ? <p className={styles.lede}>{articleData.description}</p> : null}
          <div className={styles.badges}>
            <span className={`${styles.badge} ${status === 'draft' ? styles.badgeDraft : styles.badgeLive}`}>
              {statusLabel}
            </span>
            {category?.name ? (
              <span className={`${styles.badge} ${styles.badgeOutline}`}>{category.name}</span>
            ) : null}
            {articleData.slug ? (
              <span className={`${styles.badge} ${styles.badgeOutline}`}>{articleData.slug}</span>
            ) : null}
          </div>
          {coverUrl ? (
            <div className={styles.coverFrame}>
              <img
                src={coverUrl}
                alt={coverAsset?.alternativeText || coverAsset?.name || 'Article cover'}
                className={styles.coverImage}
              />
            </div>
          ) : (
            <div className={styles.coverPlaceholder}>Cover image pending</div>
          )}
        </header>

        <div className={styles.layout}>
          <section className={styles.story}>
            <div className={styles.sectionHeader}>
              <h2 className={fraunces.className}>Article Blocks</h2>
              <p className={styles.muted}>Content modules mapped from the dynamic zone.</p>
            </div>
            <div className={styles.blocks}>
              {blocks.length === 0 ? (
                <article className={styles.card}>
                  <p className={styles.muted}>No content blocks yet.</p>
                </article>
              ) : (
                blocks.map((block, index) => {
                  const delay = 120 + index * 80;

                  switch (block.__component) {
                    case 'shared.rich-text': {
                      const rich = block as RichTextBlock;
                      return (
                        <article
                          key={`rich-${index}`}
                          className={`${styles.card} ${styles.reveal}`}
                          style={{ animationDelay: `${delay}ms` }}
                        >
                          <div className={styles.cardTag}>Rich text</div>
                          <div className={styles.richText}>
                            {rich.body ? (
                              <RichText content={rich.body} baseUrl={STRAPI_API_URL} />
                            ) : (
                              <p className={styles.muted}>No text yet.</p>
                            )}
                          </div>
                        </article>
                      );
                    }
                    case 'shared.quote': {
                      const quote = block as QuoteBlock;
                      return (
                        <article
                          key={`quote-${index}`}
                          className={`${styles.card} ${styles.quote} ${styles.reveal}`}
                          style={{ animationDelay: `${delay}ms` }}
                        >
                          <blockquote>
                            <p>{quote.body || '“Draft quote goes here.”'}</p>
                            {quote.title ? <cite>— {quote.title}</cite> : null}
                          </blockquote>
                        </article>
                      );
                    }
                    case 'shared.media': {
                      const media = block as MediaBlock;
                      const assets = extractMediaItems(media.file ?? null);
                      const asset = assets[0];
                      const url = getMediaUrl(asset);

                      return (
                        <article
                          key={`media-${index}`}
                          className={`${styles.card} ${styles.media} ${styles.reveal}`}
                          style={{ animationDelay: `${delay}ms` }}
                        >
                          <div className={styles.cardTag}>Media</div>
                          {url ? (
                            <img
                              src={url}
                              alt={asset?.alternativeText || asset?.name || 'Media'}
                              className={styles.mediaImage}
                            />
                          ) : (
                            <div className={styles.mediaPlaceholder}>Media coming soon</div>
                          )}
                          {asset?.caption ? <p className={styles.caption}>{asset.caption}</p> : null}
                        </article>
                      );
                    }
                    case 'shared.slider': {
                      const slider = block as SliderBlock;
                      const assets = extractMediaItems(slider.files ?? null);
                      return (
                        <article
                          key={`slider-${index}`}
                          className={`${styles.card} ${styles.slider} ${styles.reveal}`}
                          style={{ animationDelay: `${delay}ms` }}
                        >
                          <div className={styles.cardTag}>Gallery</div>
                          {assets.length === 0 ? (
                            <p className={styles.muted}>No images yet.</p>
                          ) : (
                            <div className={styles.sliderGrid}>
                              {assets.map((asset, assetIndex) => {
                                const url = getMediaUrl(asset);
                                if (!url) return null;
                                return (
                                  <img
                                    key={`slider-${index}-${assetIndex}`}
                                    src={url}
                                    alt={asset?.alternativeText || asset?.name || 'Gallery'}
                                    className={styles.sliderImage}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    }
                    default:
                      return (
                        <article key={`unknown-${index}`} className={`${styles.card} ${styles.reveal}`}>
                          <div className={styles.cardTag}>Unsupported block</div>
                          <pre>{JSON.stringify(block, null, 2)}</pre>
                        </article>
                      );
                  }
                })
              )}
            </div>
          </section>

          <aside className={styles.meta}>
            <article className={`${styles.card} ${styles.metaCard}`}>
              <h3 className={`${fraunces.className} ${styles.metaTitle}`}>Article meta</h3>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{statusLabel}</dd>
                </div>
                {publishedAt ? (
                  <div>
                    <dt>Published</dt>
                    <dd>{publishedAt}</dd>
                  </div>
                ) : null}
                {updatedAt ? (
                  <div>
                    <dt>Updated</dt>
                    <dd>{updatedAt}</dd>
                  </div>
                ) : null}
                {articleData.slug ? (
                  <div>
                    <dt>Slug</dt>
                    <dd>{articleData.slug}</dd>
                  </div>
                ) : null}
              </dl>
            </article>

            {author ? (
              <article className={`${styles.card} ${styles.metaCard}`}>
                <h3 className={`${fraunces.className} ${styles.metaTitle}`}>Author</h3>
                <div className={styles.authorRow}>
                  {authorAvatarUrl ? (
                    <img
                      className={styles.avatar}
                      src={authorAvatarUrl}
                      alt={authorAvatar?.alternativeText || authorAvatar?.name || author.name || 'Author'}
                    />
                  ) : (
                    <div className={styles.avatar} />
                  )}
                  <div>
                    <strong>{author.name || 'Unnamed author'}</strong>
                    {author.email ? <p className={styles.muted}>{author.email}</p> : null}
                  </div>
                </div>
              </article>
            ) : null}

            {category ? (
              <article className={`${styles.card} ${styles.metaCard}`}>
                <h3 className={`${fraunces.className} ${styles.metaTitle}`}>Category</h3>
                <p>
                  <strong>{category.name || 'Uncategorized'}</strong>
                </p>
                {category.description ? <p className={styles.muted}>{category.description}</p> : null}
                {category.slug ? (
                  <div className={styles.pillRow}>
                    <span className={styles.pill}>{category.slug}</span>
                  </div>
                ) : null}
              </article>
            ) : null}

            {seoEntries.length > 0 ? (
              <article className={`${styles.card} ${styles.seoCard}`}>
                <h3 className={`${fraunces.className} ${styles.metaTitle}`}>SEO</h3>
                {seoEntries.map((entry, index) => {
                  const shareAsset = extractMediaItems(entry.shareImage ?? null)[0];
                  const shareUrl = getMediaUrl(shareAsset);
                  return (
                    <div key={`seo-${index}`} style={{ marginBottom: index === seoEntries.length - 1 ? 0 : 16 }}>
                      <h4 className={styles.seoTitle}>{entry.metaTitle || 'Meta title'}</h4>
                      {entry.metaDescription ? <p className={styles.seoDesc}>{entry.metaDescription}</p> : null}
                      {shareUrl ? (
                        <img
                          className={styles.seoImage}
                          src={shareUrl}
                          alt={shareAsset?.alternativeText || shareAsset?.name || 'Share image'}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </article>
            ) : null}
          </aside>
        </div>

        <details className={styles.raw}>
          <summary>Raw response</summary>
          <pre>{JSON.stringify(article, null, 2)}</pre>
        </details>
      </div>
    </main>
  );
}
