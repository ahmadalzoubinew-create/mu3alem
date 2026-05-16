/**
 * Converts Arabic/European decimal format to standard decimal
 * Converts: "7,5" → "7.5" and "٧٫٥" → "7.5"
 */
export function parseDecimal(value) {
  if (!value) return 0;
  const cleaned = value
    .toString()
    .replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2')
    .replace(/٣/g, '3').replace(/٤/g, '4').replace(/٥/g, '5')
    .replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8')
    .replace(/٩/g, '9')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}