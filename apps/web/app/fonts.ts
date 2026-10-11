import { Manrope, Unbounded } from "next/font/google";

export const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const unbounded = Unbounded({
  // No fixed weights: one variable font file per subset instead of one file per weight.
  subsets: ["cyrillic", "latin"],
  variable: "--font-unbounded",
  display: "swap",
});

export const fontVariables = `${manrope.variable} ${unbounded.variable}`;
