import json
import logging
import re
from difflib import SequenceMatcher
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Comment

import ai
from models import (
    VALID_CATEGORIES,
    Category,
    Price,
    Product,
    RawExtraction,
    Variant,
)

logger = logging.getLogger(__name__)

# Elements to strip from the HTML
STRIP_TAGS = {"script", "style", "svg", "noscript", "iframe", "link",
              "aside", "form", "button", "input", "select", "option",
              "template", "dialog", "picture", "img"}
STRIP_SEMANTIC = {"header", "footer", "nav"}
ICON_PATTERNS = re.compile(r"(1x1|pixel|spacer|blank|favicon|icon\b|\.ico|sprite|tracking)", re.I)
MAX_CLEANED_TEXT_CHARS = 40_000

SYSTEM_PROMPT = """\
You are a product data extraction engine. Given preprocessed HTML and structured data \
from an e-commerce product detail page, extract all product information into the schema provided.

Guidelines:
- name: The full product name as displayed on the page.
- brand: The brand or manufacturer.
- price: The current selling price, currency code (e.g. "USD", "GBP"), and compare_at_price if the item is on sale.
- description: A comprehensive product description combining all descriptive text on the page.
- key_features: A list of distinct product features or bullet points found on the page.
- colors: All available color options for this product.
- image_urls: Only include full-resolution product images (not thumbnails, icons, or UI elements). \
Prefer the largest/highest-quality version of each image. Normalize protocol-relative URLs by prepending "https:".
- video_url: A product video URL if one exists on the page.
- variants: Each variant is a discrete purchasable configuration (e.g. a specific size, color, width, or fit). \
Each variant has an `attributes` list of {name, value} pairs (e.g. [{"name": "Size", "value": "10"}, {"name": "Color", "value": "Black"}]). \
Include variant-specific price, SKU, availability, and image_url when available. \
If the page lists sizes, colors, fits, or other selectable options, enumerate all combinations visible on the page.
- suggested_category: Your best guess for the Google Product Taxonomy category path \
(e.g. "Apparel & Accessories > Shoes" or "Hardware > Tools > Power Tools > Drills"). \
Use the ">" separator between levels. Be as specific as possible.\
"""


# ---------------------------------------------------------------------------
# HTML preprocessing
# ---------------------------------------------------------------------------

def _extract_jsonld(soup: BeautifulSoup) -> list[dict]:
    """Extract all JSON-LD blocks from the page."""
    results = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(tag.string or "")
            if isinstance(data, list):
                results.extend(data)
            else:
                results.append(data)
        except (json.JSONDecodeError, TypeError):
            continue
    return results


def _extract_meta_tags(soup: BeautifulSoup) -> dict[str, str]:
    """Extract Open Graph and Twitter Card meta tags."""
    meta = {}
    for tag in soup.find_all("meta"):
        prop = tag.get("property") or tag.get("name") or ""
        content = tag.get("content", "")
        if prop and content:
            prop_lower = prop.lower()
            if prop_lower.startswith("og:") or prop_lower.startswith("twitter:"):
                meta[prop_lower] = content
    return meta


def _parse_srcset(srcset: str) -> str | None:
    """Pick the highest-resolution URL from a srcset attribute."""
    candidates = []
    for part in srcset.split(","):
        part = part.strip()
        if not part:
            continue
        tokens = part.split()
        url = tokens[0]
        width = 0
        if len(tokens) > 1:
            desc = tokens[-1]
            match = re.match(r"(\d+)", desc)
            if match:
                width = int(match.group(1))
        candidates.append((width, url))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def _normalize_url(url: str) -> str:
    """Normalize protocol-relative URLs and strip whitespace."""
    url = url.strip()
    if url.startswith("//"):
        return "https:" + url
    return url


def _is_junk_image(url: str) -> bool:
    """Filter out tracking pixels, icons, and other non-product images."""
    return bool(ICON_PATTERNS.search(url)) or url.startswith("data:")


def _extract_image_candidates(soup: BeautifulSoup, jsonld_data: list[dict]) -> list[str]:
    """Collect all candidate product image URLs from the page."""
    urls: set[str] = set()

    for img in soup.find_all("img"):
        for attr in ("src", "data-src"):
            val = img.get(attr, "")
            if val:
                urls.add(_normalize_url(val))
        srcset = img.get("srcset", "")
        if srcset:
            best = _parse_srcset(srcset)
            if best:
                urls.add(_normalize_url(best))

    for source in soup.find_all("source"):
        srcset = source.get("srcset", "")
        if srcset:
            best = _parse_srcset(srcset)
            if best:
                urls.add(_normalize_url(best))

    for item in jsonld_data:
        for key in ("image", "images"):
            val = item.get(key)
            if isinstance(val, str):
                urls.add(_normalize_url(val))
            elif isinstance(val, list):
                for v in val:
                    if isinstance(v, str):
                        urls.add(_normalize_url(v))

    return sorted(u for u in urls if u and not _is_junk_image(u))


def _extract_page_text(soup: BeautifulSoup) -> str:
    """Strip non-content elements, then extract text with line-break separators."""
    for tag in soup.find_all(STRIP_TAGS):
        tag.decompose()

    for tag in soup.find_all(STRIP_SEMANTIC):
        tag.decompose()

    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)

    if len(text) > MAX_CLEANED_TEXT_CHARS:
        text = text[:MAX_CLEANED_TEXT_CHARS] + "\n[...truncated...]"

    return text


def preprocess_html(raw_html: str) -> dict:
    """
    Preprocess raw HTML into components for LLM extraction.

    Returns dict with keys: jsonld, meta_tags, cleaned_html, image_candidates
    """
    soup = BeautifulSoup(raw_html, "lxml")

    jsonld_data = _extract_jsonld(soup)
    meta_tags = _extract_meta_tags(soup)
    image_candidates = _extract_image_candidates(soup, jsonld_data)
    page_text = _extract_page_text(soup)

    logger.info(
        f"Preprocessed: {len(raw_html)} -> {len(page_text)} chars, "
        f"{len(jsonld_data)} JSON-LD blocks, {len(meta_tags)} meta tags, "
        f"{len(image_candidates)} image candidates"
    )

    return {
        "jsonld": jsonld_data,
        "meta_tags": meta_tags,
        "page_text": page_text,
        "image_candidates": image_candidates,
    }


# ---------------------------------------------------------------------------
# Category resolution
# ---------------------------------------------------------------------------

def _fuzzy_match_category(suggestion: str, threshold: float = 0.80) -> str | None:
    """Find the best matching category from the taxonomy via fuzzy matching."""
    suggestion_lower = suggestion.lower().strip()

    if suggestion in VALID_CATEGORIES:
        return suggestion

    best_score = 0.0
    best_match = None
    for cat in VALID_CATEGORIES:
        score = SequenceMatcher(None, suggestion_lower, cat.lower()).ratio()
        if score > best_score:
            best_score = score
            best_match = cat

    if best_score >= threshold and best_match:
        logger.info(f"Category fuzzy match: '{suggestion}' -> '{best_match}' (score={best_score:.2f})")
        return best_match

    return None


def _get_top_category_candidates(suggestion: str, n: int = 10) -> list[str]:
    """Return the top-N closest categories by fuzzy match score."""
    suggestion_lower = suggestion.lower().strip()
    scored = []
    for cat in VALID_CATEGORIES:
        score = SequenceMatcher(None, suggestion_lower, cat.lower()).ratio()
        scored.append((score, cat))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [cat for _, cat in scored[:n]]


async def _resolve_category(suggestion: str, product_name: str) -> Category:
    """Resolve a suggested category string to a validated Category."""
    match = _fuzzy_match_category(suggestion)
    if match:
        return Category(name=match)

    candidates = _get_top_category_candidates(suggestion)
    logger.info(f"Category fallback: asking LLM to pick from {len(candidates)} candidates")

    prompt = (
        f"Product: {product_name}\n"
        f"Suggested category: {suggestion}\n\n"
        f"Which of these Google Product Taxonomy categories best fits this product? "
        f"Reply with ONLY the exact category string.\n\n"
        + "\n".join(f"- {c}" for c in candidates)
    )

    response = await ai.responses(
        "gpt-5-nano",
        [{"role": "user", "content": prompt}],
    )
    chosen = response.output_text.strip()

    if chosen in VALID_CATEGORIES:
        return Category(name=chosen)

    rematch = _fuzzy_match_category(chosen, threshold=0.70)
    if rematch:
        return Category(name=rematch)

    logger.warning(f"Category resolution failed, using best fuzzy match for: {suggestion}")
    return Category(name=candidates[0])


# ---------------------------------------------------------------------------
# Full extraction pipeline
# ---------------------------------------------------------------------------

async def extract_product(raw_html: str) -> Product:
    """Extract a Product from raw HTML using preprocessing + LLM."""
    preprocessed = preprocess_html(raw_html)

    user_content_parts = []

    if preprocessed["jsonld"]:
        jsonld_str = json.dumps(preprocessed["jsonld"], indent=2, default=str)
        if len(jsonld_str) > 20_000:
            jsonld_str = jsonld_str[:20_000] + "\n[...truncated...]"
        user_content_parts.append(f"## Structured Data (JSON-LD)\n{jsonld_str}")

    if preprocessed["meta_tags"]:
        meta_str = "\n".join(f"{k}: {v}" for k, v in preprocessed["meta_tags"].items())
        user_content_parts.append(f"## Meta Tags\n{meta_str}")

    if preprocessed["image_candidates"]:
        imgs = "\n".join(preprocessed["image_candidates"][:50])
        user_content_parts.append(f"## Image Candidates\n{imgs}")

    user_content_parts.append(f"## Page Text\n{preprocessed['page_text']}")

    user_message = "\n\n".join(user_content_parts)

    raw: RawExtraction = await ai.responses(
        "gpt-5-mini",
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        text_format=RawExtraction,
    )

    category = await _resolve_category(raw.suggested_category, raw.name)

    return Product(
        name=raw.name,
        price=raw.price,
        description=raw.description,
        key_features=raw.key_features,
        image_urls=raw.image_urls,
        video_url=raw.video_url,
        category=category,
        brand=raw.brand,
        colors=raw.colors,
        variants=raw.variants,
    )
