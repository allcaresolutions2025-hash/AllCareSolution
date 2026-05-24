import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { AchtMartLogo } from "./acht-mart-logo";
import type { SiteBrand } from "@/lib/brand";

export function SiteFooter({ brand }: { brand: SiteBrand }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-brand-950 text-brand-100 mt-16">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="mb-3">
            <AchtMartLogo size="md" imageUrl={brand.logoUrl} alt={`${brand.siteName} logo`} />
          </div>
          <p className="text-sm text-brand-300">
            Premium Ayurvedic &amp; herbal wellness products, manufactured in India,
            sold direct-to-consumer with an ethical points &amp; rewards program.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-3">Shop</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-white">All Products</Link></li>
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">My Orders</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-3">Earn With Us</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/affiliate" className="hover:text-white">Points Program</Link></li>
            <li><Link href="/legal/direct-selling" className="hover:text-white">How the Points System Works</Link></li>
            <li><Link href="/legal/terms" className="hover:text-white">Terms & Conditions</Link></li>
            <li><Link href="/legal/buyback" className="hover:text-white">30-Day Buyback</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-white">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-3">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>12/20, Soosainagar 3rd Street, Vilangudi, Madurai 625018, Tamil Nadu</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> <a href="mailto:achtmarts2026@gmail.com">achtmarts2026@gmail.com</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-800">
        <div className="container py-4 text-xs flex flex-col md:flex-row items-center justify-between gap-2 text-brand-300">
          <p>© {year} All Care Herbal Traders. All rights reserved.</p>
          <p>
            Points are an internal loyalty unit only — no cash value, not redeemable for money, never transferred to a bank account.
          </p>
        </div>
      </div>
    </footer>
  );
}
