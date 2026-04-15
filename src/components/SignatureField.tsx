"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ChangeEvent } from "react";

type SignatureFieldProps = {
  name: string;
  label: string;
  helper?: string;
  initialValue?: string | null;
};

export default function SignatureField({
  name,
  label,
  helper,
  initialValue,
}: SignatureFieldProps) {
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [signature, setSignature] = useState(initialValue ?? "");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#0f172a";
  }, []);

  const getCanvasPoint = (
    event: PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const { x, y } = getCanvasPoint(event, canvas);
    context.beginPath();
    context.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const { x, y } = getCanvasPoint(event, canvas);
    context.lineTo(x, y);
    context.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) {
      return;
    }
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    setSignature(canvas.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSignature(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("draw")}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              mode === "draw"
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Dibujar
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              mode === "upload"
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Subir imagen
          </button>
        </div>
      </div>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
      {mode === "draw" ? (
        <div className="grid gap-2">
          <canvas
            ref={canvasRef}
            width={560}
            height={160}
            className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <button
            type="button"
            onClick={clearCanvas}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 sm:w-auto"
          >
            Limpiar firma
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
          />
        </div>
      )}
      {signature ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold text-slate-600">Vista previa</p>
          <img
            src={signature}
            alt="Firma guardada"
            className="h-24 w-full rounded-xl border border-slate-200 bg-white object-contain"
          />
          <button
            type="button"
            onClick={() => setSignature("")}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 sm:w-auto"
          >
            Quitar firma guardada
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Sin firma guardada.</p>
      )}
      <input type="hidden" name={name} value={signature} />
    </div>
  );
}
