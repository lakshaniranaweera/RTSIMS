import { Badge } from "@/components/ui/badge";
import type { RequestStatus, ReturnStatus } from "@prisma/client";

const REQUEST_TONE: Record<RequestStatus, string> = {
  PENDING: "bg-amber-500 text-white",
  ACCEPTED: "bg-blue-500 text-white",
  PACKING: "bg-indigo-500 text-white",
  READY_TO_DELIVER: "bg-violet-500 text-white",
  SENT: "bg-orange-500 text-white",
  RECEIVED: "bg-emerald-500 text-white",
  REJECTED: "bg-red-500 text-white",
};

const REQUEST_LABEL: Record<RequestStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PACKING: "Packing",
  READY_TO_DELIVER: "Ready to deliver",
  SENT: "Sent",
  RECEIVED: "Received",
  REJECTED: "Rejected",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge className={REQUEST_TONE[status]}>{REQUEST_LABEL[status]}</Badge>;
}

const RETURN_TONE: Record<ReturnStatus, string> = {
  PENDING: "bg-amber-500 text-white",
  ACCEPTED: "bg-emerald-500 text-white",
  REJECTED: "bg-red-500 text-white",
};

export function ReturnBadge({ status }: { status: ReturnStatus }) {
  return <Badge className={RETURN_TONE[status]}>{status}</Badge>;
}

export { REQUEST_LABEL };
