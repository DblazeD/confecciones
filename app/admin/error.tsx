"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="panel">
    <h1>No pudimos cargar esta pantalla</h1>
    <button className="button secondary" type="button" onClick={reset}>Intentar de nuevo</button>
  </section>;
}
