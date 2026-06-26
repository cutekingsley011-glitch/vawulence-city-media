import { useState } from "react";
import { Shield, FileCheck, Video, Phone, CalendarCheck, Megaphone, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_WA = import.meta.env.VITE_ADMIN_WA ?? "2348000000000";

interface Service {
  key: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  description: string;
  color: string;
  bg: string;
}

const SERVICES: Service[] = [
  {
    key: "escrow",
    icon: Shield,
    title: "Escrow",
    tagline: "Safe buyer-seller transactions",
    description:
      "We hold funds in trust between buyer and seller until both parties are satisfied. Our escrow service protects you from fraud — the buyer deposits, we confirm, seller delivers, then we release funds. Suitable for high-value goods, freelance projects, land deals, and more.\n\nHow it works:\n1. Both parties agree and contact admin\n2. Buyer sends funds to VCM escrow account\n3. Seller delivers goods/service\n4. Buyer confirms receipt\n5. Admin releases payment to seller",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    key: "cac",
    icon: FileCheck,
    title: "CAC Registration",
    tagline: "Register your business officially",
    description:
      "We handle business name and company registration with the Corporate Affairs Commission (CAC) on your behalf — fast, reliable, and stress-free.\n\nWhat we cover:\n• Business Name Registration\n• Private Limited Company (Ltd) incorporation\n• Obtaining CAC Certificate\n• Post-incorporation filings\n\nJust provide your preferred business name and details, and we take care of the rest.",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  {
    key: "content",
    icon: Video,
    title: "Content Creation",
    tagline: "Professional content for your brand",
    description:
      "Elevate your brand with professional content creation services from our in-house team.\n\nWe offer:\n• Photography (products, portraits, events)\n• Video production (promos, interviews, reels)\n• Social media content packages\n• Graphic design and flyers\n• Copywriting and captions\n\nWhether you're a small business or a public figure, we create content that connects with your audience.",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  {
    key: "numbers",
    icon: Phone,
    title: "Country Numbers",
    tagline: "International numbers for any country",
    description:
      "Get verified virtual phone numbers for any country — USA, UK, Canada, Germany, and more.\n\nUse cases:\n• Verifying international apps and platforms\n• Business caller ID in a foreign country\n• WhatsApp and Telegram registrations\n• Anonymous communication\n\nNumbers are typically delivered within minutes. Contact admin with your preferred country.",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
  },
  {
    key: "events",
    icon: CalendarCheck,
    title: "Event Planning",
    tagline: "From concept to execution",
    description:
      "Need help planning your next event? Vawulence City Media offers full event planning and coordination services — from concept to execution.\n\nWhat we handle:\n• Venue sourcing and booking\n• Event design and décor\n• MC, DJ, and entertainment sourcing\n• Photography and videography coverage\n• Guest management and logistics\n• Corporate events, birthdays, weddings, and more\n\nContact admin with your event type, date, and budget to get started.",
    color: "text-pink-700",
    bg: "bg-pink-50 border-pink-200",
  },
  {
    key: "ads",
    icon: Megaphone,
    title: "Ads & Business Promotion",
    tagline: "Put your brand in front of thousands",
    description:
      "Want your business in front of thousands across Ebonyi State? Vawulence City Media offers business promotion and advertising packages tailored to your brand.",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
];

export default function ServicesPage() {
  const [selected, setSelected] = useState<Service | null>(null);

  if (selected) {
    const Icon = selected.icon;
    const waText = encodeURIComponent(`Hi, I'm interested in the ${selected.title} service on VCM`);
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </button>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${selected.bg} ${selected.color}`}>
          <Icon className="w-4 h-4" />
          {selected.title}
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">{selected.title}</h1>
        <p className="text-muted-foreground text-sm mb-5">{selected.tagline}</p>
        <div className="bg-muted/40 rounded-xl p-5 mb-6">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.description}</p>
        </div>
        <a href={`https://wa.me/${ADMIN_WA}?text=${waText}`} target="_blank" rel="noopener noreferrer">
          <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-base">
            <MessageCircle className="w-5 h-5" />
            Contact Admin on WhatsApp
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Services</h1>
      <p className="text-sm text-muted-foreground mb-6">VCM-backed services to help you thrive. Tap any service for details.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {SERVICES.map((svc) => {
          const Icon = svc.icon;
          return (
            <button
              key={svc.key}
              onClick={() => setSelected(svc)}
              className={`text-left border rounded-xl p-5 transition-shadow hover:shadow-md ${svc.bg}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${svc.color} bg-white/60 border ${svc.bg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h2 className={`font-bold text-base mb-0.5 ${svc.color}`}>{svc.title}</h2>
              <p className="text-sm text-muted-foreground">{svc.tagline}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
