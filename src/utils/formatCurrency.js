/**
 * Central INR currency formatter — single source of truth
 * Uses Indian locale (en-IN) with ₹ symbol
 * All monetary displays across CRM + public site must use this
 */
export function formatCurrency(amount, opts = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  const { compact = false, noSymbol = false } = opts;
  if (compact && Math.abs(n) >= 100000) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  }
  if (noSymbol) {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function formatCurrencyWithDecimals(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default formatCurrency;
