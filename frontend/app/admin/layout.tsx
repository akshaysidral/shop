"use client";

import type { ReactNode } from "react";
import PanelLayout from "../../src/components/PanelLayout";
import { RequirePermission } from "../../src/components/Guards";
import { ADMIN_LINKS } from "../../src/views/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequirePermission permission="STATS_READ">
      <PanelLayout title="Admin panel" links={ADMIN_LINKS}>{children}</PanelLayout>
    </RequirePermission>
  );
}
