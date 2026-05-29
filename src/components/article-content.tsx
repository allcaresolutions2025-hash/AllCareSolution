import React from "react";

// Renders article body text safely (no dangerouslySetInnerHTML):
//   • blank line       → new paragraph
//   • line "## Heading" → <h2>
//   • line "### Heading"→ <h3>
//   • URLs             → clickable links (new tab). Amazon/affiliate links
//                         get rel="sponsored nofollow" per Amazon + SEO rules.
const URL_RE = /(https?:\/\/[^\s<]+)/g;
const AFFILIATE_HOSTS = ["amazon.", "amzn.to", "amzn.eu", "amzn.in"];

function isAffiliate(url: string): boolean {
  const lower = url.toLowerCase();
  return AFFILIATE_HOSTS.some((h) => lower.includes(h));
}

function linkify(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    if (URL_RE.test(part)) {
      URL_RE.lastIndex = 0; // reset stateful regex
      const affiliate = isAffiliate(part);
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={part}
          target="_blank"
          rel={affiliate ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer"}
          className="text-brand-700 underline underline-offset-2 hover:text-brand-800 break-words"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

export function ArticleContent({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/);
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-slate-700">
      {blocks.map((raw, bi) => {
        const block = raw.trim();
        if (!block) return null;
        if (block.startsWith("### ")) {
          return <h3 key={bi} className="text-lg font-bold text-slate-900 pt-2">{linkify(block.slice(4), `h3-${bi}`)}</h3>;
        }
        if (block.startsWith("## ")) {
          return <h2 key={bi} className="text-xl font-bold text-slate-900 pt-2">{linkify(block.slice(3), `h2-${bi}`)}</h2>;
        }
        // Paragraph — preserve single line breaks within it.
        const lines = block.split("\n");
        return (
          <p key={bi}>
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {linkify(line, `p-${bi}-${li}`)}
                {li < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
