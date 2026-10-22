import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { DisplayStatus } from "@/lib/types";

const styles: Record<DisplayStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-stone-200 text-stone-700",
  COMPLETED: "bg-sky-100 text-sky-900",
  NO_SHOW: "bg-rose-100 text-rose-900",
  EXPIRED: "bg-orange-100 text-orange-900",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Badge variant="secondary" className={styles[status]}>
      {statusLabel(status)}
    </Badge>
  );
}
