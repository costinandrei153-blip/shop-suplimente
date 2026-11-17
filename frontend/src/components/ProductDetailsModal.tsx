
import { useState } from "react";
import type { ApiProduct } from "../services/productService";
import ProductPack from "./ProductPack";
import "./ProductDetailsModal.css";

interface ProductDetailsModalProps {
  product: ApiProduct;
  onClose: () => void;
  onAddToCart: (product: ApiProduct, quantity: number) => void;
}

function ProductDetailsModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailsModalProps) {
  const [quantity, setQuantity] = useState(1);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
    }).format(price);

  const totalPrice = product.price * quantity;

  return (
    <div
      className="product-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <button
          className="product-modal-close"
          onClick={onClose}
          aria-label="Close product details"
          type="button"
        >
          ×
        </button>

        <div
          className="product-modal-visual"
          style={{ position: "relative" }}
        >
          {/* Imaginea produsului din PostgreSQL */}
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={`${product.brand} ${product.name}`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "#0b0d09",
                zIndex: 1,
              }}
            />
          )}

          <span className="product-modal-brand">
            TRENIX / PERFORMANCE SERIES
          </span>

          {/* Macheta CSS ramane disponibila pentru produsele fara imagine */}
          {!product.imageUrl && (
            <div className="tnx-pack3d tnx-pack-modal">
              <ProductPack name={product.name} category={product.category.name} />
            </div>
          )}

          <span className="product-modal-index">
            PRODUCT / {String(product.id).padStart(3, "0")}
          </span>
        </div>

        <div className="product-modal-content">
          <span className="product-modal-category">
            {product.category.name.toUpperCase()}
          </span>

          <h2 id="product-modal-title">
            {product.name}
          </h2>

          <span className="product-modal-description">
            {product.description || "Premium sports nutrition."}
          </span>

          <div className="product-modal-divider" />

          <div className="product-modal-price-row">
            <span>UNIT PRICE</span>
            <strong>{formatPrice(product.price)}</strong>
          </div>

          <div className="product-modal-stock-row">
            <span>AVAILABILITY</span>

            <strong
              className={
                product.stock > 0 ? "in-stock" : "out-stock"
              }
            >
              {product.stock > 0
                ? `${product.stock} UNITS AVAILABLE`
                : "OUT OF STOCK"}
            </strong>
          </div>

          <div className="product-modal-quantity">
            <span>QUANTITY</span>

            <div className="quantity-control">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    Math.max(1, current - 1)
                  )
                }
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    Math.min(product.stock, current + 1)
                  )
                }
                disabled={quantity >= product.stock}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="product-modal-price-row">
            <span>TOTAL</span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>

          <button
            className="product-modal-add"
            type="button"
            disabled={product.stock <= 0}
            onClick={() => {
              onAddToCart(product, quantity);
              onClose();
            }}
          >
            {product.stock > 0 ? "ADD TO BAG" : "SOLD OUT"}
            <span>↗</span>
          </button>

          <p className="product-modal-footer">
            TRENIX · BUILT FOR STRENGTH.
          </p>
        </div>
      </section>
    </div>
  );
}

export default ProductDetailsModal;
