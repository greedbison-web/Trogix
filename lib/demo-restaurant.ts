/**
 * The permanent demo restaurant.
 *
 * This is the single source of truth for every product surface on the site —
 * hero, the one-order sequence, the kitchen pass and the interactive demo all
 * read from here. If a dish name, a price or a timestamp appears twice on the
 * page, it comes from this file both times.
 *
 * Section 2's entire argument ("one order, every surface") collapses if any
 * value differs between surfaces, so nothing here may be inlined elsewhere.
 */

export const restaurant = {
  name: "Sundara",
  neighbourhood: "Bandra",
  city: "Mumbai",
  table: "12",
  service: "Dinner service",
  currency: "₹",
} as const;

export const courses = ["Small Plates", "Mains", "Wine"] as const;

export type Dish = {
  id: string;
  name: string;
  note: string;
  price: number;
  course: (typeof courses)[number];
};

export const menu: Dish[] = [
  {
    id: "kingfish",
    name: "Kokum Cured Kingfish",
    note: "Coconut cream, curry leaf oil",
    price: 620,
    course: "Small Plates",
  },
  {
    id: "prawn-toast",
    name: "Malabar Prawn Toast",
    note: "Fermented chilli, lime leaf",
    price: 740,
    course: "Small Plates",
  },
  {
    id: "aubergine",
    name: "Smoked Aubergine, Burnt Onion",
    note: "Sesame, aged ghee",
    price: 560,
    course: "Small Plates",
  },
  {
    id: "morel-pulao",
    name: "Kashmiri Morel Pulao",
    note: "Saffron, dried apricot",
    price: 980,
    course: "Mains",
  },
  {
    id: "duck",
    name: "Dry-Aged Duck, Coorg Pepper",
    note: "Plum, jaggery glaze",
    price: 1240,
    course: "Mains",
  },
  {
    id: "kulcha",
    name: "Sourdough Kulcha",
    note: "Cultured butter, sea salt",
    price: 280,
    course: "Small Plates",
  },
];

export const dishById = Object.fromEntries(menu.map((dish) => [dish.id, dish]));

/** The canonical order — the one that moves across all three surfaces in §2. */
export const order = {
  table: restaurant.table,
  placedAt: "19:46",
  settledAt: "21:14",
  lines: [
    { id: "kingfish", quantity: 1 },
    { id: "prawn-toast", quantity: 2 },
    { id: "morel-pulao", quantity: 1 },
  ],
} as const;

export const orderLines = order.lines.map((line) => ({
  ...dishById[line.id],
  quantity: line.quantity,
}));

export const orderCount = order.lines.reduce((n, line) => n + line.quantity, 0);

export const orderTotal = orderLines.reduce(
  (sum, line) => sum + line.price * line.quantity,
  0,
);

/** Format 3080 as "3,080" — Indian grouping matches the restaurant's market. */
export function formatPrice(value: number): string {
  return value.toLocaleString("en-IN");
}

export function withCurrency(value: number): string {
  return `${restaurant.currency}${formatPrice(value)}`;
}

/**
 * The pass, as shown in §4. T12 is the same order defined above — the section
 * reads as one continuous evening only because it is literally the same data.
 */
export const passTickets = [
  {
    table: "12",
    elapsed: "0:42",
    state: "new" as const,
    lines: orderLines.map((line) => `${line.quantity}× ${line.name}`),
  },
  {
    table: "07",
    elapsed: "4:18",
    state: "firing" as const,
    lines: ["2× Dry-Aged Duck, Coorg Pepper", "1× Kashmiri Morel Pulao"],
  },
  {
    table: "21",
    elapsed: "8:55",
    state: "late" as const,
    lines: ["1× Malabar Prawn Toast", "2× Smoked Aubergine, Burnt Onion"],
  },
];
