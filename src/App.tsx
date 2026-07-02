import {
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useRef,
  useState,
} from "react";
import { SignedIn, SignedOut, SignIn, useClerk, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import {
  Bike,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ImagePlus,
  Loader2,
  LogOut,
  Maximize2,
  Menu,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import { Link, NavLink, Navigate, Outlet, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { Drawer } from "./components/ui/Drawer";
import { cn } from "./lib/cn";
import { useUpload } from "./lib/useUpload";
import { MyAppsGrid } from "./components/MyApps";

type BikeStatus = "inactive" | "available" | "purchase_pending" | "sold";
type PipelineStatus = "nouveau" | "validation" | "en_cours" | "gagnee" | "perdue";
type Site = "60" | "76";
type BikeUseMode = "purchase" | "rental";
type BikeWithPhotos = Doc<"bikes"> & { photoUrls: string[] };
type CycleRequest = Doc<"cycleRequests"> & { bike: BikeWithPhotos | null };

type BikeForm = {
  photos: Id<"_storage">[];
  description: string;
  site: Site;
  gdrReference: string;
  category: string;
  condition: string;
  status: BikeStatus;
  price: string;
  profile: string;
  useMode: BikeUseMode;
};

type ReebikeForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  desiredAt: string;
  duration: string;
  formula: string;
  frontBrake: string;
  bikeType: string;
  wheelSize: string;
  compatibilityPhotos: Id<"_storage">[];
};

type RepairForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

const GREEN = "#196b24";
const ORANGE = "#ff7700";
const LOGO = "/Logo%20Cycle%20en%20Bray.webp";

const categories = ["VTT", "VTC", "Vélo de route", "Vélo de ville", "Vélo vintage"];
const profiles = ["Homme", "Femme", "Enfant"];
const conditions = ["Neuf", "Très bon état", "Bon état", "À réviser"];
const useModes: Record<BikeUseMode, string> = {
  purchase: "Achat",
  rental: "Location",
};
const sites: Array<{ value: Site; label: string }> = [
  { value: "60", label: "Recyclerie 60" },
  { value: "76", label: "Recyclerie 76" },
];

const stockLabels: Record<BikeStatus, string> = {
  inactive: "Inactif",
  available: "Disponible",
  purchase_pending: "Achat en cours",
  sold: "Vendu",
};

function stockLabel(status: string) {
  if (status === "available" || status === "online") return "Disponible";
  if (status === "purchase_pending" || status === "waiting" || status === "reserved") return "Achat en cours";
  if (status === "sold") return "Vendu";
  return "Inactif";
}

const pipelineLabels: Record<PipelineStatus, string> = {
  nouveau: "Nouveau",
  validation: "Validation",
  en_cours: "En cours",
  gagnee: "Gagnee",
  perdue: "Perdue",
};

const pipelineColumns: Array<{ key: PipelineStatus; label: string; accent: string }> = [
  { key: "nouveau", label: "Nouveau", accent: "#5cc66d" },
  { key: "validation", label: "Validation", accent: ORANGE },
  { key: "en_cours", label: "En cours", accent: "#2f9e44" },
  { key: "gagnee", label: "Gagnee", accent: GREEN },
  { key: "perdue", label: "Perdue", accent: "#ef4444" },
];

const processSteps = [
  "Contact pris",
  "Prestation planifiee",
  "Prestation terminee",
  "Facture editee",
  "Facture reglee",
];

const fallbackImages = [
  "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=1200&q=82",
];

const initialForm: BikeForm = {
  photos: [],
  description: "",
  site: "60",
  gdrReference: "28147497673",
  category: "Vélo de ville",
  condition: "Bon état",
  status: "inactive",
  price: "",
  profile: "Homme",
  useMode: "purchase",
};

const initialReebikeForm: ReebikeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
  desiredAt: "",
  duration: "1 à 30 jours - Formule maillot vert",
  formula: "La roue seule car j'ai ma propre monture!",
  frontBrake: "Patins",
  bikeType: "VTT",
  wheelSize: "24 pouces",
  compatibilityPhotos: [],
};

const initialRepairForm: RepairForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

const reebikeDurations = [
  "1 à 30 jours - Formule maillot vert",
  "1 à 4 mois - Formule maillot à pois",
  "5 à 12 mois - Formule maillot jaune",
];

const reebikeFormulas = [
  "La roue seule car j'ai ma propre monture!",
  "La complète (vélo + roue) car parce que je pars de 0 !",
];

const reebikeBrakeTypes = ["Patins", "Disque"];
const reebikeBikeTypes = ["VTT", "COURSE", "VILLE", "VINTAGE"];
const reebikeWheelSizes = ["24 pouces", "26 pouces", "28 pouces", "Je ne sais pas"];

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : undefined;
}

function euro(value?: number) {
  if (value === undefined) return "Prix sur demande";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function bikeImage(bike: Pick<BikeWithPhotos, "photoUrls" | "_creationTime">) {
  return bike.photoUrls[0] ?? fallbackImages[Math.floor(bike._creationTime) % fallbackImages.length];
}

function shopBikeTitle(bike: Pick<BikeWithPhotos, "category" | "sizeLabel" | "title">) {
  return [bike.category, bike.sizeLabel].filter(Boolean).join(" · ") || bike.title.replace(/\s*·?\s*GDR\s*\d+$/i, "");
}

function gdrPrefix(site: Site) {
  return site === "76" ? "56294995344" : "28147497673";
}

function normalizeGdrForSite(site: Site, current: string) {
  const suffix = current.replace(/\D/g, "").slice(-4);
  return `${gdrPrefix(site)}${suffix}`.slice(0, 15);
}

function formToPayload(form: BikeForm) {
  return {
    photos: form.photos,
    description: form.description,
    site: form.site,
    gdrReference: form.gdrReference || undefined,
    category: form.category,
    condition: form.condition,
    status: form.status,
    price: form.useMode === "purchase" ? numberOrUndefined(form.price) : undefined,
    profile: form.profile,
    useMode: form.useMode,
  };
}

function formFromBike(bike: BikeWithPhotos): BikeForm {
  return {
    photos: bike.photos,
    description: bike.description,
    site: bike.site,
    gdrReference: bike.gdrReference ?? "",
    category: bike.category,
    condition: bike.condition,
    status:
      bike.status === "available" || bike.status === "online"
        ? "available"
        : bike.status === "purchase_pending" || bike.status === "waiting" || bike.status === "reserved"
          ? "purchase_pending"
          : bike.status === "sold"
            ? "sold"
            : "inactive",
    price: bike.price === undefined ? "" : String(bike.price),
    profile: bike.sizeLabel ?? "Homme",
    useMode: bike.useMode === "rental" ? "rental" : "purchase",
  };
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Shop />} />
        <Route path="/boutique" element={<Shop />} />
        <Route path="/reebike" element={<Reebike />} />
        <Route path="/reparation" element={<Repair />} />
        <Route path="/velos/:id" element={<BikeDetail />} />
      </Route>
      <Route path="/crm" element={<CrmLayout />}>
        <Route index element={<Navigate to="/crm/stock" replace />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="suivi" element={<TrackingPage />} />
        <Route path="profil" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/boutique" replace />} />
    </Routes>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center", className)}>
      <img src={LOGO} alt="Cycle en Bray" className="h-full w-full object-contain" />
    </span>
  );
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between px-5 py-4 sm:px-7 lg:px-8">
          <Link to="/boutique" aria-label="Cycle en Bray">
            <LogoMark className="h-16 w-48 sm:w-56" />
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-black/8 bg-white/75 p-1 shadow-sm">
            <PublicTab to="/boutique" icon={<ShoppingBag className="h-4 w-4" />}>Boutique</PublicTab>
            <PublicTab to="/reebike" icon={<Bike className="h-4 w-4" />}>Reebike</PublicTab>
            <PublicTab to="/reparation" icon={<ShieldCheck className="h-4 w-4" />}>Réparation</PublicTab>
          </nav>
        </div>
      </header>
      <Outlet />
      <PublicFooter />
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto flex max-w-[92rem] flex-col gap-5 px-5 py-8 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8">
        <LogoMark className="h-14 w-44" />
        <div className="flex flex-col gap-3 text-sm text-zinc-600 sm:flex-row sm:items-center">
          <span>Recyclerie du Pays de Bray</span>
          <span className="hidden h-4 w-px bg-zinc-300 sm:block" />
          <Link to="/crm" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#196b24] px-4 font-semibold text-white">
            <ShieldCheck className="h-4 w-4" /> CRM
          </Link>
        </div>
      </div>
    </footer>
  );
}

function PublicTab({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition",
          isActive ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950",
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

function Shop() {
  const [params, setParams] = useSearchParams();
  const filters = {
    searchText: params.get("q") || undefined,
    site: (params.get("site") as Site | null) || undefined,
    category: params.get("category") || undefined,
    profile: params.get("profile") || undefined,
    useMode: (params.get("mode") as BikeUseMode | null) || undefined,
    maxPrice: numberOrUndefined(params.get("max") ?? ""),
  };
  const bikes = useQuery(api.bikes.listPublic, filters);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <>
      <section className="overflow-hidden bg-white">
        <img src="/hero.avif" alt="" className="block h-[240px] w-full object-cover sm:h-[300px] lg:h-[360px]" />
      </section>

      <main id="catalogue" className="mx-auto max-w-[92rem] px-5 py-10 sm:px-7 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#196b24]">Catalogue</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">Velos disponibles</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <FilterInput icon={<Search className="h-4 w-4" />} value={params.get("q") ?? ""} onChange={(value) => updateParam("q", value)} placeholder="Recherche" />
            <FilterSelect value={params.get("site") ?? ""} onChange={(value) => updateParam("site", value)} options={sites.map((site) => [site.value, site.label])} placeholder="Tous sites" />
            <FilterSelect value={params.get("mode") ?? ""} onChange={(value) => updateParam("mode", value)} options={Object.entries(useModes)} placeholder="Tous" />
            <FilterSelect value={params.get("category") ?? ""} onChange={(value) => updateParam("category", value)} options={categories.map((item) => [item, item])} placeholder="Categorie" />
            <FilterSelect value={params.get("profile") ?? ""} onChange={(value) => updateParam("profile", value)} options={profiles.map((item) => [item, item])} placeholder="Profil" />
            <FilterInput icon={<SlidersHorizontal className="h-4 w-4" />} value={params.get("max") ?? ""} onChange={(value) => updateParam("max", value)} placeholder="Prix max" />
          </div>
        </div>
        {bikes === undefined ? <LoadingState /> : bikes.length === 0 ? <EmptyShop /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {bikes.map((bike) => <BikeCard key={bike._id} bike={bike} />)}
          </div>
        )}
      </main>
    </>
  );
}

function Repair() {
  const submitRepair = useMutation(api.bikes.submitRepair);
  const [form, setForm] = useState<RepairForm>(initialRepairForm);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await submitRepair({
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          message: form.message || undefined,
        },
      });
      setDone(true);
      setForm(initialRepairForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demande impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-7 lg:px-8">
      <form className="space-y-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-8" onSubmit={onSubmit}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#196b24]">Réparation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Demande de réparation</h1>
        </div>

        {done && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Demande envoyée. Elle apparaît maintenant dans le suivi CRM.
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold">Informations personnelles</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <LightInput label="Prénom" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} required />
            <LightInput label="Nom" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} required />
            <LightInput label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
            <LightInput label="Téléphone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} required />
          </div>
        </section>

        <label className="block text-sm font-medium text-zinc-700">
          Commentaire
          <textarea
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            required
            placeholder="Décrivez la réparation souhaitée, le problème rencontré, vos disponibilités..."
            className="mt-1 min-h-36 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-[#196b24]"
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end">
          <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#196b24] px-5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Envoyer la demande
          </button>
        </div>
      </form>
    </main>
  );
}

function Reebike() {
  const submitReebike = useMutation(api.bikes.submitReebike);
  const upload = useUpload();
  const [form, setForm] = useState<ReebikeForm>(initialReebikeForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of Array.from(files).slice(0, 4)) ids.push(await upload(file));
      setForm((current) => ({ ...current, compatibilityPhotos: [...current.compatibilityPhotos, ...ids] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi image impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await submitReebike({
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          message: form.message || undefined,
        },
        reebike: {
          desiredAt: form.desiredAt,
          duration: form.duration,
          formula: form.formula,
          frontBrake: form.frontBrake,
          bikeType: form.bikeType,
          wheelSize: form.wheelSize,
          compatibilityPhotos: form.compatibilityPhotos,
        },
      });
      setDone(true);
      setForm(initialReebikeForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demande impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-7 lg:px-8">
      <form className="space-y-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-8" onSubmit={onSubmit}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#196b24]">Reebike</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Demande Reebike</h1>
        </div>

        {done && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Demande envoyee. Elle apparait maintenant dans le suivi CRM.
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold">Informations personnelles</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <LightInput label="Prenom" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} required />
            <LightInput label="Nom" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} required />
            <LightInput label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
            <LightInput label="Telephone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} required />
          </div>
        </section>

        <section className="space-y-7">
          <DateTimePicker
            label="A partir de quand souhaitez-vous disposer de votre équipement ?"
            value={form.desiredAt}
            onChange={(value) => setForm({ ...form, desiredAt: value })}
            onlyThursday
          />
          <RadioGroup title="Pour quelle durée ?" value={form.duration} options={reebikeDurations} onChange={(value) => setForm({ ...form, duration: value })} />
          <RadioGroup title="Quelle formule vous tente le plus ?" value={form.formula} options={reebikeFormulas} onChange={(value) => setForm({ ...form, formula: value })} required />
          <RadioGroup title="Quel est votre type de frein avant ?" value={form.frontBrake} options={reebikeBrakeTypes} onChange={(value) => setForm({ ...form, frontBrake: value })} required />
          <RadioGroup title="Indiquez-nous votre type de vélo" value={form.bikeType} options={reebikeBikeTypes} onChange={(value) => setForm({ ...form, bikeType: value })} required />
          <RadioGroup title="Pour quelle taille de roue souhaitez-vous ?" value={form.wheelSize} options={reebikeWheelSizes} onChange={(value) => setForm({ ...form, wheelSize: value })} required />
          <label className="block text-sm font-medium text-zinc-700">
            Message
            <textarea
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="mt-1 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-[#196b24]"
            />
          </label>
          <div>
            <p className="text-xl font-semibold">Vous avez un doute au sujet de la compatibilité ?</p>
            <p className="text-xl font-semibold">Envoyez-nous une photo !</p>
            <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-sm text-zinc-600">
              {uploading ? <Loader2 className="mb-2 h-5 w-5 animate-spin" /> : <ImagePlus className="mb-2 h-5 w-5" />}
              {form.compatibilityPhotos.length ? `${form.compatibilityPhotos.length} photo(s) ajoutee(s)` : "Cliquez ici pour ajouter une image"}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => onFiles(event.target.files)} />
            </label>
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end">
          <button disabled={saving || uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#196b24] px-5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Envoyer la demande
          </button>
        </div>
      </form>
    </main>
  );
}

function BikeCard({ bike }: { bike: BikeWithPhotos }) {
  return (
    <Link to={`/velos/${bike._id}`} className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        <img src={bikeImage(bike)} alt={bike.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {(bike.status === "purchase_pending" || bike.status === "waiting" || bike.status === "reserved") && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            Déjà réservé
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#196b24]">{bike.category} · {bike.site === "60" ? "Recyclerie 60" : "Recyclerie 76"}</p>
        <h3 className="mt-1 text-lg font-semibold text-zinc-950">{shopBikeTitle(bike)}</h3>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
          {[bike.sizeLabel, bike.condition].filter(Boolean).map((item) => (
            <span key={item} className="rounded-md bg-zinc-100 px-2 py-1">{item}</span>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xl font-semibold">{bike.useMode === "rental" ? "Location" : euro(bike.price)}</p>
          <span className="text-sm font-medium text-zinc-500">{stockLabel(bike.status)}</span>
        </div>
      </div>
    </Link>
  );
}

function BikeDetail() {
  const { id } = useParams();
  const bike = useQuery(api.bikes.getPublic, id ? { id: id as Id<"bikes"> } : "skip");
  const reserveBike = useMutation(api.bikes.reserveBike);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "", rentalStart: "", rentalEnd: "" });
  const [reserveState, setReserveState] = useState<"idle" | "saving" | "done">("idle");
  const [reserveError, setReserveError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (bike === undefined) return <LoadingState />;
  if (!bike) return <Navigate to="/boutique" replace />;
  const alreadyReserved = bike.status === "purchase_pending" || bike.status === "waiting" || bike.status === "reserved";
  const galleryImages = bike.photoUrls.length ? bike.photoUrls : fallbackImages;
  const selectedImage = galleryImages[activeImage] ?? galleryImages[0];

  function moveImage(direction: -1 | 1) {
    setActiveImage((current) => (current + direction + galleryImages.length) % galleryImages.length);
  }

  async function submitReservation(event: FormEvent) {
    event.preventDefault();
    setReserveState("saving");
    setReserveError("");
    try {
      await reserveBike({
        bikeId: bike!._id,
        ...reserveForm,
        message: reserveForm.message || undefined,
        rentalStart: reserveForm.rentalStart || undefined,
        rentalEnd: reserveForm.rentalEnd || undefined,
      });
      setReserveState("done");
    } catch (error) {
      setReserveError(error instanceof Error ? error.message : "Reservation impossible.");
      setReserveState("idle");
    }
  }

  return (
    <>
      <main className="mx-auto grid max-w-[92rem] gap-8 px-5 py-10 sm:px-7 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="grid gap-3">
          <div className="relative overflow-hidden rounded-lg bg-zinc-100">
            <button type="button" onClick={() => setLightboxOpen(true)} className="block w-full">
              <img src={selectedImage} alt={shopBikeTitle(bike)} className="aspect-[4/3] w-full object-cover" />
            </button>
            {galleryImages.length > 1 && (
              <>
                <button type="button" onClick={() => moveImage(-1)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-950 shadow-sm">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => moveImage(1)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-950 shadow-sm">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <button type="button" onClick={() => setLightboxOpen(true)} className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full bg-white/92 px-4 text-sm font-semibold text-zinc-950 shadow-sm">
              <Maximize2 className="h-4 w-4" /> Agrandir
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {galleryImages.slice(0, 8).map((url, index) => (
              <button key={`${url}-${index}`} type="button" onClick={() => setActiveImage(index)} className={cn("overflow-hidden rounded-lg border bg-zinc-100", activeImage === index ? "border-[#196b24] ring-2 ring-[#196b24]/20" : "border-transparent")}>
                <img src={url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#196b24]">{bike.site === "60" ? "Recyclerie 60" : "Recyclerie 76"}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal">{shopBikeTitle(bike)}</h1>
          <p className="mt-4 text-3xl font-semibold">{bike.useMode === "rental" ? "Location" : euro(bike.price)}</p>
          <p className="mt-6 leading-8 text-zinc-700">{bike.description}</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Spec label="Categorie" value={bike.category} />
            <Spec label="Profil" value={bike.sizeLabel} />
            <Spec label="Etat" value={bike.condition} />
            <Spec label="REF GDR" value={bike.gdrReference} />
            <Spec label="Disponibilité" value={bike.useMode === "rental" ? "Location" : "Achat"} />
          </div>
          <button
            onClick={() => {
              setReserveError("");
              setReserveState("idle");
              setReserveOpen(true);
            }}
            disabled={alreadyReserved}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-[#196b24] px-5 text-sm font-semibold text-white disabled:bg-orange-500"
          >
            {alreadyReserved ? "Déjà réservé" : bike.useMode === "rental" ? "Demander la location" : "Réserver ce vélo"}
          </button>
        </section>
      </main>
      <Drawer
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        variant="modal"
        title={reserveState === "done" ? "Demande envoyée" : bike.useMode === "rental" ? "Demander la location" : "Réserver ce vélo"}
        panelClassName="!inset-[6vh_5vw] !rounded-2xl border-0 shadow-[0_30px_90px_rgba(0,0,0,0.22)] lg:!inset-[8vh_12vw]"
        headerClassName="bg-white"
        bodyClassName="bg-white p-0 text-zinc-900"
      >
        {reserveState === "done" ? (
          <div className="grid min-h-[520px] place-items-center p-6">
            <div className="max-w-md text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-8 ring-emerald-50/60">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h2 className="mt-6 text-3xl font-semibold tracking-normal text-zinc-950">Votre demande est bien envoyée</h2>
              <p className="mt-3 leading-7 text-zinc-600">
                Nous avons reçu votre demande pour <span className="font-semibold text-zinc-950">{shopBikeTitle(bike)}</span>. L’équipe Cycle en Bray revient vers vous rapidement pour confirmer la suite.
              </p>
              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left">
                <div className="flex gap-3">
                  <img src={bikeImage(bike)} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-950">{shopBikeTitle(bike)}</p>
                    <p className="mt-1 text-sm text-zinc-600">{bike.useMode === "rental" ? "Location" : euro(bike.price)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#196b24]">{bike.site === "60" ? "Recyclerie 60" : "Recyclerie 76"}</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReserveOpen(false)}
                className="mt-6 h-11 rounded-lg bg-[#196b24] px-5 text-sm font-semibold text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[560px] lg:grid-cols-[0.86fr_1.14fr]">
            <aside className="relative overflow-hidden bg-zinc-950 text-white">
              <img src={bikeImage(bike)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-72" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-black/10" />
              <div className="relative flex h-full min-h-[320px] flex-col justify-end p-6">
                <span className="mb-4 inline-flex w-fit rounded-full bg-white/16 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {bike.site === "60" ? "Recyclerie 60" : "Recyclerie 76"}
                </span>
                <h2 className="text-3xl font-semibold tracking-normal">{shopBikeTitle(bike)}</h2>
                <p className="mt-3 text-2xl font-semibold">{bike.useMode === "rental" ? "Location" : euro(bike.price)}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  {[bike.category, bike.sizeLabel, bike.condition].filter(Boolean).map((item) => (
                    <span key={item} className="rounded-full bg-white/16 px-3 py-1 font-semibold backdrop-blur">{item}</span>
                  ))}
                </div>
              </div>
            </aside>

            <form className="flex flex-col p-5 sm:p-7" onSubmit={submitReservation}>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#196b24]">{bike.useMode === "rental" ? "Location" : "Réservation"}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">Vos informations</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Complétez vos coordonnées, la demande arrivera directement dans le suivi Cycle en Bray.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <LightInput label="Prénom" value={reserveForm.firstName} onChange={(value) => setReserveForm({ ...reserveForm, firstName: value })} required />
                <LightInput label="Nom" value={reserveForm.lastName} onChange={(value) => setReserveForm({ ...reserveForm, lastName: value })} required />
                <LightInput label="Email" value={reserveForm.email} onChange={(value) => setReserveForm({ ...reserveForm, email: value })} required type="email" />
                <LightInput label="Téléphone" value={reserveForm.phone} onChange={(value) => setReserveForm({ ...reserveForm, phone: value })} required />
                {bike.useMode === "rental" && (
                  <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                    <ThursdayDatePicker label="Début de location" value={reserveForm.rentalStart} onChange={(value) => setReserveForm({ ...reserveForm, rentalStart: value })} />
                    <ThursdayDatePicker label="Fin de location" value={reserveForm.rentalEnd} onChange={(value) => setReserveForm({ ...reserveForm, rentalEnd: value })} />
                  </div>
                )}
                <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
                  Message
                  <textarea
                    value={reserveForm.message}
                    onChange={(event) => setReserveForm({ ...reserveForm, message: event.target.value })}
                    placeholder="Disponibilités, question sur le vélo..."
                    className="mt-1 min-h-32 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-[#196b24]"
                  />
                </label>
              </div>

              {reserveError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{reserveError}</p>}

              <div className="mt-auto flex flex-col-reverse gap-2 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setReserveOpen(false)} className="h-11 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700">Annuler</button>
                <button disabled={reserveState === "saving"} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#196b24] px-5 text-sm font-semibold text-white disabled:opacity-60">
                  {reserveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {reserveState === "saving" ? "Envoi en cours..." : "Envoyer la demande"}
                </button>
              </div>
            </form>
          </div>
        )}
      </Drawer>
      {lightboxOpen && (
        <div className="fixed inset-0 z-[300] grid place-items-center bg-black/88 p-4" onClick={() => setLightboxOpen(false)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white">Fermer</button>
          {galleryImages.length > 1 && (
            <>
              <button type="button" onClick={(event) => { event.stopPropagation(); moveImage(-1); }} className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={(event) => { event.stopPropagation(); moveImage(1); }} className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img src={selectedImage} alt="" className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </>
  );
}

function CrmLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="crm-light min-h-screen bg-white text-zinc-950">
      <SignedOut>
        <div className="grid min-h-screen place-items-center px-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-[var(--crm-surface)] p-8 text-center">
            <LogoMark className="mx-auto h-16 w-52" />
            <h1 className="mt-5 text-2xl font-semibold">CRM</h1>
            <p className="mt-2 text-sm text-zinc-600">Connexion Clerk requise.</p>
            <div className="mt-6"><SignIn routing="hash" /></div>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="flex min-h-screen">
          <Sidebar onClose={() => setMobileOpen(false)} className="hidden lg:flex" />
          {mobileOpen && <Sidebar onClose={() => setMobileOpen(false)} className="fixed inset-y-0 left-0 z-50 flex w-72" />}
          <div className="min-w-0 flex-1 lg:pl-64">
            <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-bg)_92%,transparent)] px-4 backdrop-blur lg:hidden">
              <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-zinc-700 hover:bg-[var(--crm-surface-2)]" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
              <LogoMark className="h-10 w-32" />
              <Link to="/crm/profil"><UserAvatar /></Link>
            </div>
            <Outlet />
          </div>
        </div>
      </SignedIn>
    </div>
  );
}

function Sidebar({ className, onClose }: { className?: string; onClose: () => void }) {
  return (
    <aside className={cn("fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-[var(--crm-border)] bg-[var(--crm-surface)]", className)}>
      <div className="flex h-16 items-center justify-center border-b border-[var(--crm-border)] px-5">
        <LogoMark className="h-12 w-44" />
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        <CrmNav to="/crm/stock" icon={<Package className="h-5 w-5" />} onClick={onClose}>Stock velos</CrmNav>
        <CrmNav to="/crm/suivi" icon={<ClipboardList className="h-5 w-5" />} onClick={onClose}>Suivi</CrmNav>
        <CrmNav to="/boutique" icon={<Store className="h-5 w-5" />} onClick={onClose}>Boutique</CrmNav>
      </nav>
      <div className="border-t border-[var(--crm-border)] p-3">
        <AccountSidebarCard onClick={onClose} />
      </div>
    </aside>
  );
}

function CrmNav({ to, icon, children, onClick }: { to: string; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive ? "bg-brand-500/15 text-brand-700" : "text-zinc-600 hover:bg-[var(--crm-surface-2)] hover:text-zinc-950",
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

function UserAvatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { user } = useUser();
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Moi";
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#196b24] font-semibold text-white", size === "lg" ? "h-24 w-24 text-2xl" : "h-9 w-9 text-xs")}>
      {user?.imageUrl ? <img src={user.imageUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function AccountSidebarCard({ onClick }: { onClick: () => void }) {
  const { user } = useUser();
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Mon profil";
  return (
    <Link
      to="/crm/profil"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg bg-[var(--crm-surface-2)] px-3 py-2 transition hover:bg-[var(--crm-surface-3)]"
    >
      <UserAvatar />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">{name}</p>
        <p className="truncate text-xs text-zinc-500">{user?.primaryEmailAddress?.emailAddress}</p>
      </div>
    </Link>
  );
}

function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"infos" | "apps">("infos");

  if (!isLoaded) return <LoadingState dark />;
  if (!user) return <Navigate to="/crm" replace />;

  const accountUser = user;
  const currentFirstName = firstName || accountUser.firstName || "";
  const currentLastName = lastName || accountUser.lastName || "";
  const email = accountUser.primaryEmailAddress?.emailAddress ?? "";
  const displayName = [accountUser.firstName, accountUser.lastName].filter(Boolean).join(" ") || email || "Mon profil";

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await accountUser.update({ firstName: currentFirstName.trim(), lastName: currentLastName.trim() });
      await accountUser.reload();
      setMessage("Profil enregistre.");
    } catch {
      setMessage("Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      await accountUser.setProfileImage({ file });
      await accountUser.reload();
      setMessage("Photo mise a jour.");
    } catch {
      setMessage("Impossible de mettre a jour la photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <PageHeader title="Profil" />
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200">
          {([{ key: "infos", label: "Informations" }, { key: "apps", label: "Mes applications" }] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition",
                tab === t.key ? "border-brand-500 text-zinc-950" : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "apps" ? (
          <MyAppsGrid current="cycleenbray" />
        ) : (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-zinc-950">{displayName}</h2>
              <p className="text-sm text-zinc-500">{email}</p>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => onPhoto(event.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-800">
                <Camera className="h-4 w-4" /> {uploading ? "Envoi..." : "Changer la photo"}
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <LightInput label="Prenom" value={currentFirstName} onChange={setFirstName} />
            <LightInput label="Nom" value={currentLastName} onChange={setLastName} />
            <LightInput label="Email" value={email} onChange={() => undefined} disabled />
          </div>
          {message && <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">{message}</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-zinc-200 pt-4">
            <button type="button" onClick={() => void signOut({ redirectUrl: "/" })} className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700">
              <LogOut className="h-4 w-4" /> Se deconnecter
            </button>
            <button type="button" onClick={save} disabled={saving} className="h-10 rounded-lg bg-[#196b24] px-4 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </section>
        )}
      </main>
    </div>
  );
}

function StockPage() {
  const [search, setSearch] = useState("");
  const [site, setSite] = useState<"" | Site>("");
  const [status, setStatus] = useState<"" | BikeStatus>("");
  const bikes = useQuery(api.bikes.list, { searchText: search || undefined, site: site || undefined, status: status || undefined });
  const createBike = useMutation(api.bikes.create);
  const updateBike = useMutation(api.bikes.update);
  const updateStatus = useMutation(api.bikes.updateStatus);
  const removeBike = useMutation(api.bikes.remove);
  const upload = useUpload();
  const [form, setForm] = useState<BikeForm>(initialForm);
  const [editingId, setEditingId] = useState<Id<"bikes"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailBike, setDetailBike] = useState<BikeWithPhotos | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of Array.from(files).slice(0, 8)) ids.push(await upload(file));
      setForm((current) => ({ ...current, photos: [...current.photos, ...ids] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi image impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) await updateBike({ id: editingId, ...formToPayload(form) });
      else await createBike(formToPayload(form));
      setForm(initialForm);
      setEditingId(null);
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Stock velos"
        action={
          <button
            onClick={() => {
              setError("");
              setEditingId(null);
              setForm(initialForm);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#196b24] px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Nouveau velo
          </button>
        }
      />
      <main className="p-4 sm:p-6">
        <section className="min-w-0">
          <StockToolbar search={search} setSearch={setSearch} site={site} setSite={setSite} status={status} setStatus={setStatus} />
          <div className="mt-5 grid gap-4">
            {bikes === undefined ? <LoadingState dark /> : bikes.map((bike) => (
              <BikeRow
                key={bike._id}
                bike={bike}
                onOpen={() => setDetailBike(bike)}
                onEdit={() => {
                  setDetailBike(null);
                  setEditingId(bike._id);
                  setForm(formFromBike(bike));
                  setError("");
                  setFormOpen(true);
                }}
                onOnline={() => updateStatus({ id: bike._id, status: bike.status === "available" || bike.status === "online" ? "inactive" : "available" })}
                onSold={() => updateStatus({ id: bike._id, status: "sold" })}
                onRemove={() => removeBike({ id: bike._id })}
              />
            ))}
          </div>
        </section>
      </main>
      <BikeFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
          setForm(initialForm);
        }}
        editing={Boolean(editingId)}
        form={form}
        setForm={setForm}
        saving={saving}
        uploading={uploading}
        error={error}
        onFiles={onFiles}
        onSubmit={submit}
      />
      <StockBikeDetailModal bike={detailBike} onClose={() => setDetailBike(null)} />
    </div>
  );
}

function BikeFormModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  saving,
  uploading,
  error,
  onFiles,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  form: BikeForm;
  setForm: (form: BikeForm) => void;
  saving: boolean;
  uploading: boolean;
  error: string;
  onFiles: (files: FileList | null) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      variant="modal"
      title={editing ? "Modifier le velo" : "Nouveau velo"}
      panelClassName="!inset-[10vh_10vw] !rounded-lg"
      bodyClassName="p-6"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <DarkSelectField
            label="Site de traitement"
            value={form.site}
            onChange={(value) => {
              const site = value as Site;
              setForm({ ...form, site, gdrReference: normalizeGdrForSite(site, form.gdrReference) });
            }}
            options={sites.map((item) => [item.value, item.label])}
          />
          <GdrField form={form} setForm={setForm} />
          <DarkSelectField label="Categorie" value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={categories.map((item) => [item, item])} />
          <DarkSelectField label="Profil" value={form.profile} onChange={(value) => setForm({ ...form, profile: value })} options={profiles.map((item) => [item, item])} />
          <DarkSelectField label="Disponible pour" value={form.useMode} onChange={(value) => setForm({ ...form, useMode: value as BikeUseMode, price: value === "rental" ? "" : form.price })} options={Object.entries(useModes)} />
          <DarkSelectField label="Statut" value={form.status} onChange={(value) => setForm({ ...form, status: value as BikeStatus })} options={Object.entries(stockLabels)} />
          <DarkSelectField label="Etat" value={form.condition} onChange={(value) => setForm({ ...form, condition: value })} options={conditions.map((item) => [item, item])} />
          {form.useMode === "purchase" && <DarkText label="Prix" value={form.price} onChange={(value) => setForm({ ...form, price: value })} inputMode="decimal" />}
        </div>
        <DarkTextarea label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} required />
        <PhotoManager form={form} setForm={setForm} />
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] p-4 text-center text-sm text-zinc-500">
          {uploading ? <Loader2 className="mb-2 h-5 w-5 animate-spin" /> : <ImagePlus className="mb-2 h-5 w-5" />}
          {form.photos.length ? `${form.photos.length} image(s)` : "Ajouter des images"}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => onFiles(event.target.files)} />
        </label>
        {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-[var(--crm-border)] pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[var(--crm-border)] px-4 text-sm font-semibold text-zinc-700">
            Annuler
          </button>
          <button disabled={saving || uploading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#196b24] px-4 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {editing ? "Mettre a jour" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function StockBikeDetailModal({ bike, onClose }: { bike: BikeWithPhotos | null; onClose: () => void }) {
  if (!bike) return null;
  return (
    <Drawer
      open={Boolean(bike)}
      onClose={onClose}
      variant="modal"
      title={bike.title}
      panelClassName="!inset-[10vh_10vw] !rounded-lg"
      bodyClassName="p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <img src={bikeImage(bike)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
        <div>
          <p className="text-sm text-zinc-500">{bike.description}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <DarkSpec label="Statut" value={stockLabel(bike.status)} />
            <DarkSpec label="REF GDR" value={bike.gdrReference} />
            <DarkSpec label="Site de traitement" value={bike.site === "60" ? "Recyclerie 60" : "Recyclerie 76"} />
            <DarkSpec label="Categorie" value={bike.category} />
            <DarkSpec label="Profil" value={bike.sizeLabel} />
            <DarkSpec label="Etat" value={bike.condition} />
            <DarkSpec label="Disponibilité" value={bike.useMode === "rental" ? "Location" : "Achat"} />
            <DarkSpec label="Prix" value={bike.useMode === "rental" ? "Non applicable" : euro(bike.price)} />
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function PhotoManager({ form, setForm }: { form: BikeForm; setForm: (form: BikeForm) => void }) {
  const urls = useQuery(
    api.bikes.photoUrls,
    form.photos.length > 0 ? { ids: form.photos } : "skip",
  );
  if (form.photos.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-zinc-700">Photos existantes</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {form.photos.map((photoId, index) => (
          <div key={photoId} className="relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            {urls?.[index] ? (
              <img src={urls[index] ?? ""} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center text-xs text-zinc-600">Photo</div>
            )}
            <button
              type="button"
              onClick={() => setForm({ ...form, photos: form.photos.filter((id) => id !== photoId) })}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-600 shadow-sm hover:bg-red-50"
              aria-label="Supprimer la photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GdrField({ form, setForm }: { form: BikeForm; setForm: (form: BikeForm) => void }) {
  const prefix = gdrPrefix(form.site);
  const suffix = form.gdrReference.replace(/\D/g, "").slice(prefix.length, prefix.length + 4);
  return (
    <label className="block text-sm font-medium text-zinc-700">
      REF GDR
      <div className="mt-1 flex h-10 overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm focus-within:border-brand-500">
        <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 font-mono text-zinc-600">{prefix}</span>
        <input
          value={suffix}
          onChange={(event) => setForm({ ...form, gdrReference: `${prefix}${event.target.value.replace(/\D/g, "").slice(0, 4)}` })}
          className="min-w-0 flex-1 bg-white px-3 font-mono text-zinc-950 outline-none"
          inputMode="numeric"
          placeholder="0000"
          maxLength={4}
          required
        />
      </div>
    </label>
  );
}

function TrackingPage() {
  const requests = useQuery(api.bikes.listRequests, {});
  const updatePipeline = useMutation(api.bikes.updateRequestPipeline);
  const [openRequest, setOpenRequest] = useState<CycleRequest | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const rows = requests ?? [];
  const selectedRequest = openRequest ? rows.find((request) => request._id === openRequest._id) ?? openRequest : null;
  const visibleColumns = tab === "open" ? pipelineColumns.slice(0, 3) : pipelineColumns.slice(3);

  async function onPipeline(id: Id<"cycleRequests">, pipelineStatus: PipelineStatus, processStep?: number) {
    setOpenRequest((current) => current && current._id === id ? {
      ...current,
      pipelineStatus,
      processStep: processStep ?? current.processStep,
      updatedAt: Date.now(),
    } : current);
    await updatePipeline({ id, pipelineStatus, processStep });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Suivi" action={<span className="inline-flex items-center gap-2 rounded-lg bg-[#196b24] px-3 py-2 text-sm font-semibold text-white"><ClipboardList className="h-4 w-4" /> Kanban</span>} />
      <div className="px-4 pt-4 sm:px-6">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
          <button
            onClick={() => setTab("open")}
            className={cn("h-9 rounded-md px-4 text-sm font-semibold", tab === "open" ? "bg-[#196b24] text-white" : "text-zinc-600")}
          >
            En cours
          </button>
          <button
            onClick={() => setTab("closed")}
            className={cn("h-9 rounded-md px-4 text-sm font-semibold", tab === "closed" ? "bg-[#196b24] text-white" : "text-zinc-600")}
          >
            Gagnée / Perdue
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {requests === undefined ? <LoadingState dark /> : (
          <div className="hidden h-full gap-4 lg:flex">
            {visibleColumns.map((column) => {
              const cards = rows.filter((request) => request.pipelineStatus === column.key);
              return (
                <KanbanColumn key={column.key} title={column.label} count={cards.length} accent={column.accent}>
                  {cards.map((request) => (
                    <TrackingCard key={request._id} request={request} onOpen={() => setOpenRequest(request)} />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
        )}
        <div className="space-y-4 lg:hidden">
          {visibleColumns.map((column) => (
            <div key={column.key}>
              <h2 className="mb-2 text-sm font-semibold text-zinc-700">{column.label}</h2>
              <div className="space-y-2">
                {rows.filter((request) => request.pipelineStatus === column.key).map((request) => (
                  <TrackingCard key={request._id} request={request} onOpen={() => setOpenRequest(request)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <BikeRequestDrawer
        request={selectedRequest}
        onClose={() => setOpenRequest(null)}
        onPipeline={onPipeline}
      />
    </div>
  );
}

function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--crm-border)] px-4 py-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">{title}</h1>
      </div>
      {action}
    </div>
  );
}

function KanbanColumn({ title, count, accent, children }: { title: string; count: number; accent: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>
        <span className="rounded-full bg-[var(--crm-surface-3)] px-2 py-0.5 text-xs text-zinc-600">{count}</span>
      </div>
      <div className="min-h-[160px] flex-1 space-y-2.5 rounded-lg bg-[var(--crm-surface-2)] p-2">
        {children}
      </div>
    </div>
  );
}

function TrackingCard({ request, onOpen }: { request: CycleRequest; onOpen: () => void }) {
  const percent = Math.round((request.processStep / processSteps.length) * 100);
  const isReebike = request.requestKind === "reebike";
  const isRepair = request.requestKind === "repair";
  const isService = isReebike || isRepair || !request.bikeId;
  return (
    <button
      onClick={onOpen}
      style={{ backgroundColor: GREEN }}
      className="w-full rounded-xl p-3 text-left text-white shadow-sm ring-1 ring-black/10 transition hover:brightness-110"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <Bike className="h-3.5 w-3.5" />
          {isRepair ? "Demande réparation" : isReebike ? "Demande Reebike" : "Réservation vélo"}
        </span>
        <span className="rounded bg-white/18 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
          {new Date(request.createdAt).toLocaleDateString("fr-FR")}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        {isService ? (
          <LogoMark className="h-14 w-14 rounded-full bg-white p-1 ring-2 ring-white/20" />
        ) : (
          <img src={request.bike ? bikeImage(request.bike) : fallbackImages[0]} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/20" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{request.customer.firstName} {request.customer.lastName}</p>
          <p className="truncate text-xs text-white/80">{isRepair ? request.customer.message : isReebike ? request.reebike?.formula : request.bikeTitle}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-white/90">
          <span className="truncate">{processSteps[Math.max(0, request.processStep - 1)] ?? "A démarrer"}</span>
          <span className="ml-2 shrink-0 tabular-nums">{percent}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-white/85">
        {isReebike && request.reebike?.bikeType && <span className="rounded bg-white/20 px-1.5 py-0.5 font-medium">{request.reebike.bikeType}</span>}
        {isReebike && request.reebike?.wheelSize && <span className="rounded bg-white/20 px-1.5 py-0.5 font-medium">{request.reebike.wheelSize}</span>}
        {isRepair && <span className="rounded bg-white/20 px-1.5 py-0.5 font-medium">Réparation</span>}
        {request.rental && <span className="rounded bg-white/20 px-1.5 py-0.5 font-medium">Location</span>}
        {request.bike?.site && <span className="rounded bg-white/20 px-1.5 py-0.5 font-medium">Site {request.bike.site}</span>}
        {request.bikeGdrReference && <span className="rounded bg-white/20 px-1.5 py-0.5 font-medium">GDR {request.bikeGdrReference}</span>}
      </div>
    </button>
  );
}

function BikeRequestDrawer({
  request,
  onClose,
  onPipeline,
}: {
  request: CycleRequest | null;
  onClose: () => void;
  onPipeline: (id: Id<"cycleRequests">, pipelineStatus: PipelineStatus, processStep?: number) => Promise<unknown>;
}) {
  const [tab, setTab] = useState<"demande" | "gestion" | "client">("demande");
  const updateRequest = useMutation(api.bikes.updateRequest);
  if (!request) return null;
  const processStep = request.processStep;
  const pipelineStatus = request.pipelineStatus;
  const isReebike = request.requestKind === "reebike";
  const isRepair = request.requestKind === "repair";

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await updateRequest({
      id: request!._id,
      customer: {
        firstName: String(data.get("firstName") ?? ""),
        lastName: String(data.get("lastName") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        message: String(data.get("message") ?? "") || undefined,
      },
    });
  }

  async function saveManagement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const siteValue = String(data.get("site") ?? "");
    await updateRequest({
      id: request!._id,
      management: {
        site: siteValue === "60" || siteValue === "76" ? siteValue : undefined,
        assignedTo: String(data.get("assignedTo") ?? "") || undefined,
        notes: String(data.get("notes") ?? "") || undefined,
      },
    });
  }

  async function saveReebike(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await updateRequest({
      id: request!._id,
      reebike: {
        desiredAt: String(data.get("desiredAt") ?? ""),
        duration: String(data.get("duration") ?? "") || undefined,
        formula: String(data.get("formula") ?? ""),
        frontBrake: String(data.get("frontBrake") ?? ""),
        bikeType: String(data.get("bikeType") ?? ""),
        wheelSize: String(data.get("wheelSize") ?? ""),
        compatibilityPhotos: request!.reebike?.compatibilityPhotos ?? [],
      },
    });
  }

  return (
    <Drawer
      open={Boolean(request)}
      onClose={onClose}
      variant="modal"
      panelClassName="border-0 shadow-[0_28px_90px_rgba(0,0,0,0.18)]"
      bodyClassName="p-6 sm:p-7"
      headerClassName="border-b-0"
      headerStyle={{ backgroundColor: GREEN }}
      closeButtonClassName="text-white/78 hover:bg-black/10 hover:text-white"
      title={
        <div className="flex w-full items-center gap-3">
          <span className="rounded-md bg-white/14 px-2 py-1 text-xs font-semibold text-white">Cycle</span>
          <span className="rounded-md bg-white/14 px-2 py-1 text-xs font-semibold text-white">{isRepair ? "Réparation" : isReebike ? "Reebike" : "Boutique"}</span>
          <span className="text-sm text-white/88">{pipelineLabels[pipelineStatus]}</span>
          {request.bikeGdrReference && <span className="font-mono text-xs text-white/65">#{request.bikeGdrReference}</span>}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => onPipeline(request._id, "gagnee")} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/12 px-3 text-xs font-semibold text-white hover:bg-white/18">
              <CheckCircle2 className="h-4 w-4" /> Gagnee
            </button>
            <button onClick={() => onPipeline(request._id, "perdue")} className="inline-flex h-8 items-center gap-1 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700">
              <XCircle className="h-4 w-4" /> Perdue
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-5 flex gap-2 border-b border-[var(--crm-border)]">
        {(["demande", "gestion", "client"] as const).map((key) => (
          <button key={key} onClick={() => setTab(key)} className={cn("border-b-2 px-3 py-2 text-sm font-semibold", tab === key ? "border-brand-500 text-zinc-950" : "border-transparent text-zinc-500")}>
            {key === "demande" ? "Demande" : key === "gestion" ? "Gestion" : "Client"}
          </button>
        ))}
      </div>

      {tab === "demande" && (
        isRepair ? (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <LogoMark className="mx-auto h-28 w-44" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950">Demande de réparation</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DarkSpec label="Client" value={`${request.customer.firstName} ${request.customer.lastName}`} />
                <DarkSpec label="Téléphone" value={request.customer.phone} />
                <DarkSpec label="Email" value={request.customer.email} />
                <DarkSpec label="Commentaire" value={request.customer.message} />
              </div>
            </div>
          </div>
        ) : isReebike ? (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <LogoMark className="mx-auto h-28 w-44" />
              <RequestPhotoPreview ids={request.reebike?.compatibilityPhotos ?? []} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950">Demande Reebike</h2>
              <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={saveReebike}>
                <CrmFieldInput label="Date souhaitee" name="desiredAt" type="datetime-local" defaultValue={request.reebike?.desiredAt ?? ""} />
                <CrmFieldSelect name="duration" label="Duree" defaultValue={request.reebike?.duration ?? reebikeDurations[0]} options={reebikeDurations} />
                <CrmFieldSelect name="formula" label="Formule" defaultValue={request.reebike?.formula ?? reebikeFormulas[0]} options={reebikeFormulas} />
                <CrmFieldSelect name="frontBrake" label="Frein avant" defaultValue={request.reebike?.frontBrake ?? "Patins"} options={reebikeBrakeTypes} />
                <CrmFieldSelect name="bikeType" label="Type de velo" defaultValue={request.reebike?.bikeType ?? "VTT"} options={reebikeBikeTypes} />
                <CrmFieldSelect name="wheelSize" label="Taille de roue" defaultValue={request.reebike?.wheelSize ?? "24 pouces"} options={reebikeWheelSizes} />
                <div className="sm:col-span-2">
                  <button className="h-10 rounded-lg bg-[#196b24] px-4 text-sm font-semibold text-white">Enregistrer la demande</button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <img src={request.bike ? bikeImage(request.bike) : fallbackImages[0]} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950">{request.bikeTitle}</h2>
              <p className="mt-3 leading-7 text-zinc-600">{request.bike?.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <DarkSpec label="REF GDR" value={request.bikeGdrReference} />
                <DarkSpec label="Site" value={request.bike?.site === "60" ? "Recyclerie 60" : "Recyclerie 76"} />
                <DarkSpec label="Categorie" value={request.bike?.category} />
                <DarkSpec label="Profil" value={request.bike?.sizeLabel} />
                <DarkSpec label="Etat" value={request.bike?.condition} />
                <DarkSpec label="Disponibilité" value={request.bike?.useMode === "rental" ? "Location" : "Achat"} />
                <DarkSpec label="Prix" value={request.bike?.useMode === "rental" ? "Non applicable" : euro(request.bike?.price)} />
                {request.rental && <DarkSpec label="Début location" value={new Date(`${request.rental.startDate}T12:00`).toLocaleDateString("fr-FR")} />}
                {request.rental && <DarkSpec label="Fin location" value={new Date(`${request.rental.endDate}T12:00`).toLocaleDateString("fr-FR")} />}
              </div>
            </div>
          </div>
        )
      )}

      {tab === "gestion" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {processSteps.map((step, index) => {
              const stepIndex = index + 1;
              const done = processStep >= stepIndex;
              return (
                <button
                  key={step}
                  onClick={() => {
                    const nextStep = done ? Math.max(0, stepIndex - 1) : stepIndex;
                    onPipeline(request._id, nextStep >= 5 ? "gagnee" : nextStep === 0 ? "nouveau" : "en_cours", nextStep);
                  }}
                  className={cn(
                    "flex min-h-24 items-start gap-3 rounded-lg border p-3 text-left text-sm font-semibold transition",
                    done ? "border-brand-500 bg-brand-500/14 text-zinc-950" : "border-[var(--crm-border)] bg-white text-zinc-600 hover:border-brand-500/50",
                  )}
                >
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold", done ? "border-[#196b24] bg-[#196b24] text-white" : "border-zinc-300 bg-white text-zinc-500")}>
                    {done ? <Check className="h-4 w-4" /> : null}
                  </span>
                  {step}
                </button>
              );
            })}
          </div>
          <form className="grid gap-3 rounded-lg border border-[var(--crm-border)] bg-white p-4" onSubmit={saveManagement}>
            <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
              Note
              <textarea
                name="notes"
                defaultValue={request.management?.notes ?? ""}
                className="mt-1 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-brand-500"
              />
            </label>
            <button className="h-10 justify-self-start rounded-lg bg-[#196b24] px-4 text-sm font-semibold text-white">Enregistrer la note</button>
          </form>
        </div>
      )}

      {tab === "client" && (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveClient}>
          <CrmFieldInput name="firstName" label="Prenom" defaultValue={request.customer.firstName} required />
          <CrmFieldInput name="lastName" label="Nom" defaultValue={request.customer.lastName} required />
          <CrmFieldInput name="email" label="Email" type="email" defaultValue={request.customer.email} required />
          <CrmFieldInput name="phone" label="Telephone" defaultValue={request.customer.phone} required />
          <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
            Message client
            <textarea
              name="message"
              defaultValue={request.customer.message ?? ""}
              className="mt-1 min-h-28 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-brand-500"
            />
          </label>
          <div className="sm:col-span-2">
            <button className="h-10 rounded-lg bg-[#196b24] px-4 text-sm font-semibold text-white">Enregistrer le client</button>
          </div>
        </form>
      )}
    </Drawer>
  );
}

function StockToolbar({ search, setSearch, site, setSite, status, setStatus }: {
  search: string;
  setSearch: (value: string) => void;
  site: "" | Site;
  setSite: (value: "" | Site) => void;
  status: "" | BikeStatus;
  setStatus: (value: "" | BikeStatus) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <DarkInlineInput icon={<Search className="h-4 w-4" />} value={search} onChange={setSearch} placeholder="Recherche, REF GDR, marque..." />
        <DarkInlineSelect value={site} onChange={(value) => setSite(value as "" | Site)} options={sites.map((item) => [item.value, item.label])} placeholder="Tous les sites" />
        <DarkInlineSelect value={status} onChange={(value) => setStatus(value as "" | BikeStatus)} options={Object.entries(stockLabels)} placeholder="Tous les statuts" />
      </div>
    </div>
  );
}

function BikeRow({
  bike,
  onOpen,
  onEdit,
  onOnline,
  onSold,
  onRemove,
}: {
  bike: BikeWithPhotos;
  onOpen: () => void;
  onEdit: () => void;
  onOnline: () => void;
  onSold: () => void;
  onRemove: () => void;
}) {
  return (
    <article
      onClick={onOpen}
      className="grid cursor-pointer gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-brand-500/40 hover:shadow-md lg:grid-cols-[220px_1fr]"
    >
      <div className="relative overflow-hidden rounded-lg bg-zinc-100">
        <img src={bikeImage(bike)} alt={bike.title} className="aspect-[4/3] h-full w-full object-cover" />
        {(bike.status === "purchase_pending" || bike.status === "waiting" || bike.status === "reserved") && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
            Déjà réservé
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={bike.status} />
              <Badge>{bike.useMode === "rental" ? "Location" : "Achat"}</Badge>
              <Badge>{bike.site === "60" ? "Recyclerie 60" : "Recyclerie 76"}</Badge>
              {bike.gdrReference && <Badge>GDR {bike.gdrReference}</Badge>}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-zinc-950">{bike.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">{bike.description}</p>
          </div>
          <p className="text-2xl font-semibold text-zinc-950">{bike.useMode === "rental" ? "Location" : euro(bike.price)}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-700">
          {[bike.category, bike.sizeLabel, bike.condition].filter(Boolean).map((item) => (
            <span key={item} className="rounded-md bg-zinc-100 px-2 py-1">{item}</span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            Modifier
          </button>
          <button
            className="rounded-lg bg-[#196b24] px-3 py-2 text-xs font-semibold text-white"
            onClick={(event) => {
              event.stopPropagation();
              onOnline();
            }}
          >
            {bike.status === "available" || bike.status === "online" ? "Rendre inactif" : "Disponible"}
          </button>
          <button
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={(event) => {
              event.stopPropagation();
              onSold();
            }}
          >
            Vendu
          </button>
          <button
            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function FilterInput({ icon, value, onChange, placeholder }: { icon: ReactNode; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500">{icon}<input className="min-w-0 bg-transparent text-zinc-950 outline-none placeholder:text-zinc-600" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[][]; placeholder: string }) {
  return <select className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}</select>;
}

function DarkInlineInput({ icon, value, onChange, placeholder }: { icon: ReactNode; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500">{icon}<input className="min-w-0 bg-transparent text-zinc-950 outline-none placeholder:text-zinc-500" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function DarkInlineSelect({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[][]; placeholder: string }) {
  return <select className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}</select>;
}

function DarkText({ label, value, onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-zinc-700">{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-500" /></label>;
}

function DarkTextarea({ label, value, onChange, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-zinc-700">{label}<textarea {...props} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-brand-500" /></label>;
}

function DarkSelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block text-sm font-medium text-zinc-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-500">{options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}</select></label>;
}

function LightInput({ label, value, onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-zinc-700">{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#196b24]" /></label>;
}

function CrmFieldInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <input
        {...props}
        className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-500"
      />
    </label>
  );
}

function CrmFieldSelect({
  label,
  name,
  defaultValue,
  options,
  labels,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-brand-500"
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateTimePicker({ label, value, onChange, onlyThursday = false }: { label: string; value: string; onChange: (value: string) => void; onlyThursday?: boolean }) {
  const selected = value ? new Date(value) : null;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selected ?? new Date());
  const time = value.includes("T") ? value.split("T")[1] : "09:00";
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = Array.from({ length: startOffset + daysInMonth }, (_, index) => index < startOffset ? null : index - startOffset + 1);
  const labelValue = selected
    ? selected.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })
    : "Choisir une date et une heure";

  function emit(day: number, nextTime = time || "09:00") {
    const date = new Date(year, monthIndex, day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}T${nextTime}`);
  }

  return (
    <div className="relative">
      <p className="text-xl font-semibold text-zinc-950">{label}*</p>
      {onlyThursday && <p className="mt-1 text-sm font-medium text-[#196b24]">Nous proposons les retraits uniquement le jeudi.</p>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 text-left text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-[#196b24]/40"
      >
        <span>{labelValue}</span>
        <CalendarDays className="h-5 w-5 text-[#196b24]" />
      </button>
      <input value={value} onChange={() => undefined} required className="sr-only" tabIndex={-1} />
      {open && (
        <div className="absolute z-20 mt-3 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-semibold capitalize">{month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
            <button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500">
            {["L", "M", "M", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const active = Boolean(day && selected?.getFullYear() === year && selected.getMonth() === monthIndex && selected.getDate() === day);
              const disabled = Boolean(day && onlyThursday && new Date(year, monthIndex, day).getDay() !== 4);
              return day ? (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => emit(day)}
                  className={cn("h-10 rounded-lg text-sm font-semibold", active ? "bg-[#196b24] text-white" : disabled ? "cursor-not-allowed text-zinc-300" : "text-zinc-800 hover:bg-zinc-100")}
                >
                  {day}
                </button>
              ) : <span key={`empty-${index}`} />;
            })}
          </div>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Heure
            <select
              value={time || "09:00"}
              onChange={(event) => {
                const day = selected?.getDate() ?? new Date().getDate();
                emit(day, event.target.value);
              }}
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#196b24]"
            >
              {["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"].map((hour) => <option key={hour} value={hour}>{hour}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function ThursdayDatePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const selected = value ? new Date(`${value}T12:00`) : null;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selected ?? new Date());
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = Array.from({ length: startOffset + daysInMonth }, (_, index) => index < startOffset ? null : index - startOffset + 1);

  function emit(day: number) {
    const date = new Date(year, monthIndex, day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <p className="text-sm font-medium text-zinc-700">{label}</p>
      <p className="mt-1 text-xs font-medium text-[#196b24]">Nous proposons les retraits uniquement le jeudi.</p>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm font-semibold text-zinc-900"
      >
        <span>{selected ? selected.toLocaleDateString("fr-FR", { dateStyle: "full" }) : "Choisir un jeudi"}</span>
        <CalendarDays className="h-4 w-4 text-[#196b24]" />
      </button>
      <input value={value} required onChange={() => undefined} className="sr-only" tabIndex={-1} />
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200"><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-sm font-semibold capitalize">{month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
            <button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500">
            {["L", "M", "M", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const disabled = Boolean(day && new Date(year, monthIndex, day).getDay() !== 4);
              const active = Boolean(day && selected?.getFullYear() === year && selected.getMonth() === monthIndex && selected.getDate() === day);
              return day ? (
                <button key={day} type="button" disabled={disabled} onClick={() => emit(day)} className={cn("h-9 rounded-lg text-sm font-semibold", active ? "bg-[#196b24] text-white" : disabled ? "cursor-not-allowed text-zinc-300" : "text-zinc-800 hover:bg-zinc-100")}>
                  {day}
                </button>
              ) : <span key={`empty-${index}`} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestPhotoPreview({ ids }: { ids: Id<"_storage">[] }) {
  const urls = useQuery(api.bikes.photoUrls, ids.length > 0 ? { ids } : "skip");
  if (!ids.length) return <p className="mt-4 text-center text-sm text-zinc-500">Aucune photo de compatibilite</p>;
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {ids.map((id, index) => (
        <div key={id} className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
          {urls?.[index] ? (
            <img src={urls[index] ?? ""} alt="" className="aspect-square w-full object-cover" />
          ) : (
            <div className="grid aspect-square place-items-center text-xs text-zinc-500">Photo</div>
          )}
        </div>
      ))}
    </div>
  );
}

function RadioGroup({ title, value, options, onChange, required = false }: { title: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
  return (
    <fieldset>
      <legend className="text-xl font-semibold text-zinc-950">{title}{required ? "*" : ""}</legend>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <label key={option} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-base font-semibold transition", value === option ? "border-[#196b24] bg-[#196b24]/8 text-[#196b24] shadow-sm" : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300")}>
            <input
              type="radio"
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
              required={required}
            />
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", value === option ? "border-[#196b24]" : "border-zinc-300")}>
              {value === option && <span className="h-2.5 w-2.5 rounded-full bg-[#196b24]" />}
            </span>
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Spec({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg border border-zinc-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p><p className="mt-2 font-medium">{value ?? "Non renseigne"}</p></div>;
}

function DarkSpec({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg border border-zinc-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p><p className="mt-2 font-medium text-zinc-900">{value ?? "Non renseigne"}</p></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">{children}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const label = stockLabel(status);
  const className =
    label === "Disponible"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : label === "Achat en cours"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : label === "Vendu"
          ? "border-zinc-300 bg-zinc-100 text-zinc-700"
          : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", className)}>{label}</span>;
}

function LoadingState({ dark = false }: { dark?: boolean }) {
  return <div className={cn("grid min-h-60 place-items-center", dark ? "text-zinc-600" : "text-zinc-500")}><Loader2 className="h-8 w-8 animate-spin" /></div>;
}

function EmptyShop() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center">
      <Bike className="mx-auto h-10 w-10 text-zinc-700" />
      <h3 className="mt-4 text-lg font-semibold">Aucun velo en ligne</h3>
      <p className="mt-2 text-sm text-zinc-500">Ajoute un velo dans le CRM puis publie-le pour alimenter la boutique.</p>
    </div>
  );
}
