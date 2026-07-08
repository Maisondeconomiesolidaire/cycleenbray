import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { frFR } from "@clerk/localizations";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import App from "./App";
import { MissingConfig } from "./components/MissingConfig";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { centralAuthUrl, needsCentralAuthRedirect } from "./lib/centralAuth";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(document.getElementById("root")!);

const missing: string[] = [];
if (!convexUrl) missing.push("VITE_CONVEX_URL");
if (!clerkKey || clerkKey.includes("REMPLACER")) {
  missing.push("VITE_CLERK_PUBLISHABLE_KEY");
}

if (missing.length > 0) {
  // Les clés ne sont pas encore configurées : on affiche les instructions de setup
  // plutôt que de planter au démarrage.
  root.render(
    <StrictMode>
      <MissingConfig missing={missing} />
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  const useCentralAuth = needsCentralAuthRedirect();
  const satelliteProps = useCentralAuth
    ? {
        isSatellite: true,
        domain: window.location.host,
        signInUrl: centralAuthUrl("sign-in"),
        signUpUrl: centralAuthUrl("sign-up"),
      }
    : {};
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider
          publishableKey={clerkKey}
          localization={frFR}
          appearance={{ variables: { colorPrimary: "#196b24" } }}
          {...satelliteProps}
        >
          {useCentralAuth ? (
            <ConvexProvider client={convex}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ConvexProvider>
          ) : (
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ConvexProviderWithClerk>
          )}
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
