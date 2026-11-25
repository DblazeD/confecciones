"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/format";

export function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [zoom, setZoom] = useState<string | null>(null);
  if (!photos.length) return <div className="photo-placeholder">Sin foto</div>;
  return (
    <>
      <div className="gallery" aria-label="Fotos del producto">
        {photos.map((photo, index) => (
          <button key={photo} type="button" onClick={() => setZoom(photo)} aria-label={`Ampliar foto ${index + 1}`}>
            <img src={mediaUrl(photo)} alt={`${name}, foto ${index + 1}`} loading={index ? "lazy" : "eager"} />
          </button>
        ))}
      </div>
      {zoom && <dialog open className="zoom-dialog" aria-label="Foto ampliada" onKeyDown={(event) => {
        if (event.key === "Escape") setZoom(null);
      }}>
        <button autoFocus type="button" className="button" onClick={() => setZoom(null)}>Cerrar foto</button>
        <img src={mediaUrl(zoom)} alt={name} />
      </dialog>}
    </>
  );
}
