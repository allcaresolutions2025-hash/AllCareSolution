export const metadata = { title: "30-Day Buyback Policy" };

export default function BuybackPage() {
  return (
    <div className="container-page max-w-3xl prose prose-sm">
      <h1>30-Day Buyback &amp; Refund Policy</h1>
      <p><em>Compliant with the Consumer Protection (Direct Selling) Rules, 2021.</em></p>

      <h2>The promise</h2>
      <p>
        If you&apos;re not satisfied with any ACHT MART product, you may return it for a full
        refund within <strong>30 days of delivery</strong>, no questions asked, provided the
        product is in resaleable condition (unopened or substantially unused).
      </p>

      <h2>How to return</h2>
      <ol>
        <li>Email <a href="mailto:achtmarts2026@gmail.com">achtmarts2026@gmail.com</a> with your order number and reason.</li>
        <li>We&apos;ll send you a return shipping label (free for buyback returns).</li>
        <li>Pack the item and drop with the courier within 7 days.</li>
        <li>Once received and inspected, we refund to your original payment method within 5-7 business days.</li>
      </ol>

      <h2>What happens to commissions on returned orders</h2>
      <p>
        Affiliate commissions for any returned order are automatically reversed. Commissions remain in
        a <em>pending</em> state for the entire 30-day buyback window — they only become payable after
        the window closes without a return.
      </p>

      <h2>Exclusions</h2>
      <ul>
        <li>Products that are clearly used beyond inspection (more than 20% consumed).</li>
        <li>Products damaged by misuse (not by shipping).</li>
        <li>Orders past 30 days from delivery.</li>
      </ul>
    </div>
  );
}
