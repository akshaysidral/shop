import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <Box className={styles.container}>
      <Typography variant="h1" className={styles.code}>404</Typography>
      <Typography variant="h6" className={styles.message}>We could not find that page.</Typography>
      <Button component={NextLink} href="/" variant="contained">Back to shop</Button>
    </Box>
  );
}
