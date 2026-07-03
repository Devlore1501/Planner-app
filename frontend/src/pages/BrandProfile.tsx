import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FileUp, ImageIcon, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrand, useExtractProfile, useSetPackage, useUpdateBrand } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { Brand, ExtractedProfile } from "@/types/api";

function PackageCard({ brand, isAgency }: { brand: Brand; isAgency: boolean }) {
  const setPackage = useSetPackage(brand.id);
  const [topUp, setTopUp] = useState("");
  const remaining = Math.max(0, brand.package_total - brand.package_used);
  const pct = brand.package_total > 0
    ? Math.min(100, Math.round((brand.package_used / brand.package_total) * 100))
    : 0;

  function handleTopUp() {
    const value = Number(topUp);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Inserisci un numero valido");
      return;
    }
    setPackage.mutate(
      { package_total: value },
      {
        onSuccess: () => {
          toast.success("Pacchetto aggiornato");
          setTopUp("");
        },
        onError: (err) => toast.error(`Errore: ${err.message}`),
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Pacchetto grafiche
        </CardTitle>
        <CardDescription>
          Le email in formato grafica vengono scalate dal pacchetto quando il
          piano viene approvato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <span className="text-lg font-semibold tabular-nums">{remaining}</span>
            <span className="text-muted-foreground"> disponibili su {brand.package_total}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {brand.package_used} usate
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {isAgency && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              type="number"
              min={0}
              placeholder="Nuovo totale pacchetto"
              className="max-w-[220px]"
              value={topUp}
              onChange={(e) => setTopUp(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTopUp}
              disabled={setPackage.isPending || topUp === ""}
            >
              Aggiorna
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FormState {
  name: string;
  country: string;
  description: string;
  tone_of_voice: string;
  mission: string;
  positioning: string;
  emails_per_week: number;
  avatar_who: string;
  avatar_desires: string;
  avatar_objections: string;
  avatar_language: string;
  avatar_notes: string;
}

function toFormState(brand: Brand): FormState {
  return {
    name: brand.name ?? "",
    country: brand.country ?? "IT",
    description: brand.description ?? "",
    tone_of_voice: brand.tone_of_voice ?? "",
    mission: brand.mission ?? "",
    positioning: brand.positioning ?? "",
    emails_per_week: brand.emails_per_week ?? 3,
    avatar_who: brand.avatar?.who ?? "",
    avatar_desires: (brand.avatar?.desires ?? []).join("\n"),
    avatar_objections: (brand.avatar?.objections ?? []).join("\n"),
    avatar_language: brand.avatar?.language ?? "",
    avatar_notes: brand.avatar?.notes ?? "",
  };
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BrandProfile() {
  const { brandId: brandIdParam } = useParams();
  const brandId = Number(brandIdParam);
  const { user } = useAuth();
  const isAgency = user?.role === "agency";
  const { data: brand, isLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);
  const extract = useExtractProfile(brandId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [form, setForm] = useState<FormState | null>(null);

  function applyExtraction(result: ExtractedProfile) {
    setForm((f) => {
      if (!f) return f;
      const merged = { ...f };
      if (result.description) merged.description = result.description;
      if (result.tone_of_voice) merged.tone_of_voice = result.tone_of_voice;
      if (result.mission) merged.mission = result.mission;
      if (result.positioning) merged.positioning = result.positioning;
      if (result.avatar?.who) merged.avatar_who = result.avatar.who;
      if (result.avatar?.desires?.length)
        merged.avatar_desires = result.avatar.desires.join("\n");
      if (result.avatar?.objections?.length)
        merged.avatar_objections = result.avatar.objections.join("\n");
      if (result.avatar?.language) merged.avatar_language = result.avatar.language;
      if (result.avatar?.notes) merged.avatar_notes = result.avatar.notes;
      return merged;
    });
  }

  function handleExtract() {
    if (selectedFiles.length === 0) {
      toast.error("Seleziona prima un PDF (o TXT/MD)");
      return;
    }
    extract.mutate(
      { files: selectedFiles },
      {
        onSuccess: (result) => {
          applyExtraction(result);
          setSelectedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
          toast.success(
            "Profilo estratto dal documento: rivedi i campi e premi Salva",
            { duration: 6000 }
          );
          if (result.extraction_notes) {
            toast.info(result.extraction_notes, { duration: 8000 });
          }
        },
        onError: (err) => toast.error(`Estrazione fallita: ${err.message}`),
      }
    );
  }

  useEffect(() => {
    if (brand && !form) setForm(toFormState(brand));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function handleSave() {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Il nome del brand è obbligatorio");
      return;
    }
    updateBrand.mutate(
      {
        name: form.name.trim(),
        description: form.description,
        tone_of_voice: form.tone_of_voice,
        mission: form.mission,
        positioning: form.positioning,
        emails_per_week: Number(form.emails_per_week) || 3,
        country: form.country,
        avatar: {
          who: form.avatar_who,
          desires: splitLines(form.avatar_desires),
          objections: splitLines(form.avatar_objections),
          language: form.avatar_language,
          notes: form.avatar_notes,
        },
      },
      {
        onSuccess: () => toast.success("Profilo brand salvato"),
        onError: (err) => toast.error(`Errore: ${err.message}`),
      }
    );
  }

  if (isLoading || !form) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Profilo brand
          </h1>
          <p className="text-sm text-muted-foreground">
            Questi dati alimentano la generazione dei piani editoriali.
          </p>
        </div>
        {isAgency && (
          <Button onClick={handleSave} disabled={updateBrand.isPending}>
            <Save className="h-4 w-4" />
            {updateBrand.isPending ? "Salvataggio…" : "Salva profilo"}
          </Button>
        )}
      </div>

      {brand && <PackageCard brand={brand} isAgency={isAgency} />}

      {isAgency && (
      <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.04] to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Compila da documento
          </CardTitle>
          <CardDescription>
            Carica il brand book o il questionario del cliente (PDF, fino a 3
            file): l'AI estrae identità, tono di voce e avatar. Poi rivedi e
            salva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              multiple
              className="max-w-md cursor-pointer"
              onChange={(e) =>
                setSelectedFiles(Array.from(e.target.files ?? []).slice(0, 3))
              }
            />
            <Button
              onClick={handleExtract}
              disabled={extract.isPending || selectedFiles.length === 0}
            >
              {extract.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              {extract.isPending
                ? "Analisi in corso… (può richiedere ~1 min)"
                : "Analizza documento"}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identità</CardTitle>
          <CardDescription>
            Chi è il brand e come parla ai suoi clienti.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={!isAgency}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Cosa vende il brand, a chi, come…"
              disabled={!isAgency}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Tone of voice</Label>
            <Textarea
              id="tone"
              rows={2}
              value={form.tone_of_voice}
              onChange={(e) => set("tone_of_voice", e.target.value)}
              placeholder="es. prima persona, confidenziale, da enologo"
              disabled={!isAgency}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mission">Mission</Label>
            <Textarea
              id="mission"
              rows={2}
              value={form.mission}
              onChange={(e) => set("mission", e.target.value)}
              disabled={!isAgency}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="positioning">Positioning</Label>
            <Textarea
              id="positioning"
              rows={2}
              value={form.positioning}
              onChange={(e) => set("positioning", e.target.value)}
              disabled={!isAgency}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="epw">Email a settimana</Label>
              <Input
                id="epw"
                type="number"
                min={1}
                max={7}
                className="w-32"
                value={form.emails_per_week}
                onChange={(e) => set("emails_per_week", Number(e.target.value))}
                disabled={!isAgency}
              />
              <p className="text-xs text-muted-foreground">
                Base del piano mensile (×4).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Paese di destinazione</Label>
              <select
                id="country"
                className="flex h-10 w-full max-w-[220px] cursor-pointer rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                disabled={!isAgency}
              >
                <option value="IT">Italia</option>
                <option value="FR">Francia</option>
                <option value="DE">Germania</option>
                <option value="ES">Spagna</option>
                <option value="GB">Regno Unito</option>
                <option value="US">Stati Uniti</option>
                <option value="CH">Svizzera</option>
                <option value="AT">Austria</option>
                <option value="NL">Paesi Bassi</option>
                <option value="BE">Belgio</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Usato per festività, ponti e ricorrenze nel calendario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avatar / Buyer persona</CardTitle>
          <CardDescription>
            Il cliente tipo a cui scrivono le email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="who">Chi è</Label>
            <Textarea
              id="who"
              rows={2}
              value={form.avatar_who}
              onChange={(e) => set("avatar_who", e.target.value)}
              placeholder="es. appassionato di vino 35-60, acquista online…"
              disabled={!isAgency}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="desires">Desideri (uno per riga)</Label>
              <Textarea
                id="desires"
                rows={4}
                value={form.avatar_desires}
                onChange={(e) => set("avatar_desires", e.target.value)}
                placeholder={"bere meglio\nscoprire cantine"}
                disabled={!isAgency}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objections">Obiezioni (una per riga)</Label>
              <Textarea
                id="objections"
                rows={4}
                value={form.avatar_objections}
                onChange={(e) => set("avatar_objections", e.target.value)}
                placeholder={"prezzo\nspedizione"}
                disabled={!isAgency}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Linguaggio</Label>
            <Input
              id="language"
              value={form.avatar_language}
              onChange={(e) => set("avatar_language", e.target.value)}
              placeholder="es. informale, evocativo"
              disabled={!isAgency}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar-notes">Note</Label>
            <Textarea
              id="avatar-notes"
              rows={2}
              value={form.avatar_notes}
              onChange={(e) => set("avatar_notes", e.target.value)}
              disabled={!isAgency}
            />
          </div>
        </CardContent>
      </Card>

      {isAgency && (
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateBrand.isPending}>
          <Save className="h-4 w-4" />
          {updateBrand.isPending ? "Salvataggio…" : "Salva profilo"}
        </Button>
      </div>
      )}
    </div>
  );
}
