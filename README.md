## Channel3 Take Home Assignment

### Usage

**Prerequisites:** Python 3.12+, Node.js, and an OpenRouter API key in `.env`.

```bash
# Install backend dependencies
uv sync

# Extract products from HTML files in data/
uv run python main.py

# Start the API server
uv run python server.py
```

```bash
# In a separate terminal — install and start the frontend
cd frontend
npm install
npm run dev
```

- **Backend** runs at `http://localhost:8000`
- **Frontend** runs at `http://localhost:5173`

To add new products, place HTML files in `data/` and re-run `uv run python main.py`.

---

### System Design

#### Backend Scaling

The extraction pipeline that preprocesses HTML (followed by a single LLM call with structured output) is stateless and horizontally scalable by design. To go from 5 -> 50 million products, the immediate change is replacing the local file-based pipeline (main.py writing products.json) with a distributed architecture:

Message queue ingesting HTML payloads, a fleet of async workers running the preprocessing + LLM (w/ a concurrency-limited semaphore), and a database as the product store (instead of products.json).

**What scales well:**
- Generic preprocessing — no per-site logic means zero maintenance as sites are added
- Text-only extraction — 1-5k chars per page keeps input costs around $0.003/product, or $150k/50M products (can switch to a cheaper model like gpt-5-nano if quality holds)
- 2-step category resolution — fuzzy matching resolves most products without an extra API call

**What won't scale:**
- Fuzzy match loops over all categories per product — wasteful at 50M products, should be replaced by a precomputed embedding index for O(1) lookup
- No retry logic for API failures — would cascade into more drops at scale
- No deduplication or change-detection — re-crawling a site would reprocess unchanged pages unnecessarily (a content hash would resolve this cheaply)

#### Frontend API & Developer Tools

Beyond the basic CRUD endpoints, a production API would expose:

- **`/search`** — vector embeddings over product descriptions for natural language queries (e.g. "size 12 hiking boots under $150")
- **`/filter`** — faceted search across structured fields we already extract (category, brand, color, etc.)
- **`/compare`** — side-by-side diff of multiple products' features and specs
- **`/extract`** — streaming endpoint so agents can submit a URL and receive extraction progress in real time

For developers building new shopping experiences, the most impactful tools would be:

- **Schema customization** — let devs extend the Product model with domain-specific fields (e.g. material breakdown for clothing, nutrition info for food, PC specs for computers) that the LLM prompt adapts to automatically
- **Confidence scoring** — flag low-certainty extractions for human review
- **Embeddable UI components** — product cards, comparison tables, and variant selectors
- **Webhook system** — notify downstream apps when products are updated/extracted for real-time catalog sync
