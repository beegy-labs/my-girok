# RAG & Document Chunking Best Practices - 2026

This guide covers optimal chunking strategies for RAG (Retrieval-Augmented Generation) systems as of 2026.

## Overview

| Use Case       | Tokens    | Characters   | Rationale             |
| -------------- | --------- | ------------ | --------------------- |
| General Q&A    | 256-512   | ~1,000-2,000 | Precision-focused     |
| Technical docs | 400-500   | ~1,600-2,000 | Captures full context |
| Context-heavy  | 512-1,024 | ~2,000-4,000 | Complex relationships |

**Enterprise 2026 Standard**: Semantic-first with size constraints (min 200, max 1,000 tokens)

## Chunking Strategies

| Strategy     | Description                                 | Best For                |
| ------------ | ------------------------------------------- | ----------------------- |
| Recursive    | Hierarchical separators (`\n\n`, `\n`, ` `) | General purpose         |
| Semantic     | Embedding similarity grouping               | Context-aware chunks    |
| Header-based | Split by markdown headers                   | Technical documentation |
| Agentic      | LLM-driven splitting                        | Complex documents       |

### Header-Based Chunking

Improves retrieval accuracy by **40-60%** for technical documentation.

**Benefits**:

- Embeddings capture section context
- Natural semantic boundaries
- Preserves document hierarchy

### Recursive Character Splitting

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", " ", ""],
    length_function=len,
)

chunks = splitter.split_text(document)
```

### Semantic Chunking

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

splitter = SemanticChunker(
    OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95,
)

chunks = splitter.split_text(document)
```

## Overlap Recommendations

| Chunk Size   | Overlap | Percentage |
| ------------ | ------- | ---------- |
| 256 tokens   | 25-50   | 10-20%     |
| 512 tokens   | 50-100  | 10-20%     |
| 1,024 tokens | 100-200 | 10-20%     |

## Context Window Optimization (128k)

```
128k budget allocation:
├── System prompt:    ~5k tokens (4%)
├── Conversation:    ~20k tokens (16%)
├── Code context:    ~30k tokens (23%)
└── Documents:       ~70k tokens (55%)
    └── ~35 docs × 2,000 avg tokens
```

### Lost-in-the-Middle Effect

LLMs weight beginning and end more heavily:

- Place critical info at **start** or **end**
- Avoid important context in middle sections
- Use summarization for long middle sections

## Token-to-Lines Conversion

For markdown documents with code blocks:

| Lines | Tokens (approx) |
| ----- | --------------- |
| 50    | ~500            |
| 100   | ~1,000          |
| 150   | ~1,500          |
| 200   | ~2,000          |

## Implementation Example

### Document Processor

```typescript
interface ChunkConfig {
  maxTokens: number;
  overlapTokens: number;
  separators: string[];
}

const defaultConfig: ChunkConfig = {
  maxTokens: 500,
  overlapTokens: 50,
  separators: ['\n\n', '\n', '. ', ' '],
};

function chunkDocument(content: string, config: ChunkConfig = defaultConfig): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  // Split by highest-priority separator first
  for (const separator of config.separators) {
    const parts = content.split(separator);

    for (const part of parts) {
      const potential = currentChunk + separator + part;
      const tokens = estimateTokens(potential);

      if (tokens > config.maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = part;
      } else {
        currentChunk = potential;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return addOverlap(chunks, config.overlapTokens);
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
```

### Markdown Header Chunker

```typescript
interface MarkdownChunk {
  content: string;
  headers: string[];
  level: number;
}

function chunkByHeaders(markdown: string): MarkdownChunk[] {
  const chunks: MarkdownChunk[] = [];
  const lines = markdown.split('\n');

  let currentChunk: MarkdownChunk = {
    content: '',
    headers: [],
    level: 0,
  };

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous chunk
      if (currentChunk.content.trim()) {
        chunks.push({ ...currentChunk });
      }

      const level = headerMatch[1].length;
      const title = headerMatch[2];

      // Update header stack
      currentChunk.headers = currentChunk.headers.slice(0, level - 1);
      currentChunk.headers.push(title);
      currentChunk.level = level;
      currentChunk.content = line + '\n';
    } else {
      currentChunk.content += line + '\n';
    }
  }

  // Add final chunk
  if (currentChunk.content.trim()) {
    chunks.push(currentChunk);
  }

  return chunks;
}
```

## Retrieval Optimization

### Hybrid Search

```typescript
interface RetrievalConfig {
  vectorWeight: number; // 0.7 recommended
  keywordWeight: number; // 0.3 recommended
  topK: number;
  rerank: boolean;
}

async function hybridSearch(query: string, config: RetrievalConfig): Promise<Document[]> {
  // Vector similarity search
  const vectorResults = await vectorStore.similaritySearch(query, config.topK * 2);

  // Keyword search (BM25)
  const keywordResults = await keywordStore.search(query, config.topK * 2);

  // Combine scores
  const combined = mergeResults(
    vectorResults,
    keywordResults,
    config.vectorWeight,
    config.keywordWeight,
  );

  // Optional reranking
  if (config.rerank) {
    return reranker.rerank(query, combined, config.topK);
  }

  return combined.slice(0, config.topK);
}
```

## Tools (2026)

| Tool                                     | Purpose                |
| ---------------------------------------- | ---------------------- |
| LangChain RecursiveCharacterTextSplitter | Hierarchical splitting |
| LlamaIndex SimpleNodeParser              | Semantic boundaries    |
| rag-chunk CLI                            | Markdown benchmarking  |
| tiktoken                                 | GPT token counting     |

## Best Practices Summary

| Practice          | Recommendation                              |
| ----------------- | ------------------------------------------- |
| Chunk size        | 400-500 tokens for technical docs           |
| Overlap           | 10-20% of chunk size                        |
| Strategy          | Header-based for docs, semantic for general |
| Context placement | Critical info at start/end                  |
| Retrieval         | Hybrid vector + keyword search              |

## Anti-Patterns to Avoid

| Don't            | Do                   | Reason                 |
| ---------------- | -------------------- | ---------------------- |
| Fixed-size only  | Semantic boundaries  | Context preservation   |
| No overlap       | 10-20% overlap       | Information continuity |
| Single strategy  | Hybrid approach      | Better recall          |
| Ignore structure | Use headers/sections | Document semantics     |
| Skip reranking   | Cross-encoder rerank | Precision improvement  |

## Sources

- [Unstructured - Chunking Best Practices](https://unstructured.io/blog/chunking-for-rag-best-practices)
- [Weaviate - Chunking Strategies](https://weaviate.io/blog/chunking-strategies-for-rag)
- [Microsoft Azure - Chunk Documents](https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents)
- [RAG About It - Enterprise Framework 2026](https://ragaboutit.com/the-chunking-decision-framework-how-enterprise-teams-choose-between-semantic-fixed-and-hybrid-strategies/)
- [Stack Overflow - Chunking in RAG](https://stackoverflow.blog/2024/12/27/breaking-up-is-hard-to-do-chunking-in-rag-applications/)

---

_Last Updated: 2026-01-22_
