export function parseDecimal(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value)
    .replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2')
    .replace(/٣/g, '3').replace(/٤/g, '4').replace(/٥/g, '5')
    .replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8')
    .replace(/٩/g, '9')
    .replace(/،/g, '.')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return parseFloat(parts[0] + '.' + parts.slice(1).join('')) || 0;
  return parseFloat(cleaned) || 0;
}