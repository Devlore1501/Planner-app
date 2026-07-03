import { FlaskConical, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandSwitcher } from "@/components/layout/BrandSwitcher";
import { useSystemStatus } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopBarProps {
  brandId: number | null;
}

export function TopBar({ brandId }: TopBarProps) {
  const { data: system } = useSystemStatus();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
          {user?.role === "agency" ? "Agenzia Mailift" : "Il mio workspace"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {system?.mock_mode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-300 bg-amber-50 text-amber-700"
                >
                  <FlaskConical className="h-3 w-3" />
                  Modalità demo
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              API Claude non configurata: generazione demo
            </TooltipContent>
          </Tooltip>
        )}
        <Separator orientation="vertical" className="h-6" />
        <BrandSwitcher currentBrandId={brandId} />
        <Separator orientation="vertical" className="h-6" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Esci"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{user?.email} · Esci</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
