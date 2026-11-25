"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@confecciones/backend/actions";

type Props = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  label: string;
  children?: ReactNode;
  confirm?: string;
  secondary?: boolean;
  danger?: boolean;
  grid?: boolean;
};

export function ActionForm({ action, label, children, confirm, secondary, danger, grid }: Props) {
  const [state, dispatch, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} className={grid ? "form-grid" : "flow"} action={dispatch} onSubmit={(event) => {
      event.preventDefault();
      if (pending || (confirm && !window.confirm(confirm))) return;
      const data = new FormData(event.currentTarget);
      startTransition(() => dispatch(data));
    }}>
      {children}
      <div className={grid ? "span" : undefined}>
        <button className={`button${danger ? " danger" : secondary ? " secondary" : ""}`} disabled={pending}>
          {pending ? "Guardando…" : label}
        </button>
        {state.error && <p className="feedback error" role="alert">{state.error}</p>}
        {state.success && <p className="feedback success" role="status">{state.success}</p>}
      </div>
    </form>
  );
}
