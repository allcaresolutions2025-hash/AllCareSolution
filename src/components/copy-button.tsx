"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function onClick() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }
  const baseClass = className ?? "btn-outline shrink-0";
  return (
    <button onClick={onClick} className={baseClass} aria-label={label || "Copy"}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
