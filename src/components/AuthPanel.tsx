import { AuthSwitch } from "./ui/auth-switch";

/** Écran d’authentification personnalisé, connecté aux flux Clerk partagés. */
export function AuthPanel({ redirectUrl: _redirectUrl }: { redirectUrl?: string } = {}) {
  return <AuthSwitch appName="Cycle en Bray" logoSrc="/cycle-en-bray-logo.webp" homeHref="/" homeLabel="Retour à la boutique" />;
}
