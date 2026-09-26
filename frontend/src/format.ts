// undefined locale = use the viewer's own device/browser locale for
// punctuation conventions, while fixing the currency itself to EUR.
const currencyFormatter = new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" });

export function formatPrice(price: number): string {
  return currencyFormatter.format(price);
}
