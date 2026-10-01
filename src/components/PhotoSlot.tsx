"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Trash2 } from "lucide-react";

type Props = {
  label: string;
  hint?: string;
  url: string | null;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

export default function PhotoSlot({ label, hint, url, disabled, onUpload, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function handle(file?: File) {
    if (!file) return;
    setBusy(true);
    setErro("");
    try {
      await onUpload(file);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="label">{label}</div>
      <div
        className={`group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl ${
          url ? "bg-subtle ring-1 ring-stroke" : "border-2 border-dashed border-stroke bg-canvas"
        }`}
      >
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="h-full w-full object-contain" />
            {!disabled && (
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-linear-to-t from-ink/60 to-transparent p-2.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button type="button" className="btn bg-white/95 px-2.5 py-1 text-xs text-ink shadow-sm hover:bg-white" onClick={() => input.current?.click()} disabled={busy}>
                  <RefreshCw className="h-3.5 w-3.5" /> Trocar
                </button>
                <button type="button" className="btn bg-white/95 px-2.5 py-1 text-xs text-[#e0503c] shadow-sm hover:bg-white" onClick={() => onRemove()} disabled={busy}>
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-sm text-muted transition enabled:hover:bg-brand-50/50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-stroke">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </span>
            <span className="font-medium text-soft">{busy ? "Enviando…" : "Adicionar foto"}</span>
            {hint && <span className="text-xs text-muted">{hint}</span>}
          </button>
        )}
        {busy && url && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/75 text-sm backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
          </div>
        )}
      </div>
      {erro && <p className="mt-1.5 text-xs text-[#e0503c]">{erro}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
}
