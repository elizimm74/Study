// The example result shown on the landing page (a made-up meal-planning app).
// It's written to look like a real report: varied people, plain-spoken quotes,
// and numbers that add up (12 buy + 6 maybe + 7 no = 25).

export type Verdict = "buy" | "maybe" | "no";
export type ExamplePersona = { name: string; age: number; role: string; device: string; verdict: Verdict; quote: string };

export const EXAMPLE_SITE = "mealmate.app";

export const EXAMPLE_PERSONAS: ExamplePersona[] = [
  { name: "Priya", age: 34, role: "Nurse", device: "Android", verdict: "buy", quote: "Planning dinners after a 12-hour shift is the worst part of my week. $9 is fine." },
  { name: "Jordan", age: 29, role: "Teacher", device: "Laptop", verdict: "buy", quote: "The grocery list sorted by aisle sold me." },
  { name: "Maya", age: 16, role: "Student", device: "iPhone", verdict: "maybe", quote: "Looks cool but I don't have a card." },
  { name: "Sam", age: 41, role: "Dad of three", device: "iPhone", verdict: "buy", quote: "If it ends the 5pm “what's for dinner” panic, it's worth it." },
  { name: "Ethan", age: 19, role: "Student", device: "iPhone", verdict: "no", quote: "$9 a month for recipes? TikTok is free." },
  { name: "Lena", age: 26, role: "Grad student", device: "iPhone", verdict: "buy", quote: "Cheaper than one takeout order. Trying it." },
  { name: "Chris", age: 33, role: "Freelancer", device: "Laptop", verdict: "maybe", quote: "Where's the price? I had to sign up to see it." },
  { name: "Marcus", age: 38, role: "Sales manager", device: "Laptop", verdict: "buy", quote: "I got what it does in ten seconds." },
  { name: "Sofia", age: 48, role: "Lawyer", device: "Laptop", verdict: "no", quote: "Signup asked for too much before showing me anything." },
  { name: "Aisha", age: 31, role: "Designer", device: "iPhone", verdict: "buy", quote: "The sample week did it. Clean app." },
  { name: "Nina", age: 45, role: "Accountant", device: "Laptop", verdict: "maybe", quote: "I'd try it if there was a free week." },
  { name: "Tom", age: 52, role: "Shop owner", device: "Laptop", verdict: "buy", quote: "My wife has been asking for something like this." },
  { name: "Jake", age: 15, role: "Student", device: "iPhone", verdict: "no", quote: "my mom does the cooking lol" },
  { name: "Hana", age: 24, role: "Junior developer", device: "Laptop", verdict: "buy", quote: "Macros per meal? Yes." },
  { name: "Leo", age: 22, role: "College student", device: "Android", verdict: "maybe", quote: "Kind of what I already do in my notes app." },
  { name: "Diego", age: 35, role: "Line cook", device: "Android", verdict: "buy", quote: "The recipes are actually good, not filler." },
  { name: "Ben", age: 55, role: "Contractor", device: "Android", verdict: "no", quote: "Too many steps. Closed it." },
  { name: "Ruth", age: 63, role: "Retired", device: "iPad", verdict: "buy", quote: "Big text, easy signup. I'd pay." },
  { name: "Grace", age: 37, role: "Mom of two", device: "iPhone", verdict: "maybe", quote: "Need to know if it handles picky eaters." },
  { name: "Mei", age: 36, role: "Researcher", device: "Laptop", verdict: "no", quote: "No reviews, no idea who's behind it." },
  { name: "Kofi", age: 27, role: "Fitness coach", device: "iPhone", verdict: "buy", quote: "I'd send this to my clients if the trial holds up." },
  { name: "Omar", age: 28, role: "Product manager", device: "Laptop", verdict: "maybe", quote: "Promising. I want to see a full week first." },
  { name: "Alex", age: 25, role: "Barista", device: "iPhone", verdict: "no", quote: "Can't justify another subscription right now." },
  { name: "Emma", age: 30, role: "Marketing lead", device: "Laptop", verdict: "buy", quote: "Fair price, once I found it." },
  { name: "Carla", age: 42, role: "Nurse", device: "Android", verdict: "no", quote: "Couldn't find the pricing. Gave up." },
];

export const EXAMPLE_FIXES = [
  { title: "Show the price on the homepage", detail: "5 of 13 who didn't buy never found it.", win: 3 },
  { title: "Add a 7-day trial, no card", detail: "Students and first-timers stall at the card form.", win: 3 },
  { title: "Cut signup to email only", detail: "Four fields before any value is too many.", win: 2 },
];

export const EXAMPLE_BLOCKER = { text: "Price hidden until signup", detail: "5 of 13 who didn't buy" };

export function countVerdicts(list: ExamplePersona[]) {
  return {
    buy: list.filter((p) => p.verdict === "buy").length,
    maybe: list.filter((p) => p.verdict === "maybe").length,
    no: list.filter((p) => p.verdict === "no").length,
  };
}
