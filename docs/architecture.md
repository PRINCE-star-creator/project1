# System Architecture

```text
Next.js student/admin UI
        |
        v
FastAPI /api/v1
  |       |       |
 Auth   Products  Reviews
  |       |       |
  v       v       v
PostgreSQL/SQLite  NLP service
                   |-- NLTK-style preprocessing
                   |-- TF-IDF
                   |-- calibrated Linear SVM
                   |-- aspect window extraction
                   v
             transparent rating engine
```

The application deliberately separates marketplace adapters from the normalized product model. Live provider data must be marked `live`; fallback records are marked `demo`.
