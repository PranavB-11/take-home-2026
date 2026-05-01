import asyncio
import json
import logging
from pathlib import Path

from extract import extract_product

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = Path(__file__).parent / "products.json"

logger = logging.getLogger(__name__)

# For parallel processing (rate limiting)
MAX_CONCURRENT = 10
_semaphore = asyncio.Semaphore(MAX_CONCURRENT)


async def _process_file(html_file: Path) -> dict | None:
    async with _semaphore:
        logger.info(f"Processing {html_file.name}...")
        raw_html = html_file.read_text(encoding="utf-8")
        try:
            product = await extract_product(raw_html)
            logger.info(f"  -> Extracted: {product.name} ({product.brand})")
            return product.model_dump()
        except Exception:
            logger.exception(f"  -> Failed to extract from {html_file.name}")
            return None


async def process_all():
    html_files = sorted(DATA_DIR.glob("*.html"))
    if not html_files:
        logger.error("No HTML files found in data/")
        return

    logger.info(f"Found {len(html_files)} HTML files to process (max {MAX_CONCURRENT} concurrent)")

    results = await asyncio.gather(*[_process_file(f) for f in html_files])
    products = [r for r in results if r is not None]

    OUTPUT_FILE.write_text(json.dumps(products, indent=2, default=str), encoding="utf-8")
    logger.info(f"Wrote {len(products)} products to {OUTPUT_FILE}")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    asyncio.run(process_all())
