'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { msg, useMessages } from 'gt-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, MapPin, Pen, Sparkles, Trash2 } from 'lucide-react';

const LABELS = {
  title: msg('Sketch Lab'),
  description: msg('Draw a prop, polish with optional AI, then place it on the map.'),
  brush: msg('Brush'),
  eraser: msg('Eraser'),
  size: msg('Size'),
  clear: msg('Clear'),
  aiPolish: msg('AI polish'),
  placeOnMap: msg('Place on map'),
  close: msg('Close'),
  aiWorking: msg('Working…'),
  aiNoKey: msg('Add OPENAI_API_KEY on the server to enable AI polish.'),
  aiError: msg('AI request failed. Using your sketch as-is.'),
};

const PALETTE = [
  '#0b0f0e',
  '#ffffff',
  '#d1e5e0',
  '#3d5a9b',
  '#d22e2e',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
] as const;

const CANVAS_SIZE = 480;

type SketchLabDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with PNG data URL; parent should set pending art and place_sketch tool */
  onPlaceOnMap: (imageDataUrl: string) => void;
};

export function SketchLabDialog({ open, onOpenChange, onPlaceOnMap }: SketchLabDialogProps) {
  const m = useMessages();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'brush' | 'eraser'>('brush');
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [brushRadius, setBrushRadius] = useState(4);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fbfbf7';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const gridStep = 24;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= CANVAS_SIZE; g += gridStep) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(CANVAS_SIZE, g);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    if (open) {
      clearCanvas();
      setAiHint(null);
    }
  }, [open, clearCanvas]);

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY,
    };
  }, []);

  const paintLine = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushRadius * 2;
      if (mode === 'eraser') {
        ctx.strokeStyle = '#fbfbf7';
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.strokeStyle = color;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [brushRadius, color, mode],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const p = getPos(e);
      if (!p) return;
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastRef.current = p;
    },
    [getPos],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || !lastRef.current) return;
      const p = getPos(e);
      if (!p) return;
      paintLine(lastRef.current, p);
      lastRef.current = p;
    },
    [getPos, paintLine],
  );

  const endStroke = useCallback(() => {
    drawingRef.current = false;
    lastRef.current = null;
  }, []);

  const exportPng = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return '';
    return c.toDataURL('image/png');
  }, []);

  const handlePlace = useCallback(() => {
    const url = exportPng();
    if (!url) return;
    onPlaceOnMap(url);
  }, [exportPng, onPlaceOnMap]);

  const handleAi = useCallback(async () => {
    setAiBusy(true);
    setAiHint(null);
    try {
      const dataUrl = exportPng();
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const res = await fetch('/api/sketch-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          prompt:
            'Isometric city-builder sticker prop, bold black ink outlines, flat mint sage and cream palette with royal blue accents, hand-drawn notebook style, no purple, no pink, single centered object',
        }),
      });
      const data = (await res.json()) as {
        imageDataUrl?: string;
        enhanced?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.imageDataUrl) {
        setAiHint(m(LABELS.aiError));
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = data.imageDataUrl!;
      });
      const c = canvasRef.current;
      const ctx = c?.getContext('2d');
      if (ctx && c) {
        clearCanvas();
        const s = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height) * 0.92;
        const dw = img.width * s;
        const dh = img.height * s;
        ctx.drawImage(img, (CANVAS_SIZE - dw) / 2, (CANVAS_SIZE - dh) / 2, dw, dh);
      }
      if (data.message) setAiHint(data.message);
      else if (!data.enhanced) setAiHint(m(LABELS.aiNoKey));
    } catch {
      setAiHint(m(LABELS.aiError));
    } finally {
      setAiBusy(false);
    }
  }, [clearCanvas, exportPng, m]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95dvh] overflow-y-auto border-2 border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">{m(LABELS.title)}</DialogTitle>
          <DialogDescription>{m(LABELS.description)}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              variant={mode === 'brush' ? 'default' : 'outline'}
              size="sm"
              className="gap-1"
              onClick={() => setMode('brush')}
            >
              <Pen className="w-4 h-4" />
              {m(LABELS.brush)}
            </Button>
            <Button
              type="button"
              variant={mode === 'eraser' ? 'default' : 'outline'}
              size="sm"
              className="gap-1"
              onClick={() => setMode('eraser')}
            >
              <Eraser className="w-4 h-4" />
              {m(LABELS.eraser)}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={clearCanvas}>
              <Trash2 className="w-4 h-4" />
              {m(LABELS.clear)}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className={`h-9 w-9 rounded-md border-2 transition-transform ${
                  color === c && mode === 'brush' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'border-border'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setMode('brush');
                  setColor(c);
                }}
              />
            ))}
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{m(LABELS.size)}</div>
            <Slider
              value={[brushRadius]}
              min={1}
              max={18}
              step={1}
              onValueChange={(v) => setBrushRadius(v[0] ?? 4)}
            />
          </div>

          <div className="relative rounded-lg overflow-hidden border-2 border-border bg-[#fbfbf7] touch-none mx-auto max-w-full">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full max-w-[min(100vw-3rem,480px)] h-auto cursor-crosshair block"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
            />
          </div>

          {aiHint && <p className="text-xs text-muted-foreground">{aiHint}</p>}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={aiBusy}
            onClick={() => void handleAi()}
          >
            <Sparkles className="w-4 h-4" />
            {aiBusy ? m(LABELS.aiWorking) : m(LABELS.aiPolish)}
          </Button>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {m(LABELS.close)}
            </Button>
            <Button type="button" className="gap-2" onClick={handlePlace}>
              <MapPin className="w-4 h-4" />
              {m(LABELS.placeOnMap)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
