export const ADMIN_SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "home", label: "Home page" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "sectors", label: "Sectors" },
  { key: "zones", label: "Delivery zones" },
  { key: "users", label: "Customers" },
  { key: "admins", label: "Admins" },
  { key: "payments", label: "Payment settings" },
  { key: "support", label: "Support" },
  { key: "requests", label: "Admin requests" },
  { key: "riders", label: "Rider requests" },
  { key: "leaderboard", label: "Rider leaderboard" },
  { key: "brand", label: "Brand" },
  { key: "ads", label: "Ads" },
  { key: "exports", label: "Exports" },
  { key: "code", label: "Source code" },
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]["key"];
