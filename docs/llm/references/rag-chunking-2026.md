# RAG & Document Chunking - 2026 Best Practices

> Optimal chunking strategies for RAG systems | **Updated**: 2026-01-22

## Optimal Chunk Sizes

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

```yaml
benefits:
  - Embeddings capture section context
  - Natural semantic boundaries
  - Preserves document hierarchy
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

## Tools (2026)

| Tool                                     | Purpose                |
| ---------------------------------------- | ---------------------- |
| LangChain RecursiveCharacterTextSplitter | Hierarchical splitting |
| LlamaIndex SimpleNodeParser              | Semantic boundaries    |
| rag-chunk CLI                            | Markdown benchmarking  |
| tiktoken                                 | GPT token counting     |

## Sources

- [Unstructured - Chunking Best Practices](https://unstructured.io/blog/chunking-for-rag-best-practices)
- [Weaviate - Chunking Strategies](https://weaviate.io/blog/chunking-strategies-for-rag)
- [Microsoft Azure - Chunk Documents](https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents)
- [RAG About It - Enterprise Framework 2026](https://ragaboutit.com/the-chunking-decision-framework-how-enterprise-teams-choose-between-semantic-fixed-and-hybrid-strategies/)
- [Stack Overflow - Chunking in RAG](https://stackoverflow.blog/2024/12/27/breaking-up-is-hard-to-do-chunking-in-rag-applications/)
