import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CartResponse } from "../services/cartService";
import {
  checkoutOrder,
  type CheckoutRequest,
  type OrderResponse,
} from "../services/orderService";
import "./CheckoutModal.css";

type Customer = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

type CheckoutModalProps = {
  cart: CartResponse;
  customer: Customer;
  onClose: () => void;
  onOrderCreated: () => Promise<void> | void;
};

const SHIPPING_FEE = 15;

function formatPrice(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(value);
}

export default function CheckoutModal({
  cart,
  customer,
  onClose,
  onOrderCreated,
}: CheckoutModalProps) {
  const [form, setForm] = useState<CheckoutRequest>({
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    email: customer.email ?? "",
    phone: "",
    shippingAddress: "",
    city: "",
    county: "",
    postalCode: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);

  const subtotal = Number(cart.totalPrice ?? 0);
  const estimatedTotal = useMemo(
    () => subtotal + SHIPPING_FEE,
    [subtotal]
  );

  const updateField = (field: keyof CheckoutRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || createdOrder) return;

    setSubmitting(true);
    setError(null);

    try {
      const order = await checkoutOrder({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        shippingAddress: form.shippingAddress.trim(),
        city: form.city.trim(),
        county: form.county.trim(),
        postalCode: form.postalCode.trim(),
        notes: form.notes?.trim() || "",
      });

      setCreatedOrder(order);
      await onOrderCreated();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nu am putut plasa comanda. Încearcă din nou."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="checkout-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        className="checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        <div className="checkout-header">
          <div>
            <span className="checkout-kicker">TRENIX / SECURE CHECKOUT</span>
            <h2 id="checkout-title">
              {createdOrder ? "ORDER CONFIRMED." : "DELIVERY DETAILS."}
            </h2>
          </div>
          <button
            className="checkout-close"
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        {createdOrder ? (
          <div className="checkout-success">
            <div className="checkout-success-mark">✓</div>
            <span className="checkout-kicker">BUILT FOR STRENGTH. ORDERED.</span>
            <h3>THANK YOU FOR YOUR ORDER.</h3>
            <p>
              Comanda <strong>#{createdOrder.id}</strong> a fost înregistrată.
              Vei achita ramburs la livrare.
            </p>
            <div className="checkout-success-total">
              <span>TOTAL CONFIRMAT</span>
              <strong>{formatPrice(Number(createdOrder.totalAmount))}</strong>
            </div>
            <button className="checkout-submit" type="button" onClick={onClose}>
              CONTINUE SHOPPING <span>↗</span>
            </button>
          </div>
        ) : (
          <form className="checkout-content" onSubmit={handleSubmit}>
            <div className="checkout-fields">
              <div className="checkout-section-title">
                <span>01</span> PERSONAL INFORMATION
              </div>
              <div className="checkout-field-grid">
                <label>
                  FIRST NAME
                  <input
                    autoComplete="given-name"
                    required
                    maxLength={100}
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                  />
                </label>
                <label>
                  LAST NAME
                  <input
                    autoComplete="family-name"
                    required
                    maxLength={100}
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                  />
                </label>
                <label>
                  EMAIL ADDRESS
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={150}
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </label>
                <label>
                  PHONE NUMBER
                  <input
                    type="tel"
                    autoComplete="tel"
                    required
                    pattern="[+]?[0-9\\s()\\-]{7,20}"
                    title="Introdu un număr de telefon valid."
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </label>
              </div>

              <div className="checkout-section-title checkout-section-spaced">
                <span>02</span> SHIPPING ADDRESS
              </div>
              <div className="checkout-field-grid">
                <label className="checkout-field-full">
                  STREET ADDRESS
                  <input
                    autoComplete="street-address"
                    required
                    maxLength={255}
                    placeholder="Stradă, număr, bloc, apartament"
                    value={form.shippingAddress}
                    onChange={(event) => updateField("shippingAddress", event.target.value)}
                  />
                </label>
                <label>
                  CITY
                  <input
                    autoComplete="address-level2"
                    required
                    maxLength={100}
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                  />
                </label>
                <label>
                  COUNTY
                  <input
                    autoComplete="address-level1"
                    required
                    maxLength={100}
                    value={form.county}
                    onChange={(event) => updateField("county", event.target.value)}
                  />
                </label>
                <label>
                  POSTAL CODE
                  <input
                    autoComplete="postal-code"
                    required
                    minLength={3}
                    maxLength={12}
                    value={form.postalCode}
                    onChange={(event) => updateField("postalCode", event.target.value)}
                  />
                </label>
                <label className="checkout-field-full">
                  DELIVERY NOTES <span className="checkout-optional">OPTIONAL</span>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="Detalii utile pentru curier..."
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <aside className="checkout-summary">
              <div className="checkout-section-title">
                <span>03</span> YOUR ORDER
              </div>
              <div className="checkout-items">
                {cart.items.map((item) => (
                  <div className="checkout-item" key={item.id}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>QTY {item.quantity}</span>
                    </div>
                    <strong>{formatPrice(Number(item.subtotal))}</strong>
                  </div>
                ))}
              </div>
              <div className="checkout-summary-line">
                <span>SUBTOTAL</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div className="checkout-summary-line">
                <span>DELIVERY</span>
                <strong>{formatPrice(SHIPPING_FEE)}</strong>
              </div>
              <div className="checkout-summary-total">
                <span>TOTAL</span>
                <strong>{formatPrice(estimatedTotal)}</strong>
              </div>
              <div className="checkout-payment">
                <span className="checkout-payment-icon">₨</span>
                <div>
                  <strong>CASH ON DELIVERY</strong>
                  <p>Plătești curierului la primirea coletului.</p>
                </div>
              </div>
              <p className="checkout-terms">
                Prin plasarea comenzii confirmi că datele de livrare sunt corecte.
              </p>
              {error && <div className="checkout-error" role="alert">{error}</div>}
              <button className="checkout-submit" type="submit" disabled={submitting || cart.items.length === 0}>
                {submitting ? "PLACING ORDER..." : "PLACE ORDER"}
                {!submitting && <span>↗</span>}
              </button>
            </aside>
          </form>
        )}
      </section>
    </div>
  );
}
