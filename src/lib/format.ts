export function formatXAF(amount: number): string {
  // Cameroon Franc — spaces as thousand separator, "FCFA" suffix
  return `${Math.round(amount).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;
}
