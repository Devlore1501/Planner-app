import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  KeyRound,
  Plus,
  Save,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBrands,
  useCreateUser,
  useDeleteUser,
  useNotionSettings,
  useResetUserPassword,
  useSaveNotionSettings,
  useSystemStatus,
  useUsers,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/api";

function StatusRow({
  label,
  ok,
  okLabel = "Configurato",
  koLabel = "Non configurato",
}: {
  label: string;
  ok: boolean;
  okLabel?: string;
  koLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <span
        className={
          ok
            ? "inline-flex items-center gap-1 text-emerald-700"
            : "inline-flex items-center gap-1 text-muted-foreground"
        }
      >
        {ok ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        {ok ? okLabel : koLabel}
      </span>
    </div>
  );
}

const ROLE_STYLES: Record<string, string> = {
  agency: "border-indigo-200 bg-indigo-50 text-indigo-700",
  client: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function UsersCard() {
  const { user: me } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: brands } = useBrands();
  const createUser = useCreateUser();
  const resetPassword = useResetUserPassword();
  const deleteUser = useDeleteUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [brandId, setBrandId] = useState<string>("");

  function handleCreate() {
    if (!email.trim() || !password.trim()) {
      toast.error("Email e password sono obbligatorie");
      return;
    }
    if (role === "client" && !brandId) {
      toast.error("Seleziona il brand del cliente");
      return;
    }
    createUser.mutate(
      {
        email: email.trim(),
        password,
        role,
        brand_id: role === "client" ? Number(brandId) : null,
      },
      {
        onSuccess: () => {
          toast.success("Account creato");
          setEmail("");
          setPassword("");
          setBrandId("");
        },
        onError: (err) => toast.error(`Errore: ${err.message}`),
      }
    );
  }

  function handleReset(userId: number) {
    const newPassword = window.prompt("Nuova password per questo account:");
    if (!newPassword) return;
    resetPassword.mutate(
      { id: userId, password: newPassword },
      {
        onSuccess: () => toast.success("Password aggiornata"),
        onError: (err) => toast.error(`Errore: ${err.message}`),
      }
    );
  }

  function handleDelete(userId: number, userEmail: string) {
    if (!window.confirm(`Eliminare l'account "${userEmail}"?`)) return;
    deleteUser.mutate(userId, {
      onSuccess: () => toast.success("Account eliminato"),
      onError: (err) => toast.error(`Errore: ${err.message}`),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Utenti
        </CardTitle>
        <CardDescription>
          Account agenzia (accesso a tutti i brand) e account cliente (accesso al
          proprio brand: piani, catalogo, saldo pacchetto).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2">
            {(users ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{u.email}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        ROLE_STYLES[u.role] ?? "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.role === "agency" ? "agenzia" : "cliente"}
                    </span>
                  </div>
                  {u.brand_name && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {u.brand_name}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reimposta password"
                    onClick={() => handleReset(u.id)}
                  >
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {u.id !== me?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Elimina account"
                      onClick={() => handleDelete(u.id, u.email)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4 text-primary" />
            Nuovo account
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@brand.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password provvisoria"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ruolo</Label>
              <div className="flex gap-2">
                {(["client", "agency"] as UserRole[]).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={role === r ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRole(r)}
                  >
                    {r === "client" ? "Cliente" : "Agenzia"}
                  </Button>
                ))}
              </div>
            </div>
            {role === "client" && (
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {(brands ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={createUser.isPending}>
              <Plus className="h-4 w-4" />
              {createUser.isPending ? "Creazione…" : "Crea account"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const { data: settings, isLoading } = useNotionSettings();
  const { data: system, isLoading: systemLoading } = useSystemStatus();
  const saveSettings = useSaveNotionSettings();

  const [token, setToken] = useState("");
  const [templatesDbId, setTemplatesDbId] = useState<string | null>(null);
  const [calendarPageId, setCalendarPageId] = useState<string | null>(null);

  const effectiveDbId = templatesDbId ?? settings?.templates_db_id ?? "";
  const effectivePageId =
    calendarPageId ?? settings?.calendar_parent_page_id ?? "";

  function handleSave() {
    const payload: {
      token?: string;
      templates_db_id?: string;
      calendar_parent_page_id?: string;
    } = {};
    if (token.trim()) payload.token = token.trim();
    if (templatesDbId !== null) payload.templates_db_id = templatesDbId.trim();
    if (calendarPageId !== null)
      payload.calendar_parent_page_id = calendarPageId.trim();

    if (Object.keys(payload).length === 0) {
      toast.info("Nessuna modifica da salvare");
      return;
    }
    saveSettings.mutate(payload, {
      onSuccess: () => {
        toast.success("Impostazioni Notion salvate");
        setToken("");
        setTemplatesDbId(null);
        setCalendarPageId(null);
      },
      onError: (err) => toast.error(`Errore: ${err.message}`),
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">
          Configurazione a livello agenzia (valida per tutti i brand).
        </p>
      </div>

      <UsersCard />

      {/* Notion */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notion</CardTitle>
              <CardDescription>
                Token dell'integrazione, database template Canva e pagina padre
                per i calendari editoriali.
              </CardDescription>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : settings?.configured ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Configurato
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <XCircle className="h-3.5 w-3.5" />
                Non configurato
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notion-token">Token integrazione</Label>
            <Input
              id="notion-token"
              type="password"
              placeholder={
                settings?.token_preview
                  ? `Attuale: ${settings.token_preview} — inserisci per sostituire`
                  : "ntn_…"
              }
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="templates-db">Database template (ID)</Label>
            <Input
              id="templates-db"
              value={effectiveDbId}
              onChange={(e) => setTemplatesDbId(e.target.value)}
              placeholder="ID del database Notion con i template Canva"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-page">
              Pagina padre calendari (ID)
            </Label>
            <Input
              id="calendar-page"
              value={effectivePageId}
              onChange={(e) => setCalendarPageId(e.target.value)}
              placeholder="ID della pagina Notion sotto cui pubblicare i piani"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Template sincronizzati:{" "}
              <span className="font-medium text-foreground">
                {settings?.templates_synced ?? 0}
              </span>
              {settings?.templates_last_sync_at
                ? ` · ultima sync ${formatDate(settings.templates_last_sync_at, "long")}`
                : " · mai sincronizzati"}
            </p>
            <Button onClick={handleSave} disabled={saveSettings.isPending}>
              <Save className="h-4 w-4" />
              {saveSettings.isPending ? "Salvataggio…" : "Salva"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stato sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Stato sistema</CardTitle>
          <CardDescription>
            {system ? `Versione ${system.version}` : "Stato del backend"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {systemLoading ? (
            <>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </>
          ) : system ? (
            <>
              <StatusRow label="Backend" ok={system.ok} okLabel="Online" koLabel="Offline" />
              <StatusRow
                label="API Claude (Anthropic)"
                ok={system.anthropic_configured}
              />
              <StatusRow label="Notion" ok={system.notion_configured} />
              <StatusRow
                label="Database"
                ok={system.database_persistent}
                okLabel={`Persistente (${system.database})`}
                koLabel="SQLite non persistente"
              />
              {!system.database_persistent && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      Attenzione: il database non è collegato a Postgres.
                    </p>
                    <p className="mt-0.5">
                      Brand, piani e chiavi Klaviyo sono salvati in un file locale
                      che viene <strong>cancellato ad ogni nuovo deploy</strong>.
                      Collega la variabile <code>DATABASE_URL</code> al servizio
                      Postgres su Railway (vedi DEPLOY.md) prima di inserire dati
                      veri.
                    </p>
                  </div>
                </div>
              )}
              {system.mock_mode && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <Badge
                      variant="outline"
                      className="mb-1 border-amber-300 bg-amber-100 text-amber-800"
                    >
                      mock_mode attivo
                    </Badge>
                    <p>
                      API Claude non configurata: generazione demo. I piani
                      generati sono deterministici e servono solo a provare il
                      flusso end-to-end.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Impossibile contattare il backend.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
