/**
 * Platinum Scissors — Product Catalogue
 * ──────────────────────────────────────
 * All sample product data lives here.
 *
 * • Prices are stored as integer **cents** to avoid floating-point rounding.
 * • To change a product, edit the object below — the rest of the site reads
 *   from PRODUCTS automatically.
 * • Images are realistic studio product photographs (assets/images/).
 */

"use strict";

const PRODUCTS = [
  {
    id: "everyday-01",
    name: "Everyday Scissors",
    category: "Everyday",
    priceCents: 1000,          // $10.00
    description:
      "A simple option for everyday paper-cutting and general household tasks.",
    image: "assets/images/everyday-scissors.jpg",
    alt: "Studio product photograph of everyday household scissors with black matte handles",
  },
  {
    id: "tailoring-01",
    name: "Tailoring Scissors",
    category: "Tailoring",
    priceCents: 2000,          // $20.00
    description:
      "A scissors option for fabric-cutting, sewing, and tailoring projects.",
    image: "assets/images/tailoring-scissors.jpg",
    alt: "Studio product photograph of professional heavy-duty tailoring shears with polished handles",
  },
  {
    id: "craft-01",
    name: "Precision Craft Scissors",
    category: "Craft",
    priceCents: 3500,          // $35.00
    description:
      "A compact scissors option for detailed paper crafts and creative projects.",
    image: "assets/images/craft-scissors.jpg",
    alt: "Studio product photograph of compact precision craft embroidery scissors with needle-point tips",
  },
  {
    id: "hairdressing-01",
    name: "Hairdressing Scissors",
    category: "Hairdressing",
    priceCents: 5000,          // $50.00
    description:
      "A scissors option for haircutting and styling tasks.",
    image: "assets/images/hairdressing-scissors.jpg",
    alt: "Studio product photograph of professional polished Japanese steel hairdressing salon shears",
  },
];

/**
 * Convenience: list of unique category names (used by filter UI).
 */
const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.category))];

/**
 * Look up a product by its unique ID.
 * Returns undefined when the ID is unknown.
 */
function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * Format an integer-cents value as a USD price string.
 * e.g. 3500 → "$35.00"
 */
function formatPrice(cents) {
  return "$" + (cents / 100).toFixed(2);
}
