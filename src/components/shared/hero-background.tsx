"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

type HeroBackgroundProps = {
  children: ReactNode
}

/** Full-bleed hero grid. */
const VIEW_W = 1000
const VIEW_H = 900
const CELL = 16
const COLS = Math.ceil(VIEW_W / CELL)
const ROWS = Math.ceil(VIEW_H / CELL)

const PALETTE: [number, number, number][] = [
  [255, 132, 55],
  [214, 106, 44],
  [138, 66, 28],
  [58, 29, 12],
  [14, 14, 18],
]

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function rgb(c: [number, number, number], a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
}

function samplePalette(t: number): [number, number, number] {
  const u = clamp01(t) * (PALETTE.length - 1)
  const i = Math.min(PALETTE.length - 2, Math.floor(u))
  return mixRgb(PALETTE[i], PALETTE[i + 1], u - i)
}

function cellKey(c: number, r: number) {
  return c * 1024 + r
}

function inBounds(x: number, y: number) {
  return x >= 0 && x <= VIEW_W && y >= 0 && y <= VIEW_H
}

type Cell = {
  c: number
  r: number
  x: number
  y: number
  grain: number
  live: 0 | 1 | 2
  period: number
  offset: number
  window: number
}

function hash01(c: number, r: number, salt: number) {
  let n = Math.imul(c + 1, 374761393) ^ Math.imul(r + 1, 668265263) ^ Math.imul(salt + 1, 1274126177)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return (n >>> 0) / 4294967296
}

function buildCells(): Cell[] {
  const cells: Cell[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = hash01(c, r, 1)
      const b = hash01(c, r, 2)
      const d = hash01(c, r, 3)
      const live: 0 | 1 | 2 = a > 0.94 ? 2 : a > 0.86 ? 1 : 0
      cells.push({
        c,
        r,
        x: c * CELL + CELL / 2,
        y: r * CELL + CELL / 2,
        grain: d,
        live,
        period: live === 2 ? 3.2 + b * 6.8 : 5.5 + b * 11,
        offset: d * 24,
        window: live === 2 ? 0.07 + b * 0.08 : 0.12 + b * 0.12,
      })
    }
  }
  return cells
}

function TriangleCellGrid({
  compact,
  motionOk,
  pointerClient,
}: {
  compact: boolean
  motionOk: boolean
  pointerClient: React.MutableRefObject<{ x: number; y: number } | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const cells = useMemo(buildCells, [])
  const valid = useMemo(() => new Set(cells.map((cell) => cellKey(cell.c, cell.r))), [cells])

  const clientToCell = useCallback(
    (clientX: number, clientY: number): { c: number; r: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      const x = ((clientX - rect.left) / rect.width) * VIEW_W
      const y = ((clientY - rect.top) / rect.height) * VIEW_H
      if (!inBounds(x, y)) return null
      const c = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL)))
      const r = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL)))
      if (!valid.has(cellKey(c, r))) return null
      return { c, r }
    },
    [valid],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let start: number | null = null
    const line = compact ? 0.7 : 0.85

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    const loop = (now: number) => {
      if (start == null) start = now
      const elapsed = (now - start) / 1000
      const pos = pointerClient.current
      const hover = pos ? clientToCell(pos.x, pos.y) : null

      const w = canvas.width
      const h = canvas.height
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.setTransform(w / VIEW_W, 0, 0, h / VIEW_H, 0, 0)

      for (const cell of cells) {
        let t = 0.78 + cell.grain * 0.16

        if (motionOk && cell.live) {
          const local = ((elapsed + cell.offset) % cell.period) / cell.period
          if (local < cell.window) {
            const envelope = Math.sin((local / cell.window) * Math.PI)
            t -= envelope * (cell.live === 2 ? 0.74 : 0.4)
          }
        } else if (!motionOk && cell.live === 2) {
          t -= 0.18
        }

        if (hover) {
          const d = Math.hypot(cell.c - hover.c, cell.r - hover.r)
          if (d < 5.5) {
            t -= ((1 - d / 5.5) ** 1.2) * 0.42
          }
        }

        ctx.fillStyle = rgb(samplePalette(clamp01(t)), 0.92)
        ctx.fillRect(cell.c * CELL, cell.r * CELL, CELL, CELL)
      }

      ctx.beginPath()
      for (let x = 0; x <= VIEW_W; x += CELL) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, VIEW_H)
      }
      for (let y = 0; y <= VIEW_H; y += CELL) {
        ctx.moveTo(0, y)
        ctx.lineTo(VIEW_W, y)
      }
      ctx.strokeStyle = "rgba(255,255,255,0.10)"
      ctx.lineWidth = line
      ctx.stroke()

      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()
    raf = requestAnimationFrame(loop)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [cells, clientToCell, compact, motionOk, pointerClient])

  return (
    <div ref={wrapRef} className="absolute inset-0 z-1">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}

export default function HeroBackground({ children }: HeroBackgroundProps) {
  const [compact, setCompact] = useState(true)
  const [motionOk, setMotionOk] = useState(true)
  const pointerClient = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mqDesktop = window.matchMedia("(min-width: 768px)")

    const sync = () => {
      setCompact(!mqDesktop.matches)
      setMotionOk(!mqMotion.matches)
    }

    sync()
    mqMotion.addEventListener("change", sync)
    mqDesktop.addEventListener("change", sync)
    return () => {
      mqMotion.removeEventListener("change", sync)
      mqDesktop.removeEventListener("change", sync)
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    pointerClient.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseLeave = useCallback(() => {
    pointerClient.current = null
  }, [])

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full min-h-svh overflow-hidden bg-[#08080A]"
    >
      <TriangleCellGrid compact={compact} motionOk={motionOk} pointerClient={pointerClient} />

      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 58% 52% at 50% 42%, rgba(8,8,10,0.82) 0%, rgba(8,8,10,0.46) 46%, transparent 74%)",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-20 bg-linear-to-t from-[#08080A] to-transparent sm:h-36" />

      <div className="relative z-10 pointer-events-none">{children}</div>
    </section>
  )
}
