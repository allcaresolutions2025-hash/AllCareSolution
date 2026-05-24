export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl prose prose-sm">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: 22 May 2026</em></p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> name, email, phone, password (hashed)</li>
        <li><strong>Orders:</strong> shipping address, items purchased, payment reference (we do not store card details — handled by Razorpay)</li>
        <li><strong>KYC (affiliates only):</strong> PAN, bank account, IFSC, account-holder name — used solely for payout processing and TDS compliance</li>
        <li><strong>Technical:</strong> IP address, user-agent, basic analytics</li>
      </ul>

      <h2>How we use it</h2>
      <p>To fulfil orders, process payouts, comply with tax law, prevent fraud, and improve the service. We do not sell your data.</p>

      <h2>Sharing</h2>
      <p>We share data only with: (a) shipping couriers (name, address, phone), (b) Razorpay (payment processing), (c) statutory authorities when required by law.</p>

      <h2>Retention</h2>
      <p>Order and financial records are retained for 8 years to satisfy income-tax and GST requirements.</p>

      <h2>Your rights</h2>
      <p>Under the Digital Personal Data Protection Act, 2023, you may request access, correction, or erasure of your personal data by writing to support@achtmart.com.</p>

      <h2>Security</h2>
      <p>Passwords are hashed using bcrypt. All traffic is encrypted with TLS. Sensitive financial data is encrypted at rest.</p>

      <h2>Cookies</h2>
      <p>We use a session cookie to keep you signed in. We do not use third-party tracking cookies.</p>

      <h2>Contact</h2>
      <p>Data Protection Officer: <a href="mailto:support@achtmart.com">support@achtmart.com</a></p>
    </div>
  );
}
