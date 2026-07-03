import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Plus, Store } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useBrands } from "@/lib/queries";
import { setLastBrandId } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface BrandSwitcherProps {
  currentBrandId: number | null;
}

/**
 * Brand switcher in topbar: dropdown con ricerca (Command).
 * Cambiando brand naviga a /brands/:id/plans e persiste la scelta.
 * Un account cliente ha un solo brand: mostra un'etichetta statica invece
 * del selettore (niente "Nuovo brand", niente switch inutile).
 */
export function BrandSwitcher({ currentBrandId }: BrandSwitcherProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: brands, isLoading } = useBrands();

  const current = brands?.find((b) => b.id === currentBrandId) ?? null;

  function selectBrand(id: number) {
    setLastBrandId(id);
    setOpen(false);
    navigate(`/brands/${id}/plans`);
  }

  if (user?.role === "client") {
    return (
      <span className="flex w-[220px] items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm">
        <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">
          {current?.name ?? user.brand_name ?? "Il tuo brand"}
        </span>
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Seleziona brand"
          className="w-[220px] justify-between"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {current
                ? current.name
                : isLoading
                  ? "Caricamento…"
                  : "Seleziona brand"}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Cerca brand…" />
          <CommandList>
            <CommandEmpty>Nessun brand trovato.</CommandEmpty>
            <CommandGroup heading="Brand">
              {(brands ?? []).map((brand) => (
                <CommandItem
                  key={brand.id}
                  value={brand.name}
                  onSelect={() => selectBrand(brand.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      brand.id === currentBrandId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{brand.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem
                value="__new__"
                onSelect={() => {
                  setOpen(false);
                  navigate("/", { state: { openNewBrand: true } });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuovo brand
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
