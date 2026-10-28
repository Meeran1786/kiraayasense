/**
 * Starting category tree and question sets for KiraayaSense v2. Seeded once
 * by prisma/seed.ts; after that admins edit both from /admin, and the seed
 * never overwrites a category or question set that already exists.
 *
 * Question keys are metric identifiers: ratings aggregate per key, so a key
 * must mean the same thing in every set that uses it (labels may differ).
 */
import type { RelationshipKey } from "../../lib/relationships";

export interface SeedCategory {
  slug: string;
  name: string;
  relationships: RelationshipKey[];
  children: { slug: string; name: string }[];
}

const sub = (parent: string, names: string[]) =>
  names.map((name) => ({
    slug: `${parent}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
    name,
  }));

export const CATEGORIES: SeedCategory[] = [
  {
    slug: "housing",
    name: "Housing & stays",
    relationships: ["TENANT_GUEST", "EMPLOYEE"],
    children: [
      { slug: "housing-flat", name: "Flat / Apartment" },
      { slug: "housing-independent-house", name: "Independent house" },
      { slug: "housing-pg", name: "PG" },
      { slug: "housing-hostel", name: "Hostel" },
      { slug: "housing-hotel-budget", name: "Budget hotel" },
      { slug: "housing-hotel-luxury", name: "Luxury hotel" },
      { slug: "housing-serviced-apartment", name: "Serviced apartment" },
      { slug: "housing-co-living", name: "Co-living" },
    ],
  },
  {
    slug: "automotive",
    name: "Automotive",
    relationships: ["EMPLOYEE", "CUSTOMER", "VENDOR_SUPPLIER", "JOB_APPLICANT"],
    children: sub("automotive", ["OEM", "Tier-1 supplier", "Tier-2 supplier", "Dealership", "Service centre"]),
  },
  {
    slug: "aerospace",
    name: "Aerospace & defence",
    relationships: ["EMPLOYEE", "CUSTOMER", "VENDOR_SUPPLIER", "JOB_APPLICANT"],
    children: sub("aerospace", ["OEM", "MRO", "Component supplier", "Engineering services"]),
  },
  {
    slug: "it-ites",
    name: "IT & ITES",
    relationships: ["EMPLOYEE", "CUSTOMER", "VENDOR_SUPPLIER", "JOB_APPLICANT"],
    children: sub("it-ites", ["IT services", "BPO / call centre", "KPO", "Product company", "GCC"]),
  },
  {
    slug: "education",
    name: "Education",
    relationships: ["STUDENT_PARENT", "EMPLOYEE", "JOB_APPLICANT"],
    children: sub("education", ["School", "College / university", "Coaching institute", "Online course", "Skill training"]),
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    relationships: ["PATIENT_FAMILY", "EMPLOYEE", "JOB_APPLICANT"],
    children: sub("healthcare", ["Hospital", "Clinic", "Diagnostic lab", "Pharmacy"]),
  },
  {
    slug: "banking-finance",
    name: "Banking & finance",
    relationships: ["CUSTOMER", "EMPLOYEE", "JOB_APPLICANT"],
    children: sub("banking-finance", ["Bank", "NBFC", "Insurance", "Broker / fintech app"]),
  },
  {
    slug: "telecom",
    name: "Telecom & internet",
    relationships: ["CUSTOMER", "EMPLOYEE"],
    children: sub("telecom", ["Mobile operator", "Broadband provider", "DTH"]),
  },
  {
    slug: "ecommerce-retail",
    name: "E-commerce & retail",
    relationships: ["CUSTOMER", "EMPLOYEE", "VENDOR_SUPPLIER"],
    children: sub("ecommerce-retail", ["Marketplace", "Quick commerce", "Supermarket", "Electronics store"]),
  },
  {
    slug: "food-hospitality",
    name: "Food & hospitality",
    relationships: ["CUSTOMER", "EMPLOYEE"],
    children: sub("food-hospitality", ["Restaurant", "Cloud kitchen", "Caterer", "Food delivery app"]),
  },
  {
    slug: "travel-transport",
    name: "Travel & transport",
    relationships: ["CUSTOMER", "EMPLOYEE"],
    children: sub("travel-transport", ["Airline", "Bus operator", "Cab / ride-hailing", "Travel agency"]),
  },
  {
    slug: "home-services",
    name: "Home services",
    relationships: ["CUSTOMER", "EMPLOYEE"],
    children: sub("home-services", ["Packers & movers", "Plumber / electrician", "Cleaning", "Pest control"]),
  },
  {
    slug: "real-estate",
    name: "Real estate",
    relationships: ["CUSTOMER", "TENANT_GUEST", "EMPLOYEE"],
    children: sub("real-estate", ["Builder / developer", "Broker", "Society management"]),
  },
  {
    slug: "government-utilities",
    name: "Government & utilities",
    relationships: ["CUSTOMER"],
    children: sub("government-utilities", ["Electricity board", "Water board", "Municipal office", "RTO", "Passport office"]),
  },
];

// ── Question sets ──────────────────────────────────────────────────────────

export type SeedQuestion =
  | { key: string; label: string; type: "STAR"; helpText?: string }
  | { key: string; label: string; type: "YES_NO" | "NUMBER"; required?: boolean; helpText?: string }
  | { key: string; label: string; type: "SINGLE_CHOICE"; options: string[]; required?: boolean; helpText?: string };

const star = (key: string, label: string, helpText?: string): SeedQuestion => ({ key, label, type: "STAR", helpText });
const yesNo = (key: string, label: string, required = false): SeedQuestion => ({ key, label, type: "YES_NO", required });
const choice = (key: string, label: string, options: string[], required = false): SeedQuestion => ({
  key,
  label,
  type: "SINGLE_CHOICE",
  options,
  required,
});
const number = (key: string, label: string, helpText?: string): SeedQuestion => ({
  key,
  label,
  type: "NUMBER",
  required: false,
  helpText,
});

// Shared metrics, asked wherever they make sense so any two businesses can
// be compared on them.
const VALUE = (label = "Value for money") => star("VALUE_FOR_MONEY", label);
const RESPONSIVE = (label = "Responsiveness to complaints") => star("RESPONSIVENESS", label);
const HONEST = (label = "Honesty and transparency") => star("TRANSPARENCY", label);

const WOULD_RECOMMEND = yesNo("WOULD_RECOMMEND", "Would you recommend them to a friend?");
const ISSUE_OUTCOME = choice("ISSUE_OUTCOME", "Did you raise a complaint?", [
  "No complaint",
  "Raised and resolved",
  "Raised, not resolved",
]);
const EMPLOYMENT_STATUS = choice("EMPLOYMENT_STATUS", "Do you still work here?", ["Current employee", "Former employee"], true);

export interface SeedQuestionSet {
  categorySlug: string | null; // null = generic fallback for the relationship
  relationship: RelationshipKey;
  title: string;
  proofRequired?: boolean;
  mediaRequired?: boolean;
  questions: SeedQuestion[];
}

const employeeCore = (extra: SeedQuestion[] = []): SeedQuestion[] => [
  star("SALARY_ON_TIME", "Salary paid on time"),
  star("WORK_LIFE_BALANCE", "Work-life balance"),
  star("GROWTH", "Learning and growth"),
  star("MANAGEMENT_BEHAVIOUR", "Manager and leadership behaviour"),
  ...extra,
  RESPONSIVE("HR responsiveness to issues"),
  HONEST("Honesty about pay and policies"),
  EMPLOYMENT_STATUS,
  WOULD_RECOMMEND,
];

const housingStay = (extra: SeedQuestion[], facts: SeedQuestion[] = []): SeedQuestion[] => [
  VALUE("Value for money / rent escalation fairness"),
  RESPONSIVE("Owner / caretaker responsiveness"),
  HONEST("Deposit and charges transparency"),
  ...extra,
  ...facts,
];

export const QUESTION_SETS: SeedQuestionSet[] = [
  // ── Generic fallbacks: one per relationship ──
  {
    categorySlug: null,
    relationship: "TENANT_GUEST",
    title: "Tenant or guest (general)",
    questions: [
      VALUE(),
      RESPONSIVE(),
      HONEST(),
      star("HYGIENE_CLEANLINESS", "Hygiene and cleanliness"),
      star("LOCALITY_SAFETY", "Safety"),
      star("AMENITIES", "Amenities and maintenance"),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: null,
    relationship: "CUSTOMER",
    title: "Customer (general)",
    questions: [
      VALUE(),
      star("SERVICE_QUALITY", "Quality of the service or product"),
      star("STAFF_BEHAVIOUR", "Staff behaviour"),
      star("TIMELINESS", "Delivered on time, as promised"),
      RESPONSIVE(),
      HONEST(),
      ISSUE_OUTCOME,
      WOULD_RECOMMEND,
    ],
  },
  { categorySlug: null, relationship: "EMPLOYEE", title: "Employee (general)", questions: employeeCore([star("JOB_SECURITY", "Job security")]) },
  {
    categorySlug: null,
    relationship: "STUDENT_PARENT",
    title: "Student or parent (general)",
    questions: [
      VALUE("Value for the fees"),
      star("TEACHING_QUALITY", "Teaching quality"),
      star("INFRASTRUCTURE", "Classrooms, labs and facilities"),
      star("STUDENT_SAFETY", "Safety of students"),
      RESPONSIVE(),
      HONEST("Fee and refund transparency"),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: null,
    relationship: "PATIENT_FAMILY",
    title: "Patient or family (general)",
    questions: [
      star("DOCTOR_COMMUNICATION", "Doctor explained the treatment clearly"),
      star("WAITING_TIME", "Waiting time"),
      star("HYGIENE_CLEANLINESS", "Hygiene and cleanliness"),
      star("STAFF_BEHAVIOUR", "Nurse and staff behaviour"),
      VALUE("Value for the bill"),
      RESPONSIVE(),
      HONEST("Billing transparency"),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: null,
    relationship: "VENDOR_SUPPLIER",
    title: "Vendor or supplier (general)",
    questions: [
      star("PAYMENT_ON_TIME", "Payments made on time"),
      star("FAIR_TERMS", "Fairness of contract terms"),
      star("COMMUNICATION", "Clarity of communication"),
      star("ORDER_STABILITY", "Consistency of orders"),
      RESPONSIVE(),
      HONEST(),
      number("PAYMENT_DELAY_DAYS", "Typical payment delay beyond the due date (days)"),
    ],
  },
  {
    categorySlug: null,
    relationship: "JOB_APPLICANT",
    title: "Job applicant (general)",
    questions: [
      star("INTERVIEW_PROCESS", "Interview process was fair and organised"),
      star("COMMUNICATION", "Communication and feedback"),
      RESPONSIVE("Response time"),
      HONEST("Honesty about the role and pay"),
      yesNo("GOT_OFFER", "Did you get an offer?"),
      choice("APPLIED_VIA", "How did you apply?", ["Company website", "Job portal", "Referral", "Campus", "Consultant"]),
    ],
  },

  // ── Housing & stays (v1's seven grievance metrics live on here) ──
  {
    categorySlug: "housing",
    relationship: "TENANT_GUEST",
    title: "Housing tenant",
    proofRequired: true,
    mediaRequired: true,
    questions: housingStay(
      [
        star("LOCALITY_SAFETY", "Locality and approach-road safety"),
        star("HYGIENE_CLEANLINESS", "Hygiene, cleanliness and waste"),
        star("WATER_SUPPLY", "Water supply and sewerage"),
        star("ELECTRICITY_BACKUP", "Electricity uptime and backup"),
        star("AMENITIES", "Lift and common amenities"),
      ],
      [yesNo("DEPOSIT_RETURNED", "Was your deposit returned in full?"), number("MONTHLY_RENT", "Monthly rent (₹)", "Optional. Shown only as a range.")]
    ),
  },
  ...(["housing-pg", "housing-hostel", "housing-co-living"] as const).map(
    (slug): SeedQuestionSet => ({
      categorySlug: slug,
      relationship: "TENANT_GUEST",
      title: slug === "housing-pg" ? "PG resident" : slug === "housing-hostel" ? "Hostel resident" : "Co-living resident",
      proofRequired: true,
      mediaRequired: true,
      questions: housingStay(
        [
          star("FOOD_QUALITY", "Food quality"),
          star("HYGIENE_CLEANLINESS", "Hygiene and cleanliness"),
          star("LOCALITY_SAFETY", "Safety"),
          star("WATER_SUPPLY", "Water supply"),
          star("ELECTRICITY_BACKUP", "Electricity and backup"),
          star("RULE_FAIRNESS", "Fairness of rules (curfew, guests)"),
        ],
        [
          yesNo("FOOD_INCLUDED", "Was food included in the rent?"),
          yesNo("DEPOSIT_RETURNED", "Was your deposit returned in full?"),
          number("MONTHLY_RENT", "Monthly rent (₹)", "Optional. Shown only as a range."),
        ]
      ),
    })
  ),
  ...(["housing-hotel-budget", "housing-hotel-luxury", "housing-serviced-apartment"] as const).map(
    (slug): SeedQuestionSet => ({
      categorySlug: slug,
      relationship: "TENANT_GUEST",
      title: "Hotel guest",
      proofRequired: true,
      mediaRequired: true,
      questions: [
        VALUE(),
        star("HYGIENE_CLEANLINESS", "Room cleanliness"),
        star("STAFF_BEHAVIOUR", "Staff behaviour"),
        star("CHECKIN_EXPERIENCE", "Check-in and check-out"),
        star("ROOM_MATCHED_LISTING", "Room matched the photos and listing"),
        RESPONSIVE(),
        HONEST("No hidden charges"),
        WOULD_RECOMMEND,
      ],
    })
  ),
  { categorySlug: "housing", relationship: "EMPLOYEE", title: "Housing and hotel staff", questions: employeeCore() },

  // ── Automotive & aerospace ──
  {
    categorySlug: "automotive",
    relationship: "EMPLOYEE",
    title: "Automotive employee",
    questions: [
      ...employeeCore([star("SHOPFLOOR_SAFETY", "Safety on the shop floor"), star("JOB_SECURITY", "Job security")]),
      choice("SHIFT_TYPE", "Your shift", ["General", "Rotational", "Night"]),
    ],
  },
  {
    categorySlug: "automotive",
    relationship: "CUSTOMER",
    title: "Automotive B2B customer",
    questions: [
      star("DELIVERY_ON_TIME", "Delivery on time"),
      star("PRODUCT_QUALITY", "Quality / rejection rate"),
      star("COMMUNICATION", "Communication"),
      VALUE("Pricing"),
      RESPONSIVE(),
      HONEST(),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: "automotive",
    relationship: "VENDOR_SUPPLIER",
    title: "Automotive supplier",
    questions: [
      star("PAYMENT_ON_TIME", "Payments made on time"),
      star("FAIR_TERMS", "Fairness of contract terms and price-downs"),
      star("COMMUNICATION", "Clarity of specs and communication"),
      star("ORDER_STABILITY", "Schedule stability"),
      RESPONSIVE(),
      HONEST(),
      number("PAYMENT_DELAY_DAYS", "Typical payment delay beyond the due date (days)"),
    ],
  },
  {
    categorySlug: "automotive-dealership",
    relationship: "CUSTOMER",
    title: "Car or bike buyer",
    questions: [
      VALUE("Final price vs quote"),
      star("DELIVERY_ON_TIME", "Delivered on the promised date"),
      star("STAFF_BEHAVIOUR", "Sales staff behaviour"),
      star("SERVICE_QUALITY", "Paperwork and registration handled well"),
      RESPONSIVE(),
      HONEST("No forced add-ons or hidden charges"),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: "automotive-service-centre",
    relationship: "CUSTOMER",
    title: "Vehicle service customer",
    questions: [
      star("SERVICE_QUALITY", "Quality of repair"),
      star("TIMELINESS", "Vehicle ready on time"),
      star("STAFF_BEHAVIOUR", "Advisor behaviour"),
      VALUE(),
      RESPONSIVE(),
      HONEST("Billing transparency (no unapproved work)"),
      ISSUE_OUTCOME,
    ],
  },
  {
    categorySlug: "aerospace",
    relationship: "EMPLOYEE",
    title: "Aerospace employee",
    questions: employeeCore([star("SHOPFLOOR_SAFETY", "Safety and quality culture"), star("JOB_SECURITY", "Job security")]),
  },

  // ── IT & ITES ──
  {
    categorySlug: "it-ites",
    relationship: "EMPLOYEE",
    title: "IT employee",
    questions: employeeCore([star("JOB_SECURITY", "Job security"), star("APPRAISAL_FAIRNESS", "Appraisal fairness")]),
  },
  {
    categorySlug: "it-ites-bpo-call-centre",
    relationship: "EMPLOYEE",
    title: "BPO / call centre employee",
    questions: [
      star("SALARY_ON_TIME", "Salary paid on time"),
      star("SHIFT_CAB", "Shift timings and cab facility"),
      star("TARGET_PRESSURE", "Targets and pressure", "5 = reasonable, 1 = unmanageable"),
      star("LEAVE_POLICY", "Leave policy"),
      star("APPRAISAL_FAIRNESS", "Appraisal fairness"),
      star("EXIT_SETTLEMENT", "Exit and full-and-final settlement"),
      RESPONSIVE("HR responsiveness to issues"),
      HONEST("Honesty about pay and incentives"),
      EMPLOYMENT_STATUS,
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: "it-ites",
    relationship: "CUSTOMER",
    title: "IT services client",
    questions: [
      star("SERVICE_QUALITY", "Quality of delivery"),
      star("TIMELINESS", "Met deadlines"),
      star("COMMUNICATION", "Communication"),
      VALUE(),
      RESPONSIVE(),
      HONEST(),
      WOULD_RECOMMEND,
    ],
  },

  // ── Education ──
  {
    categorySlug: "education-coaching-institute",
    relationship: "STUDENT_PARENT",
    title: "Coaching student or parent",
    questions: [
      star("TEACHING_QUALITY", "Teaching quality"),
      star("BATCH_SIZE", "Batch size and personal attention"),
      star("RESULTS_VS_PROMISES", "Results vs what was promised"),
      star("STUDY_MATERIAL", "Study material"),
      VALUE("Value for the fees"),
      RESPONSIVE(),
      HONEST("Honest fee refund policy"),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: "education-online-course",
    relationship: "STUDENT_PARENT",
    title: "Online course learner",
    questions: [
      star("TEACHING_QUALITY", "Course content and teaching"),
      star("RESULTS_VS_PROMISES", "Job / placement outcome vs promises"),
      star("PLATFORM_EXPERIENCE", "App and platform"),
      VALUE("Value for the fees"),
      RESPONSIVE(),
      HONEST("Honest fee refund policy"),
      WOULD_RECOMMEND,
    ],
  },

  // ── Healthcare ──
  {
    categorySlug: "healthcare-hospital",
    relationship: "PATIENT_FAMILY",
    title: "Hospital patient or family",
    questions: [
      star("DOCTOR_COMMUNICATION", "Doctor explained the treatment clearly"),
      star("WAITING_TIME", "Waiting time"),
      star("HYGIENE_CLEANLINESS", "Hygiene and cleanliness"),
      star("STAFF_BEHAVIOUR", "Nurse and staff behaviour"),
      star("INSURANCE_PROCESS", "Insurance / cashless process"),
      VALUE("Value for the bill"),
      RESPONSIVE(),
      HONEST("Billing transparency"),
      choice("INSURANCE_OUTCOME", "Did you use insurance?", ["Not used", "Cashless, smooth", "Cashless, delayed", "Claim rejected"]),
    ],
  },
  {
    categorySlug: "healthcare-diagnostic-lab",
    relationship: "PATIENT_FAMILY",
    title: "Diagnostic lab customer",
    questions: [
      star("TIMELINESS", "Reports delivered on time"),
      star("STAFF_BEHAVIOUR", "Sample collection and staff"),
      star("HYGIENE_CLEANLINESS", "Hygiene"),
      VALUE(),
      RESPONSIVE(),
      HONEST("Pricing transparency"),
    ],
  },

  // ── Banking, telecom, retail, food, travel, home, real estate, government ──
  {
    categorySlug: "banking-finance",
    relationship: "CUSTOMER",
    title: "Bank or finance customer",
    questions: [
      star("SERVICE_QUALITY", "Branch and phone service"),
      star("DIGITAL_EXPERIENCE", "App and online banking"),
      star("STAFF_BEHAVIOUR", "Staff behaviour"),
      VALUE("Fees and charges"),
      RESPONSIVE(),
      HONEST("No hidden charges or mis-selling"),
      ISSUE_OUTCOME,
    ],
  },
  {
    categorySlug: "telecom",
    relationship: "CUSTOMER",
    title: "Telecom customer",
    questions: [
      star("NETWORK_QUALITY", "Network coverage and call quality"),
      star("UPTIME", "Uptime"),
      VALUE(),
      RESPONSIVE("Complaint resolution"),
      HONEST("No hidden charges"),
      ISSUE_OUTCOME,
    ],
  },
  {
    categorySlug: "telecom-broadband-provider",
    relationship: "CUSTOMER",
    title: "Broadband customer",
    questions: [
      star("SPEED_VS_PLAN", "Speed vs plan"),
      star("UPTIME", "Uptime"),
      star("INSTALLATION", "Installation"),
      VALUE(),
      RESPONSIVE("Complaint resolution"),
      HONEST("No hidden charges"),
      ISSUE_OUTCOME,
    ],
  },
  {
    categorySlug: "ecommerce-retail",
    relationship: "CUSTOMER",
    title: "Shopper",
    questions: [
      star("PRODUCT_QUALITY", "Product matched the listing"),
      star("DELIVERY_ON_TIME", "Delivered on time"),
      star("RETURNS_REFUNDS", "Returns and refunds"),
      VALUE(),
      RESPONSIVE(),
      HONEST(),
      ISSUE_OUTCOME,
    ],
  },
  {
    categorySlug: "ecommerce-retail",
    relationship: "VENDOR_SUPPLIER",
    title: "Seller or supplier",
    questions: [
      star("PAYMENT_ON_TIME", "Payouts on time"),
      star("FAIR_TERMS", "Fairness of commissions and penalties"),
      star("COMMUNICATION", "Seller support"),
      RESPONSIVE(),
      HONEST(),
      number("PAYMENT_DELAY_DAYS", "Typical payout delay beyond the due date (days)"),
    ],
  },
  {
    categorySlug: "food-hospitality",
    relationship: "CUSTOMER",
    title: "Diner",
    questions: [
      star("FOOD_QUALITY", "Food quality"),
      star("HYGIENE_CLEANLINESS", "Hygiene"),
      star("STAFF_BEHAVIOUR", "Service"),
      VALUE(),
      RESPONSIVE(),
      HONEST("Bill matched the menu"),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: "food-hospitality-food-delivery-app",
    relationship: "CUSTOMER",
    title: "Food delivery customer",
    questions: [
      star("FOOD_QUALITY", "Food arrived fresh and correct"),
      star("DELIVERY_ON_TIME", "Delivered on time"),
      star("RETURNS_REFUNDS", "Refunds for wrong or missing items"),
      VALUE(),
      RESPONSIVE(),
      HONEST("No hidden fees"),
      ISSUE_OUTCOME,
    ],
  },
  {
    categorySlug: "travel-transport",
    relationship: "CUSTOMER",
    title: "Traveller",
    questions: [
      star("TIMELINESS", "Punctuality"),
      star("STAFF_BEHAVIOUR", "Staff and driver behaviour"),
      star("LOCALITY_SAFETY", "Safety"),
      star("RETURNS_REFUNDS", "Cancellations and refunds"),
      VALUE(),
      RESPONSIVE(),
      HONEST("No hidden charges"),
    ],
  },
  {
    categorySlug: "home-services",
    relationship: "CUSTOMER",
    title: "Home services customer",
    questions: [
      star("SERVICE_QUALITY", "Quality of work"),
      star("TIMELINESS", "Arrived and finished on time"),
      star("STAFF_BEHAVIOUR", "Worker behaviour"),
      VALUE(),
      RESPONSIVE(),
      HONEST("Final bill matched the quote"),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: "home-services-packers-movers",
    relationship: "CUSTOMER",
    title: "Packers and movers customer",
    questions: [
      star("DAMAGE_FREE", "Goods arrived undamaged"),
      star("TIMELINESS", "Picked up and delivered on time"),
      star("STAFF_BEHAVIOUR", "Crew behaviour"),
      VALUE(),
      RESPONSIVE("Damage claim handling"),
      HONEST("Final bill matched the quote"),
      ISSUE_OUTCOME,
    ],
  },
  {
    categorySlug: "real-estate-builder-developer",
    relationship: "CUSTOMER",
    title: "Home buyer",
    questions: [
      star("POSSESSION_ON_TIME", "Possession on the promised date"),
      star("CONSTRUCTION_QUALITY", "Construction quality"),
      star("AMENITIES", "Promised amenities delivered"),
      VALUE(),
      RESPONSIVE(),
      HONEST("Honest about approvals and charges"),
      number("POSSESSION_DELAY_MONTHS", "Possession delay (months)"),
    ],
  },
  {
    categorySlug: "real-estate-broker",
    relationship: "CUSTOMER",
    title: "Broker client",
    questions: [
      star("LISTING_ACCURACY", "Listings matched reality"),
      star("COMMUNICATION", "Communication"),
      VALUE("Value for the brokerage"),
      RESPONSIVE(),
      HONEST(),
      WOULD_RECOMMEND,
    ],
  },
  {
    categorySlug: "real-estate-society-management",
    relationship: "TENANT_GUEST",
    title: "Resident",
    questions: [
      star("AMENITIES", "Maintenance of common areas"),
      star("LOCALITY_SAFETY", "Security"),
      star("HYGIENE_CLEANLINESS", "Cleanliness and waste"),
      VALUE("Value for the maintenance fee"),
      RESPONSIVE(),
      HONEST("Accounts shared openly"),
    ],
  },
  {
    categorySlug: "government-utilities",
    relationship: "CUSTOMER",
    title: "Citizen",
    questions: [
      star("TIMELINESS", "Work done in the promised time"),
      star("PROCESS_CLARITY", "Clarity of process and documents"),
      star("STAFF_BEHAVIOUR", "Staff behaviour"),
      star("DIGITAL_EXPERIENCE", "Online portal"),
      RESPONSIVE(),
      HONEST("No bribe or unofficial charge asked"),
      ISSUE_OUTCOME,
    ],
  },
];
