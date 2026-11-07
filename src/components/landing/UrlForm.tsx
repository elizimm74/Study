// The "paste your URL" box. A plain form: it sends you to /app?url=...,
// which starts the test (signed-out visitors sign up first; the URL comes along).
export default function UrlForm({ id = "url" }: { id?: string }) {
  return (
    <form action="/app" method="get" className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
      <label htmlFor={id} className="sr-only">
        Your website
      </label>
      <div className="relative flex-1">
        <span className="t-label field-prefix pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden>
          https://
        </span>
        <input id={id} name="url" placeholder="yourstartup.com" required autoComplete="url" inputMode="url" className="field h-12 pl-20" />
      </div>
      <button className="btn btn-primary h-12 px-6">Test it</button>
    </form>
  );
}
