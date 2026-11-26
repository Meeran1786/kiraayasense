/**
 * Plain-language guides at /guides/<slug>. They answer the questions people
 * ask before renting or paying, so search engines and AI answer engines have
 * something worth quoting, and each one links to the matching listings.
 *
 * Keep them general and factual: no legal advice, and point readers to the
 * official body for anything binding.
 */
export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** One-sentence answer shown first and used as the meta description. */
  summary: string;
  updated: string; // ISO date
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  /** Where to go next on KiraayaSense. */
  links: { label: string; href: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "pg-deposit-checklist",
    title: "How to check a PG before you pay the deposit",
    summary:
      "Visit in the evening, talk to two current tenants, get the deposit and notice terms in writing, and pay by UPI so you have proof. These four steps prevent most PG deposit disputes.",
    updated: "2026-11-26",
    sections: [
      {
        heading: "Before you visit",
        bullets: [
          "Read reviews from past tenants, especially about deposit refunds, food and the owner's behaviour.",
          "Ask on WhatsApp for the full monthly cost: rent, food, electricity, Wi-Fi, laundry and any maintenance charge.",
          "Ask how much deposit is taken, when it is refunded and what can be deducted.",
        ],
      },
      {
        heading: "During the visit",
        bullets: [
          "Go between 8 and 9 pm. You see the real crowd, the dinner, the noise and the water situation.",
          "Talk to two current tenants away from the owner. Ask how long their friends waited for a deposit refund.",
          "Check the actual room you will get: mobile signal, power backup, ventilation, lock on the door and cupboard.",
          "Look for a fire extinguisher and a second way out of the building.",
          "Taste the food if you are paying for meals.",
        ],
      },
      {
        heading: "Before you pay",
        bullets: [
          "Get the deposit amount, refund timeline, notice period and allowed deductions in writing. A WhatsApp message from the owner is better than nothing.",
          "Pay rent and deposit by UPI or bank transfer, never cash without a receipt.",
          "Take dated photos and a video of the room on move-in day and send them to the owner.",
        ],
      },
      {
        heading: "When you move out",
        bullets: [
          "Give notice in writing, as agreed.",
          "Take move-out photos of the room and share them with the owner.",
          "If the refund is delayed, ask in writing for the amount and the reason for each deduction.",
          "If it is still not paid, you can file a complaint with the National Consumer Helpline (1915) or on the e-Daakhil consumer portal.",
        ],
      },
    ],
    faq: [
      {
        q: "How much deposit can a PG take?",
        a: "There is no single national cap for PGs. The Model Tenancy Act, 2021 suggests at most two months' rent for residential rentals, but it applies only in states that have adopted it. Agree the amount in writing before paying.",
      },
      {
        q: "What proof should I keep?",
        a: "UPI or bank receipts for every payment, the deposit and notice terms in writing, and dated move-in and move-out photos of the room.",
      },
      {
        q: "How do I know if a PG refunds deposits on time?",
        a: "Ask current and past tenants, and read reviews that mention deposit refunds. On KiraayaSense, PG reviewers rate deposit refunds as a separate question.",
      },
    ],
    links: [
      { label: "PG reviews across India", href: "/search?category=housing-pg" },
      { label: "Hostel reviews", href: "/search?category=housing-hostel" },
      { label: "Review the PG you live in", href: "/search?category=housing-pg" },
    ],
  },
  {
    slug: "renting-a-flat-checklist",
    title: "Checklist before renting a flat in India",
    summary:
      "Before renting a flat, meet the actual owner, read the rent agreement fully, record the condition of the flat on day one, and pay only by traceable methods. Ask neighbours about water, power and the society rules.",
    updated: "2026-11-26",
    sections: [
      {
        heading: "Check the owner and the flat",
        bullets: [
          "Meet the actual owner, or see a written authority if a broker or relative is renting it out.",
          "Ask neighbours or the society office about water supply, power cuts, parking and rules for tenants and visitors.",
          "Open every tap, switch and window. Check for damp patches, leaks and pests.",
          "Note the meter readings for electricity, water and gas.",
        ],
      },
      {
        heading: "Read the rent agreement",
        bullets: [
          "Rent, deposit, maintenance, the yearly increase and who pays for repairs should all be written down.",
          "Check the lock-in period and the notice period for both sides.",
          "Check how and when the deposit will be refunded, and what can be deducted.",
          "Register or notarise the agreement as your state requires.",
        ],
      },
      {
        heading: "On move-in day",
        bullets: [
          "Make a list of furniture and fittings, with photos, and get it signed by the owner.",
          "Pay by UPI or bank transfer and keep every receipt.",
          "Complete police tenant verification if your city requires it.",
        ],
      },
    ],
    faq: [
      {
        q: "Is a broker necessary to rent a flat?",
        a: "No. Many owners list directly. If you use a broker, agree the brokerage in writing before visiting flats.",
      },
      {
        q: "How much deposit is normal for a flat?",
        a: "It varies by city. The Model Tenancy Act, 2021 suggests at most two months' rent, but only in states that have adopted it. Some cities commonly ask for much more, so agree it in writing.",
      },
    ],
    links: [
      { label: "Flat and apartment reviews", href: "/search?category=housing-flat" },
      { label: "Independent house reviews", href: "/search?category=housing-independent-house" },
    ],
  },
  {
    slug: "hospital-bill-complaint",
    title: "How to question or complain about a hospital bill in India",
    summary:
      "Ask the hospital's billing desk for an itemised bill, compare it with the estimate you were given, and raise the problem in writing. If that fails, approach your insurer or TPA, the state's clinical establishment authority, or a consumer commission.",
    updated: "2026-11-26",
    sections: [
      {
        heading: "Before and during admission",
        bullets: [
          "Ask for a written cost estimate for the treatment, room type and expected stay.",
          "Ask whether the room category changes the price of other items. It often does.",
          "If you have insurance, confirm cashless approval with the insurer or TPA and keep the approval letter.",
        ],
      },
      {
        heading: "When you get the bill",
        bullets: [
          "Ask for an itemised bill listing every medicine, consumable, test and procedure.",
          "Compare it with the estimate and with the pharmacy and lab receipts you have.",
          "Ask the billing desk in writing to explain or correct each item you question.",
          "Keep copies of the discharge summary, bills, receipts and all messages.",
        ],
      },
      {
        heading: "If the hospital doesn't resolve it",
        bullets: [
          "Write to the hospital's grievance officer or medical superintendent.",
          "If insurance is involved, raise a grievance with the insurer, then the Insurance Ombudsman.",
          "Contact your state's health department or clinical establishments authority, where one exists.",
          "File a consumer complaint through the National Consumer Helpline (1915) or the e-Daakhil portal.",
        ],
      },
    ],
    faq: [
      {
        q: "Can a hospital refuse to release a patient over an unpaid bill?",
        a: "Courts and health authorities have repeatedly said patients should not be detained over bills. If this happens, contact the state health department and keep a written record.",
      },
      {
        q: "Is an itemised bill my right?",
        a: "Yes. You can ask for an itemised bill and your medical records. Ask in writing and keep a copy of the request.",
      },
    ],
    links: [
      { label: "Hospital reviews", href: "/search?category=healthcare-hospital" },
      { label: "Clinic reviews", href: "/search?category=healthcare-clinic" },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
