import json
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from extract import extract_product
from models import Product

PRODUCTS_FILE = Path(__file__).parent / "products.json"

app = FastAPI(title="Product Extraction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)


def _load_products() -> list[dict]:
    if PRODUCTS_FILE.exists():
        return json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
    return []


@app.get("/api/products")
def list_products():
    return _load_products()


@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    products = _load_products()
    if product_id < 0 or product_id >= len(products):
        raise HTTPException(status_code=404, detail="Product not found")
    return products[product_id]


@app.post("/api/extract")
async def extract(request: Request):
    raw_html = (await request.body()).decode("utf-8")
    if not raw_html.strip():
        raise HTTPException(status_code=400, detail="Empty HTML body")
    product = await extract_product(raw_html)
    return product.model_dump()


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    uvicorn.run(app, host="0.0.0.0", port=8000)
