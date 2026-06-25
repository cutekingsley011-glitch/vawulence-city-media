import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { TopNav, BottomNav, MobileHeader } from "@/components/Navigation";
import JoinModal from "@/components/JoinModal";
import HomePage from "@/pages/HomePage";
import PostPage from "@/pages/PostPage";
import GistsPage from "@/pages/GistsPage";
import ComingSoonPage from "@/pages/ComingSoonPage";
import AdminPage from "@/pages/AdminPage";
import VoteCardsPage from "@/pages/VoteCardsPage";
import VoteCardDetailPage from "@/pages/VoteCardDetailPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import EventsPage from "@/pages/EventsPage";
import EventDetailPage from "@/pages/EventDetailPage";
import ContestsPage from "@/pages/ContestsPage";
import VipPage from "@/pages/VipPage";
import MarketplacePage from "@/pages/MarketplacePage";
import MarketplaceItemPage from "@/pages/MarketplaceItemPage";
import ConnectionsPage from "@/pages/ConnectionsPage";
import ServicesPage from "@/pages/ServicesPage";
import RecruitmentPage from "@/pages/RecruitmentPage";
import SpillPage from "@/pages/SpillPage";
import InstallPromptBanner from "@/components/InstallPromptBanner";
import NotFound from "@/pages/not-found";
import { useTrackVisit } from "@workspace/api-client-react";
import { getStoredUser } from "@/lib/user";

// Register service worker in production only.
// In dev, unregister any stale SW so it cannot serve cached old code.
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // When a new SW takes over, reload so users get the fresh build
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    }).catch(() => {});
    // Also reload any time the controller changes (covers skipWaiting case)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  } else {
    // Dev: kill any stale service worker so it cannot intercept Vite's module requests
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    caches.keys().then((keys) => {
      for (const key of keys) caches.delete(key);
    });
  }
}

const queryClient = new QueryClient();

function AppShell() {
  const [showJoin, setShowJoin] = useState(false);
  const trackVisit = useTrackVisit();

  useEffect(() => {
    if (!sessionStorage.getItem("vcm_visited")) {
      trackVisit.mutate(undefined, {
        onSuccess: () => sessionStorage.setItem("vcm_visited", "1"),
      });
    }

    const user = getStoredUser();
    if (!user) {
      setTimeout(() => setShowJoin(true), 500);
    }

    const openJoin = () => setShowJoin(true);
    window.addEventListener("vcm:open-join", openJoin);
    return () => window.removeEventListener("vcm:open-join", openJoin);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <JoinModal open={showJoin} onJoined={() => setShowJoin(false)} />
      <MobileHeader />
      <TopNav />

      <main className="min-h-screen bg-background pt-11 md:pt-14 pb-20 md:pb-4">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/post/:id" component={PostPage} />
          <Route path="/gists" component={GistsPage} />
          <Route path="/vote-cards/:id" component={VoteCardDetailPage} />
          <Route path="/vote-cards" component={VoteCardsPage} />
          <Route path="/polls" component={VoteCardsPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route path="/events/:id" component={EventDetailPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/contests" component={ContestsPage} />
          <Route path="/vip" component={VipPage} />
          <Route path="/goat" component={VoteCardsPage} />
          <Route path="/marketplace/:id" component={MarketplaceItemPage} />
          <Route path="/marketplace" component={MarketplacePage} />
          <Route path="/connections" component={ConnectionsPage} />
          <Route path="/services" component={ServicesPage} />
          <Route path="/recruitment" component={RecruitmentPage} />
          <Route path="/spill" component={SpillPage} />
          <Route path="/podcast" component={() => <ComingSoonPage title="VCM Podcast" description="Hot takes, gist breakdowns, and unfiltered conversations — dropping soon." />} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <BottomNav />
      <InstallPromptBanner />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" component={AdminPage} />
      <Route>
        <AppShell />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
