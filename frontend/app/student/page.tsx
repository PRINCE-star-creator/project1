'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, LogOut, Package, Star, MessageSquare,
  BarChart3, TrendingUp, Loader2, ShoppingCart, Truck,
  ShieldCheck, ArrowLeft, Check, Search, Filter, Sparkles,
  ThumbsUp, Tag, Clock, ArrowRight, Zap, RefreshCw, X, Trash2, ChevronRight
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.45, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
  })
};

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
  if (cat.toLowerCase().includes('audio') || cat.toLowerCase().includes('sound') || cat.toLowerCase().includes('headphone')) return defaultProductImages.Audio;
  if (cat.toLowerCase().includes('laptop') || cat.toLowerCase().includes('computer')) return defaultProductImages.Laptops;
  if (cat.toLowerCase().includes('watch') || cat.toLowerCase().includes('wear')) return defaultProductImages.Wearables;
  if (cat.toLowerCase().includes('camera')) return defaultProductImages.Cameras;
  return defaultProductImages.Default;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    Positive: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#4ade80' },
    Neutral:  { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  text: '#fbbf24' },
    Negative: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#f87171' },
  };
  const c = colors[sentiment] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'var(--muted-color)' };
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontFamily: 'var(--font-sans)', letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text }} />
      {sentiment || '—'}
    </span>
  );
}

function StarRating({ rating, size = 13 }: { rating: number | null, size?: number }) {
  if (rating == null) return <span style={{ color: 'var(--muted-color)' }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < Math.round(rating) ? '#fbbf24' : 'transparent'}
          color={i < Math.round(rating) ? '#fbbf24' : 'var(--muted-color)'}
        />
      ))}
    </span>
  );
}

export default function Student() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // E-Commerce UI State
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sentimentFilter, setSentimentFilter] = useState<'All' | 'Positive' | 'Neutral' | 'Negative'>('All');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'price-asc' | 'price-desc'>('featured');
  const [cartItems, setCartItems] = useState<{ id: string; name: string; price: number; quantity: number; image?: string; category?: string }[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderCelebration, setOrderCelebration] = useState(false);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Write Review State
  const [showAddReview, setShowAddReview] = useState(true);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [ratingDelta, setRatingDelta] = useState<{
    prev: number;
    next: number;
    diff: string;
    productName: string;
    bayesian?: number;
    wilson?: number;
  } | null>(null);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});

  const cartCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems]);
  const cartSubtotal = useMemo(() => cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cartItems]);

  // Live sentiment preview based on input text and English NLP grammar
  const liveSentimentPreview = useMemo(() => {
    if (!newReviewText.trim() || newReviewText.trim().length < 3) return null;
    const lower = newReviewText.toLowerCase();
    const cleanTokens = lower.replace(/[^a-z0-9\s']/g, ' ').trim().split(/\s+/);
    
    const posWords = new Set(['excellent', 'great', 'good', 'amazing', 'love', 'perfect', 'fast', 'clear', 'comfortable', 'best', 'happy', 'quality', 'stellar', 'powerful', 'smooth', 'superb', 'vibrant', 'solid', 'worth', 'helpful', 'durable', 'sturdy', 'premium']);
    const negWords = new Set(['bad', 'terrible', 'poor', 'disappointing', 'slow', 'worst', 'hate', 'broken', 'awful', 'drains', 'drain', 'issue', 'problem', 'late', 'weak', 'loud', 'useless', 'waste', 'cheap', 'defective', 'flimsy', 'glitchy', 'scam', 'horrible']);
    const negations = new Set(['not', 'never', 'no', 'hardly', 'barely', 'dont', "don't", 'didnt', "didn't", 'doesnt', "doesn't", 'isnt', "isn't", 'wasnt', "wasn't", 'arent', "aren't", 'wont', "won't", 'cant', "can't", 'cannot', 'shouldnt', "shouldn't", 'wouldnt', "wouldn't"]);

    let posHits: string[] = [];
    let negHits: string[] = [];

    // 1. English Negative Concord ('no no', 'no no no')
    if (/\b(no(\s+no)+)\b/i.test(lower)) {
      negHits.push('negative concord (no no)');
    }

    // 2. Action / Purchase Rejection Patterns
    if (/\b(do\s*not|don'?t|never|cannot|can'?t|would\s*not|wouldn'?t|should\s*not|shouldn'?t)\s+(buy|purchase|order|recommend|get|bother|trust|waste)\b/i.test(lower)) {
      negHits.push('avoid purchase recommendation');
    }

    // 3. Consumer Rejection & Endorsement Idioms
    if (/\b(waste\s+of\s+(money|time|cash)|avoid\s+at\s+all\s+costs?|not\s+worth\s+it|piece\s+of\s+(junk|trash)|fell\s+apart|stopped\s+working)\b/i.test(lower)) {
      negHits.push('strong negative idiom');
    }
    if (/\b(worth\s+every\s+(penny|cent|dollar)|must\s+buy|highly\s+recommend|exceeded\s+expectations|game\s+changer|best\s+purchase)\b/i.test(lower)) {
      posHits.push('strong endorsement');
    }

    cleanTokens.forEach((tok, idx) => {
      const prevWindow = cleanTokens.slice(Math.max(0, idx - 3), idx);
      const isNegated = prevWindow.some(w => negations.has(w));
      if (posWords.has(tok)) {
        if (isNegated) {
          negHits.push(`not ${tok}`);
        } else {
          posHits.push(tok);
        }
      } else if (negWords.has(tok)) {
        if (isNegated) {
          posHits.push(`not ${tok}`);
        } else {
          negHits.push(tok);
        }
      }
    });

    if (posHits.length > negHits.length) return { sentiment: 'Positive', color: '#4ade80', cues: posHits };
    if (negHits.length > posHits.length) return { sentiment: 'Negative', color: '#f87171', cues: negHits };
    return { sentiment: 'Neutral', color: '#fbbf24', cues: [...posHits, ...negHits] };
  }, [newReviewText]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('reviewlens_token');
      if (!token) {
        router.push('/');
        return;
      }
      const sid = localStorage.getItem('reviewlens_student_id') || 'Student';
      setStudentId(sid);
      setNewReviewAuthor(sid);
      loadStudentData();
    }
  }, [router]);


  async function loadStudentData() {
    try {
      const [p, r] = await Promise.all([api('/api/v1/student/products'), api('/api/v1/student/reviews?limit=500')]);
      setProducts(p);
      setReviews(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.clear();
    router.push('/');
  }

  function handleAddToCart(product: any, qty: number = 1) {
    if (!product) return;
    setCartItems(prev => {
      const idx = prev.findIndex(item => String(item.id) === String(product._id));
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += qty;
        return copy;
      }
      return [...prev, {
        id: product._id,
        name: product.name,
        price: product.price || 89.99,
        quantity: qty,
        image: getProductImage(product),
        category: product.category || 'Product'
      }];
    });
    setCartToast(`Added ${qty} × "${product.name}" to your Cart!`);
    setTimeout(() => setCartToast(null), 3500);
  }

  function handleUpdateCartQty(id: string, delta: number) {
    setCartItems(prev => prev.map(item => {
      if (String(item.id) === String(id)) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as any);
  }

  function handleRemoveFromCart(id: string) {
    setCartItems(prev => prev.filter(item => String(item.id) !== String(id)));
  }

  function handleCheckout() {
    if (!cartItems.length) return;
    setOrderCelebration(true);
    setTimeout(() => {
      setCartItems([]);
      setOrderCelebration(false);
      setShowCartDrawer(false);
      setCartToast(`Order reserved successfully under Student ID: ${studentId}!`);
      setTimeout(() => setCartToast(null), 4000);
    }, 1600);
  }

  function toggleHelpful(reviewId: string, initialCount: number) {
    setVotedMap(prev => {
      const alreadyVoted = !!prev[reviewId];
      const nextVoted = !alreadyVoted;
      setHelpfulVotes(v => ({
        ...v,
        [reviewId]: (v[reviewId] ?? initialCount) + (nextVoted ? 1 : -1)
      }));
      return { ...prev, [reviewId]: nextVoted };
    });
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProduct) return;
    if (!newReviewText.trim() || newReviewText.trim().length < 3) {
      setReviewError('Please write a review text of at least 3 characters.');
      return;
    }
    const prevRating = currentProduct.rating || 4.5;
    setSubmittingReview(true);
    setReviewError('');
    try {
      const res = await api('/api/v1/student/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: currentProduct._id,
          review_text: newReviewText.trim(),
          star_rating: newReviewRating,
          author: newReviewAuthor.trim() || studentId || 'Verified Student Buyer'
        })
      });

      const newReview = res.review || res;
      const updatedProduct = res.product;

      // Add to reviews list at the top
      setReviews(prev => [newReview, ...prev]);

      // Update product rating and metrics in products list
      if (updatedProduct) {
        setProducts(prev => prev.map(p => String(p._id) === String(updatedProduct._id) ? { ...p, ...updatedProduct } : p));
        const newRating = updatedProduct.rating || prevRating;
        const diffVal = Math.round((newRating - prevRating) * 10) / 10;
        const diffFormatted = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;
        setRatingDelta({
          prev: prevRating,
          next: newRating,
          diff: diffFormatted,
          productName: currentProduct.name,
          bayesian: updatedProduct.rating_bayesian,
          wilson: updatedProduct.wilson_lower_pct
        });
      } else {
        const newAvg = Math.round(((currentProduct.rating * currentProductReviews.length + newReviewRating) / (currentProductReviews.length + 1)) * 10) / 10;
        setProducts(prev => prev.map(p => String(p._id) === String(currentProduct._id) ? {
          ...p,
          rating: newAvg,
          review_count: (p.review_count || 0) + 1
        } : p));
        const diffVal = Math.round((newAvg - prevRating) * 10) / 10;
        const diffFormatted = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;
        setRatingDelta({
          prev: prevRating,
          next: newAvg,
          diff: diffFormatted,
          productName: currentProduct.name
        });
      }

      setReviewSuccessMsg(`Review published! Product rating recalculated immediately based on sentiment and star input.`);
      setNewReviewText('');
      setShowAddReview(true);
      setTimeout(() => setReviewSuccessMsg(null), 6000);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  }


  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  // Filtered & Sorted Catalog Products
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });

    if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.price || 99) - (b.price || 99));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.price || 99) - (a.price || 99));
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Selected Product & its specific reviews
  const currentProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find(p => String(p._id) === String(selectedProductId)) || null;
  }, [products, selectedProductId]);

  const currentProductReviews = useMemo(() => {
    if (!selectedProductId) return [];
    return reviews.filter(r => String(r.product_id) === String(selectedProductId));
  }, [reviews, selectedProductId]);

  // Filtered Reviews for the selected product
  const filteredReviews = useMemo(() => {
    return currentProductReviews.filter(r => {
      const matchesSentiment = sentimentFilter === 'All' || r.sentiment === sentimentFilter;
      const matchesRating = ratingFilter === 0 || r.star_rating === ratingFilter;
      return matchesSentiment && matchesRating;
    });
  }, [currentProductReviews, sentimentFilter, ratingFilter]);

  // Sentiment distribution for selected product
  const sentimentStats = useMemo(() => {
    const total = currentProductReviews.length || 1;
    const pos = currentProductReviews.filter(r => r.sentiment === 'Positive').length;
    const neu = currentProductReviews.filter(r => r.sentiment === 'Neutral').length;
    const neg = currentProductReviews.filter(r => r.sentiment === 'Negative').length;
    return {
      posCount: pos, posPct: Math.round((pos / total) * 100),
      neuCount: neu, neuPct: Math.round((neu / total) * 100),
      negCount: neg, negPct: Math.round((neg / total) * 100),
      total: currentProductReviews.length
    };
  }, [currentProductReviews]);

  // Key themes for selected product
  const productThemes = useMemo(() => {
    const map: Record<string, { pos: number; neg: number; neu: number }> = {};
    currentProductReviews.forEach(r => {
      (r.themes || []).forEach((t: any) => {
        const themeName = typeof t === 'string' ? t : (t?.theme || t?.name);
        if (!themeName) return;
        if (!map[themeName]) map[themeName] = { pos: 0, neg: 0, neu: 0 };
        const sentiment = typeof t === 'object' && t?.sentiment ? t.sentiment : (r.sentiment || 'Positive');
        if (sentiment === 'Positive') map[themeName].pos++;
        else if (sentiment === 'Negative') map[themeName].neg++;
        else map[themeName].neu++;
      });
    });
    return Object.entries(map).map(([theme, counts]) => ({
      theme,
      sentiment: counts.pos >= counts.neg ? 'Positive' : 'Negative',
      count: counts.pos + counts.neg + counts.neu
    }));
  }, [currentProductReviews]);

  /* ── Loading State ── */
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--bg-base)', color: 'var(--ink)'
    }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
        <Loader2 size={40} color="var(--accent)" />
      </motion.div>
      <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--muted-color)', fontSize: 15 }}>
        Loading marketplace catalogue & reviews…
      </span>
    </div>
  );

  /* ── Error State ── */
  if (error) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20
    }}>
      <div className="panel p6" style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px', color: 'var(--error)' }}>Connection Error</h2>
        <p style={{ color: 'var(--muted-color)', fontSize: 14, marginBottom: 20 }}>{error}</p>
        <button className="btn" onClick={() => { setError(''); setLoading(true); loadStudentData(); }}>
          <RefreshCw size={14} style={{ display: 'inline', marginRight: 6 }} />
          Retry Connection
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--ink)' }}>
      {/* ── Cart Toast Notification ── */}
      <AnimatePresence>
        {cartToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed', top: 20, left: '50%', zIndex: 9999,
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
              padding: '12px 24px', borderRadius: 99, fontWeight: 700, fontSize: 14,
              boxShadow: '0 10px 30px rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            <Check size={18} />
            {cartToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Navigation Bar ── */}
      <header className="topbar" style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div className="shell topinner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={11} color="var(--accent)" />
                ReviewLens Store · Student Experience
              </div>
              <div className="brandtitle" style={{ fontSize: 18 }}>Marketplace & Reviews</div>
            </div>
          </div>

          <div className="toolbar" style={{ gap: 12 }}>
            <span className="tag" style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)', padding: '6px 12px' }}>
              <GraduationCap size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              ID: {studentId}
            </span>

            {/* Shopping Cart Button */}
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowCartDrawer(true)}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                padding: '6px 14px', borderRadius: 99,
                gap: 8, fontSize: 13, fontWeight: 700
              }}
              title="Open Cart"
            >
              <ShoppingCart size={16} color="var(--accent)" />
              <span>Cart</span>
              <span style={{
                background: cartCount > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: cartCount > 0 ? '#ffffff' : 'var(--muted-color)',
                borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 800
              }}>
                {cartCount}
              </span>
            </button>

            <button className="btn secondary" onClick={logout} style={{ padding: '7px 14px', fontSize: 13 }}>
              <LogOut size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="shell" style={{ paddingTop: 24, paddingBottom: 60 }}>
        {/* ═══════════════════════════════════════════════════════
            VIEW A: PRODUCT DETAIL & REVIEWS (E-Commerce style)
            ═══════════════════════════════════════════════════════ */}
        {currentProduct ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Back Button */}
            <button
              onClick={() => { setSelectedProductId(null); setSentimentFilter('All'); setRatingFilter(0); }}
              className="btn secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13 }}
            >
              <ArrowLeft size={16} />
              Back to All Products
            </button>

            {/* Product Overview Section */}
            <div className="panel p6" style={{ marginBottom: 30 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 32 }}>
                {/* Left Column: Image & Badges */}
                <div>
                  <div style={{
                    width: '100%', height: 380, borderRadius: 14, overflow: 'hidden',
                    background: 'var(--bg-base)', position: 'relative', border: '1px solid var(--line-subtle)'
                  }}>
                    <img
                      src={getProductImage(currentProduct)}
                      alt={currentProduct.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e: any) => { e.target.src = defaultProductImages.Default; }}
                    />
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                      {currentProduct.sales_tag && (
                        <span className="tag" style={{ background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', fontWeight: 800 }}>
                          {currentProduct.sales_tag}
                        </span>
                      )}
                      <span className="tag" style={{ background: 'rgba(10,10,15,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {currentProduct.category}
                      </span>
                    </div>
                  </div>

                  {/* Highlights Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-secondary)', background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 8 }}>
                      <Truck size={16} color="var(--accent)" />
                      <span>Free Express Delivery</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-secondary)', background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 8 }}>
                      <ShieldCheck size={16} color="#4ade80" />
                      <span>Authentic AI Reviews</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Pricing, Product Details & Action */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div className="eyebrow" style={{ color: 'var(--accent)', marginBottom: 6 }}>
                      {currentProduct.brand || 'Official Collection'}
                    </div>
                    <h1 style={{ fontSize: 28, margin: '0 0 10px', color: 'var(--ink)' }}>
                      {currentProduct.name}
                    </h1>

                    {/* Star Rating Overview with Real-world Algorithm Metrics */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                      <StarRating rating={currentProduct.rating || 4.5} size={16} />
                      <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 15 }}>
                        {currentProduct.rating || 4.5}★
                      </span>
                      <span style={{ color: 'var(--muted-color)', fontSize: 13 }}>
                        · {currentProductReviews.length} customer reviews
                      </span>
                      {currentProduct.rating_bayesian !== undefined && (
                        <span className="tag" style={{ fontSize: 11, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }} title="Empirical Bayes smoothed rating using catalog prior baseline">
                          Bayesian: {currentProduct.rating_bayesian}★
                        </span>
                      )}
                      {currentProduct.wilson_lower_pct !== undefined && (
                        <span className="tag" style={{ fontSize: 11, background: 'rgba(168,85,247,0.12)', color: '#c084fc', borderColor: 'rgba(168,85,247,0.3)' }} title="Wilson 95% Confidence Interval lower bound for true satisfaction">
                          Wilson: {currentProduct.wilson_lower_pct}%
                        </span>
                      )}
                    </div>

                    {/* Pricing Box */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
                      padding: '16px 20px', borderRadius: 12, marginBottom: 20
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <span style={{ fontSize: 32, fontWeight: 900, color: '#4ade80' }}>
                          ${(currentProduct.price || 89.99).toFixed(2)}
                        </span>
                        {currentProduct.original_price && (
                          <span style={{ fontSize: 18, color: 'var(--muted-color)', textDecoration: 'line-through' }}>
                            ${currentProduct.original_price.toFixed(2)}
                          </span>
                        )}
                        {currentProduct.discount_pct && (
                          <span style={{
                            padding: '3px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.2)',
                            color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 800, fontSize: 12
                          }}>
                            {currentProduct.discount_pct}% OFF
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: '#4ade80' }}>
                        <Check size={14} />
                        <span>In Stock ({currentProduct.stock_count || 12} units available). Ships tomorrow.</span>
                      </div>
                    </div>

                    {/* Add to Cart Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)',
                        border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden'
                      }}>
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          style={{ background: 'none', border: 'none', color: 'var(--ink)', padding: '8px 14px', cursor: 'pointer' }}
                        >-</button>
                        <span style={{ padding: '8px 12px', fontWeight: 800, fontSize: 14 }}>{quantity}</span>
                        <button
                          onClick={() => setQuantity(q => q + 1)}
                          style={{ background: 'none', border: 'none', color: 'var(--ink)', padding: '8px 14px', cursor: 'pointer' }}
                        >+</button>
                      </div>

                      <button
                        className="btn"
                        onClick={() => handleAddToCart(currentProduct, quantity)}
                        style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}
                      >
                        <ShoppingCart size={18} />
                        Add to Cart
                      </button>
                    </div>

                    {/* AI Sentiment Intelligence Snapshot */}
                    <div style={{
                      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                      padding: 16, borderRadius: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Sparkles size={16} color="var(--accent)" />
                          <b style={{ fontSize: 13 }}>ReviewLens AI Sentiment Summary</b>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>
                          {sentimentStats.posPct}% Positive Signals
                        </span>
                      </div>

                      {/* Distribution Bar */}
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, display: 'flex', overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ width: `${sentimentStats.posPct}%`, background: '#34d399' }} title={`Positive: ${sentimentStats.posCount}`} />
                        <div style={{ width: `${sentimentStats.neuPct}%`, background: '#fbbf24' }} title={`Neutral: ${sentimentStats.neuCount}`} />
                        <div style={{ width: `${sentimentStats.negPct}%`, background: '#f87171' }} title={`Negative: ${sentimentStats.negCount}`} />
                      </div>

                      {/* Real-world Algorithm & Rating Distribution Breakdown */}
                      <div style={{ margin: '12px 0 10px', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Rating Breakdown (Click to filter):</span>
                          <span style={{ fontSize: 10, color: 'var(--muted-color)', fontFamily: 'var(--font-mono)' }}>Bayesian + Wilson</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, fontSize: 11, textAlign: 'center' }}>
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = (currentProduct.rating_distribution && currentProduct.rating_distribution[String(star)]) || 0;
                            const pct = currentProductReviews.length ? Math.round((count / currentProductReviews.length) * 100) : 0;
                            const isActive = ratingFilter === star;
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRatingFilter(prev => prev === star ? 0 : star)}
                                className={`star-filter-btn ${isActive ? 'active' : ''}`}
                                title={`Filter reviews by ${star} Stars`}
                              >
                                <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Star size={11} fill="#fbbf24" /> {star}
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 12, margin: '2px 0' }}>{pct}%</div>
                                <div style={{ color: 'var(--muted-color)', fontSize: 9 }}>({count})</div>
                              </button>
                            );
                          })}
                        </div>
                        {ratingFilter > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, padding: '6px 10px', background: 'rgba(99,102,241,0.12)', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)' }}>
                            <span style={{ fontSize: 12, color: 'var(--ink)' }}>
                              ⚡ Filtered by <b>{ratingFilter}★ Reviews</b> ({filteredReviews.length} found)
                            </span>
                            <button
                              type="button"
                              onClick={() => setRatingFilter(0)}
                              style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                            >
                              Clear Filter ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Product Themes Pills */}
                      {productThemes.length > 0 && (
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--muted-color)', display: 'block', marginBottom: 6 }}>
                            Key Extracted Themes:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {productThemes.map((t, idx) => (
                              <span key={`${t.theme}-${t.sentiment}-${idx}`} className="tag" style={{
                                fontSize: 11,
                                borderColor: t.sentiment === 'Positive' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'
                              }}>
                                {t.theme} ({t.sentiment})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Product Reviews Section ── */}
            <section className="panel p6">
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--line)'
              }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Customer Reviews for {currentProduct.name}</h2>
                  <p style={{ margin: 0, color: 'var(--muted-color)', fontSize: 13 }}>
                    Showing {filteredReviews.length} of {currentProductReviews.length} analyzed customer opinions
                  </p>
                </div>

                {/* Review Filters & Write Review Action */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <button
                    className="btn"
                    onClick={() => { setShowAddReview(!showAddReview); setReviewError(''); }}
                    style={{
                      padding: '7px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: showAddReview ? 'var(--bg-elevated)' : undefined,
                      border: showAddReview ? '1px solid var(--line)' : undefined
                    }}
                  >
                    <Sparkles size={14} color="var(--accent)" />
                    {showAddReview ? 'Hide Review Form' : 'Write a Review'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-color)' }}>Filter:</span>
                    {(['All', 'Positive', 'Neutral', 'Negative'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSentimentFilter(s)}
                        className={`mode-btn ${sentimentFilter === s ? 'active' : 'secondary'}`}
                        style={{ padding: '4px 10px', fontSize: 12, height: 'auto' }}
                      >
                        {s}
                      </button>
                    ))}
                    <select
                      className="input"
                      value={ratingFilter}
                      onChange={e => setRatingFilter(Number(e.target.value))}
                      style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                    >
                      <option value={0}>All Stars</option>
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Review Success Toast */}
              {reviewSuccessMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)',
                    color: '#4ade80', padding: '12px 18px', borderRadius: 10, marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700
                  }}
                >
                  <Check size={18} />
                  <span>{reviewSuccessMsg}</span>
                </motion.div>
              )}

              {/* Product Rating Recalculation Delta Banner */}
              {ratingDelta && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(56,189,248,0.12))',
                    border: '1px solid rgba(99,102,241,0.4)',
                    boxShadow: '0 8px 30px rgba(99,102,241,0.15)',
                    borderRadius: 14, padding: '16px 20px', marginBottom: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8'
                    }}>
                      <TrendingUp size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
                        Overall Product Rating Recalculated!
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 2 }}>
                        {ratingDelta.productName} updated from <b>{ratingDelta.prev}★</b> ➔ <b style={{ color: '#4ade80', fontSize: 15 }}>{ratingDelta.next}★</b> ({ratingDelta.diff} delta)
                        {ratingDelta.bayesian !== undefined && <span style={{ marginLeft: 8, color: '#38bdf8' }}>· Bayesian: {ratingDelta.bayesian}★</span>}
                        {ratingDelta.wilson !== undefined && <span style={{ marginLeft: 8, color: '#c084fc' }}>· Wilson: {ratingDelta.wilson}%</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRatingDelta(null)}
                    className="btn secondary"
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    Dismiss ✕
                  </button>
                </motion.div>
              )}

              {/* Write Review Form Card */}
              {showAddReview && (
                <motion.form
                  onSubmit={submitReview}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(26,26,46,0.7)', border: '1px solid var(--accent)',
                    borderRadius: 14, padding: 22, marginBottom: 26, boxShadow: '0 0 25px var(--accent-glow)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, color: 'var(--ink)' }}>Write a Customer Review</h3>
                      <p style={{ margin: '4px 0 0', color: 'var(--muted-color)', fontSize: 13 }}>
                        Your feedback will be analyzed by AI for sentiment and immediately update {currentProduct.name}'s overall rating!
                      </p>
                    </div>
                    <span className="tag" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent)', border: '1px solid rgba(0,212,255,0.3)', fontWeight: 700 }}>
                      ⚡ Real-time Rating Recalculation
                    </span>
                  </div>

                  {/* Interactive Star Rating */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                      Overall Rating: <span style={{ color: '#fbbf24' }}>{hoverRating || newReviewRating} of 5 Stars</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(star => {
                        const active = star <= (hoverRating || newReviewRating);
                        return (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setNewReviewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                              transform: active ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s ease'
                            }}
                          >
                            <Star
                              size={28}
                              fill={active ? '#fbbf24' : 'transparent'}
                              color={active ? '#fbbf24' : 'var(--muted-color)'}
                            />
                          </button>
                        );
                      })}
                      <span style={{ fontSize: 13, color: 'var(--muted-color)', marginLeft: 8 }}>
                        {newReviewRating === 5 ? '★★★★★ 5.0 (Excellent)' :
                         newReviewRating === 4 ? '★★★★☆ 4.0 (Good)' :
                         newReviewRating === 3 ? '★★★☆☆ 3.0 (Average)' :
                         newReviewRating === 2 ? '★★☆☆☆ 2.0 (Fair)' : '★☆☆☆☆ 1.0 (Poor)'}
                      </span>
                    </div>
                  </div>

                  {/* Reviewer Name */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                      Your Reviewer Name / Roll:
                    </label>
                    <input
                      className="input"
                      value={newReviewAuthor}
                      onChange={e => setNewReviewAuthor(e.target.value)}
                      placeholder={`e.g. ${studentId} or Verified Buyer`}
                      style={{ maxWidth: 360 }}
                    />
                  </div>

                  {/* Review Text */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                      Review Feedback:
                    </label>
                    <textarea
                      className="input"
                      rows={4}
                      value={newReviewText}
                      onChange={e => setNewReviewText(e.target.value)}
                      placeholder="Share your experience (e.g. sound quality, battery life, performance, build quality)..."
                      style={{ width: '100%', resize: 'vertical' }}
                      required
                    />
                  </div>

                  {/* Live AI Sentiment Feedback Preview */}
                  {liveSentimentPreview && (
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: `1px solid ${liveSentimentPreview.color}40`,
                      borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={14} color={liveSentimentPreview.color} />
                        <span style={{ fontSize: 13, color: 'var(--ink)' }}>
                          AI Sentiment Analysis Preview: <b style={{ color: liveSentimentPreview.color }}>{liveSentimentPreview.sentiment}</b>
                        </span>
                      </div>
                      {liveSentimentPreview.cues.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--muted-color)' }}>
                          Detected key signals: {liveSentimentPreview.cues.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  {reviewError && (
                    <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 14 }}>
                      {reviewError}
                    </div>
                  )}

                  {/* Submit Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="submit"
                      className="btn"
                      disabled={submittingReview}
                      style={{ padding: '10px 22px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}
                    >
                      {submittingReview ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Analyzing & Updating Rating…
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Publish Review & Recalculate Rating
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setShowAddReview(false)}
                      style={{ padding: '10px 18px', fontSize: 14 }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}


              {/* Reviews List */}
              {filteredReviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {filteredReviews.map((r: any, i: number) => (
                    <motion.div
                      key={r._id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line-subtle)',
                        borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10
                      }}
                    >
                      {/* Reviewer Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent2), var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 13, color: '#fff'
                          }}>
                            {(r.author || 'Customer').charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <b style={{ fontSize: 14, color: 'var(--ink)' }}>{r.author || 'Verified Buyer'}</b>
                              <span style={{ fontSize: 11, color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Check size={11} /> Verified Purchase
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              <StarRating rating={r.star_rating || 5} size={12} />
                              <span style={{ fontSize: 11, color: 'var(--muted-color)' }}>
                                {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent review'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* AI Sentiment Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <SentimentBadge sentiment={r.sentiment || 'Positive'} />
                          <span style={{ fontSize: 11, color: 'var(--muted-color)', fontFamily: 'var(--font-mono)' }}>
                            {Math.round((r.confidence || 0.8) * 100)}% conf
                          </span>
                        </div>
                      </div>

                      {/* Review Text */}
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
                        "{r.review_text}"
                      </p>

                      {/* Review Themes */}
                      {(r.themes || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {r.themes.map((t: any, tidx: number) => {
                            const name = typeof t === 'string' ? t : (t?.theme || t?.name || 'Theme');
                            const sentiment = typeof t === 'object' && t?.sentiment ? t.sentiment : (r.sentiment || 'Positive');
                            return (
                              <span key={`${name}-${tidx}`} style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 11,
                                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-subtle)',
                                color: 'var(--ink-secondary)'
                              }}>
                                🏷️ {name} · <b>{sentiment}</b>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Helpful Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <button
                          type="button"
                          style={{
                            background: votedMap[r._id || `rev-${i}`] ? 'rgba(74,222,128,0.12)' : 'none',
                            border: votedMap[r._id || `rev-${i}`] ? '1px solid rgba(74,222,128,0.3)' : '1px solid transparent',
                            color: votedMap[r._id || `rev-${i}`] ? '#4ade80' : 'var(--muted-color)',
                            borderRadius: 6, padding: '3px 8px',
                            fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => toggleHelpful(r._id || `rev-${i}`, (i * 3 + 2))}
                        >
                          <ThumbsUp size={12} fill={votedMap[r._id || `rev-${i}`] ? '#4ade80' : 'transparent'} />
                          Helpful ({helpfulVotes[r._id || `rev-${i}`] ?? (i * 3 + 2)})
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <MessageSquare size={36} color="var(--muted-color)" style={{ marginBottom: 10 }} />
                  <p style={{ color: 'var(--muted-color)', fontSize: 14 }}>
                    No reviews match the selected filter criteria.
                  </p>
                </div>
              )}
            </section>
          </motion.div>
        ) : (
          /* ═══════════════════════════════════════════════════════
             VIEW B: E-COMMERCE PRODUCT CATALOG
             ═══════════════════════════════════════════════════════ */
          <div>
            {/* Promotional Banner */}
            <motion.div
              className="panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '24px 30px', marginBottom: 28, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(0,212,255,0.12))',
                border: '1px solid rgba(124,58,237,0.25)', position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{ maxWidth: 640 }}>
                <span className="tag" style={{ background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 800, marginBottom: 10 }}>
                  🔥 AUTUMN MEGA DEALS
                </span>
                <h1 style={{ fontSize: 28, margin: '6px 0 8px', color: 'var(--ink)' }}>
                  Shop Tech with AI Sentiment Intelligence
                </h1>
                <p style={{ color: 'var(--ink-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  Browse authentic electronics products with real-time sentiment analysis, verified review evidence, and transparent customer ratings. Click any product to inspect reviews.
                </p>
              </div>
            </motion.div>

            {/* Filter & Search Bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 14, marginBottom: 24
            }}>
              {/* Search Box */}
              <div style={{ position: 'relative', minWidth: 280 }}>
                <Search size={16} style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--muted-color)', pointerEvents: 'none'
                }} />
                <input
                  className="input"
                  style={{ paddingLeft: 40, paddingRight: searchQuery ? 36 : 14 }}
                  placeholder="Search products or brands…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer',
                      padding: 4, display: 'flex', alignItems: 'center'
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sort By Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted-color)' }}>Sort by:</span>
                <select
                  className="input"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  style={{ padding: '8px 12px', fontSize: 13 }}
                >
                  <option value="featured">Featured Deals</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`mode-btn ${selectedCategory === cat ? 'active' : 'secondary'}`}
                  style={{ padding: '6px 16px', fontSize: 13, height: 'auto', borderRadius: 99 }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <motion.div
                initial="hidden" animate="visible"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 20
                }}
              >
                {filteredProducts.map((p: any, i: number) => {
                  const prodReviews = reviews.filter(r => r.product_id === p._id);
                  const posCount = prodReviews.filter(r => r.sentiment === 'Positive').length;
                  const posPct = prodReviews.length ? Math.round((posCount / prodReviews.length) * 100) : 85;

                  return (
                    <motion.div
                      key={p._id}
                      custom={i}
                      variants={fadeUp}
                      className="panel"
                      onClick={() => {
                        setSelectedProductId(p._id);
                        setShowAddReview(true);
                      }}
                      style={{
                        padding: 16, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        position: 'relative', overflow: 'hidden'
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,212,255,0.12)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = '';
                        (e.currentTarget as HTMLElement).style.transform = '';
                        (e.currentTarget as HTMLElement).style.boxShadow = '';
                      }}
                    >
                      {/* Product Image */}
                      <div>
                        <div style={{
                          width: '100%', height: 210, borderRadius: 12, overflow: 'hidden',
                          background: 'var(--bg-base)', position: 'relative', marginBottom: 14
                        }}>
                          <img
                            src={getProductImage(p)}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                            loading="lazy"
                            onError={(e: any) => { e.target.src = defaultProductImages.Default; }}
                          />

                          {/* Floating Badges */}
                          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {p.sales_tag && (
                              <span className="tag" style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 10 }}>
                                {p.sales_tag}
                              </span>
                            )}
                            <span className="tag" style={{ backdropFilter: 'blur(8px)', background: 'rgba(10,10,15,0.8)', fontSize: 10 }}>
                              {p.category || 'Electronics'}
                            </span>
                          </div>

                          {p.discount_pct && (
                            <span style={{
                              position: 'absolute', top: 10, right: 10,
                              background: '#22c55e', color: '#fff', padding: '3px 8px', borderRadius: 99,
                              fontWeight: 800, fontSize: 11
                            }}>
                              {p.discount_pct}% OFF
                            </span>
                          )}
                        </div>

                        {/* Title & Brand */}
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {p.brand || 'TechBrand'}
                          </span>
                          <h3 style={{ fontSize: 16, margin: '2px 0 6px', color: 'var(--ink)', lineHeight: 1.4 }}>
                            {p.name}
                          </h3>
                        </div>

                        {/* Rating Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <StarRating rating={p.rating || 4.5} size={13} />
                          <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700 }}>
                            {p.rating || 4.5}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--muted-color)' }}>
                            ({prodReviews.length} reviews)
                          </span>
                        </div>
                      </div>

                      {/* Pricing & AI Sentiment Bar */}
                      <div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          paddingTop: 10, borderTop: '1px solid var(--line-subtle)', marginBottom: 12
                        }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 22, fontWeight: 900, color: '#4ade80' }}>
                              ${(p.price || 89.99).toFixed(2)}
                            </span>
                            {p.original_price && (
                              <span style={{ fontSize: 13, color: 'var(--muted-color)', textDecoration: 'line-through' }}>
                                ${p.original_price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
                            {posPct}% Positive
                          </span>
                        </div>

                        {/* Call-to-action button */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          width: '100%', padding: '9px 14px', borderRadius: 8,
                          background: 'var(--bg-elevated)', border: '1px solid var(--line)',
                          color: 'var(--ink)', fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
                        }}>
                          <span>View Reviews & Details</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="panel p6" style={{ textAlign: 'center', padding: 50 }}>
                <Package size={44} color="var(--muted-color)" style={{ marginBottom: 14 }} />
                <h3 style={{ margin: '0 0 6px' }}>No products found</h3>
                <p style={{ color: 'var(--muted-color)', fontSize: 14, margin: '0 0 16px' }}>
                  No items match "{searchQuery}" in category "{selectedCategory}".
                </p>
                <button
                  className="btn secondary"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          CART DRAWER & SLIDE-OVER OVERLAY
          ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCartDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCartDrawer(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(5, 5, 12, 0.75)',
                backdropFilter: 'blur(6px)', zIndex: 998
              }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 460,
                background: 'var(--bg-elevated)', borderLeft: '1px solid var(--line)',
                zIndex: 999, display: 'flex', flexDirection: 'column', boxShadow: '-15px 0 40px rgba(0,0,0,0.6)'
              }}
            >
              {/* Drawer Header */}
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShoppingCart size={20} color="var(--accent)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>Your Shopping Cart</h3>
                    <span style={{ fontSize: 12, color: 'var(--muted-color)' }}>{cartCount} item{cartCount === 1 ? '' : 's'} reserved</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCartDrawer(false)}
                  className="btn secondary"
                  style={{ padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cartItems.length > 0 ? (
                  cartItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', gap: 14, padding: 14, borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line-subtle)'
                      }}
                    >
                      <div style={{ width: 68, height: 68, borderRadius: 8, overflow: 'hidden', minWidth: 68, background: 'var(--bg-base)' }}>
                        <img src={item.image || defaultProductImages.Default} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700 }}>{item.category}</span>
                        <h4 style={{ margin: '2px 0 6px', fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#4ade80', fontSize: 15 }}>${(item.price * item.quantity).toFixed(2)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--line)', borderRadius: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.id, -1)}
                              style={{ background: 'none', border: 'none', color: 'var(--ink)', padding: '4px 8px', cursor: 'pointer' }}
                            >-</button>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '0 4px' }}>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.id, 1)}
                              style={{ background: 'none', border: 'none', color: 'var(--ink)', padding: '4px 8px', cursor: 'pointer' }}
                            >+</button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.id)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted-color)' }}>
                    <ShoppingCart size={48} style={{ opacity: 0.25, marginBottom: 12 }} />
                    <p style={{ margin: 0, fontSize: 14 }}>Your cart is empty.</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted-color)' }}>Explore authentic verified products and click Add to Cart.</p>
                  </div>
                )}
              </div>

              {/* Drawer Footer & Checkout */}
              {cartItems.length > 0 && (
                <div style={{ padding: '20px 24px', borderTop: '1px solid var(--line)', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--ink-secondary)' }}>
                    <span>Subtotal ({cartCount} items)</span>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--ink-secondary)' }}>
                    <span>Student Shipping</span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>FREE Express</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 16, fontWeight: 900, color: 'var(--ink)' }}>
                    <span>Total Due</span>
                    <span style={{ color: '#4ade80' }}>${cartSubtotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    className="btn"
                    disabled={orderCelebration}
                    onClick={handleCheckout}
                    style={{ width: '100%', padding: '14px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {orderCelebration ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Confirming Student Reservation…
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        Complete Student Checkout
                      </>
                    )}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--muted-color)' }}>
                    🔒 Secured Student Guarantee · Zero Risk Return Policy
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Toast Notification */}
      <AnimatePresence>
        {cartToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
              background: 'linear-gradient(135deg, rgba(26,26,46,0.95), rgba(15,15,26,0.98))',
              border: '1px solid rgba(74,222,128,0.4)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              borderRadius: 12, padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)', fontSize: 13
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(74,222,128,0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={16} />
            </div>
            <span style={{ fontWeight: 600 }}>{cartToast}</span>
            <button
              type="button"
              onClick={() => setCartToast(null)}
              style={{ background: 'none', border: 'none', color: 'var(--muted-color)', cursor: 'pointer', marginLeft: 8 }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
