import { ReactNode } from "react";
import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { Category } from "../../../api";
import { AppsIcon } from "../../../icons";
import { useFetch } from "../../../useFetch";
import CategoryIcon from "../../../components/CategoryIcon";
import styles from "./CategoryBar.module.css";

function Chip({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <ButtonBase
      component={NextLink}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${styles.chip} ${active ? styles.active : ""}`}
    >
      {icon}
      <Typography variant="caption" className={styles.label}>{label}</Typography>
    </ButtonBase>
  );
}

/** Flipkart/Amazon-style row of category shortcuts under the header. Hidden on seller and admin pages. */
export default function CategoryBar() {
  const { data } = useFetch<Category[]>("/categories");
  const params = useSearchParams();
  const pathname = usePathname();
  const legacyCategory = params.get("category");
  const activeCategory = (data ?? []).find((category) => pathname === `/category/${category.slug}`
    || String(category.id) === legacyCategory);
  if (pathname.startsWith("/admin") || pathname.startsWith("/seller")) return null;

  return (
    <Box component="nav" aria-label="Categories" sx={{ bgcolor: "background.paper" }} className={styles.navigation}>
      <Container>
        <Box className={styles.items}>
          <Chip href="/" label="All" icon={<AppsIcon />} active={!activeCategory} />
          {(data ?? []).map((c) => (
            <Chip key={c.id} href={`/category/${c.slug}`} label={c.name} icon={<CategoryIcon icon={c.icon} />} active={activeCategory?.id === c.id} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
