import hashlib, re

VERSION = 'mock-v1.1.0'
POS = {'excellent','great','good','amazing','love','perfect','fast','clear','comfortable','best','happy','helpful','easy','smooth','quality','worth','recommend','recommended','impressed','nice','superb','solid','liked','pleased'}
NEG = {'bad','terrible','poor','disappointing','slow','worst','hate','broken','awful','drains','issue','problem','late','difficult','weak','waste','useless','ugly','annoying','flawed','defective','scratch','fails'}
NEGATIONS = {'not', 'never', 'no', 'hardly', 'barely', 'scarcely', 'dont', 'didnt', 'doesnt', 'isnt', 'wasnt', 'arent', 'wont', 'cant', 'cannot', 'neither', 'nor', 'seldom'}

THEMES = {
    'battery': ['battery','charge','charging','drain','power'],
    'camera': ['camera','photo','picture','photos','video'],
    'display': ['display','screen','brightness','resolution'],
    'audio': ['audio','sound','speaker','headphones','bass'],
    'delivery': ['delivery','shipping','arrived','package','late'],
    'packaging': ['packaging','box','package'],
    'comfort': ['comfort','comfortable','fit','wear'],
    'performance': ['performance','speed','fast','slow','lag']
}

def clean(t):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s]', ' ', t.lower())).strip()

def analyze(text):
    c = clean(text)
    toks = c.split()
    
    pos_hits = []
    neg_hits = []
    
    for i, w in enumerate(toks):
        prev_window = toks[max(0, i-3):i]
        is_negated = any(nw in NEGATIONS for nw in prev_window)
        
        if w in POS:
            if is_negated:
                neg_hits.append(f"not_{w}")
            else:
                pos_hits.append(w)
        elif w in NEG:
            if is_negated:
                pos_hits.append(f"not_{w}")
            else:
                neg_hits.append(w)
                
    p = len(pos_hits)
    n = len(neg_hits)
    total = max(1, p + n)
    raw = (p - n) / total
    
    if raw > 0.15:
        label = 'Positive'
    elif raw < -0.15:
        label = 'Negative'
    else:
        label = 'Neutral'
        
    confidence = round(min(0.99, 0.58 + abs(raw) * 0.36 + min(0.12, (p + n) * 0.01)), 2)
    
    themes = []
    for theme, words in THEMES.items():
        hits = [w for w in words if w in toks]
        if hits:
            h = hits[0]
            idx = toks.index(h)
            before = toks[max(0, idx - 4): min(len(toks), idx + 5)]
            pp = 0
            nn = 0
            for j, bw in enumerate(before):
                w_neg = any(nw in NEGATIONS for nw in before[max(0, j-3):j])
                if bw in POS:
                    if w_neg: nn += 1
                    else: pp += 1
                elif bw in NEG:
                    if w_neg: pp += 1
                    else: nn += 1
            sl = 'Positive' if pp > nn else 'Negative' if nn > pp else 'Neutral'
            themes.append({
                'theme': theme.title(),
                'sentiment': sl,
                'confidence': round(0.62 + min(0.3, abs(pp - nn) * 0.08), 2),
                'evidence': hits
            })
            
    digest = hashlib.sha256(c.encode()).hexdigest()[:12]
    citations = [{'type': 'input', 'label': 'Uploaded review', 'ref': digest}]
    trace = {
        'raw_text': text,
        'normalized_text': c,
        'tokens': toks,
        'positive_hits': pos_hits,
        'negative_hits': neg_hits,
        'decision': label,
        'confidence': confidence,
        'version': VERSION
    }
    return {
        'sentiment': label,
        'confidence': confidence,
        'themes': themes,
        'citations': citations,
        'trace': trace
    }

