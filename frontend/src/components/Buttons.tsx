import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import { brand } from "../theme";

/** The coral "Buy now" / "Place order" button. ("Add to cart" is the saffron secondary colour.) */
export const BuyButton = styled(Button)({
  backgroundColor: brand.coral,
  color: "#fff",
  "&:hover": { backgroundColor: "#e8542a" },
  "&.Mui-disabled": { backgroundColor: "#ffb59d", color: "#fff" },
});
