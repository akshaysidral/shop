"use client";

import { Suspense } from "react";
import LoginPage from "../../src/LoginPage";

export default function LoginRoute() {
  return <Suspense fallback={null}><LoginPage /></Suspense>;
}
