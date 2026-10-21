import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderApp } from "../testUtils";
import PanelLayout from "./PanelLayout";
import type { PanelLink } from "./PanelLayout";

const LINKS: PanelLink[] = [
  { to: "/panel", label: "Dashboard", icon: <span />, end: true },
  { to: "/panel/items", label: "Items", icon: <span />, permission: "ITEMS_READ" },
  { to: "/panel/secret", label: "Secret", icon: <span />, permission: "SECRET_READ" },
];

function panel(route: string, permissions: string[]) {
  return renderApp(
    <Routes>
      <Route path="/panel" element={<PanelLayout title="My panel" links={LINKS} />}>
        <Route index element={<div>Dashboard page</div>} />
        <Route path="items" element={<div>Items page</div>} />
      </Route>
    </Routes>,
    { route, permissions },
  );
}

describe("PanelLayout", () => {
  it("shows the title and the page content", () => {
    panel("/panel", []);
    expect(screen.getByText("My panel")).toBeInTheDocument();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("lists only the links the user may use", () => {
    panel("/panel", ["ITEMS_READ"]);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Items" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Secret" })).not.toBeInTheDocument();
  });

  it("highlights the current page only", () => {
    panel("/panel/items", ["ITEMS_READ"]);
    expect(screen.getByRole("link", { name: "Items" })).toHaveClass("Mui-selected");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("Mui-selected");
    expect(screen.getByText("Items page")).toBeInTheDocument();
  });

  it("highlights the dashboard on its own page", () => {
    panel("/panel", ["ITEMS_READ"]);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass("Mui-selected");
  });
});
