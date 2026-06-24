import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { TopNav, BottomNav } from "@/components/Navigation";
import BreakingTicker from "@/components/BreakingTicker";
import JoinModal from "@/components/JoinModal";
import HomePage from "@/pages/HomePage";
import PostPage from "@/pages/PostPage";
import GistsPage from "@/pages/GistsPage";
import ComingSoonPage from "@/pages/ComingSoonPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";
import { useTrackVisit } from "@workspace/api-client-react";
import { getStoredUser } from "@/lib/user";

const queryClient = new QueryClient();

function AppShell() {
  const [showJoin, setShowJoin] = useState(false);
  const trackVisit = useTrackVisit();

  useEffect(() => {
    // Track visit once per session
    if (!sessionStorage.getItem("vcm_visited")) {
      trackVisit.mutate(undefined, {
        onSuccess: () => sessionStorage.setItem("vcm_visited", "1"),
      });
    }

    // Show join modal if user not registered
    const user = getStoredUser();
    if (!user) {
      // Small delay so page renders first
      setTimeout(() => setShowJoin(true), 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <JoinModal open={showJoin} onJoined={() => setShowJoin(false)} />
      <TopNav />
      <BreakingTicker />

      {/* Main content — padded for top nav on desktop, bottom nav on mobile */}
      <main className="min-h-screen bg-background pt-0 md:pt-14 pb-20 md:pb-4">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/post/:id" component={PostPage} />
          <Route path="/gists" component={GistsPage} />
          <Route path="/polls">
            <ComingSoonPage title="Polls" description="Vote on hot topics and see what Nigeria thinks. Coming soon." />
          </Route>
          <Route path="/marketplace">
            <ComingSoonPage title="Marketplace" description="Buy, sell, and connect with vendors across Nigeria. Coming soon." />
          </Route>
          <Route path="/events">
            <ComingSoonPage title="Events" description="Discover the hottest events happening near you. Coming soon." />
          </Route>
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <BottomNav />
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
