import ProductManager from "../../components/ProductManager";

export default function AdminProducts() {
  return <ProductManager source="/products" title="All products" showSeller />;
}
