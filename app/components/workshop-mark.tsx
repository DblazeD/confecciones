import Link from "next/link";
import type { Brand } from "@/lib/catalog";
import { mediaUrl } from "@/lib/format";

export function WorkshopMark({ brand }: { brand: Brand }) {
  return (
    <Link className="wordmark" href="/">
      {brand.logo
        ? <img src={mediaUrl(brand.logo)} width="48" height="48" alt="" />
        : <span className="brand-mark" aria-hidden="true">DA</span>}
      <span className="wordmark-text">
        <strong>{brand.name}</strong>
        <span>Confección con amor</span>
      </span>
    </Link>
  );
}
