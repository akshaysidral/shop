import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "./api";
import { BuyButton } from "./components/Buttons";
import { BagIcon } from "./icons";
import { brand } from "./theme";

type AccountType = "BUYER" | "SELLER";
type NavState = { from?: string; mode?: "login" | "register"; accountType?: AccountType } | null;

export default function LoginPage({ onAuth }: { onAuth: () => void | Promise<void> }) {
  const location = useLocation();
  const hint = location.state as NavState;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">(hint?.mode ?? "login");
  const [accountType, setAccountType] = useState<AccountType>(hint?.accountType ?? "BUYER");
  const [storeName, setStoreName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = mode === "login"
        ? { email, password }
        : accountType === "SELLER"
          ? { email, password, accountType, storeName: storeName.trim() }
          : { email, password, accountType };
      const r = await api.post<{ token: string }>(`/auth/${mode}`, body);
      localStorage.setItem("token", r.data.token);
      await onAuth();
      const fallback = mode === "register" && accountType === "SELLER" ? "/seller" : "/";
      nav(hint?.from ?? fallback, { replace: true });
    } catch (err) {
      setMsg(errMsg(err, "Request failed (password needs 6+ chars)"));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : accountType === "SELLER" ? "Grow your business" : "Join Bazario";
  const blurb = mode === "login"
    ? "Get access to your orders, cart and seller tools."
    : accountType === "SELLER"
      ? "List products, run festival offers and ship orders from one place. Bazario keeps a small commission on each sale: 5% as standard, 3% for preferred sellers."
      : "Discover products by category and enjoy festival deals.";

  return (
    <Paper variant="outlined" sx={{ maxWidth: 880, mx: "auto", overflow: "hidden", display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" } }}>
      <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "space-between", p: 4, color: "#fff", background: brand.gradient }}>
        <Box>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography sx={{ mt: 2, opacity: 0.85 }}>{blurb}</Typography>
        </Box>
        <BagIcon sx={{ fontSize: 96, opacity: 0.4 }} />
      </Box>

      <Box component="form" onSubmit={submit} noValidate sx={{ p: { xs: 3, md: 5 }, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ display: { md: "none" }, fontWeight: 700 }}>{mode === "login" ? "Login" : "Register"}</Typography>
        {mode === "register" && (
          <RadioGroup row aria-label="Account type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
            <FormControlLabel value="BUYER" control={<Radio />} label="I want to buy" />
            <FormControlLabel value="SELLER" control={<Radio />} label="I want to sell" />
          </RadioGroup>
        )}
        <TextField id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField id="password" label="Password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
                   value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === "register" && accountType === "SELLER" && (
          <TextField id="store" label="Store name" helperText='Buyers see this as "Sold by ..."' value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        )}
        {msg && <Alert severity="error">{msg}</Alert>}
        <BuyButton type="submit" variant="contained" size="large" disabled={busy}>
          {mode === "login" ? "Login" : "Create account"}
        </BuyButton>
        <Button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); }}>
          Switch to {mode === "login" ? "register" : "login"}
        </Button>
      </Box>
    </Paper>
  );
}
