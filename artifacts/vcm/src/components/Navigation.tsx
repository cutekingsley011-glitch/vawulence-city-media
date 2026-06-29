import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Home, FileText, Vote, Trophy, ShoppingBag, CalendarDays,
  Heart, Briefcase, MessageCircle, Award, Flag, Flame,
  Menu, Shield, FileCheck, Video, Phone, CalendarCheck, Megaphone,
  ArrowLeft,
} from "lucide-react";
import { ProfileTrigger } from "./ProfilePanel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// ── All scrollable tabs ───────────────────────────────────────────────────────
// Services is now in the hamburger drawer, not the tab strip
const ALL_TABS = [
  { label: "Home",        href: "/",              icon: Home },
  { label: "Spill 🔥",    href: "/spill",         icon: Flame },
  { label: "Marketplace", href: "/marketplace",   icon: ShoppingBag },
  { label: "Connections", href: "/connections",   icon: Heart },
  { label: "Report Case", href: "/report-case",   icon: Flag },
  { label: "Gists",       href: "/gists",         icon: FileText },
  { label: "Polls",       href: "/polls",         icon: Vote },
  { label: "Events",      href: "/events",        icon: CalendarDays },
  { label: "Recruitment", href: "/recruitment",   icon: Briefcase },
  { label: "Leaderboard", href: "/leaderboard",   icon: Trophy },
  { label: "Chat Room",   href: "/chat",          icon: MessageCircle },
  { label: "Contests",    href: "/contests",      icon: Award },
] as const;

// Desktop nav shows the first 6 without overflow
const DESKTOP_TABS = ALL_TABS.slice(0, 6);

// ── Services data (same cards, same WA links) ─────────────────────────────────
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

// ── Services drawer content ───────────────────────────────────────────────────
function ServicesDrawer({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Service | null>(null);

  if (selected) {
    const Icon = selected.icon;
    const waText = encodeURIComponent(`Hi, I'm interested in the ${selected.title} service on VCM`);
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-5 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </button>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${selected.bg} ${selected.color}`}>
          <Icon className="w-4 h-4" />
          {selected.title}
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">{selected.title}</h2>
        <p className="text-muted-foreground text-sm mb-5">{selected.tagline}</p>
        <div className="bg-muted/40 rounded-xl p-4 mb-6 flex-1 overflow-y-auto">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.description}</p>
        </div>
        <a
          href={`https://wa.me/${ADMIN_WA}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="shrink-0"
        >
          <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-base">
            <MessageCircle className="w-5 h-5" />
            Contact Admin on WhatsApp
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold mb-1 shrink-0">Services</h2>
      <p className="text-xs text-muted-foreground mb-4 shrink-0">Tap any service for details.</p>
      <div className="flex flex-col gap-3 overflow-y-auto flex-1">
        {SERVICES.map((svc) => {
          const Icon = svc.icon;
          return (
            <button
              key={svc.key}
              onClick={() => setSelected(svc)}
              className={`text-left border rounded-xl p-4 transition-shadow hover:shadow-md ${svc.bg}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${svc.color} bg-white/60 border ${svc.bg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className={`font-bold text-sm ${svc.color}`}>{svc.title}</p>
                  <p className="text-xs text-muted-foreground">{svc.tagline}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isActive(href: string, location: string) {
  if (href === "/") return location === "/";
  return location.startsWith(href);
}

function useLongPress(onLongPress: () => void, ms = 5000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useCallback(() => {
    timerRef.current = setTimeout(onLongPress, ms);
  }, [onLongPress, ms]);
  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);
  return {
    onMouseDown: start, onMouseUp: cancel, onMouseLeave: cancel,
    onTouchStart: start, onTouchEnd: cancel, onTouchCancel: cancel,
  };
}

// ── Mobile top header ─────────────────────────────────────────────────────────
export function MobileHeader() {
  const [, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logoLongPress = useLongPress(() => navigate("/admin"), 5000);
  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-border h-11 flex items-center justify-between px-3">
        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open services menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo + wordmark — centred between hamburger and profile */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => navigate("/")}
          {...logoLongPress}
        >
          <img
            src="/vcm-logo.png"
            alt="VCM"
            className="h-7 w-auto object-contain"
            draggable={false}
          />
          <span className="font-bold text-sm text-foreground leading-tight">
            Vawulence City Media
          </span>
        </div>

        <ProfileTrigger />
      </header>

      {/* Services drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[340px] flex flex-col p-5">
          <SheetTitle className="sr-only">Services</SheetTitle>
          <ServicesDrawer onClose={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Desktop top nav ───────────────────────────────────────────────────────────
export function TopNav() {
  const [location, navigate] = useLocation();
  const logoLongPress = useLongPress(() => navigate("/admin"), 5000);

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-border shadow-sm h-14 items-center px-6 gap-0">
      <img
        src="/vcm-logo.png"
        alt="VCM"
        className="h-8 w-auto object-contain mr-6 select-none cursor-pointer"
        draggable={false}
        {...logoLongPress}
        onClick={() => navigate("/")}
      />
      <nav className="flex items-center gap-1 flex-1">
        {DESKTOP_TABS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href, location);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <ProfileTrigger />
    </header>
  );
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
export function BottomNav() {
  const [location] = useLocation();
  const stripRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const activeIdx = ALL_TABS.findIndex((t) => isActive(t.href, location));
    if (activeIdx < 0) return;
    const el = tabRefs.current[activeIdx];
    const strip = stripRef.current;
    if (!el || !strip) return;
    const elLeft = el.offsetLeft;
    const elRight = elLeft + el.offsetWidth;
    const stripLeft = strip.scrollLeft;
    const stripRight = stripLeft + strip.offsetWidth;
    if (elLeft < stripLeft || elRight > stripRight) {
      strip.scrollTo({ left: elLeft - 16, behavior: "smooth" });
    }
  }, [location]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="bottom-nav"
    >
      <div
        ref={stripRef}
        className="flex overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch" as never,
          scrollSnapType: "x mandatory",
        }}
      >
        {ALL_TABS.map(({ label, href, icon: Icon }, i) => {
          const active = isActive(href, location);
          return (
            <Link
              key={href}
              href={href}
              ref={(el: HTMLAnchorElement | null) => { tabRefs.current[i] = el; }}
              className="flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer select-none shrink-0"
              style={{
                width: "72px",
                minWidth: "72px",
                scrollSnapAlign: "start",
              }}
              data-testid={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-semibold leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
              <div className={`h-[2px] rounded-full mt-0.5 transition-all duration-200 ${active ? "w-8 bg-primary" : "w-0 bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
