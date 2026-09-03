import { AuthSwitch } from "./ui/auth-switch";

/**
 * Écran d'authentification Cycle en Bray, branché sur le portail partagé de
 * l'écosystème (voir `ui/auth-switch`).
 *
 * Le portail est un écran PLEIN, servi par la page dédiée `/connexion`. Ne le
 * monte pas dans le shell boutique ni dans une carte : il s'y replierait en
 * version étroite au milieu d'un grand écran. Les pages protégées renvoient
 * vers `/connexion` plutôt que de l'afficher sur place.
 */
export function AuthPanel({
  redirectUrl,
  initialMode,
}: { redirectUrl?: string; initialMode?: "signin" | "signup" } = {}) {
  return (
    <AuthSwitch
      appName="Cycle en Bray"
      logoSrc="/cycle-en-bray-logo.webp"
      initialMode={initialMode}
      redirectUrl={redirectUrl}
      homeHref="/boutique"
      homeLabel="Retour à la boutique"
    />
  );
}
