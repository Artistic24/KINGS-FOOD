import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,

  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { InAppBrowser } from "@capacitor/inappbrowser";

import appCss from "../styles.css?url";
import { reportAppError } from "../lib/error-reporting";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Toaster } from "../components/ui/sonner";
import { supabase } from "../integrations/supabase/client";
import { initializeNativeGoogleSignIn } from "@/lib/native-auth";
import { setupNativeDeviceAccess } from "@/lib/native-device";
import { SupportButton } from "../components/SupportButton";
import { GlobalChat } from "../components/GlobalChat";
import { AdsPopup } from "../components/AdsPopup";
import { DeliveredPopup } from "../components/DeliveredPopup";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to KINGS FOOD
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportAppError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-input bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KINGS FOOD — Cameroon's all-in-one marketplace" },
      { name: "description", content: "Burgers, pizza, fresh poultry, supermarket, fashion and hair — delivered across all 10 regions of Cameroon. Pay with MTN Mobile Money, Orange Money or cash on delivery." },
      { name: "author", content: "KINGS FOOD" },
      { property: "og:title", content: "KINGS FOOD — Cameroon's all-in-one marketplace" },
      { property: "og:description", content: "Burgers, pizza, fresh poultry, supermarket, fashion and hair — delivered across all 10 regions of Cameroon. Pay with MTN Mobile Money, Orange Money or cash on delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "KINGS FOOD — Cameroon's all-in-one marketplace" },
      { name: "twitter:description", content: "Burgers, pizza, fresh poultry, supermarket, fashion and hair — delivered across all 10 regions of Cameroon. Pay with MTN Mobile Money, Orange Money or cash on delivery." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/17cbeb1c-a8fd-4dc5-851a-92ec7fa2533f/id-preview-31c82b61--5b541573-9b19-4256-8e18-fa0e67c89700.lovable.app-1781325406332.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/17cbeb1c-a8fd-4dc5-851a-92ec7fa2533f/id-preview-31c82b61--5b541573-9b19-4256-8e18-fa0e67c89700.lovable.app-1781325406332.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializeNativeGoogleSignIn().catch((error) => {
        console.warn("Native Google Sign-In initialization failed:", error);
      });
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = anchor.href;
      if (!href || !/^https?:\/\//i.test(href)) return;

      const url = new URL(href);
      if (url.origin === window.location.origin) return;

      event.preventDefault();
      InAppBrowser.openInWebView({
        url,
        options: {
          showURL: true,
          showToolbar: true,
          showNavigationButtons: true,
          closeButtonText: "Close",
          hardwareBack: true,
          android: { isIsolated: true },
        },
      }).catch((error) => {
        console.warn("Could not open link in the in-app browser:", error);
        window.location.href = href;
      });
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setupNativeDeviceAccess(data.user.id).then((fn) => { cleanup = fn; });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setupNativeDeviceAccess(session.user.id).then((fn) => { cleanup = fn; });
      }
    });
    return () => { cleanup?.(); sub.subscription.unsubscribe(); };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        {isHome && <GlobalChat />}
        {isHome && <SupportButton />}
        <AdsPopup />
        <DeliveredPopup />
      </div>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

