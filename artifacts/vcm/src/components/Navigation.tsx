import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Home, FileText, Vote, Trophy, MoreHorizontal, ShoppingBag, CalendarDays, Megaphone, Trophy as TrophyIcon, Crown, Heart, Wrench, Briefcase, Flame } from "lucide-react";
import { ProfileTrigger } from "./ProfilePanel";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Gists", href: "/gists", icon: FileText },
  { label: "Vote Cards", href: "/vote-cards", icon: Vote },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const MORE_ITEMS = [
  { label: "Events", href: "/events", icon: CalendarDays, comingSoon: false },
  { label: "Contests", href: "/contests", icon: TrophyIcon, comingSoon: false },
  { label: "VIP", href: "/vip", icon: Crown, comingSoon: false },
  { label: "Advertise", href: "/advertise", icon: Megaphone, comingSoon: false },
  { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, comingSoon: false },
  { label: "Connections", href: "/connections", icon: Heart, comingSoon: false },
  { label: "Services", href: "/services", icon: Wrench, comingSoon: false },
  { label: "Recruitment", href: "/recruitment", icon: Briefcase, comingSoon: false },
  { label: "Spill the Tea", href: "/spill", icon: Flame, comingSoon: false },
];

function isActive(href: string, location: string) {
  if (href === "/") return location === "/";
  return location.startsWith(href);
}

function useLongPress(onLongPress: () => void, ms = 5000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => { onLongPress(); }, ms);
  }, [onLongPress, ms]);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  return {
    onMouseDown: start, onMouseUp: cancel, onMouseLeave: cancel,
    onTouchStart: start, onTouchEnd: cancel, onTouchCancel: cancel,
  };
}

// ── Mobile-only top header (logo + profile icon) ─────────────────────────────
export function MobileHeader() {
  const [, navigate] = useLocation();
  const logoLongPress = useLongPress(() => navigate("/admin"), 5000);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-border h-11 flex items-center justify-between px-4">
      <img
        src="/vcm-logo.png"
        alt="VCM"
        className="h-7 w-auto object-contain select-none cursor-pointer"
        draggable={false}
        {...logoLongPress}
        onClick={() => navigate("/")}
      />
      <ProfileTrigger />
    </header>
  );
}

// ── Desktop top nav ───────────────────────────────────────────────────────────
export function TopNav() {
  const [location, navigate] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const logoLongPress = useLongPress(() => navigate("/admin"), 5000);

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-border shadow-sm h-14 items-center px-6">
        <img
          src="/vcm-logo.png"
          alt="Vawulence City Media"
          className="h-10 w-auto mr-8 cursor-pointer object-contain select-none"
          data-testid="logo-vcm"
          draggable={false}
          {...logoLongPress}
          onClick={() => navigate("/")}
        />
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <span
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive(href, location)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </span>
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="nav-more"
          >
            <MoreHorizontal className="w-4 h-4" />
            More
          </button>
        </nav>
        <ProfileTrigger className="ml-4" />
      </header>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
export function BottomNav() {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border flex items-center"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        data-testid="bottom-nav"
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className="flex-1">
            <span
              className={`flex flex-col items-center gap-0.5 py-2 text-center cursor-pointer transition-colors ${
                isActive(href, location) ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </span>
          </Link>
        ))}
        <button
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground"
          onClick={() => setMoreOpen(true)}
          data-testid="bottom-nav-more"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left text-base font-bold">More</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-3">
          {MORE_ITEMS.map((item) =>
            item.href && !item.comingSoon ? (
              <Link key={item.label} href={item.href} onClick={onClose}>
                <div
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-muted/60 text-center cursor-pointer hover:bg-blue-50 hover:text-primary transition-colors"
                  data-testid={`more-item-${item.label.toLowerCase()}`}
                >
                  {item.icon && <item.icon className="w-5 h-5" />}
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              </Link>
            ) : (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-muted/60 text-center opacity-60"
                data-testid={`more-item-${item.label.toLowerCase()}`}
              >
                {item.icon && <item.icon className="w-5 h-5 text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                {item.comingSoon && (
                  <span className="text-xs text-muted-foreground">Coming Soon</span>
                )}
              </div>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
