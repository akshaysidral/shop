import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "../testUtils";
import { RequirePermission } from "./Guards";

function guarded(permission: string | string[], options: Parameters<typeof renderApp>[1]) {
  return renderApp(
    <Routes>
      <Route path="/seller" element={<RequirePermission permission={permission}><div>Seller area</div></RequirePermission>} />
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>,
    { route: "/seller", ...options },
  );
}

describe("RequirePermission", () => {
  it("sends anonymous visitors to the login page", () => {
    guarded("PRODUCTS_CREATE", { permissions: null });
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("blocks users without the permission", () => {
    guarded("PRODUCTS_CREATE", { permissions: [] });
    expect(screen.getByText(/do not have access/i)).toBeInTheDocument();
    expect(screen.queryByText("Seller area")).not.toBeInTheDocument();
  });

  it("lets users with the permission in", () => {
    guarded("PRODUCTS_CREATE", { permissions: ["PRODUCTS_CREATE"] });
    expect(screen.getByText("Seller area")).toBeInTheDocument();
  });

  it("accepts any one of several permissions", () => {
    guarded(["PRODUCTS_CREATE", "OFFERS_MANAGE"], { permissions: ["OFFERS_MANAGE"] });
    expect(screen.getByText("Seller area")).toBeInTheDocument();
  });

  it("waits while the login is still being checked", () => {
    guarded("PRODUCTS_CREATE", { permissions: null, auth: { loading: true } });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
