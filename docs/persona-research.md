# Persona research notes

How Crawler's personas are told to behave, and where each rule comes from.
The rules live in `src/lib/behavior.ts`. Each persona only gets the rules that fit them.

There are two kinds of rules:
- **Facts:** from published studies, linked below.
- **Assumptions:** our best guesses, informed by those studies. These are labeled, and we should tune them as we learn more.

## Facts (from research)

| Rule | Applies to | Source |
|---|---|---|
| Visitors decide within ~10 seconds whether to stay, and they skim instead of reading | Everyone | [Nielsen Norman Group: How long do users stay on web pages?](https://nngroup.com/articles/how-long-do-users-stay-on-web-pages/) |
| The median landing page converts ~6.6% of visitors (SaaS ~3.8%, ecommerce ~4.2%) | Everyone | Unbounce Conversion Benchmark Report, Q4 2024 (41,000 pages), via [Apexure](https://www.apexure.com/blog/landing-page-conversion-rate-benchmarks-by-industry) |
| Forced account creation is a top reason people quit (~18-19% of abandoners) | Everyone | Baymard Institute, via [Amazon Pay](https://pay.amazon.com/blog/the-baymard-report-series-how-forcing-sign-ups-drives-down-sales) and [Baymard](https://baymard.com/blog/reduce-cart-abandonment) |
| Requiring a credit card for a trial cuts trial signups (e.g. ~10% vs ~2% of visitors) | Everyone | Totango data, via [Chargebee](https://www.chargebee.com/blog/credit-card-trials-credit-card-trials-go/) |
| Teens finish web tasks less often than adults (~55% vs 66%), dislike reading, want to *do* things, and are put off by "kid"/"youth" wording and glitzy design | Ages 13-17 | Nielsen Norman Group, *Teenagers on the Web* (38 teens, 23 sites), via [CNN](https://money.cnn.com/2005/01/31/technology/personaltech/Teenstudy/index.htm) and [mprove](https://mprove.de/script/04/nng/teenagers.html) |
| Teens are on YouTube and TikTok daily; nearly half are online "almost constantly" | Ages 13-17 | Pew Research Center (2024-2025), via [The Star](https://www.thestar.com.my/tech/tech-news/2025/12/10/survey-most-us-teens-use-youtube-and-tiktok-daily-some-almost-constantly) |
| ~87% of US teens own an iPhone; TikTok is the favorite app (46%) | Ages 13-17 | Piper Sandler *Taking Stock With Teens*, Fall 2025 (10,959 teens), via [MacTech](https://www.mactech.com/2025/10/09/survey-eighty-seven-percent-of-teens-report-they-own-an-iphone/amp/) |
| Before buying, most teens read comments (75%) and reviews (72%); they trust friends (31%) and family (28%) more than influencers (17%) | Ages 13-17 | Teen shopping survey, via [Net Influencer](https://www.netinfluencer.com/gen-z-discovers-brands-on-tiktok-but-trusts-influencers-less-than-friends-family-report-finds/) |
| Kids and teens mostly pay online with a parent's card | Ages 13-17 | Financial Basics Foundation survey, via [The New Daily](https://thenewdaily.com.au/finance/consumer/2018/08/12/teens-big-online-purchases-hurt-families) |

## Assumptions (our best guesses; tune these)

| Assumption | Value | Why |
|---|---|---|
| Share of visitors on a phone | Teens 85%, adults 60%, business buyers 35% | Teens are nearly all on phones (Pew, Piper Sandler) |
| Where visitors come from | Teens: mostly TikTok/YouTube/Instagram, then friends | Teen discovery happens on social media |
| Patience | ~10 sec / ~30 sec / a few minutes; teens skew shorter | NN/g: many leave in ~10 sec, and people who stay ~30 sec often stay minutes |
| Teens on a "card required" trial | Mostly a dead end | Most teens have no card of their own |

## How the visit simulation works

For every persona, code (not AI) rolls the dice on:
- their device
- where they came from
- their patience

The AI then answers *as that person, on that visit*. A 15-year-old who taps a TikTok link on their phone with 10 seconds of patience only sees the phone screenshot of the first screen.

## Known gaps
- Most numbers are US-based.
- Some sources are older (the NN/g teen study is from 2005) or reported second-hand.
- Before quoting these publicly, check the original reports.
