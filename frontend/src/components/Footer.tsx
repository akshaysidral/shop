import { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { brand } from "../theme";
import Logo from "./Logo";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ fontWeight: 700, color: "#fff" }}>{title}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

export default function Footer() {
  const link = { color: "#fff", underline: "hover" as const, variant: "body2" as const };
  return (
    <Box component="footer" sx={{ bgcolor: brand.footer, color: "#b9b6d8", mt: 4, py: 4 }}>
      <Container>
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr 1fr", md: "2fr 1fr 1fr" } }}>
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <Logo light />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Shop. Sell. Celebrate. A marketplace demo built with React, Material UI and Spring Boot.
            </Typography>
          </Box>
          <Column title="Shop">
            <Link component={RouterLink} to="/" {...link}>All products</Link>
            <Link component={RouterLink} to="/cart" {...link}>Cart</Link>
            <Link component={RouterLink} to="/orders" {...link}>My orders</Link>
          </Column>
          <Column title="Sellers">
            <Link component={RouterLink} to="/login" state={{ mode: "register", accountType: "SELLER" }} {...link}>Sell on Bazario</Link>
            <Link component={RouterLink} to="/seller" {...link}>Seller Hub</Link>
          </Column>
        </Box>
        <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.15)" }} />
        <Typography variant="body2">&copy; {new Date().getFullYear()} Bazario. All rights reserved.</Typography>
      </Container>
    </Box>
  );
}
