export const attendanceStatuses = ["hadir", "menyusul", "meninggalkan", "tidak hadir"] as const;

export const h1Statuses = [
  "hadir tepat waktu",
  "hadir menyusul",
  "izin meninggalkan",
  "tidak hadir",
] as const;

export const expectedRoster = [
  "Alya Putri",
  "Bima Pratama",
  "Citra Lestari",
  "Damar Wijaya",
  "Eka Sari",
  "Fajar Nugraha",
  "Gita Maheswari",
  "Hana Septiani",
  "Iqbal Ramadhan",
  "Jihan Aulia",
  "Kirana Putri",
  "Luthfi Hakim",
];

export function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getUnconfirmedCount(submittedNames: string[]) {
  const submitted = new Set(submittedNames.map(normalizeName));
  return expectedRoster.filter((name) => !submitted.has(normalizeName(name))).length;
}

export function countByValue<T extends string>(items: Array<{ value: T }>, values: readonly T[]) {
  return values.reduce((accumulator, value) => {
    accumulator[value] = items.filter((item) => item.value === value).length;
    return accumulator;
  }, {} as Record<T, number>);
}
