import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
  withCredentials: true,
});

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshInFlight: Promise<string | null> | null = null;

function expireSession() {
  localStorage.removeItem("token");
  window.dispatchEvent(new Event("auth:expired"));
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = api.post<{ token: string }>("/auth/refresh")
      .then(({ data }) => {
        localStorage.setItem("token", data.token);
        return data.token;
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          expireSession();
          return null;
        }
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (r) => r,
  async (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const request = err.config;
      const url = request?.url ?? "";
      const isAuthRequest = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"]
        .some((path) => url.endsWith(path));

      if (request && !request._retry && !isAuthRequest) {
        request._retry = true;
        const token = await refreshAccessToken();
        if (!token) {
          return Promise.reject(err);
        }
        request.headers.Authorization = `Bearer ${token}`;
        return api.request(request);
      }

      if (!isAuthRequest) {
        expireSession();
      }
    }
    return Promise.reject(err);
  },
);

// ---------------- types (mirror backend/web/Dtos.java) ----------------
export type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;            // list price
  finalPrice: number;       // what the buyer pays now (after the best live offer)
  discountPercent: number;
  offerName: string | null;
  stock: number;
  imageUrl: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  sellerId: number | null;
  sellerName: string;
};

export type Category = { id: number; name: string; slug: string; icon: string | null; productCount: number };

export type OfferStatus = "LIVE" | "SCHEDULED" | "ENDED" | "PAUSED";
export type Offer = {
  id: number;
  name: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  appliesToAll: boolean;
  productIds: number[];
  sellerId: number;
  sellerName: string;
  status: OfferStatus;
};
export type ActiveOffer = { name: string; discountPercent: number; endsAt: string; sellerName: string; appliesToAll: boolean };

export type OrderStatus = "PLACED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type OrderItem = {
  id: number;
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  sellerName: string | null;
  status: OrderStatus;
};
export type Order = {
  id: number;
  userEmail?: string;
  status: OrderStatus;
  createdAt: string;
  total: number;
  items: OrderItem[];
};
export type SellerLine = {
  orderId: number;
  itemId: number;
  createdAt: string;
  buyer: string;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  status: OrderStatus;
  commissionPercent: number;   // snapshot taken when the order was placed
  commission: number;          // what the marketplace keeps
  earning: number;             // what the seller gets
};

export type Role = { id: number; name: string; description: string | null; builtIn: boolean; permissions: string[] };
export type Me = {
  id: number;
  email: string;
  storeName: string | null;
  commissionPercent: number | null;   // sellers only
  roles: string[];
  permissions: string[];
};
export type Stats = {
  users: number; buyers: number; sellers: number; products: number; orders: number;
  revenue: number;      // gross sales (cancelled lines excluded)
  commission: number;   // the marketplace's cut of those sales
};
export type SellerEarnings = {
  commissionPercent: number; grossSales: number; commission: number; netEarnings: number;
  payable: number;      // delivered lines
  pending: number;      // placed or shipped lines
  unitsSold: number;
};
export type SellerSummary = {
  id: number; email: string; storeName: string | null; commissionPercent: number;
  unitsSold: number; grossSales: number; commission: number;
};

export function errMsg(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const m = e.response?.data?.message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}
