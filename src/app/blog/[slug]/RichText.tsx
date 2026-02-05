'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './page.module.css';

type RichTextProps = {
  content: string;
  baseUrl?: string;
};

export default function RichText({ content, baseUrl }: RichTextProps) {
  const withBaseUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return baseUrl ? `${baseUrl}${url}` : url;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (props) => <h2 className={styles.richHeading} {...props} />,
        h2: (props) => <h2 className={styles.richHeading} {...props} />,
        h3: (props) => <h3 className={styles.richHeading} {...props} />,
        h4: (props) => <h4 className={styles.richHeading} {...props} />,
        p: (props) => <p className={styles.richParagraph} {...props} />,
        ul: (props) => <ul className={styles.list} {...props} />,
        ol: (props) => <ol className={styles.list} {...props} />,
        li: (props) => <li className={styles.listItem} {...props} />,
        a: ({ href, ...props }) => {
          const isExternal = href ? !href.startsWith('/') && !href.startsWith('#') : false;
          return (
            <a
              className={styles.link}
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noreferrer' : undefined}
              {...props}
            />
          );
        },
        blockquote: (props) => <blockquote className={styles.markdownQuote} {...props} />,
        pre: (props) => <pre className={styles.codeBlock} {...props} />,
        code: ({ inline, children, ...props }) => {
          if (inline) {
            return (
              <code className={styles.inlineCode} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className={styles.code} {...props}>
              {children}
            </code>
          );
        },
        img: ({ src, alt, ...props }) => {
          const url = src?.startsWith('/') ? withBaseUrl(src) : src;
          return (
            <img
              className={styles.markdownImage}
              src={url || ''}
              alt={alt || 'Image'}
              loading="lazy"
              {...props}
            />
          );
        },
        table: (props) => <table className={styles.table} {...props} />,
        thead: (props) => <thead className={styles.tableHead} {...props} />,
        th: (props) => <th className={styles.tableCell} {...props} />,
        td: (props) => <td className={styles.tableCell} {...props} />,
        hr: (props) => <hr className={styles.divider} {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
