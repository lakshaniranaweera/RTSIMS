import { Badge } from "@/components/ui/badge";
import type { ActivationStatus } from "@prisma/client";

const TONE: Record<ActivationStatus, string> = {
  PENDING: "bg-amber-500 text-white",
  ACCEPTED: "bg-emerald-500 text-white",
  REJECTED: "bg-red-500 text-white",
};

const LABEL: Record<ActivationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export function ActivationStatusBadge({ status }: { status: ActivationStatus }) {
  return <Badge className={TONE[status]}>{LABEL[status]}</Badge>;
}

export { LABEL as ACTIVATION_STATUS_LABEL };
