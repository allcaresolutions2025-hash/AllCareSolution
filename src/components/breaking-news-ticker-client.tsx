"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Radio } from "lucide-react";

type Post = { id: string; title: string };

export function BreakingNewsTickerClient({
  posts,
  latestId,
}: {
  posts: Post[];
  latestId: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show unless the user has already dismissed this exact latest post
    const dismissed = localStorage.getItem("achtmart_news_dismissed") === latestId;
    setVisible(!dismissed);
  }, [latestId]);

  function dismiss() {
    localStorage.setItem("achtmart_news_dismissed", latestId);
    setVisible(false);
  }

  if (!visible) return null;

  // Build the ticker text: join all titles with a separator, duplicate for seamless loop
  const text = posts.map((p) => p.title).join("   ·   ");

  return (
    <div className="relative flex items-center bg-brand-700 text-white text-sm overflow-hidden h-9 z-50 shrink-0">
      {/* Label */}
      <div className="flex items-center gap-1.5 shrink-0 bg-red-600 px-3 h-full font-bold text-xs uppercase tracking-widest select-none">
        <Radio className="h-3.5 w-3.5 animate-pulse" />
        <span>Live</span>
      </div>

      {/* Scrolling text — click to open news */}
      <Link
        href="/affiliate/dashboard/news"
        className="flex-1 overflow-hidden h-full flex items-center hover:underline focus:outline-none focus:ring-2 focus:ring-white/40"
        aria-label="Read latest news"
      >
        <div className="ticker-track whitespace-nowrap will-change-transform">
          <span className="px-6 opacity-95">{text}</span>
          {/* Duplicate for seamless loop */}
          <span className="px-6 opacity-95">{text}</span>
        </div>
      </Link>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Hide news ticker"
        className="shrink-0 h-full px-3 hover:bg-white/10 transition-colors flex items-center"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
