"use client";

import { Suspense } from "react";
import LoginPage from "../../src/features/auth/LoginPage";

export default function LoginRoute() {
  return <Suspense fallback={null}><LoginPage /></Suspense>;
}
