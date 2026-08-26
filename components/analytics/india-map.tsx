'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { geoMercator, geoPath } from 'd3-geo'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import { STATE_VOLUME } from '@/lib/data'

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<FeatureCollection>)

const WIDTH = 460
const HEIGHT = 500

/** navy (#1e2a4a) → amber (#d97706) interpolation by intensity 0..1 */
function shade(t: number) {
  const from = [30, 42, 74]
  const to = [217, 119, 6]
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

export function IndiaMap() {
  const { data, isLoading } = useSWR('/india-states.geojson', fetcher, {
    revalidateOnFocus: false,
  })
  const [hover, setHover] = useState<{ name: string; value: number; x: number; y: number } | null>(null)

  const maxVolume = useMemo(() => Math.max(...Object.values(STATE_VOLUME), 1), [])

  const { paths, pathGen } = useMemo(() => {
    if (!data) return { paths: [], pathGen: null }
    const projection = geoMercator().fitExtent(
      [
        [12, 12],
        [WIDTH - 12, HEIGHT - 12],
      ],
      data as unknown as GeoJSON.GeoJSON,
    )
    const pg = geoPath(projection)
    const p = data.features.map((f: Feature<Geometry, { name: string }>) => ({
      name: f.properties.name,
      d: pg(f) ?? '',
      centroid: pg.centroid(f),
    }))
    return { paths: p, pathGen: pg }
  }, [data])

  if (isLoading || !pathGen) {
    return (
      <div className="flex h-[500px] items-center justify-center text-sm text-muted-foreground">
        Loading map…
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label="Choropleth map of India showing inspection volume by state"
      >
        {paths.map((p) => {
          const volume = STATE_VOLUME[p.name] ?? 0
          const t = volume / maxVolume
          const fill = volume > 0 ? shade(t) : 'var(--muted)'
          return (
            <path
              key={p.name}
              d={p.d}
              fill={fill}
              stroke="var(--card)"
              strokeWidth={0.5}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() =>
                setHover({ name: p.name, value: volume, x: p.centroid[0], y: p.centroid[1] })
              }
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: `${(hover.x / WIDTH) * 100}%`,
            top: `${(hover.y / HEIGHT) * 100}%`,
          }}
        >
          <p className="font-medium text-popover-foreground">{hover.name}</p>
          <p className="tabular-nums text-muted-foreground">
            {hover.value > 0 ? `${hover.value} inspections` : 'No data'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="text-xs text-muted-foreground">Low</span>
        <div
          className="h-2 w-40 rounded-full"
          style={{ background: `linear-gradient(to right, ${shade(0.05)}, ${shade(1)})` }}
        />
        <span className="text-xs text-muted-foreground">High</span>
      </div>
    </div>
  )
}
