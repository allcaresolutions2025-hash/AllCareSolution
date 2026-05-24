import { Mail, MapPin, Clock } from "lucide-react";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container-page max-w-3xl">
      <h1 className="text-3xl font-bold">Contact us</h1>
      <p className="text-muted-foreground mt-1">We&apos;re here to help with orders, returns, and affiliate questions.</p>
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <Card icon={<Mail />} title="Email" body={<a href="mailto:achtmarts2026@gmail.com">achtmarts2026@gmail.com</a>} />
        <Card icon={<MapPin />} title="Address" body={<>12/20, Soosainagar 3rd Street,<br />Vilangudi, Madurai 625018,<br />Tamil Nadu, India</>} />
        <Card icon={<Clock />} title="Hours" body={<>Mon-Sat: 10am-7pm IST<br />Sun: Closed</>} />
      </div>
    </div>
  );
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">{icon}</div>
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
