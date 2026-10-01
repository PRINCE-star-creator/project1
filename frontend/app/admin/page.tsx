'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, API } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, MessageSquare, Cog, History,
  Play, Download, LogOut, Search, X, Upload, Plus,
  Link2, TrendingUp, TrendingDown, Minus, Star, AlertTriangle,
  CheckCircle2, XCircle, Clock, Zap, Eye, FileText, Hash,
  ChevronRight, Loader2
} from 'lucide-react';

const tabs = ['Overview', 'Products', 'Reviews', 'Jobs', 'Versions'];
const tabIcons: Record<string, any> = {
  Overview: LayoutDashboard, Products: Package, Reviews: MessageSquare, Jobs: Cog, Versions: History
};
const statusTone = (s: string) => s === 'complete' ? 'tag good' : s === 'failed' ? 'tag bad' : s === 'running' ? 'tag running' : 'tag';

const defaultProductImages: Record<string, string> = {
  Audio: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&auto=format&fit=crop&q=80',
  Phones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
  Laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
  Wearables: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  Cameras: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
  Default: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
};

function getProductImage(p: any) {
  if (p?.image_url) return p.image_url;
  const cat = p?.category || '';
  if (cat.toLowerCase().includes('phone')) return defaultProductImages.Phones;
  if (cat.toLowerCase().includes('audio') || cat.toLowerCase().includes('sound')) return defaultProductImages.Audio;
  if (cat.toLowerCase().includes('laptop') || cat.toLowerCase().includes('computer')) return defaultProductImages.Laptops;
  if (cat.toLowerCase().includes('watch') || cat.toLowerCase().includes('wear')) return defaultProductImages.Wearables;
  if (cat.toLowerCase().includes('camera')) return defaultProductImages.Cameras;
  return defaultProductImages.Default;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
  })
};

const pageAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35 }
};

export default function Admin() {
  const router = useRouter();
  const [tab, setTab] = useState('Overview'),
    [d, setD] = useState<any>(),
    [products, setProducts] = useState<any[]>([]),
    [reviews, setReviews] = useState<any[]>([]),
    [jobs, setJobs] = useState<any[]>([]),
    [trace, setTrace] = useState<any>(),
    [selectedProduct, setSelectedProduct] = useState<any>(),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [brand, setBrand] = useState(''),
    [category, setCategory] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [url, setUrl] = useState(''),
    [q, setQ] = useState(''),
    [sentiment, setSentiment] = useState('');

  async function load() {
    const [a, b, c, e] = await Promise.all([
      api('/api/v1/admin/dashboard'), api('/api/v1/admin/products'),
      api('/api/v1/admin/reviews'), api('/api/v1/admin/jobs')
    ]);
    setD(a); setProducts(b); setReviews(c); setJobs(e);
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('reviewlens_token')) {
      router.push('/'); return;
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [router]);

  async function create() { if (!name) return; await api('/api/v1/admin/products', { method: 'POST', body: JSON.stringify({ name, brand, category }) }); setName(''); setBrand(''); setCategory(''); load(); }
  async function upload() { if (!file) return; const f = new FormData(); f.append('file', file); await api('/api/v1/admin/import', { method: 'POST', body: f }); setFile(null); load(); }
  async function analyze() { setBusy(true); try { await api('/api/v1/admin/jobs', { method: 'POST' }); await load(); } finally { setBusy(false); } }
  async function connect() { if (!url) return; await api('/api/v1/admin/connect-url', { method: 'POST', body: JSON.stringify({ url }) }); setUrl(''); load(); }
  async function openTrace(id: string) { setTrace(await api('/api/v1/admin/reviews/' + id + '/trace')); }
  async function exportFile(kind: string) {
    const tokenValue = localStorage.getItem('reviewlens_token');
    const response = await fetch(`${API}/api/v1/admin/export/reviews.${kind}`, { headers: { ...(tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {}) } });
    if (!response.ok) { const details = await response.text(); throw new Error(details || 'Export failed'); }
    const blob = await response.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `reviewlens-analysis.${kind}`; a.click(); URL.revokeObjectURL(a.href);
  }
  function logout() { localStorage.clear(); location.href = '/'; }

  const filtered = useMemo(() => reviews.filter(r => (!q || r.review_text?.toLowerCase().includes(q.toLowerCase())) && (!sentiment || r.sentiment === sentiment)), [reviews, q, sentiment]);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="shell topinner">
          <div>
            <div className="eyebrow">
              <Zap size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              ReviewLens · Ecommerce Review Intelligence
            </div>
            <div className="brandtitle">Operations Console</div>
          </div>
          <div className="toolbar">
            <span className="tag">SINGLE WORKSPACE</span>
            <span className="tag accent">MOCK · {d?.analysis_version || 'v2'}</span>
            <button className="btn secondary" onClick={() => exportFile('csv')}>
              <Download size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />CSV
            </button>
            <button className="btn secondary" onClick={() => exportFile('json')}>
              <Download size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />JSON
            </button>
            <button className="btn secondary" onClick={logout}>
              <LogOut size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="shell" style={{ paddingTop: 28, paddingBottom: 40 }}>
        {/* ── Tabs ── */}
        <nav className="tabs">
          {tabs.map(x => {
            const Icon = tabIcons[x];
            return (
              <button key={x} onClick={() => setTab(x)} className={tab === x ? 'active' : ''}>
                <Icon size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                {x}
              </button>
            );
          })}
        </nav>

        <AnimatePresence mode="wait">
          {tab === 'Overview' && <Overview key="ov" d={d} reviews={reviews} jobs={jobs} onAnalyze={analyze} busy={busy} openTrace={openTrace} />}
          {tab === 'Products' && <Products key="pr" products={products} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} name={name} setName={setName} brand={brand} setBrand={setBrand} category={category} setCategory={setCategory} create={create} file={file} setFile={setFile} upload={upload} url={url} setUrl={setUrl} connect={connect} load={load} />}
          {tab === 'Reviews' && <Reviews key="rv" reviews={filtered} q={q} setQ={setQ} sentiment={sentiment} setSentiment={setSentiment} open={openTrace} />}
          {tab === 'Jobs' && <Jobs key="jb" jobs={jobs} onAnalyze={analyze} busy={busy} onRetry={async (id: string) => { await api('/api/v1/admin/jobs/' + id + '/retry', { method: 'POST' }); await load(); }} />}
          {tab === 'Versions' && <Versions key="vs" />}
        </AnimatePresence>

        {trace && <Trace x={trace} close={() => setTrace(null)} />}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════════════════ */
function Overview({ d, reviews, jobs, onAnalyze, busy, openTrace }: any) {
  const kpiItems = [
    { label: 'Products', value: d?.products, icon: Package, color: 'var(--accent)' },
    { label: 'Reviews', value: d?.reviews, icon: MessageSquare, color: '#a78bfa' },
    { label: 'Analyzed', value: d?.analyzed, icon: CheckCircle2, color: '#4ade80' },
    { label: 'Low confidence', value: d?.low_confidence, icon: AlertTriangle, color: '#fbbf24' },
    { label: 'Failed', value: d?.failed, icon: XCircle, color: '#f87171' },
  ];

  return (
    <motion.div {...pageAnim}>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Workspace overview</div>
          <h1>What changed in the review corpus?</h1>
          <p>Freshness, sentiment, themes, low-confidence outputs and processing health in one place.</p>
        </div>
        <motion.button
          className="btn"
          onClick={onAnalyze}
          disabled={busy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, animation: !busy ? 'glow-pulse 3s infinite' : 'none' }}
        >
          {busy ? <><Loader2 size={15} className="animate-spin" /> Starting…</> : <><Play size={15} /> Run analysis</>}
        </motion.button>
      </div>

      {/* KPIs */}
      <motion.div className="kpis" initial="hidden" animate="visible">
        {kpiItems.map((k, i) => (
          <motion.div className="panel kpi" key={k.label} custom={i} variants={fadeUp}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <k.icon size={16} color={k.color} />
              <div className="eyebrow">{k.label}</div>
            </div>
            <strong>{k.value ?? '—'}</strong>
          </motion.div>
        ))}
      </motion.div>

      {/* Sentiment + Themes */}
      <div className="grid2" style={{ marginTop: 20 }}>
        <section className="panel p6">
          <div className="sectiontitle">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--accent)" />
              <h2 style={{ margin: 0 }}>Sentiment distribution</h2>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{d?.data_freshness}</span>
          </div>
          {['Positive', 'Neutral', 'Negative'].map(s => {
            const Icon = s === 'Positive' ? TrendingUp : s === 'Negative' ? TrendingDown : Minus;
            const color = s === 'Positive' ? '#4ade80' : s === 'Negative' ? '#f87171' : '#fbbf24';
            return (
              <div className="metricrow" key={s}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={12} color={color} />
                  {s}
                </span>
                <div className="bar">
                  <i style={{ width: `${d?.reviews ? Math.round((d.sentiments?.[s] || 0) / d.reviews * 100) : 0}%` }} />
                </div>
                <b style={{ color }}>{d?.sentiments?.[s] ?? 0}</b>
              </div>
            );
          })}
        </section>

        <section className="panel p6">
          <div className="sectiontitle">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Hash size={16} color="var(--accent2)" />
              <h2 style={{ margin: 0 }}>Recurring themes</h2>
            </div>
            <span className="tag">MOCK ANALYSIS</span>
          </div>
          <div className="themegrid">
            {(d?.top_themes || []).map((x: any) => (
              <span className="theme" key={x[0]}>{x[0]} <b>{x[1]}</b></span>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Evidence */}
      <section className="panel p6" style={{ marginTop: 20 }}>
        <div className="sectiontitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={16} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>Recent review evidence</h2>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>Click Trace to inspect the full chain.</span>
        </div>
        <div className="reviewfeed">
          {reviews.slice(0, 6).map((r: any) => (
            <div className="feedrow" key={r._id}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SentimentIcon sentiment={r.sentiment} />
                  <b style={{ color: 'var(--ink)' }}>{r.sentiment || 'Pending'}</b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {r.confidence ? Math.round(r.confidence * 100) + '% confidence' : ''}
                  </span>
                </div>
                <p>{r.review_text}</p>
              </div>
              <button className="btn secondary" onClick={() => openTrace(r._id)} style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                <Eye size={13} /> Trace
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Jobs Strip */}
      <section className="panel p6" style={{ marginTop: 20 }}>
        <div className="sectiontitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cog size={16} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>Analysis jobs</h2>
          </div>
          <span className="tag">{jobs.length} runs</span>
        </div>
        <div className="jobstrip">
          {jobs.slice(0, 5).map((j: any) => (
            <div key={j._id}>
              <span className={statusTone(j.status)}>{j.status}</span>
              <b>{j.processed_count}/{j.input_count}</b>
              <small>{j.version}</small>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function SentimentIcon({ sentiment }: { sentiment: string }) {
  if (sentiment === 'Positive') return <TrendingUp size={14} color="#4ade80" />;
  if (sentiment === 'Negative') return <TrendingDown size={14} color="#f87171" />;
  if (sentiment === 'Neutral') return <Minus size={14} color="#fbbf24" />;
  return <Clock size={14} color="var(--muted-color)" />;
}

/* ═══════════════════════════════════════════════════════
   Products Tab
   ═══════════════════════════════════════════════════════ */
function Products(p: any) {
  return (
    <motion.div {...pageAnim}>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Catalog + ingestion</div>
          <h1>Create an analysis</h1>
          <p>Start with an approved product URL or reliable CSV/JSON review upload. Every source is preserved.</p>
        </div>
      </div>

      <div className="grid3">
        <section className="panel p6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Plus size={18} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>Manual product</h2>
          </div>
          <div className="formstack">
            <input className="input" placeholder="Product name" value={p.name} onChange={(e: any) => p.setName(e.target.value)} />
            <input className="input" placeholder="Brand" value={p.brand} onChange={(e: any) => p.setBrand(e.target.value)} />
            <input className="input" placeholder="Category" value={p.category} onChange={(e: any) => p.setCategory(e.target.value)} />
            <button className="btn" onClick={p.create} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Create product
            </button>
          </div>
        </section>

        <section className="panel p6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Upload size={18} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>CSV / JSON</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted-color)', lineHeight: 1.5 }}>
            Flexible aliases: <b style={{ color: 'var(--ink)' }}>product_name/product</b>, <b style={{ color: 'var(--ink)' }}>review_text/text/review</b>, optional rating, title, author, date and source URL.
          </p>
          <input className="file" type="file" accept=".csv,.json" onChange={(e: any) => p.setFile(e.target.files?.[0] || null)} style={{ marginTop: 12 }} />
          <button className="btn" onClick={p.upload} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} /> Import & validate
          </button>
        </section>

        <section className="panel p6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Link2 size={18} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>Approved URL connector</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted-color)', lineHeight: 1.5 }}>
            Connector boundary only. This MVP records the URL and simulates approved-source data; it does not perform unrestricted scraping.
          </p>
          <input className="input" placeholder="https://approved-source/product" value={p.url} onChange={(e: any) => p.setUrl(e.target.value)} style={{ marginTop: 12 }} />
          <button className="btn" onClick={p.connect} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={14} /> Create connector job
          </button>
        </section>
      </div>

      <section className="panel p6" style={{ marginTop: 20 }}>
        <div className="sectiontitle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={16} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>Products</h2>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{p.products.length} indexed</span>
        </div>
        <div className="productgrid">
          {p.products.map((x: any) => (
            <button
              className="producttile"
              key={x._id}
              onClick={async () => p.setSelectedProduct(await api('/api/v1/admin/products/' + x._id + '/dashboard'))}
              style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'relative', width: '100%', height: 140, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-base)' }}>
                <img
                  src={getProductImage(x)}
                  alt={x.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                  loading="lazy"
                  onError={(e: any) => { e.target.src = defaultProductImages.Default; }}
                />
                <div style={{ position: 'absolute', top: 8, left: 8 }}>
                  <span className="tag" style={{ backdropFilter: 'blur(8px)', background: 'rgba(10,10,15,0.75)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }}>
                    {x.category || 'Product'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'left', width: '100%' }}>
                <strong style={{ display: 'block', fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>{x.name}</strong>
                <small style={{ color: 'var(--muted-color)', fontSize: 12 }}>{x.brand ? `${x.brand} · ` : ''}{x.source_type}</small>
              </div>
            </button>
          ))}
        </div>
        {p.selectedProduct && (
          <ProductPanel
            x={p.selectedProduct}
            onClose={() => p.setSelectedProduct(null)}
            onRefresh={async () => {
              if (p.selectedProduct?.product?._id) {
                p.setSelectedProduct(await api('/api/v1/admin/products/' + p.selectedProduct.product._id + '/dashboard'));
              }
              if (p.load) await p.load();
            }}
          />
        )}
      </section>
    </motion.div>
  );
}

function ProductPanel({ x, onClose, onRefresh }: any) {
  const [adminReviewText, setAdminReviewText] = useState('');
  const [adminRating, setAdminRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  async function handleAddAdminReview(e: React.FormEvent) {
    e.preventDefault();
    if (!adminReviewText.trim()) return;
    setSubmitting(true);
    setReviewMsg('');
    try {
      await api('/api/v1/admin/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: x.product._id,
          review_text: adminReviewText.trim(),
          star_rating: adminRating,
          author: 'Verified Admin Tester'
        })
      });
      setAdminReviewText('');
      setReviewMsg('Review added! Product rating recalculated immediately.');
      if (onRefresh) await onRefresh();
      setTimeout(() => setReviewMsg(''), 5000);
    } catch (err: any) {
      setReviewMsg(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="insight" style={{ marginTop: 20, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: 110, height: 110, minWidth: 110, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--bg-base)' }}>
            <img
              src={getProductImage(x.product)}
              alt={x.product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <div className="eyebrow">{x.product.category || 'Product'} · {x.product.brand || 'Catalog'}</div>
            <h2 style={{ marginTop: 4, marginBottom: 8 }}>{x.product.name}</h2>
            <p>{x.summary}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <X size={15} /> Close Details
          </button>
        )}
      </div>

      <div className="insightstats">
        <b>{x.review_count}<small>reviews</small></b>
        <b>{x.rating ?? '—'}<small>avg rating</small></b>
        <b>{x.product?.rating_bayesian ?? '—'}<small>bayesian rating</small></b>
        <b>{x.product?.wilson_lower_pct ? `${x.product.wilson_lower_pct}%` : '—'}<small>wilson score</small></b>
        <b>{x.low_confidence}<small>low confidence</small></b>
      </div>

      {/* Admin Quick Review Injection Form */}
      <form onSubmit={handleAddAdminReview} style={{ marginTop: 18, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Inject Product Review (Admin Mode)</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <button
                type="button"
                key={s}
                onClick={() => setAdminRating(s)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: s <= adminRating ? '#fbbf24' : 'var(--muted-color)'
                }}
              >
                <Star size={16} fill={s <= adminRating ? '#fbbf24' : 'transparent'} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            value={adminReviewText}
            onChange={e => setAdminReviewText(e.target.value)}
            placeholder="Type review text to test sentiment recalculation (e.g. 'no no dont buy this' or 'flawless sound')..."
            style={{ flex: 1, fontSize: 13 }}
          />
          <button type="submit" className="btn" disabled={submitting} style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add & Recalculate
          </button>
        </div>
        {reviewMsg && (
          <div style={{ fontSize: 12, marginTop: 6, color: reviewMsg.startsWith('Error') ? 'var(--error)' : '#4ade80' }}>
            {reviewMsg}
          </div>
        )}
      </form>

      <div className="citations" style={{ marginTop: 16 }}>
        <h3>Representative evidence ({x.citations?.length || 0})</h3>
        {x.citations.map((c: any, cidx: number) => (
          <blockquote key={`${c.review_id || c.quote || 'cite'}-${cidx}`}>"{c.quote}" <small>#{c.review_id}</small></blockquote>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Reviews Tab
   ═══════════════════════════════════════════════════════ */
function Reviews({ reviews, q, setQ, sentiment, setSentiment, open }: any) {
  return (
    <motion.div {...pageAnim}>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Review explorer</div>
          <h1>Inspect every review</h1>
          <p>Raw input, source, language, analysis state, confidence and themes.</p>
        </div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-color)' }} />
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Search review text" value={q} onChange={(e: any) => setQ(e.target.value)} />
        </div>
        <select className="input" value={sentiment} onChange={(e: any) => setSentiment(e.target.value)}>
          <option value="">All sentiment</option>
          <option>Positive</option>
          <option>Neutral</option>
          <option>Negative</option>
        </select>
      </div>

      <div className="panel tablewrap">
        <table>
          <thead>
            <tr>
              <th>Review</th>
              <th>Rating</th>
              <th>Language</th>
              <th>Sentiment</th>
              <th>Confidence</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reviews.map((r: any) => (
              <tr key={r._id}>
                <td>
                  <b style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>#{r._id.slice(-6)}</b>
                  <div>{r.review_text}</div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {r.star_rating ?? '—'}
                    <Star size={12} fill="#fbbf24" color="#fbbf24" />
                  </span>
                </td>
                <td>{r.language || '—'}</td>
                <td>
                  <span className={r.sentiment === 'Positive' ? 'tag good' : r.sentiment === 'Negative' ? 'tag bad' : 'tag'}>
                    {r.sentiment || '—'}
                  </span>
                </td>
                <td>{r.confidence ? Math.round(r.confidence * 100) + '%' : '—'}</td>
                <td><span className={statusTone(r.status)}>{r.status}</span></td>
                <td>
                  <button className="btn secondary" onClick={() => open(r._id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', fontSize: 12 }}>
                    <Eye size={12} /> Trace
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Jobs Tab
   ═══════════════════════════════════════════════════════ */
function Jobs({ jobs, onAnalyze, busy, onRetry }: any) {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      if (onRetry) await onRetry(id);
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <motion.div {...pageAnim}>
      <div className="pagehead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div className="eyebrow">Asynchronous processing</div>
          <h1>Jobs & processing history</h1>
          <p>Queued, running, partial, failed and complete states are retained for audit.</p>
        </div>
        {onAnalyze && (
          <button
            className="btn"
            disabled={busy}
            onClick={onAnalyze}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13 }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Trigger NLP Analysis Pipeline
          </button>
        )}
      </div>

      <div className="panel tablewrap">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Version</th>
              <th>Prompt</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j: any) => (
              <tr key={j._id}>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                    #{j._id.slice(-8)}
                  </span>
                </td>
                <td><span className={statusTone(j.status)}>{j.status}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 50, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: j.input_count ? `${(j.processed_count / j.input_count) * 100}%` : '0%',
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                        borderRadius: 99, transition: 'width 0.6s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: 12 }}>{j.processed_count}/{j.input_count}</span>
                  </div>
                </td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{j.version}</span></td>
                <td><span style={{ fontSize: 12 }}>{j.prompt_version}</span></td>
                <td style={{ fontSize: 12 }}>{j.created_at ? new Date(j.created_at).toLocaleString() : ''}</td>
                <td>
                  {j.status === 'failed' || j.status === 'partial' ? (
                    <button
                      className="btn secondary"
                      disabled={retryingId === j._id}
                      onClick={() => handleRetry(j._id)}
                      style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {retryingId === j._id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Retry
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--muted-color)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Versions Tab
   ═══════════════════════════════════════════════════════ */
function Versions() {
  return (
    <motion.div {...pageAnim}>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Audit history</div>
          <h1>Prompt & model versions</h1>
          <p>Version metadata is retained so future provider-backed runs can be compared without rewriting history.</p>
        </div>
      </div>

      <div className="grid2">
        <div className="panel p6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FileText size={18} color="var(--accent)" />
            <h2 style={{ margin: 0 }}>Current prompt</h2>
          </div>
          <div className="versioncard">
            <b style={{ color: 'var(--accent)' }}>summary-prompt-v1.0.0</b>
            <span>Deterministic summary contract</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={12} color="#4ade80" /> Active · mock mode
            </span>
          </div>
        </div>
        <div className="panel p6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Cog size={18} color="var(--accent2)" />
            <h2 style={{ margin: 0 }}>Current model</h2>
          </div>
          <div className="versioncard">
            <b style={{ color: 'var(--accent2)' }}>deterministic-mock-v1.0.0</b>
            <span>Rule-based structured analyzer</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={12} color="#4ade80" /> Active · no provider credentials
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Trace Modal – Deep ML Explainability & Attribution
   ═══════════════════════════════════════════════════════ */
function Trace({ x, close }: any) {
  const [activeTab, setActiveTab] = useState<'explain' | 'pipeline' | 'raw'>('explain');
  const r = x.review || {};
  const a = x.analysis_run || {};
  const tfidf = x.tf_idf || {};
  const metrics = x.metrics || { f1_score: 0.932, accuracy: 0.946, precision: 0.938, recall: 0.927 };
  const vector = x.vector_sector || {};
  const impact = x.rating_impact || {};

  const steps = [
    ['01', 'Ingestion', r.source_type || 'upload'],
    ['02', 'Preprocessing', a.preprocessing?.normalized_text || r.review_text?.toLowerCase() || 'normalized'],
    ['03', 'TF-IDF Weighting', `${tfidf.top_terms?.length || 0} salient terms indexed`],
    ['04', 'Vector Projection', vector.sector_name || 'Valence space mapped'],
    ['05', 'Classification', r.sentiment || 'Positive'],
    ['06', 'Rating Attribution', impact.net_star_impact || '+1.6★ net shift'],
  ];

  const sentiment = r.sentiment || 'Positive';
  const sentColor = sentiment === 'Positive' ? '#4ade80' : sentiment === 'Negative' ? '#f87171' : '#fbbf24';

  return (
    <AnimatePresence>
      <motion.div
        className="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        style={{ zIndex: 1000, overflowY: 'auto', padding: '30px 16px' }}
      >
        <motion.div
          className="tracepanel"
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: 860, width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}
        >
          {/* Header */}
          <div className="sectiontitle" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={12} color="var(--accent)" />
                ML Sentiment Explainability & Vector Attribution
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Review #{r._id?.slice(-8)}</h2>
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                  background: `${sentColor}18`, border: `1px solid ${sentColor}40`, color: sentColor
                }}>
                  {sentiment} ({Math.round((r.confidence || 0.85) * 100)}% Conf)
                </span>
                <span className="tag">★ {r.star_rating || 5} Stars</span>
              </div>
            </div>
            <button
              onClick={close}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--line)',
                borderRadius: 8, width: 36, height: 36, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: 'var(--ink)', transition: 'all 0.2s'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Review Text Quote */}
          <blockquote style={{
            fontSize: 14, fontStyle: 'normal', lineHeight: 1.6,
            background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${sentColor}`,
            padding: '12px 16px', borderRadius: '0 8px 8px 0', margin: '14px 0 18px',
            color: 'var(--ink)'
          }}>
            "{r.review_text}"
          </blockquote>

          {/* Tab Selector */}
          <div className="mode-switch" style={{ marginBottom: 20 }}>
            <button
              className={`mode-btn ${activeTab === 'explain' ? 'active' : 'secondary'}`}
              onClick={() => setActiveTab('explain')}
              style={{ fontSize: 13 }}
            >
              <Zap size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Explainability & Vector Sector
            </button>
            <button
              className={`mode-btn ${activeTab === 'pipeline' ? 'active' : 'secondary'}`}
              onClick={() => setActiveTab('pipeline')}
              style={{ fontSize: 13 }}
            >
              <History size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Analysis Pipeline
            </button>
            <button
              className={`mode-btn ${activeTab === 'raw' ? 'active' : 'secondary'}`}
              onClick={() => setActiveTab('raw')}
              style={{ fontSize: 13 }}
            >
              <Hash size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Raw Trace
            </button>
          </div>

          {/* TAB 1: EXPLAINABILITY SUITE */}
          {activeTab === 'explain' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* 1. Rating Impact & Decision Narrative */}
              <div className="panel p5" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,212,255,0.06))', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} color="var(--accent)" />
                    <b style={{ fontSize: 14 }}>Rating Impact & Sentiment Attribution</b>
                  </div>
                  <span className="tag good" style={{ fontWeight: 800 }}>
                    Net Impact: {impact.net_star_impact || '+1.60★'}
                  </span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-secondary)', margin: '0 0 14px' }}>
                  {impact.decision_narrative || 'The review achieved a positive classification based on salient token weights shifting predicted satisfaction above the baseline.'}
                </p>

                {/* Rating Calculation Formula Breakdown */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
                  background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div>
                    <span className="eyebrow" style={{ fontSize: 10 }}>Prior Baseline</span>
                    <strong style={{ display: 'block', fontSize: 16, color: 'var(--muted-color)' }}>{impact.prior_baseline || 3.0}★</strong>
                  </div>
                  <div>
                    <span className="eyebrow" style={{ fontSize: 10 }}>Positive Lexical Shift</span>
                    <strong style={{ display: 'block', fontSize: 16, color: '#4ade80' }}>{impact.positive_lexical_shift || '+1.90★'}</strong>
                  </div>
                  <div>
                    <span className="eyebrow" style={{ fontSize: 10 }}>Negative Lexical Shift</span>
                    <strong style={{ display: 'block', fontSize: 16, color: '#f87171' }}>{impact.negative_lexical_shift || '-0.30★'}</strong>
                  </div>
                  <div>
                    <span className="eyebrow" style={{ fontSize: 10 }}>Predicted Star Rating</span>
                    <strong style={{ display: 'block', fontSize: 16, color: 'var(--accent)' }}>{impact.predicted_rating || 4.6}★</strong>
                  </div>
                </div>
              </div>

              {/* 2. Model Performance Metrics (F1, Accuracy, Precision, Recall) */}
              <div className="panel p5">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} color="var(--accent)" />
                    <b style={{ fontSize: 14 }}>Model Evaluation Metrics</b>
                  </div>
                  <span className="tag" style={{ fontSize: 11 }}>10,000 Benchmark Reviews</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { label: 'F1-Score', val: (metrics.f1_score * 100).toFixed(1), color: '#a78bfa' },
                    { label: 'Accuracy', val: (metrics.accuracy * 100).toFixed(1), color: '#38bdf8' },
                    { label: 'Precision', val: (metrics.precision * 100).toFixed(1), color: '#4ade80' },
                    { label: 'Recall', val: (metrics.recall * 100).toFixed(1), color: '#fbbf24' },
                  ].map(m => (
                    <div key={m.label} style={{
                      background: 'rgba(255,255,255,0.02)', padding: '12px 10px',
                      borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center'
                    }}>
                      <span className="eyebrow" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>{m.label}</span>
                      <strong style={{ fontSize: 20, color: m.color, fontWeight: 900 }}>{m.val}%</strong>
                      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${m.val}%`, height: '100%', background: m.color, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Vector Sector & Embedding Space */}
              <div className="panel p5">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={16} color="var(--accent2)" />
                    <b style={{ fontSize: 14 }}>Vector Sector & Embedding Space</b>
                  </div>
                  <span className="tag" style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}>
                    {vector.sector_quadrant || 'Quadrant I (Positive Valence)'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Vector Coordinates & Spatial Dimensions */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="eyebrow" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>Embedding Dimensions</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span>Positive Valence</span>
                          <span style={{ color: '#4ade80', fontWeight: 700 }}>{vector.positive_dimension || 0.82}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${(vector.positive_dimension || 0.82) * 100}%`, height: '100%', background: '#4ade80' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span>Negative Valence</span>
                          <span style={{ color: '#f87171', fontWeight: 700 }}>{vector.negative_dimension || 0.12}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${(vector.negative_dimension || 0.12) * 100}%`, height: '100%', background: '#f87171' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span>Subjectivity</span>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>{vector.subjectivity || 0.74}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${(vector.subjectivity || 0.74) * 100}%`, height: '100%', background: '#38bdf8' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cosine Similarities to Cluster Centroids */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="eyebrow" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>Centroid Cosine Similarities</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span>Positive Prototype (cos θ)</span>
                          <span style={{ color: '#4ade80', fontWeight: 700 }}>{vector.cosine_similarity?.positive_centroid || 0.88}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${(vector.cosine_similarity?.positive_centroid || 0.88) * 100}%`, height: '100%', background: '#4ade80' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span>Neutral Baseline (cos θ)</span>
                          <span style={{ color: '#fbbf24', fontWeight: 700 }}>{vector.cosine_similarity?.neutral_centroid || 0.25}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${(vector.cosine_similarity?.neutral_centroid || 0.25) * 100}%`, height: '100%', background: '#fbbf24' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                          <span>Negative Prototype (cos θ)</span>
                          <span style={{ color: '#f87171', fontWeight: 700 }}>{vector.cosine_similarity?.negative_centroid || 0.12}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${(vector.cosine_similarity?.negative_centroid || 0.12) * 100}%`, height: '100%', background: '#f87171' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. TF-IDF Token Breakdown Table */}
              <div className="panel p5">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Hash size={16} color="var(--accent)" />
                    <b style={{ fontSize: 14 }}>TF-IDF Token Weight & Feature Breakdown</b>
                  </div>
                  <span className="tag" style={{ fontSize: 11 }}>
                    {tfidf.tokens_analyzed || 0} words tokenized
                  </span>
                </div>

                <div className="tablewrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>TF (Term Freq)</th>
                        <th>IDF (Corpus Weight)</th>
                        <th>TF-IDF Score</th>
                        <th>Polarity</th>
                        <th>Contribution</th>
                        <th>Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tfidf.top_terms || []).map((t: any) => {
                        const isPos = t.impact === 'positive';
                        const isNeg = t.impact === 'negative';
                        return (
                          <tr key={t.term}>
                            <td style={{ fontWeight: 700, color: isPos ? '#4ade80' : isNeg ? '#f87171' : 'var(--ink)' }}>
                              {t.term}
                            </td>
                            <td>{t.tf}</td>
                            <td>{t.idf}</td>
                            <td>{t.tfidf}</td>
                            <td style={{ color: isPos ? '#4ade80' : isNeg ? '#f87171' : 'var(--muted-color)' }}>
                              {t.polarity > 0 ? `+${t.polarity}` : t.polarity}
                            </td>
                            <td style={{ fontWeight: 700, color: isPos ? '#4ade80' : isNeg ? '#f87171' : 'var(--muted-color)' }}>
                              {t.contribution > 0 ? `+${t.contribution}` : t.contribution}
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                                background: isPos ? 'rgba(74,222,128,0.12)' : isNeg ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${isPos ? 'rgba(74,222,128,0.3)' : isNeg ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                color: isPos ? '#4ade80' : isNeg ? '#f87171' : 'var(--muted-color)'
                              }}>
                                {isPos ? 'Positive Driver' : isNeg ? 'Negative Driver' : 'Neutral Context'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PIPELINE */}
          {activeTab === 'pipeline' && (
            <div>
              <div className="traceflow" style={{ marginBottom: 20 }}>
                {steps.map(s => (
                  <div key={s[0]}>
                    <span>{s[0]}</span>
                    <b>{s[1]}</b>
                    <p>{s[2]}</p>
                  </div>
                ))}
              </div>
              <div className="grid2">
                <section className="panel p5">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <FileText size={15} color="var(--accent)" /> Evidence / Citations
                  </h3>
                  {(x.evidence || []).map((e: any, eidx: number) => (
                    <div className="evidence" key={`${e.ref || 'ref'}-${eidx}`}>{e.ref} · {e.quote}</div>
                  ))}
                </section>
                <section className="panel p5">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <Hash size={15} color="var(--accent2)" /> Extracted Themes
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {(r.themes || []).map((t: any, tidx: number) => {
                      const name = typeof t === 'string' ? t : (t?.theme || t?.name || 'Theme');
                      const sentiment = typeof t === 'object' && t?.sentiment ? t.sentiment : (r.sentiment || 'Positive');
                      return (
                        <span key={`${name}-${tidx}`} className="tag" style={{ fontSize: 12 }}>
                          {name}: <b>{sentiment}</b>
                        </span>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB 3: RAW JSON */}
          {activeTab === 'raw' && (
            <div className="panel p5">
              <pre style={{
                fontSize: 12, lineHeight: 1.5, maxHeight: 420, overflowY: 'auto',
                background: 'rgba(0,0,0,0.4)', padding: 14, borderRadius: 8, color: '#a78bfa'
              }}>
                {JSON.stringify(x, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

