import { screen } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { renderApp } from "../testUtils";
import { RequirePermission } from "./Guards";

function guarded(permission: string | string[], options: Parameters<typeof renderApp>[1]) {
  return renderApp(<RequirePermission permission={permission}><div>Seller area</div></RequirePermission>,
    { route: "/seller", ...options });
}

describe("RequirePermission", () => {
  it("sends anonymous visitors to the login page", async () => {
    guarded("PRODUCTS_CREATE", { permissions: null });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login?from=%2Fseller"));
    expect(screen.queryByText("Seller area")).not.toBeInTheDocument();
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
