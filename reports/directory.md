# Project Directory Map

```text
nlp-lab/
├── .github/
│   └── workflows/
│       └── ci.yml
├── artifacts/
│   ├── models/
│   │   ├── distilbert_goemotions/
│   │   │   ├── config.json
│   │   │   ├── final_test_metrics.json
│   │   │   ├── model.safetensors
│   │   │   ├── thresholds.json
│   │   │   ├── tokenizer.json
│   │   │   └── tokenizer_config.json
│   │   ├── onnx/
│   │   │   ├── amazon_bilstm.onnx
│   │   │   ├── amazon_bilstm.onnx.data
│   │   │   ├── amazon_parity.json
│   │   │   ├── goemotions_distilbert.onnx
│   │   │   ├── goemotions_distilbert.onnx.data
│   │   │   ├── goemotions_parity.json
│   │   │   └── onnx_export_manifest.json
│   │   └── word2vec_bilstm/
│   │       ├── amazon_processed_data/
│   │       │   ├── amazon_data_quality.json
│   │       │   ├── amazon_schema.json
│   │       │   ├── test_chunk_0.parquet
│   │       │   ├── test_chunk_1.parquet
│   │       │   ├── test_sampled.parquet
│   │       │   ├── train_chunk_0.parquet
│   │       │   ├── train_chunk_1.parquet
│   │       │   ├── train_chunk_2.parquet
│   │       │   ├── train_chunk_3.parquet
│   │       │   ├── train_chunk_4.parquet
│   │       │   ├── train_chunk_5.parquet
│   │       │   ├── train_sampled.parquet
│   │       │   ├── val_sampled.parquet
│   │       │   └── vocab.json
│   │       ├── amazon_word2vec_skipgram.model
│   │       ├── amazon_word2vec_skipgram.model.syn1neg.npy
│   │       ├── amazon_word2vec_skipgram.model.wv.vectors.npy
│   │       ├── baseline_bilstm_best.pt
│   │       ├── baseline_bilstm_history.json
│   │       ├── embedding_matrix.npy
│   │       ├── final_test_metrics.json
│   │       ├── vocab.json
│   │       ├── w2v_bilstm_best.pt
│   │       ├── w2v_bilstm_history.json
│   │       └── w2v_classification_report.json
│   ├── goemotions_config.json
│   ├── goemotions_thresholds.json
│   ├── README.md
│   └── unified_model_manifest.json
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── schemas.py
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_main.py
│   └── requirements.txt
├── configs/
│   └── requirement.txt
├── data/
│   ├── amazon_data_quality.json
│   ├── amazon_schema.json
│   ├── dataset_explorer_summary.json
│   ├── goemotions_data_quality.json
│   ├── goemotions_label_mapping.json
│   ├── goemotions_schema.json
│   ├── model_lab_artifacts.json
│   ├── README.md
│   └── technology_manifest.json
├── docs/
│   ├── gemini_notebook_context.md
│   ├── NLP_Lab_Frontend_Specification_Visual_Motion_System.md
│   ├── NLP_Lab_Gemini_Colab_Agent_Execution_Spec.md
│   ├── openapi.json
│   └── README.md
├── frontend/
│   ├── auto_qa_tests/
│   │   ├── auto_qa_frontend_test_plan.json
│   │   └── nlp_lab_e2e.spec.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── animator-title-preloader.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Callout.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── circle-reveal-loader.tsx
│   │   │   ├── demo.tsx
│   │   │   ├── hero-3.tsx
│   │   │   ├── hero-parallax.tsx
│   │   │   ├── index.ts
│   │   │   ├── liquid-loader.tsx
│   │   │   ├── liquid-loading.tsx
│   │   │   ├── loader-10.tsx
│   │   │   ├── Meter.tsx
│   │   │   ├── model-init-loader.tsx
│   │   │   └── SectionHeader.tsx
│   │   ├── AnalyzerForm.tsx
│   │   ├── ArchitectureMap.tsx
│   │   ├── DatasetCharts.tsx
│   │   ├── DocumentationReference.tsx
│   │   ├── EntryPreloader.tsx
│   │   ├── InkHero.tsx
│   │   ├── Layout.tsx
│   │   ├── ModelEvaluationPanel.tsx
│   │   ├── MotionProvider.tsx
│   │   ├── PipelineTrack.tsx
│   │   ├── ReadinessProvider.tsx
│   │   ├── Reveal.tsx
│   │   └── SiteFooter.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── documentationData.ts
│   │   ├── motion.ts
│   │   ├── storage.ts
│   │   ├── useDatasetSummary.ts
│   │   ├── useModelLab.ts
│   │   ├── useStatistics.ts
│   │   └── useTechnologyManifest.ts
│   ├── pages/
│   │   ├── analyze/
│   │   │   ├── emotions.tsx
│   │   │   └── sentiment.tsx
│   │   ├── 404.tsx
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── datasets.tsx
│   │   ├── documentation.tsx
│   │   ├── index.tsx
│   │   ├── model-lab.tsx
│   │   └── technology.tsx
│   ├── public/
│   │   ├── tech/
│   │   │   ├── colab-drive.svg
│   │   │   ├── docker.svg
│   │   │   ├── fastapi.svg
│   │   │   ├── gensim.svg
│   │   │   ├── githubactions.svg
│   │   │   ├── gsap.svg
│   │   │   ├── huggingface.svg
│   │   │   ├── kaggle.svg
│   │   │   ├── nextjs.svg
│   │   │   ├── numpy.svg
│   │   │   ├── onnx.svg
│   │   │   ├── playwright.svg
│   │   │   ├── pydantic.svg
│   │   │   ├── pytest.svg
│   │   │   ├── python.svg
│   │   │   ├── pytorch.svg
│   │   │   ├── react.svg
│   │   │   ├── recharts.svg
│   │   │   ├── safetensors.svg
│   │   │   ├── scikitlearn.svg
│   │   │   ├── sources.json
│   │   │   ├── tailwindcss.svg
│   │   │   ├── transformers.svg
│   │   │   ├── typescript.svg
│   │   │   └── uvicorn.svg
│   │   └── favicon.svg
│   ├── scripts/
│   │   ├── ci-playwright-smoke.mjs
│   │   ├── run-browser-qa.mjs
│   │   ├── test-analyzers.mjs
│   │   ├── test-api-states.mjs
│   │   ├── test-datasets.mjs
│   │   ├── test-design-system.mjs
│   │   ├── test-documentation.mjs
│   │   ├── test-entry.mjs
│   │   ├── test-model-lab.mjs
│   │   ├── test-motion.mjs
│   │   ├── test-storage.mjs
│   │   ├── test-technology.mjs
│   │   └── verify-prompt09.mjs
│   ├── styles/
│   │   ├── globals.css
│   │   └── tokens.css
│   ├── .dockerignore
│   ├── .env.example
│   ├── .eslintrc.json
│   ├── components.json
│   ├── debug.log
│   ├── DESIGN_SYSTEM.md
│   ├── Dockerfile
│   ├── next-env.d.ts
│   ├── next.config.mjs
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.tsbuildinfo
├── ml/
│   ├── amazon_rating/
│   │   ├── __init__.py
│   │   └── inference.py
│   ├── common/
│   │   ├── __init__.py
│   │   └── onnx_export.py
│   ├── go_emotions/
│   │   ├── __init__.py
│   │   └── inference.py
│   └── __init__.py
├── notebooks/
│   ├── 00_environment_and_dataset_audit.ipynb
│   ├── 01_amazon_word2vec_bilstm.ipynb
│   ├── 02_goemotions_distilbert.ipynb
│   └── 03_export_inference_and_release_checks.ipynb
├── reports/
│   ├── failures/
│   ├── figures/
│   │   ├── amazon_confusion_matrix.png
│   │   ├── amazon_text_length_dist.png
│   │   ├── goemotions_token_length_dist.png
│   │   ├── phase01_dashboard_desktop_1440.png
│   │   ├── phase01_dashboard_mobile_390.png
│   │   ├── phase01_readiness_state.png
│   │   ├── phase01_sentiment_result_1440.png
│   │   ├── phase02_entry_card.png
│   │   ├── phase02_hero_align_center.png
│   │   ├── phase02_landing_1440.png
│   │   ├── phase02_landing_390.png
│   │   ├── phase02_landing_390_full.png
│   │   ├── phase02_landing_976.png
│   │   ├── phase02_landing_976_full.png
│   │   ├── phase02_landing_full.png
│   │   ├── phase02_landing_no_js.png
│   │   ├── phase02_landing_sections_1440.png
│   │   ├── phase02_readiness_degraded.png
│   │   ├── phase02_readiness_offline.png
│   │   ├── phase02_readiness_online.png
│   │   ├── phase02_reduced_motion.png
│   │   ├── phase02_sidebar_collapsed.png
│   │   └── phase02_sidebar_expanded.png
│   ├── metrics/
│   │   ├── baseline_bilstm_history.json
│   │   ├── distilbert_goemotions_test_metrics.json
│   │   ├── w2v_bilstm_history.json
│   │   ├── word2vec_bilstm_test_metrics.json
│   │   └── word2vec_classification_report.json
│   ├── directory.md
│   ├── environment.json
│   ├── environment_requirements.txt
│   ├── ISSUE_TRACKER.csv
│   ├── PHASE_01_PROGRESS.md
│   ├── PHASE_02_PROGRESS.md
│   ├── progress.md
│   ├── progressFT.md
│   ├── research_report.md
│   └── SOURCE_CODE_REDTEAM_AUDIT.md
├── scripts/
│   ├── export_and_check_onnx.py
│   ├── export_openapi.py
│   └── generate_technology_manifest.py
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── README.md
└── sync_drive.py
```
