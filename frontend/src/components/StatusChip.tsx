import Chip from "@mui/material/Chip";

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

const COLOR: Record<string, ChipColor> = {
  PLACED: "primary", SHIPPED: "info", DELIVERED: "success", CANCELLED: "error",
  LIVE: "success", SCHEDULED: "info", PAUSED: "default", ENDED: "default",
};

export default function StatusChip({ status }: { status: string }) {
  return <Chip size="small" label={status} color={COLOR[status] ?? "default"} />;
}
