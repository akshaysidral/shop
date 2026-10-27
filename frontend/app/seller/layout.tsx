"use client";

import type { ReactNode } from "react";
import PanelLayout from "../../src/components/PanelLayout";
import { RequirePermission } from "../../src/components/Guards";
import { SELLER_LINKS } from "../../src/views/navigation";

export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <RequirePermission permission="PRODUCTS_CREATE">
      <PanelLayout title="Seller Hub" links={SELLER_LINKS}>{children}</PanelLayout>
    </RequirePermission>
  );
}
