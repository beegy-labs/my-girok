# LLM API

> AI/LLM microservice for content analysis and semantic search

## Purpose

Provides AI-powered features: content analysis, semantic search, recommendations, and text generation.

## Tech Stack

- **Framework**: FastAPI (Python 3.11)
- **LLM**: OpenAI API / Anthropic API
- **Vector DB**: Pinecone / Weaviate / ChromaDB
- **Protocol**: REST only

## API Endpoints

### REST API (`/api`)

```python
# Content Analysis
POST /api/analyze
Body: { "content": str, "type": "post" | "note" }
Response: { "summary": str, "tags": list[str], "sentiment": str }

# Semantic Search
POST /api/search
Body: { "query": str, "limit": int }
Response: { "results": list[SearchResult] }

# Generate Embeddings
POST /api/embeddings
Body: { "text": str }
Response: { "embedding": list[float] }

# Recommendations
GET /api/recommendations/:userId
Query: limit=10
Response: { "posts": list[Post] }

# Text Generation
POST /api/generate
Body: { "prompt": str, "max_tokens": int }
Response: { "text": str }

# Health Check
GET /health
Response: { "status": "ok", "llm_provider": "openai", "vector_db": "pinecone" }
```

## Key Flows

### Content Analysis

```python
from fastapi import APIRouter, HTTPException
from openai import OpenAI

router = APIRouter()
client = OpenAI(api_key=settings.OPENAI_API_KEY)

@router.post("/analyze")
async def analyze_content(request: AnalyzeRequest):
    try:
        # 1. Generate summary
        summary_response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Summarize the following content in 2-3 sentences."},
                {"role": "user", "content": request.content},
            ],
            max_tokens=150,
        )
        summary = summary_response.choices[0].message.content

        # 2. Extract tags
        tags_response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Extract 3-5 relevant tags from the content. Return as JSON array."},
                {"role": "user", "content": request.content},
            ],
            max_tokens=50,
        )
        tags = json.loads(tags_response.choices[0].message.content)

        # 3. Sentiment analysis
        sentiment_response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Analyze sentiment: positive, neutral, or negative."},
                {"role": "user", "content": request.content},
            ],
            max_tokens=10,
        )
        sentiment = sentiment_response.choices[0].message.content.lower()

        return {
            "summary": summary,
            "tags": tags,
            "sentiment": sentiment,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Semantic Search

```python
import pinecone
from sentence_transformers import SentenceTransformer

# Initialize
pinecone.init(api_key=settings.PINECONE_API_KEY)
index = pinecone.Index("my-girok-posts")
model = SentenceTransformer('all-MiniLM-L6-v2')

@router.post("/search")
async def semantic_search(request: SearchRequest):
    # 1. Generate query embedding
    query_embedding = model.encode(request.query).tolist()

    # 2. Search vector DB
    results = index.query(
        vector=query_embedding,
        top_k=request.limit,
        include_metadata=True,
    )

    # 3. Format response
    search_results = []
    for match in results.matches:
        search_results.append({
            "id": match.id,
            "score": match.score,
            "title": match.metadata.get("title"),
            "excerpt": match.metadata.get("excerpt"),
        })

    return {"results": search_results}
```

### Generate Embeddings (for indexing)

```python
@router.post("/embeddings")
async def generate_embeddings(request: EmbeddingRequest):
    # Generate embedding for new content
    embedding = model.encode(request.text).tolist()

    return {
        "embedding": embedding,
        "dimensions": len(embedding),
    }

# Called by content-api when new post is created
async def index_post(post: Post):
    # 1. Generate embedding
    embedding_response = await llm_client.post(
        "/api/embeddings",
        json={"text": f"{post.title} {post.content}"},
    )
    embedding = embedding_response.json()["embedding"]

    # 2. Store in vector DB
    index.upsert([
        {
            "id": post.id,
            "values": embedding,
            "metadata": {
                "title": post.title,
                "excerpt": post.excerpt,
                "authorId": post.authorId,
            },
        }
    ])
```

### Recommendations

```python
@router.get("/recommendations/{user_id}")
async def get_recommendations(user_id: str, limit: int = 10):
    # 1. Get user's reading history
    user_posts = await get_user_posts(user_id)

    # 2. Generate average embedding from user's content
    user_embeddings = [model.encode(post.content) for post in user_posts]
    avg_embedding = np.mean(user_embeddings, axis=0).tolist()

    # 3. Find similar content
    results = index.query(
        vector=avg_embedding,
        top_k=limit,
        filter={"authorId": {"$ne": user_id}},  # Exclude own posts
        include_metadata=True,
    )

    return {"posts": [format_result(r) for r in results.matches]}
```

## Data Models

```python
from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    content: str
    type: Literal["post", "note"]

class AnalyzeResponse(BaseModel):
    summary: str
    tags: list[str]
    sentiment: Literal["positive", "neutral", "negative"]

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

class SearchResult(BaseModel):
    id: str
    score: float
    title: str
    excerpt: str

class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dimensions: int
```

## Integration Points

### Outgoing (This service calls)
- **Vector DB** (Pinecone/Weaviate): Store and query embeddings
- **OpenAI/Anthropic**: LLM API calls

### Incoming (Other services call)
- **content-api**: Calls for content analysis when post is created
- **web-bff**: Calls for search and recommendations
- **mobile-bff**: Calls for mobile search

## Environment Variables

```bash
# LLM Provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=openai # or anthropic

# Vector Database
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=my-girok-posts

# Or ChromaDB (self-hosted)
CHROMA_URL=http://chromadb:8000

# Model
EMBEDDING_MODEL=all-MiniLM-L6-v2
LLM_MODEL=gpt-4
```

## Dependencies

```txt
# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
openai==1.3.5
anthropic==0.7.1
pinecone-client==2.2.4
sentence-transformers==2.2.2
numpy==1.24.3
pydantic==2.5.0
python-dotenv==1.0.0
```

## Performance

- Cache embeddings (avoid regeneration)
- Batch embedding generation
- Use smaller models for speed (e.g., MiniLM)
- Rate limit LLM API calls
- Use streaming for long-form generation

## Cost Optimization

- Use cheaper models for simple tasks (gpt-3.5-turbo)
- Cache LLM responses (1 hour TTL)
- Implement request deduplication
- Monitor token usage

## Security

- API key validation
- Rate limiting: 100 req/min per user
- Input validation (max 10K chars)
- Sanitize prompts (prevent injection)
- No PII in LLM requests

## Error Handling

```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Retry logic for LLM API
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def call_llm_with_retry(prompt: str):
    return await client.chat.completions.create(...)
```

## Monitoring

- Track LLM API costs
- Monitor response times
- Log failed requests
- Alert on high error rates
