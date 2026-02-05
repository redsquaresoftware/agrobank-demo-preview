import { draftMode } from 'next/headers';
import { Fraunces, Manrope } from 'next/font/google';
import { fetchStrapi } from '@/lib/strapi';
import styles from './page.module.css';
import RichText from './RichText';

type StrapiSingleResponse<T> = {
  data: T | null;
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

type About = {
  id: number;
  documentId?: string;
  title?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  blocks?: Block[] | null;
};

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

const renderRichText = (body?: string | null) => {
  if (!body) {
    return <p className={styles.muted}>No content yet.</p>;
  }

  return <RichText content={body} baseUrl={STRAPI_API_URL} />;
};

export const dynamic = 'force-dynamic';

export default async function AboutPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const isDraft = draftMode().isEnabled;
  const status =
    typeof searchParams?.status === 'string'
      ? searchParams.status
      : isDraft
        ? 'draft'
        : 'published';
  const locale = typeof searchParams?.locale === 'string' ? searchParams.locale : undefined;

  const data = await fetchStrapi<StrapiSingleResponse<About>>('/api/about', {
    params: {
      populate: '*',
      status,
      locale,
    },
  });

  if (!data.data) {
    return (
      <main className={`${manrope.className} ${styles.page}`}>
        <div className={styles.shell}>
          <h1 className={fraunces.className}>About not found</h1>
        </div>
      </main>
    );
  }

  const about = data.data;
  const blocks = Array.isArray(about.blocks) ? about.blocks : [];
  const displayTitle = about.title || 'About AgroBank';
  const statusLabel = status === 'draft' ? 'Draft preview' : 'Published';

  const renderBlock = (block: Block, index: number) => {
    const delay = 140 + index * 80;

    switch (block.__component) {
      case 'shared.rich-text': {
        const rich = block as RichTextBlock;
        return (
          <article
            key={`rich-${index}`}
            className={`${styles.card} ${styles.reveal}`}
            style={{ animationDelay: `${delay}ms` }}
          >
            <div className={styles.cardTag}>Story</div>
            <div className={styles.richText}>{renderRichText(rich.body)}</div>
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
              <p>{quote.body || '“Growing together with every season.”'}</p>
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
            <div className={styles.cardTag}>Field snapshot</div>
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
            <div className={styles.cardTag}>Field gallery</div>
            {assets.length ? (
              <div className={styles.sliderGrid}>
                {assets.map((asset, assetIndex) => {
                  const url = getMediaUrl(asset);
                  if (!url) return null;

                  return (
                    <img
                      key={`slider-${index}-${assetIndex}`}
                      src={url}
                      alt={asset.alternativeText || asset.name || 'Gallery image'}
                      className={styles.sliderImage}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={styles.mediaPlaceholder}>Gallery coming soon</div>
            )}
          </article>
        );
      }
      default: {
        return (
          <article
            key={`block-${index}`}
            className={`${styles.card} ${styles.reveal}`}
            style={{ animationDelay: `${delay}ms` }}
          >
            <div className={styles.cardTag}>Content</div>
            <p className={styles.muted}>Unsupported block type.</p>
          </article>
        );
      }
    }
  };

  return (
    <main
      className={`${manrope.className} ${styles.page} ${isDraft ? styles.draft : ''}`}
    >
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={`${styles.hero} ${styles.reveal}`} style={{ animationDelay: '80ms' }}>
          <span className={styles.eyebrow}>AgroBank • Agriculture finance</span>
          <h1 className={`${fraunces.className} ${styles.heroTitle}`}>{displayTitle}</h1>
          <div className={styles.badges}>
            <span
              className={`${styles.badge} ${status === 'draft' ? styles.badgeDraft : styles.badgeLive}`}
            >
              {statusLabel}
            </span>
            {locale ? (
              <span className={`${styles.badge} ${styles.badgeOutline}`}>Locale: {locale}</span>
            ) : null}
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.story}>
            <div className={styles.blocks}>
              {blocks.length ? (
                blocks.map(renderBlock)
              ) : (
                <article
                  className={`${styles.card} ${styles.reveal}`}
                  style={{ animationDelay: '160ms' }}
                >
                  <div className={styles.cardTag}>Waiting on content</div>
                  <p className={styles.muted}>
                    Add rich text, quotes, or media blocks in Strapi to bring this story to life.
                  </p>
                </article>
              )}
            </div>
          </section>

          <aside className={styles.meta}>
            <div className={`${styles.card} ${styles.metaCard} ${styles.reveal}`} style={{ animationDelay: '200ms' }}>
              <h3 className={`${fraunces.className} ${styles.metaTitle}`}>Record</h3>
              <dl>
                <div>
                  <dt>Document ID</dt>
                  <dd>{about.documentId || '—'}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{about.createdAt ? new Date(about.createdAt).toLocaleString() : '—'}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{about.updatedAt ? new Date(about.updatedAt).toLocaleString() : '—'}</dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>{about.publishedAt ? new Date(about.publishedAt).toLocaleString() : 'Draft'}</dd>
                </div>
                <div>
                  <dt>Blocks</dt>
                  <dd>{blocks.length}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        <details className={`${styles.raw} ${styles.reveal}`} style={{ animationDelay: '360ms' }}>
          <summary>Raw JSON</summary>
          <pre>{JSON.stringify(about, null, 2)}</pre>
        </details>
      </div>
    </main>
  );
}
