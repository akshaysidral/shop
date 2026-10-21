/* eslint-disable react-refresh/only-export-components */
import type { SvgIconComponent } from "@mui/icons-material";
import {
  BasketIcon, BeautyIcon, BooksIcon, CafeIcon, CarIcon, FashionIcon, GamesIcon, GemIcon,
  HomeIcon, PhoneIcon, SportsIcon, TagIcon, ToolsIcon,
} from "../icons";

/** Category icons are stored as short keys in the database ("phone", "books"...). */
const ICONS: Record<string, SvgIconComponent> = {
  phone: PhoneIcon, fashion: FashionIcon, home: HomeIcon, books: BooksIcon, beauty: BeautyIcon, sports: SportsIcon,
  games: GamesIcon, cafe: CafeIcon, tools: ToolsIcon, gem: GemIcon, car: CarIcon, basket: BasketIcon, tag: TagIcon,
};

/** Older databases stored Bootstrap icon names; map them so nothing breaks. */
const LEGACY: Record<string, string> = {
  "bi-phone": "phone", "bi-handbag": "fashion", "bi-house-heart": "home", "bi-journal-bookmark": "books",
  "bi-heart-pulse": "beauty", "bi-bicycle": "sports", "bi-controller": "games", "bi-cup-hot": "cafe",
  "bi-tools": "tools", "bi-gem": "gem", "bi-car-front": "car", "bi-basket": "basket", "bi-tag": "tag",
};

export const CATEGORY_ICON_KEYS = Object.keys(ICONS);

/** "bi-phone" -> "phone"; unknown or missing -> "tag". */
export function iconKey(icon: string | null): string {
  const key = icon ? (LEGACY[icon] ?? icon) : "tag";
  return key in ICONS ? key : "tag";
}

export default function CategoryIcon({ icon, fontSize = "medium" }: { icon: string | null; fontSize?: "inherit" | "small" | "medium" | "large" }) {
  const key = iconKey(icon);
  const Icon = ICONS[key];
  return <Icon fontSize={fontSize} data-icon={key} />;
}
