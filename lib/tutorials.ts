/**
 * Tutorial videos shown on /tutorials. The files live in public/videos/
 * (mp4 + a poster jpg with the same name). Captions are burned into the
 * video, so the transcript here is for search engines, AI answers and
 * people who prefer to read. To add a video: drop the two files in
 * public/videos/ and add an entry below.
 */
export type TutorialAudience = "everyone" | "reviewers" | "businesses";

export interface Tutorial {
  slug: string;
  audience: TutorialAudience;
  title: string;
  description: string;
  /** Length in seconds. */
  duration: number;
  /** Chapter start times in seconds, shown as clickable steps under the video. */
  chapters: { at: number; label: string }[];
  transcript: string[];
  uploadDate: string;
}

export const TUTORIALS: Tutorial[] = [
  {
    slug: "kiraayasense-features",
    audience: "everyone",
    title: "What you can do on KiraayaSense",
    description:
      "A quick tour: proof-backed reviews, earning points for verified reviews, earn-while-you-learn for students, free growth tools for businesses and eight Indian languages.",
    duration: 86,
    uploadDate: "2026-11-05",
    chapters: [
      { at: 0, label: "Real reviews, real proof" },
      { at: 6, label: "Proof-backed reviews" },
      { at: 16, label: "Ratings for what matters" },
      { at: 27, label: "Earn points for reviews" },
      { at: 39, label: "Students: earn while you learn" },
      { at: 48, label: "Grow your business" },
      { at: 56, label: "Get more reviews" },
      { at: 65, label: "Eight Indian languages" },
      { at: 74, label: "Works like an app" },
    ],
    transcript: [
      "KiraayaSense. Real reviews, backed by real proof.",
      "Reviews can be backed by a rent receipt, a bill or a UPI payment, so you know they come from real tenants, customers and employees.",
      "See ratings for what really matters, like food, safety, water and deposits, for PGs, hostels, flats, hotels, colleges, hospitals and more.",
      "Earn while you review. Every verified review earns points, with bonus points for photos and helpful votes. Cash rewards are coming soon, and the points you earn now will count.",
      "Students can earn while they learn. Review your PG, hostel, mess or college, help juniors choose well, and collect points and badges.",
      "For businesses, it is a free way to grow. Claim your listing, reply to reviews, and build the trust that brings in more customers.",
      "Share your review link on WhatsApp, print a QR poster, and show your rating badge on your website, to get reviews from every customer.",
      "Use it in your own language. KiraayaSense speaks eight Indian languages, including Hindi, Urdu, Telugu, Tamil and Bengali.",
      "Add it to your phone's home screen, and it works just like an app.",
      "KiraayaSense. Know the truth before you pay or join. Visit kiraayasense.com today.",
    ],
  },
  {
    slug: "kiraayasense-how-to-use-for-reviewers",
    audience: "reviewers",
    title: "How to find reviews and write your own",
    description:
      "Search for a PG, hostel, flat or business, read proof-verified reviews, write a review with photos and proof, and track your reward points.",
    duration: 136,
    uploadDate: "2026-11-05",
    chapters: [
      { at: 0, label: "Introduction" },
      { at: 10, label: "Sign in" },
      { at: 17, label: "Search" },
      { at: 22, label: "Filters" },
      { at: 29, label: "A business page" },
      { at: 37, label: "Reading reviews" },
      { at: 46, label: "Write a review" },
      { at: 51, label: "Star ratings" },
      { at: 61, label: "Quick facts" },
      { at: 66, label: "Reasons: pros and cons" },
      { at: 86, label: "Photos and proof" },
      { at: 96, label: "Submit" },
      { at: 104, label: "Reward points" },
      { at: 115, label: "Your profile" },
      { at: 122, label: "Change language" },
    ],
    transcript: [
      "This video shows you how to find honest reviews on KiraayaSense, and how to write your own.",
      "Reading reviews needs no account. To write one, tap Sign in and continue with Google.",
      "To find a place, type its name, area or PIN code in the search box.",
      "Narrow the results with filters: verified reviews only, category, location or minimum rating.",
      "Open a business to see its overall score, and a rating for each issue that matters, like food, safety and water supply.",
      "\"Proof verified\" means the reviewer showed a rent receipt or UPI payment. Tap Helpful if a review helped you, or Report if it breaks the rules.",
      "Stayed somewhere? Share your experience and help others. Tap Write a review.",
      "Choose how you know the business, then drag each slider from one to five stars.",
      "Answer a few quick facts, like whether food was included and what you paid.",
      "Give at least three specific reasons. Mark each one as a pro or a con, and pick what it is about.",
      "Add a photo, then upload your proof, such as a UPI payment screenshot or a rent receipt. Proof stays private and is only used to verify your review.",
      "Tap Submit. Our team checks every review, usually within 48 hours, before it goes live.",
      "After approval your review goes live, and you earn points: 10 for a review with proof, 5 more for a photo, and 1 for every helpful vote. See them on My Rewards.",
      "On your profile, set your public name and city, and see every review you have written.",
      "You can use KiraayaSense in eight Indian languages. Pick yours from the menu at the top, and translate any review with one tap.",
      "That's it. Start reading and writing reviews at kiraayasense.com.",
    ],
  },
  {
    slug: "kiraayasense-how-to-use-for-businesses",
    audience: "businesses",
    title: "How to claim and manage your business",
    description:
      "Claim your free listing, use the owner dashboard, reply to reviews, report fake ones, and get more reviews with a WhatsApp link, QR poster and website badge.",
    duration: 93,
    uploadDate: "2026-11-05",
    chapters: [
      { at: 0, label: "Introduction" },
      { at: 7, label: "Find your business" },
      { at: 13, label: "Claim this listing" },
      { at: 17, label: "Verify you run it" },
      { at: 29, label: "Owner dashboard" },
      { at: 38, label: "What customers rate you on" },
      { at: 42, label: "Reply to reviews" },
      { at: 51, label: "Report fake reviews" },
      { at: 57, label: "Review link and WhatsApp" },
      { at: 64, label: "QR poster" },
      { at: 71, label: "Website badge" },
      { at: 78, label: "Fair review rules" },
    ],
    transcript: [
      "This video shows business owners how to use KiraayaSense to build trust and win more customers.",
      "First, search for your business. If it isn't listed yet, you can add it for free.",
      "On your business page, tap Claim this listing.",
      "Choose your role, add your mobile number, and upload proof that you run the business, like a trade licence or GST certificate. Our team verifies it, usually with a phone call.",
      "Once verified, open your owner dashboard. It shows how many people reviewed you, how many reviews have proof, and how many are waiting for your reply.",
      "See exactly what customers rate you on, so you know what to fix first.",
      "Reply publicly to every review, good or bad. Thank the reviewer and say what you have changed. A moderator checks each reply before it goes live.",
      "If a review is fake or abusive, tap Report and a moderator will check it.",
      "To get more reviews, copy your review link or send it on WhatsApp. It opens your page with the review form ready.",
      "Print a QR poster for your counter or reception, so every customer can scan it and leave a review.",
      "Add the free rating badge or reviews widget to your website. It updates by itself and always shows your real score.",
      "Ask every customer, not only the happy ones, and never offer gifts for reviews. That keeps your reviews trusted, and within India's online review rules.",
      "Claim your business today at kiraayasense.com.",
    ],
  },
];

export const videoSrc = (slug: string) => `/videos/${slug}.mp4`;
export const posterSrc = (slug: string) => `/videos/${slug}.jpg`;
export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
