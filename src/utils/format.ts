// Format number using Brazilian locale (comma for decimals, dots for thousands)
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(value);
}

// Format integer using Brazilian locale (no decimals)
export function formatInteger(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}