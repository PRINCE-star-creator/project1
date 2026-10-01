"""
Real-world Review Analysis Engine
Combines:
1. VADER (Valence Aware Dictionary and sEntiment Reasoner) with e-commerce calibrated lexicon & intensifiers
2. English Negative Concord & Phrasal Intent Analysis (handles 'no no dont buy', idioms, purchase rejections)
3. Clause-bounded sentiment scoring (prevents negation bleeding across punctuation boundaries)
4. Multi-Aspect Extraction with localized sentiment attribution
5. Quality flags & star-to-text dissonance detection
6. Tokenization & citation grounding
"""
import re
import hashlib
from typing import Dict, Any, List, Optional
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer, BOOSTER_DICT

VERSION = 'real-vader-nlp-2.1'

# Calibrate booster dictionary for English adverbial intensifiers
BOOSTER_DICT['definitely'] = 0.293
BOOSTER_DICT['certainly'] = 0.293
BOOSTER_DICT['positively'] = 0.293

# Initialize and calibrate VADER with domain-specific e-commerce vocabulary
_analyzer = SentimentIntensityAnalyzer()
if 'definitely' in _analyzer.lexicon:
    del _analyzer.lexicon['definitely']
if 'certainly' in _analyzer.lexicon:
    del _analyzer.lexicon['certainly']

ECOMMERCE_LEXICON = {
    'stellar': 3.2, 'incredible': 3.0, 'superb': 3.1, 'flawless': 3.2, 'premium': 2.4,
    'crisp': 2.2, 'durable': 2.5, 'sturdy': 2.4, 'responsive': 2.5, 'comfortable': 2.6,
    'unusable': -3.2, 'laggy': -2.6, 'overheats': -2.8, 'flimsy': -2.7, 'cheap': -2.2,
    'scratched': -2.3, 'defective': -3.0, 'faulty': -2.9, 'glitchy': -2.5, 'drain': -2.2,
    'draining': -2.4, 'drains': -2.4, 'mediocre': -2.0, 'blazing': 2.5, 'trash': -3.2,
    'garbage': -3.2, 'worthless': -3.0, 'exceeded': 2.8, 'overpriced': -2.4,
    'scam': -3.5, 'horrible': -3.2, 'disaster': -3.2, 'flaw': -2.0, 'flawed': -2.4
}
_analyzer.lexicon.update(ECOMMERCE_LEXICON)

# E-commerce purchase rejection & endorsement patterns
INTENT_PATTERNS = [
    # Purchase / Recommendation Rejections
    (re.compile(r'\b(do\s*not|don\'?t|never|cannot|can\'?t|would\s*not|wouldn\'?t|should\s*not|shouldn\'?t)\s+(buy|purchase|order|recommend|get|bother|trust)\b', re.I), -3.0, 'reject_purchase'),
    (re.compile(r'\b(waste\s+of\s+(money|time|cash))\b', re.I), -3.0, 'waste_of_money'),
    (re.compile(r'\b(avoid\s+(at\s+all\s+costs?|this|buying|it)|stay\s+away|buyer\s+beware|save\s+your\s+money)\b', re.I), -3.0, 'avoid_product'),
    (re.compile(r'\b(not\s+worth\s+(it|the\s+money|the\s+price|a\s+penny|any\s+money|anything))\b', re.I), -2.8, 'not_worth'),
    (re.compile(r'\b(fell\s+apart|stopped\s+working|broke\s+down|died\s+after|quit\s+working|piece\s+of\s+(junk|trash|garbage|crap))\b', re.I), -2.9, 'hardware_failure'),
    (re.compile(r'\b(regret\s+(buying|purchasing|this))\b', re.I), -2.8, 'purchase_regret'),

    # Strong Endorsements
    (re.compile(r'\b(worth\s+every\s+(penny|cent|dollar)|worth\s+it|must\s+buy|highly\s+recommend|exceeded\s+expectations|game\s+changer|best\s+purchase)\b', re.I), 3.0, 'strong_endorsement'),
    (re.compile(r'\b(love\s+(it|this|them)|works?\s+(flawlessly|perfectly|great|like\s+a\s+charm))\b', re.I), 2.8, 'positive_experience'),
    (re.compile(r'\b(no\s+issues|zero\s+complaints|no\s+problems|no\s+regrets)\b', re.I), 2.5, 'absence_of_problems')
]

# Negative concord regex (e.g. 'no no', 'no no no', 'no way no')
NEGATIVE_CONCORD_RE = re.compile(r'\b(no(\s+no)+)\b', re.I)

# Aspect dictionary for multi-aspect extraction
ASPECT_TAXONOMY = {
    'Battery': ['battery', 'charge', 'charging', 'drain', 'power', 'endurance', 'charger'],
    'Camera': ['camera', 'photo', 'picture', 'photos', 'video', 'lens', 'sensor', 'megapixels'],
    'Display': ['display', 'screen', 'brightness', 'resolution', 'oled', 'panel', 'refresh'],
    'Audio': ['audio', 'sound', 'speaker', 'headphones', 'bass', 'treble', 'mic', 'microphone'],
    'Performance': ['performance', 'speed', 'fast', 'slow', 'lag', 'processor', 'smooth', 'snappy', 'ram'],
    'Build Quality': ['build', 'design', 'material', 'sturdy', 'durable', 'plastic', 'metal', 'hinge', 'finish'],
    'Comfort': ['comfort', 'comfortable', 'fit', 'wear', 'lightweight', 'ergonomic', 'heavy'],
    'Delivery': ['delivery', 'shipping', 'package', 'packaging', 'arrived', 'box', 'courier', 'late'],
    'Value': ['price', 'value', 'worth', 'cost', 'expensive', 'cheap', 'deal', 'bargain', 'penny']
}

NEGATIONS = {'not', 'never', 'no', 'hardly', 'barely', 'scarcely', 'dont', 'didnt', 'doesnt', 'isnt', 'wasnt', 'arent', 'wont', 'cant', 'cannot'}

def clean_text(t: str) -> str:
    """Normalize text while keeping alphanumeric and apostrophes."""
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s\']', ' ', t.lower())).strip()

def extract_aspect_sentiments(text: str) -> List[Dict[str, Any]]:
    """
    Extracts aspects and evaluates the localized sentiment window (-4 to +4 tokens) around the aspect.
    """
    tokens = clean_text(text).split()
    aspect_results = []
    seen_aspects = set()

    for aspect_name, keywords in ASPECT_TAXONOMY.items():
        if aspect_name in seen_aspects:
            continue
        for idx, tok in enumerate(tokens):
            if tok in keywords:
                # Capture local token context around aspect
                start = max(0, idx - 4)
                end = min(len(tokens), idx + 5)
                window_str = ' '.join(tokens[start:end])
                window_scores = _analyzer.polarity_scores(window_str)
                comp = window_scores['compound']

                if comp >= 0.05:
                    asp_sentiment = 'Positive'
                elif comp <= -0.05:
                    asp_sentiment = 'Negative'
                else:
                    asp_sentiment = 'Neutral'

                aspect_results.append({
                    'aspect': aspect_name,
                    'keyword': tok,
                    'sentiment': asp_sentiment,
                    'compound': comp,
                    'confidence': round(min(0.99, 0.65 + abs(comp) * 0.3), 2),
                    'context': window_str
                })
                seen_aspects.add(aspect_name)
                break

    return aspect_results

def analyze(text: str, star_rating: Optional[int] = None) -> Dict[str, Any]:
    """
    Real-world review analysis pipeline:
    1. English Negative Concord & Phrasal Intent matching
    2. Clause-bounded VADER scoring
    3. Multi-aspect extraction with local attribution
    4. Quality & Star-dissonance flagging
    5. Token trace and evidence citation
    """
    if not text or not text.strip():
        text = "No review content provided."

    clean_input = text.strip()

    # 1. Detect Intent Patterns (Rejections / Endorsements / Idioms)
    intent_valence = 0.0
    detected_intents = []
    for pat, weight, label in INTENT_PATTERNS:
        matches = pat.findall(clean_input)
        if matches:
            count = len(matches)
            intent_valence += weight * count
            detected_intents.append((label, weight * count))

    # 2. Check Negative Concord ('no no', 'no no no')
    # In colloquial English, repeated negative markers reinforce negativity rather than invert it
    neg_concord_matches = NEGATIVE_CONCORD_RE.findall(clean_input)
    if neg_concord_matches:
        intent_valence -= 2.5 * len(neg_concord_matches)
        detected_intents.append(('negative_concord_emphasis', -2.5))
        # Replace 'no no' with a single negation token so standard VADER doesn't invert sign
        clean_input = NEGATIVE_CONCORD_RE.sub('not', clean_input)

    # 3. Clause-aware segmentation to prevent negation bleeding across punctuation
    clauses = [c.strip() for c in re.split(r'[\.\,\;\!\?\n]+', clean_input) if c.strip()]
    if not clauses:
        clauses = [clean_input]

    clause_scores = []
    for c in clauses:
        scores = _analyzer.polarity_scores(c)
        clause_scores.append(scores)

    # Length-weighted base compound score across clauses
    total_len = sum(max(1, len(c.split())) for c in clauses)
    base_compound = sum(s['compound'] * (len(c.split()) / total_len) for s, c in zip(clause_scores, clauses))

    # 4. Integrate Intent Valence with VADER normalization: s / sqrt(s^2 + 15)
    c_val = max(-0.999, min(0.999, base_compound))
    if abs(c_val) > 0.01:
        s_base = (c_val / abs(c_val)) * ((15.0 * (c_val ** 2)) / max(0.001, 1.0 - (c_val ** 2))) ** 0.5
    else:
        s_base = 0.0

    total_s = s_base + intent_valence
    compound = round(total_s / ((total_s ** 2 + 15.0) ** 0.5), 4)

    # Sifted pos/neg/neu distribution for output
    if compound >= 0.05:
        sentiment = 'Positive'
        pos = min(0.99, max(0.05, (compound + 1.0) / 2.0))
        neg = max(0.0, 1.0 - pos - 0.15)
        neu = 0.15
    elif compound <= -0.05:
        sentiment = 'Negative'
        neg = min(0.99, max(0.05, (abs(compound) + 1.0) / 2.0))
        pos = max(0.0, 1.0 - neg - 0.15)
        neu = 0.15
    else:
        sentiment = 'Neutral'
        pos = 0.1
        neg = 0.1
        neu = 0.8

    vader_scores = {'neg': round(neg, 3), 'neu': round(neu, 3), 'pos': round(pos, 3), 'compound': compound}

    # Confidence calculation based on sentiment intensity and lexical density
    cleaned = clean_text(text)
    tokens = cleaned.split()
    total_tokens = len(tokens)
    confidence = round(min(0.99, 0.60 + abs(compound) * 0.35 + min(0.04, total_tokens * 0.002)), 2)

    # Multi-aspect extraction
    aspects = extract_aspect_sentiments(text)
    theme_labels = [a['aspect'] for a in aspects]

    # Quality flags & dissonance detection
    quality_flags = []
    if any(tok in NEGATIONS for tok in tokens) or neg_concord_matches:
        quality_flags.append('negation_context_present')
    if abs(compound) >= 0.70:
        quality_flags.append('high_intensity_sentiment')
    if total_tokens < 4:
        quality_flags.append('short_text_input')
    if detected_intents:
        quality_flags.append('intent_phrases_detected')

    # Star-to-text dissonance check
    if star_rating is not None:
        if star_rating >= 4 and sentiment == 'Negative':
            quality_flags.append('star_sentiment_dissonance_high_star_negative_text')
        elif star_rating <= 2 and sentiment == 'Positive':
            quality_flags.append('star_sentiment_dissonance_low_star_positive_text')

    # Citations grounded to input review
    ref_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()[:12]
    citations = [
        {
            'type': 'input',
            'label': 'Grounded review input',
            'ref': ref_hash,
            'vader_compound': compound,
            'pos': vader_scores['pos'],
            'neg': vader_scores['neg'],
            'neu': vader_scores['neu']
        }
    ]

    # Analysis trace
    trace = {
        'engine': 'vader-nlp-intent-calibrated',
        'raw_vader': vader_scores,
        'token_count': total_tokens,
        'tokens_sample': tokens[:20],
        'intents_detected': [label for label, _ in detected_intents],
        'clauses_analyzed': len(clauses),
        'aspects_detected': [a['aspect'] for a in aspects],
        'flags': quality_flags
    }

    return {
        'sentiment': sentiment,
        'confidence': confidence,
        'compound': compound,
        'vader_scores': vader_scores,
        'themes': theme_labels,
        'aspect_details': aspects,
        'citations': citations,
        'trace': trace,
        'quality_flags': quality_flags,
        'version': VERSION
    }

