import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";

export type SelectOption = { value: string | number; label: string };

/** A labelled native dropdown (works well on phones and is easy to test). */
export default function SelectField({ id, label, value, onChange, options, size = "small", fullWidth = true, sx }: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  size?: "small" | "medium";
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <TextField
      select
      id={id}
      label={label}
      value={value}
      size={size}
      fullWidth={fullWidth}
      sx={sx}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </TextField>
  );
}
