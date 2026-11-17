"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="section wrap">
      <p className="kicker">Something broke</p>
      <h1>The page hit a snag.</h1>
      <p className="lede" style={{ marginLeft: 0 }}>Your photos were not uploaded. Reload this view and try the photo again.</p>
      <button className="btn" type="button" onClick={() => reset()}>Try again</button>
    </section>
  );
}
