// ============================================================
//  whatsappReceipt.js
//  Drop this in: src/app/lib/whatsappReceipt.js
// ============================================================

/**
 * Builds a WhatsApp-ready receipt message and opens the app.
 *
 * @param {Object} params
 * @param {string} params.storeName       - Business name shown in receipt
 * @param {string} params.customerName    - Customer's display name
 * @param {string} params.customerPhone   - E.164 or local format, digits only
 * @param {Array}  params.items           - [{ name, quantity, unit, unitPrice }]
 * @param {number} params.totalAmount     - Grand total
 * @param {number} params.cashReceived    - Amount paid now
 * @param {number} params.remainingDebt   - Unpaid balance (0 = fully paid)
 * @param {string} [params.currency]      - Default '€'
 */
export function openWhatsAppReceipt({
  customerName,
  customerPhone,
  items = [],
  totalAmount,
  cashReceived,
  remainingDebt,
}) {
  // Build items lines
  const itemLines = items
    .filter(i => i.quantity && i.unitPrice)
    .map(i => {
      const lineTotal = (parseFloat(i.quantity) * parseFloat(i.unitPrice)).toFixed(2);
      return `  • ${i.name}: ${i.quantity} ${i.unit} × €${parseFloat(i.unitPrice).toFixed(2)} = €${lineTotal}`;
    })
    .join('\n');

  const debtLine = parseFloat(remainingDebt) <= 0
    ? `Restbetrag (Offen): €0.00 ✅`
    : `Restbetrag (Offen): €${parseFloat(remainingDebt).toFixed(2)}`;

  const message = [
    `Hallo ${customerName},`,
    ``,
    `vielen Dank für Ihren Einkauf. Hier sind die Details Ihrer Rechnung:`,
    ``,
    `Artikel:`,
    itemLines,
    ``,
    `Gesamtsumme: €${parseFloat(totalAmount).toFixed(2)}`,
    `Bar bezahlt: €${parseFloat(cashReceived).toFixed(2)}`,
    debtLine,
    ``,
    `Vielen Dank für Ihr Vertrauen!`,
  ].join('\n');

  const encoded = encodeURIComponent(message);
  const phone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}