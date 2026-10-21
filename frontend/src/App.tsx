/* eslint-disable react-refresh/only-export-components */
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { AuthProvider, useAuth } from "./AuthContext";
import { CartProvider } from "./CartContext";
import CategoryBar from "./components/CategoryBar";
import Footer from "./components/Footer";
import { RequirePermission } from "./components/Guards";
import Header from "./components/Header";
import PanelLayout from "./components/PanelLayout";
import type { PanelLink } from "./components/PanelLayout";
import CartPage from "./CartPage";
import {
  CategoriesIcon, DashboardIcon, InventoryIcon, OfferIcon, OrdersIcon, PercentIcon, SecurityIcon, ShippingIcon, UsersIcon, WalletIcon,
} from "./icons";
import LoginPage from "./LoginPage";
import NotFound from "./NotFound";
import OrdersPage from "./OrdersPage";
import ProductDetail from "./ProductDetail";
import ProductList from "./ProductList";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminHome from "./pages/admin/AdminHome";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminUsers from "./pages/admin/AdminUsers";
import SellerEarnings from "./pages/seller/SellerEarnings";
import SellerHome from "./pages/seller/SellerHome";
import SellerOffers from "./pages/seller/SellerOffers";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerProducts from "./pages/seller/SellerProducts";

export const SELLER_LINKS: PanelLink[] = [
  { to: "/seller", label: "Dashboard", icon: <DashboardIcon fontSize="small" />, end: true },
  { to: "/seller/products", label: "My products", icon: <InventoryIcon fontSize="small" />, permission: "PRODUCTS_CREATE" },
  { to: "/seller/offers", label: "Festival offers", icon: <OfferIcon fontSize="small" />, permission: "OFFERS_MANAGE" },
  { to: "/seller/orders", label: "Orders to ship", icon: <ShippingIcon fontSize="small" />, permission: "SELLER_ORDERS_READ" },
  { to: "/seller/earnings", label: "Earnings", icon: <WalletIcon fontSize="small" />, permission: "SELLER_ORDERS_READ" },
];

export const ADMIN_LINKS: PanelLink[] = [
  { to: "/admin", label: "Dashboard", icon: <DashboardIcon fontSize="small" />, end: true },
  { to: "/admin/products", label: "Products", icon: <InventoryIcon fontSize="small" />, permission: "PRODUCTS_MANAGE_ALL" },
  { to: "/admin/categories", label: "Categories", icon: <CategoriesIcon fontSize="small" />, permission: "CATEGORIES_MANAGE" },
  { to: "/admin/offers", label: "Offers", icon: <OfferIcon fontSize="small" />, permission: "OFFERS_MANAGE_ALL" },
  { to: "/admin/orders", label: "Orders", icon: <OrdersIcon fontSize="small" />, permission: "ORDERS_READ_ALL" },
  { to: "/admin/sellers", label: "Sellers & commission", icon: <PercentIcon fontSize="small" />, permission: "COMMISSION_MANAGE" },
  { to: "/admin/users", label: "Users", icon: <UsersIcon fontSize="small" />, permission: "USERS_READ" },
  { to: "/admin/roles", label: "Roles & permissions", icon: <SecurityIcon fontSize="small" />, permission: "ROLES_READ" },
];

function AppRoutes() {
  const { refresh } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<ProductList />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<LoginPage onAuth={refresh} />} />
      <Route path="/orders" element={<OrdersPage />} />

      <Route path="/seller" element={
        <RequirePermission permission="PRODUCTS_CREATE"><PanelLayout title="Seller Hub" links={SELLER_LINKS} /></RequirePermission>
      }>
        <Route index element={<SellerHome />} />
        <Route path="products" element={<SellerProducts />} />
        <Route path="offers" element={<SellerOffers />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="earnings" element={<SellerEarnings />} />
      </Route>

      <Route path="/admin" element={
        <RequirePermission permission="STATS_READ"><PanelLayout title="Admin panel" links={ADMIN_LINKS} /></RequirePermission>
      }>
        <Route index element={<AdminHome />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="sellers" element={<AdminSellers />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="roles" element={<AdminRoles />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Header />
            <CategoryBar />
            <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
              <Container><AppRoutes /></Container>
            </Box>
            <Footer />
          </Box>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
