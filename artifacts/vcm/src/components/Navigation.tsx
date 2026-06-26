import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Home, FileText, Vote, Trophy, ShoppingBag, CalendarDays,
  Heart, Wrench, Briefcase, Mic, Award, Flag,
} from "lucide-react";
import { ProfileTrigger } from "./ProfilePanel";

// ── All scrollable tabs ───────────────────────────────────────────────────────
// Priority order: Feed, Marketplace, Connections, Report Case — then the rest
const ALL_TABS = [
  { label: "Home",        href: "/",              icon: Home },
  { label: "Marketplace", href: "/marketplace",   icon: ShoppingBag },
  { label: "Connections", href: "/connections",   icon: Heart },
  { label: "Report Case", href: "/report-case",   icon: Flag },
  { label: "Gists",       href: "/gists",         icon: FileText },
  { label: "Polls",       href: "/polls",         icon: Vote },
  { label: "Events",      href: "/events",        icon: CalendarDays },
  { label: "Services",    href: "/services",      icon: Wrench },
  { label: "Recruitment", href: "/recruitment",   icon: Briefcase },
  { label: "Leaderboard", href: "/leaderboard",   icon: Trophy },
  { label: "Podcast",     href: "/podcast",       icon: Mic },
  { label: "Contests",    href: "/contests",      icon: Award },
] as const;

// Desktop nav shows the first 6 without overflow
const DESKTOP_TABS = ALL_TABS.slice(0, 6);

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
