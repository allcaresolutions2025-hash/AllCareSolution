import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CopyButton } from "@/components/copy-button";
import { Share2, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true, name: true },
  });

  const refId = user?.referralCode ?? "";
  const waText = `Hey! 🌿 I've been using these herbal wellness products from ACHT MART and love them. If you'd like to join, share my Refer ID — ${refId} — with ACHT MART admin or me, and you'll be placed in my team.`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Discover authentic Ayurvedic wellness at ACHT MART. My Refer ID: ${refId}`)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Share &amp; Earn</h1>
        <p className="text-muted-foreground mt-1">
          ACHT MART accounts are created by admin via membership pins. Share your Refer ID below —
          when a new joiner mentions it, admin places them in your team.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold flex items-center gap-2">
          <Share2 className="h-4 w-4 text-brand-600" /> Your Refer ID
        </h2>
        <div className="mt-3 flex items-center gap-2">
          <input
            readOnly
            className="input font-mono text-base font-bold tracking-wide"
            value={refId}
          />
          <CopyButton text={refId} />
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-sky-600" />
          <span>
            Give this code to the prospective member. They share it with ACHT MART
            admin (or you, if you have a pin) and get placed under you on the Left or Right slot.
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary justify-center py-3">
          Share on WhatsApp
        </a>
        <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary justify-center py-3">
          Share on Twitter / X
        </a>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Suggested message</h2>
        <textarea
          readOnly
          rows={4}
          className="input font-sans"
          value={waText}
        />
        <CopyButton text={waText} label="Copy message" />
      </div>
    </div>
  );
}
