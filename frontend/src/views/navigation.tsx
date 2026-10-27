import type { PanelLink } from "../components/PanelLayout";
import {
  CategoriesIcon, DashboardIcon, InventoryIcon, OfferIcon, OrdersIcon, PercentIcon, SecurityIcon, ShippingIcon, UsersIcon, WalletIcon,
} from "../icons";

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
