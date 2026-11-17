import { useEffect, useState } from "react";
import { getMyOrders, type OrderResponse } from "../services/orderService";
import "./OrdersModal.css";

type OrdersModalProps = {
  onClose: () => void;
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "În așteptare",
    CONFIRMED: "Confirmată",
    PROCESSING: "În procesare",
    SHIPPED: "Expediată",
    DELIVERED: "Livrată",
    CANCELLED: "Anulată",
  };
  return labels[status] ?? status;
}

export default function OrdersModal({ onClose }: OrdersModalProps) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getMyOrders()
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Nu am putut încărca comenzile."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="orders-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="orders-modal" role="dialog" aria-modal="true" aria-labelledby="orders-title">
        <div className="orders-header">
          <div>
            <span className="orders-kicker">TRENIX / ACCOUNT</span>
            <h2 id="orders-title">MY ORDERS.</h2>
          </div>
          <button className="orders-close" type="button" onClick={onClose} aria-label="Close orders">×</button>
        </div>

        <div className="orders-body">
          {loading && <p className="orders-message">LOADING YOUR ORDERS...</p>}
          {error && <p className="orders-error" role="alert">{error}</p>}
          {!loading && !error && orders.length === 0 && (
            <div className="orders-empty">
              <span>TNX / 000</span>
              <h3>NO ORDERS YET.</h3>
              <p>Comenză cu produsele esențiale TRENIX.</p>
              <button className="orders-action" type="button" onClick={onClose}>BACK TO SHOP ↗</button>
            </div>
          )}

          {!loading && !error && orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-header">
                <div>
                  <span className="orders-kicker">ORDER #{order.id}</span>
                  <strong>{formatDate(order.createdAt)}</strong>
                </div>
                <span className={`order-status order-status-${order.status.toLowerCase()}`}>
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="order-card-items">
                {order.items.map((item) => (
                  <div className="order-card-item" key={item.id}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>{item.quantity} × {formatPrice(Number(item.unitPrice))}</span>
                    </div>
                    <strong>{formatPrice(Number(item.lineTotal))}</strong>
                  </div>
                ))}
              </div>

              <div className="order-card-footer">
                <span>{order.paymentMethod === "CASH_ON_DELIVERY" ? "PLATĂ LA LIVRARE" : order.paymentMethod}</span>
                <strong>{formatPrice(Number(order.totalAmount))}</strong>
              </div>
              <p className="order-card-address">
                LIVRARE: {order.shippingAddress}, {order.city}, {order.county}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
