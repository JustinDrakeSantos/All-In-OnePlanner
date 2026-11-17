export type UnitSystem = "imperial" | "metric";

const LB_PER_KG = 2.204_622_621_8;
const ML_PER_OZ = 29.573_529_562_5;
const KM_PER_MI = 1.609_344;

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const weightUnit = (u: UnitSystem) => (u === "imperial" ? "lb" : "kg");
export const volumeUnit = (u: UnitSystem) => (u === "imperial" ? "oz" : "ml");
export const distanceUnit = (u: UnitSystem) => (u === "imperial" ? "mi" : "km");

export function weightToKg(value: number, u: UnitSystem): number {
  return u === "imperial" ? value / LB_PER_KG : value;
}
export function kgToDisplay(kg: number, u: UnitSystem): number {
  return round(u === "imperial" ? kg * LB_PER_KG : kg, 1);
}

export function volumeToMl(value: number, u: UnitSystem): number {
  return Math.round(u === "imperial" ? value * ML_PER_OZ : value);
}
export function mlToDisplay(ml: number, u: UnitSystem): number {
  return u === "imperial" ? round(ml / ML_PER_OZ, 0) : Math.round(ml);
}

export function distanceToKm(value: number, u: UnitSystem): number {
  return u === "imperial" ? value * KM_PER_MI : value;
}
export function kmToDisplay(km: number, u: UnitSystem): number {
  return round(u === "imperial" ? km / KM_PER_MI : km, 2);
}

/** Quick-add water amounts in the user's units. */
export function waterQuickAdds(u: UnitSystem): number[] {
  return u === "imperial" ? [8, 12, 16] : [250, 350, 500];
}
