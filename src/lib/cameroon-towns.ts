// Towns of Cameroon grouped by region. Used to constrain the admin request form
// so applicants can only pick a recognized town in their chosen region.

export const REGIONS = [
  "Adamawa","Centre","East","Far North","Littoral",
  "North","North-West","South","South-West","West",
] as const;

export type Region = (typeof REGIONS)[number];

export const TOWNS_BY_REGION: Record<Region, string[]> = {
  "Adamawa":    ["Ngaoundéré", "Meiganga", "Tibati", "Banyo", "Tignère", "Mbé"],
  "Centre":     ["Yaoundé", "Mbalmayo", "Obala", "Bafia", "Mfou", "Akonolinga", "Nanga-Eboko", "Eséka", "Monatélé", "Mbankomo"],
  "East":       ["Bertoua", "Batouri", "Abong-Mbang", "Yokadouma", "Bélabo", "Garoua-Boulaï"],
  "Far North":  ["Maroua", "Kousséri", "Mokolo", "Mora", "Yagoua", "Kaélé", "Mindif", "Waza"],
  "Littoral":   ["Douala", "Edéa", "Nkongsamba", "Loum", "Mbanga", "Manjo", "Yabassi", "Dibombari", "Pouma"],
  "North":      ["Garoua", "Guider", "Poli", "Tcholliré", "Lagdo", "Figuil", "Pitoa"],
  "North-West": ["Bamenda", "Kumbo", "Wum", "Nkambé", "Mbengwi", "Fundong", "Bafut", "Bali"],
  "South":      ["Ebolowa", "Kribi", "Sangmélima", "Ambam", "Lolodorf", "Mvangan", "Campo"],
  "South-West": ["Buea", "Limbe", "Tiko", "Kumba", "Mamfe", "Mundemba", "Mutengene", "Muyuka", "Idenau"],
  "West":       ["Bafoussam", "Dschang", "Mbouda", "Foumban", "Bandjoun", "Bangangté", "Foumbot", "Bafang", "Bangou"],
};

// Strip accents, lowercase, trim — must mirror SQL public.normalize_town().
export function normalizeTown(t: string | null | undefined): string {
  return (t || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
