import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { NodeOverlay } from '@/shared/components/ui/NodeOverlay'
import { Badge } from '@/shared/components/ui/Badge'
import { GitHubIcon, StarIcon, ArrowRightIcon } from '@/shared/components/ui/icons'
import { CategoryIcon } from '@/modules/editor/nodes/category'
import { TechIcon } from './tech-icons'
import { useReveal } from '@/shared/hooks/useReveal'
import { cn } from '@/shared/lib/cn'

const ENGINE_REPO_URL = 'https://github.com/Minh1billion/tabular-manner'
const HUB_REPO_URL = 'https://github.com/Minh1billion/tabular-hub'
const DOCS_URL = 'https://minh1billion.github.io/tabular-manner/'

const STAGE_W = 640
const STAGE_H = 210
const NODE_W = 150
const NODE_H = 44

const FLOW = [
  { label: 'Fetch Data', category: 'IO', x: 0, y: 8 },
  { label: 'Select Columns', category: 'Transform', x: 163, y: 78 },
  { label: 'Fill Missing', category: 'Transform', x: 326, y: 28 },
  { label: 'Export Result', category: 'IO', x: 489, y: 118 },
] as const

function edgePath(from: (typeof FLOW)[number], to: (typeof FLOW)[number]) {
  const x1 = from.x + NODE_W
  const y1 = from.y + NODE_H / 2
  const x2 = to.x
  const y2 = to.y + NODE_H / 2
  const mid = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mid + 10} ${y1}, ${mid - 10} ${y2}, ${x2} ${y2}`
}

function FlowPreview() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const update = () => setScale(Math.min(1, host.clientWidth / STAGE_W))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="hm-win">
      <div className="hm-win-bar">
        <i />
        <i />
        <i />
        <span>basic_clean_pipeline.json</span>
      </div>
      <div className="hm-win-body">
        <div ref={hostRef} className="hm-stage-host" style={{ height: STAGE_H * scale }}>
          <div className="hm-stage" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
            <svg className="hm-edges" width={STAGE_W} height={STAGE_H} aria-hidden="true">
              {FLOW.slice(0, -1).map((node, index) => {
                const d = edgePath(node, FLOW[index + 1])
                return (
                  <g key={node.label}>
                    <path d={d} />
                    <circle r="4.5">
                      <animateMotion dur="2.6s" begin={`${index * 0.7}s`} repeatCount="indefinite" path={d} />
                    </circle>
                  </g>
                )
              })}
            </svg>
            {FLOW.map((node, index) => (
              <div
                key={node.label}
                className="pn hm-node"
                data-cat={node.category}
                style={{ left: node.x, top: node.y, ['--d' as string]: `${index * 110}ms` }}
              >
                {index > 0 && <span className="hm-port l" />}
                <span className="pn-icon cat-tile" data-cat={node.category}>
                  <CategoryIcon category={node.category} />
                </span>
                <div className="pn-title">
                  <span>{node.label}</span>
                </div>
                {index < FLOW.length - 1 && <span className="hm-port r" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="hm-win-foot">4 nodes · 3 connections · valid</div>
    </div>
  )
}

function Section({ className, children }: PropsWithChildren<{ className?: string }>) {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className={cn('hm-sec reveal', className)}>
      {children}
    </section>
  )
}

function Step({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="hm-step">
      <span className="hm-step-n">{index}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

function Feature({ category, icon, title, description }: { category: string; icon: ReactNode; title: string; description: string }) {
  return (
    <div className="hm-feat">
      <span className="cat-tile" data-cat={category}>
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function Repo({ title, path, description, tags, href }: { title: string; path: string; description: string; tags: string[]; href: string }) {
  return (
    <div className="hm-repo">
      <div className="hm-repo-top">
        <div>
          <div className="hm-repo-path">{path}</div>
          <h3>{title}</h3>
        </div>
        <span className="hm-repo-ico">
          <GitHubIcon />
        </span>
      </div>
      <p>{description}</p>
      <div className="hm-repo-tags">
        {tags.map((tag) => (
          <Badge key={tag} tone="personal">
            {tag}
          </Badge>
        ))}
      </div>
      <a href={href} target="_blank" rel="noreferrer" className="btn btn-deep btn-md">
        <StarIcon />
        Star on GitHub
      </a>
    </div>
  )
}

const FEATURE_ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function HomePage() {
  return (
    <div className="hm">
      <section className="hm-sec hm-hero">
        <GridPattern cellSize={28} className="hm-mask opacity-70" />
        <NodeOverlay className="opacity-60" />

        <div className="hm-hero-grid">
          <div className="rise">
            <span className="hm-eyebrow">
              <i />
              Graph-based data engine
            </span>
            <h1>
              Design data pipelines by <mark>connecting steps</mark>, not writing scripts
            </h1>
            <p className="hm-lead">
              Tabular Hub is the visual workspace for Tabular Manner, an open-source engine that runs tabular workflows as a graph. Drag steps onto a
              canvas, connect them into a flow, and run it on real data - filtering, joins, and aggregations included, no script to maintain.
            </p>

            <div className="hm-cta">
              <Link to="/workspaces" className="btn btn-primary btn-lg">
                Go to your workspaces
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <a href={DOCS_URL} target="_blank" rel="noreferrer" className="btn btn-outline btn-lg">
                Read the docs
              </a>
            </div>

            <div>
              <div className="kicker hm-tech-label">Built with</div>
              <div className="hm-tech">
                {['Python', 'Polars', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL'].map((tech) => (
                  <span key={tech}>
                    <TechIcon name={tech} />
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rise" style={{ animationDelay: '0.12s' }}>
            <FlowPreview />
          </div>
        </div>
      </section>

      <Section>
        <div className="hm-steps-grid">
          <div>
            <span className="kicker">How it works</span>
            <h2 className="hm-h2">From an empty canvas to a finished run</h2>
          </div>
          <div className="hm-steps">
            <Step index="01" title="Design" description="Bring in a dataset, then choose from built-in steps or your own custom ones and connect them into a flow on the canvas." />
            <Step index="02" title="Validate" description="Check the graph for configuration errors before anything runs, with problems pointing straight back to the node that caused them." />
            <Step index="03" title="Run" description="The workflow processes your data step by step in the background, so the canvas stays responsive while it works." />
            <Step index="04" title="Track" description="Watch progress node by node as it happens, stop a run partway through, and look back at any past run later." />
          </div>
        </div>
      </Section>

      <Section>
        <span className="kicker">What you get</span>
        <h2 className="hm-h2">A canvas, a real engine underneath it</h2>

        <div className="hm-feats">
          <Feature
            category="Transform"
            icon={
              <svg {...FEATURE_ICON}>
                <circle cx="6" cy="6" r="2.5" />
                <circle cx="18" cy="6" r="2.5" />
                <circle cx="12" cy="18" r="2.5" />
                <path d="M8.5 6h7M7 8l4 8M17 8l-4 8" />
              </svg>
            }
            title="Visual graph canvas"
            description="Drag nodes onto a canvas and wire them together - branch a flow into two paths or merge two sources with a join, no code required."
          />
          <Feature
            category="IO"
            icon={
              <svg {...FEATURE_ICON}>
                <path d="M3 12h4l3-8 4 16 3-8h4" />
              </svg>
            }
            title="Live run tracking"
            description="Every run streams its progress node by node over a live connection, and can be cancelled the moment it's no longer needed."
          />
          <Feature
            category="Custom"
            icon={
              <svg {...FEATURE_ICON}>
                <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
              </svg>
            }
            title="Custom nodes"
            description="Define your own transform steps with sandboxed expressions - safe to run on shared infrastructure, no arbitrary code execution."
          />
          <Feature
            category="IO"
            icon={
              <svg {...FEATURE_ICON}>
                <ellipse cx="12" cy="6" rx="8" ry="3" />
                <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
              </svg>
            }
            title="Bring your own data"
            description="Import CSV, Parquet, or Arrow files, or read straight from S3 and Postgres, without changing how the rest of the flow is built."
          />
          <Feature
            category="Merge"
            icon={
              <svg {...FEATURE_ICON}>
                <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
              </svg>
            }
            title="Built on Polars"
            description="Every step compiles into a single lazy query, so pipelines scale past what fits comfortably in memory."
          />
          <Feature
            category="Transform"
            icon={
              <svg {...FEATURE_ICON}>
                <rect x="3" y="3" width="8" height="8" rx="2" />
                <rect x="13" y="3" width="8" height="8" rx="2" />
                <rect x="3" y="13" width="8" height="8" rx="2" />
                <rect x="13" y="13" width="8" height="8" rx="2" />
              </svg>
            }
            title="Isolated workspaces"
            description="Each workspace keeps its own datasets, custom nodes, and run history, separate from everything else in the hub."
          />
        </div>
      </Section>

      <Section>
        <div className="hm-os">
          <span className="kicker">Open source, in two parts</span>
          <h2 className="hm-h2" style={{ maxWidth: '28ch' }}>
            The engine and the app that runs it
          </h2>
          <p>
            Tabular Manner is the graph-based execution engine underneath everything - it can run on its own from a JSON spec, with no server attached.
            Tabular Hub is this web app: the canvas, the accounts, and the background workers that run it for you. Both repos are MIT licensed, and a star
            helps other people looking for a low-code data tool find them.
          </p>
        </div>

        <div className="hm-repos">
          <Repo
            title="Tabular Manner"
            path="Minh1billion / tabular-manner"
            description="The core engine: a hexagonal Python package that compiles a JSON graph of nodes into a Polars execution plan and streams progress as it runs."
            tags={['Python', 'Polars', 'Engine']}
            href={ENGINE_REPO_URL}
          />
          <Repo
            title="Tabular Hub"
            path="Minh1billion / tabular-hub"
            description="This app: a FastAPI server and React canvas that wrap the engine with accounts, workspaces, storage, and real-time run tracking."
            tags={['FastAPI', 'React', 'Server + Client']}
            href={HUB_REPO_URL}
          />
        </div>
      </Section>

      <footer className="hm-foot">
        <div className="hm-foot-in">
          <div className="hm-foot-brand">
            <img src={logo} alt="" />
            <strong>Tabular Hub</strong>
            <small>MIT licensed</small>
          </div>
          <nav>
            <a href={DOCS_URL} target="_blank" rel="noreferrer">
              Documentation
            </a>
            <a href={ENGINE_REPO_URL} target="_blank" rel="noreferrer">
              Core engine
            </a>
            <a href={HUB_REPO_URL} target="_blank" rel="noreferrer">
              Web app
            </a>
            <Link to="/workspaces">Workspaces</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
