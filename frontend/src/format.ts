const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const money = (n: number) => inr.format(n);

/** 3 -> "3%", 5.5 -> "5.5%" */
export const percent = (n: number) => `${Number(n)}%`;
