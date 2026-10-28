"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AuthProvider } from "../AuthContext";
import { CartProvider } from "../CartContext";
import CategoryBar from "../features/catalog/components/CategoryBar";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { theme } from "../theme";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <CartProvider>
          <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Header />
            <Suspense fallback={null}><CategoryBar /></Suspense>
            <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
              <Container>{children}</Container>
            </Box>
            <Footer />
          </Box>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
