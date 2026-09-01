import { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { NodeOverlay } from '@/shared/components/ui/NodeOverlay'
import { Card } from '@/shared/components/ui/Card'
import { cn } from '@/shared/lib/cn'

const ENGINE_REPO_URL = 'https://github.com/Minh1billion/tabular-manner'
const HUB_REPO_URL = 'https://github.com/Minh1billion/tabular-hub'
const DOCS_URL = 'https://minh1billion.github.io/tabular-manner/'

function GitHubMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={props.className} aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function StarIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden="true">
      <path d="M12 2.5l2.77 5.86 6.36.75-4.72 4.4 1.24 6.31L12 16.9l-5.65 2.92 1.24-6.31-4.72-4.4 6.36-.75L12 2.5Z" />
    </svg>
  )
}

function FlowNode({
  type,
  label,
  portIn = false,
  portOut = false,
  delay,
}: {
  type: string
  label: string
  portIn?: boolean
  portOut?: boolean
  delay: number
}) {
  return (
    <div
      className="relative shrink-0 w-[158px] bg-white border-2 border-black rounded-card px-3.5 py-3 shadow-[3px_3px_0_0_rgba(22,35,28,0.12)] animate-node-settle"
      style={{ animationDelay: `${delay}ms` }}
    >
      {portIn && (
        <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-muted border-2 border-[#f5f5ef]" />
      )}
      <div className="font-mono text-[9.5px] tracking-wide text-muted uppercase mb-1">{type}</div>
      <div className="text-[13px] font-medium text-ink leading-snug">{label}</div>
      {portOut && (
        <span className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-brand border-2 border-[#f5f5ef]" />
      )}
    </div>
  )
}

function FlowEdge({ delay }: { delay: number }) {
  return (
    <div className="h-[1.5px] w-8 min-w-8 bg-line animate-node-settle" style={{ animationDelay: `${delay}ms` }} />
  )
}

function StepCard({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="font-mono text-[13px] text-muted pt-0.5 shrink-0 w-6">{index}</div>
      <div>
        <h3 className="font-headline font-semibold text-[15px] text-ink mb-1">{title}</h3>
        <p className="text-[13.5px] text-slate leading-relaxed max-w-[46ch]">{description}</p>
      </div>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="hover:border-line">
      <h3 className="font-headline font-semibold text-[14.5px] text-ink mb-1.5">{title}</h3>
      <p className="text-[13px] text-slate leading-relaxed">{description}</p>
    </Card>
  )
}

function RepoCard({
  title,
  path,
  description,
  tags,
  href,
}: {
  title: string
  path: string
  description: string
  tags: string[]
  href: string
}) {
  return (
    <div className="bg-white border-2 border-black rounded-panel p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-mono text-[11px] text-muted mb-1">{path}</div>
          <h3 className="font-headline font-semibold text-[17px] text-ink">{title}</h3>
        </div>
        <GitHubMark className="w-5 h-5 text-ink shrink-0 mt-1" />
      </div>

      <p className="text-[13.5px] text-slate leading-relaxed mb-5 flex-1">{description}</p>

      <div className="flex items-center flex-wrap gap-1.5 mb-5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="font-mono text-[10px] tracking-wide px-2 py-1 rounded-full bg-cream-soft text-slate"
          >
            {tag}
          </span>
        ))}
      </div>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-deep text-brand-tint hover:bg-[#0e3325] transition-colors active:scale-[0.98]"
      >
        <StarIcon className="w-4 h-4" />
        Star on GitHub
      </a>
    </div>
  )
}

function Section({ id, className, children }: PropsWithChildren<{ id?: string; className?: string }>) {
  return (
    <section id={id} className={cn('relative mx-auto w-full max-w-6xl px-6', className)}>
      {children}
    </section>
  )
}

function Eyebrow({ children }: PropsWithChildren) {
  return <div className="font-mono text-[11px] text-muted tracking-wide uppercase mb-3.5">{children}</div>
}

export function HomePage() {
  const primaryHref = '/workspaces'
  const primaryLabel = 'Go to your workspaces'

  return (
    <div className="min-h-full bg-cream">
      {/* Hero */}
      <Section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        <GridPattern cellSize={28} className="opacity-70 [mask-image:radial-gradient(ellipse_60%_60%_at_20%_20%,black,transparent)]" />
        <NodeOverlay className="opacity-60" />

        <div className="relative grid lg:grid-cols-[1.05fr,1fr] gap-14 items-center">
          <div>
            <Eyebrow>Graph-based data engine</Eyebrow>
            <h1 className="font-headline font-semibold text-[2.6rem] leading-[1.08] text-ink mb-5 max-w-[16ch]">
              Design data pipelines by connecting steps, not writing scripts
            </h1>
            <p className="text-[15px] text-slate leading-relaxed max-w-[52ch] mb-8">
              Tabular Hub is the visual workspace for Tabular Manner, an open-source engine that
              runs tabular workflows as a graph. Drag steps onto a canvas, connect them into a
              flow, and run it on real data - filtering, joins, and aggregations included, no
              script to maintain.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-10">
              <Link
                to={primaryHref}
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors active:scale-[0.98]"
              >
                {primaryLabel}
              </Link>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-medium bg-white text-ink border-2 border-black hover:bg-cream-soft transition-colors active:scale-[0.98]"
              >
                Read the docs
              </a>
            </div>

            <div>
              <div className="font-mono text-[10.5px] text-muted tracking-wide uppercase mb-2.5">Built with</div>
              <div className="flex flex-wrap gap-1.5">
                {['Python', 'Polars', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL'].map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-[10.5px] px-2.5 py-1 rounded-full bg-white border border-line text-slate"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-panel border-2 border-black bg-white p-7 overflow-hidden">
              <GridPattern cellSize={20} className="opacity-50" />
              <div className="relative flex items-center flex-wrap gap-y-6 justify-center py-3">
                <FlowNode type="fetch_internal" label="Fetch Data" portOut delay={0} />
                <FlowEdge delay={80} />
                <FlowNode type="select" label="Select Columns" portIn portOut delay={120} />
                <FlowEdge delay={200} />
                <FlowNode type="fill_mean" label="Fill Missing (Mean)" portIn portOut delay={240} />
                <FlowEdge delay={320} />
                <FlowNode type="push_internal" label="Export Result" portIn delay={360} />
              </div>
              <div className="relative mt-5 pt-4 border-t border-line font-mono text-[10.5px] text-muted">
                basic_clean_pipeline.json
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section className="py-20 border-t border-line">
        <div className="grid lg:grid-cols-[0.7fr,1.3fr] gap-12">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="font-headline font-semibold text-[1.8rem] leading-tight text-ink max-w-[14ch]">
              From an empty canvas to a finished run
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-9">
            <StepCard
              index="01"
              title="Design"
              description="Bring in a dataset, then choose from built-in steps or your own custom ones and connect them into a flow on the canvas."
            />
            <StepCard
              index="02"
              title="Validate"
              description="Check the graph for configuration errors before anything runs, with problems pointing straight back to the node that caused them."
            />
            <StepCard
              index="03"
              title="Run"
              description="The workflow processes your data step by step in the background, so the canvas stays responsive while it works."
            />
            <StepCard
              index="04"
              title="Track"
              description="Watch progress node by node as it happens, stop a run partway through, and look back at any past run later."
            />
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section className="py-20 border-t border-line">
        <Eyebrow>What you get</Eyebrow>
        <h2 className="font-headline font-semibold text-[1.8rem] leading-tight text-ink max-w-[20ch] mb-10">
          A canvas, a real engine underneath it
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            title="Visual graph canvas"
            description="Drag nodes onto a canvas and wire them together - branch a flow into two paths or merge two sources with a join, no code required."
          />
          <FeatureCard
            title="Live run tracking"
            description="Every run streams its progress node by node over a live connection, and can be cancelled the moment it's no longer needed."
          />
          <FeatureCard
            title="Custom nodes"
            description="Define your own transform steps with sandboxed expressions - safe to run on shared infrastructure, no arbitrary code execution."
          />
          <FeatureCard
            title="Bring your own data"
            description="Import CSV, Parquet, or Arrow files, or read straight from S3 and Postgres, without changing how the rest of the flow is built."
          />
          <FeatureCard
            title="Built on Polars"
            description="Every step compiles into a single lazy query, so pipelines scale past what fits comfortably in memory."
          />
          <FeatureCard
            title="Isolated workspaces"
            description="Each workspace keeps its own datasets, custom nodes, and run history, separate from everything else in the hub."
          />
        </div>
      </Section>

      {/* Open source */}
      <Section className="py-20 border-t border-line">
        <div className="max-w-[60ch] mb-10">
          <Eyebrow>Open source, in two parts</Eyebrow>
          <h2 className="font-headline font-semibold text-[1.8rem] leading-tight text-ink mb-4">
            The engine and the app that runs it
          </h2>
          <p className="text-[14px] text-slate leading-relaxed">
            Tabular Manner is the graph-based execution engine underneath everything - it can run
            on its own from a JSON spec, with no server attached. Tabular Hub is this web app: the
            canvas, the accounts, and the background workers that run it for you. Both repos are
            MIT licensed, and a star helps other people looking for a low-code data tool find them.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <RepoCard
            title="Tabular Manner"
            path="Minh1billion / tabular-manner"
            description="The core engine: a hexagonal Python package that compiles a JSON graph of nodes into a Polars execution plan and streams progress as it runs."
            tags={['Python', 'Polars', 'Engine']}
            href={ENGINE_REPO_URL}
          />
          <RepoCard
            title="Tabular Hub"
            path="Minh1billion / tabular-hub"
            description="This app: a FastAPI server and React canvas that wrap the engine with accounts, workspaces, storage, and real-time run tracking."
            tags={['FastAPI', 'React', 'Server + Client']}
            href={HUB_REPO_URL}
          />
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-line">
        <Section className="py-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-3">
          <div className="flex items-center gap-[9px]">
            <img src={logo} alt="" className="w-6 h-6" />
            <span className="font-headline font-semibold text-[13.5px] text-ink">Tabular Hub</span>
            <span className="font-mono text-[11px] text-muted">MIT licensed</span>
          </div>

          <div className="flex-1" />

          <nav className="flex items-center gap-5 text-[13px] text-slate">
            <a href={DOCS_URL} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Documentation
            </a>
            <a href={ENGINE_REPO_URL} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Core engine
            </a>
            <a href={HUB_REPO_URL} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Web app
            </a>
            <Link to={primaryHref} className="hover:text-ink transition-colors">
              Workspaces
            </Link>
          </nav>
        </Section>
      </footer>
    </div>
  )
}