# Research Report

## 1. Executive Summary
Overview of experiments, models evaluated, and primary takeaways.

## 2. Datasets & Problem Formulation
- **Amazon Rating Prediction**: Text classification / ordinal regression for review ratings.
- **GoEmotions**: Multi-label fine-grained emotion classification across 27 emotion categories + neutral.

## 3. Modeling & Methodology
- Preprocessing & tokenization strategies
- Baseline architectures vs fine-tuned transformers
- Loss functions, regularizers, and optimization parameters

## 4. Evaluation & Results
- Benchmark metrics (Precision, Recall, F1-score, MAE/RMSE where applicable)
- Comparative analysis across model checkpoints

## 5. Failure Analysis & Qualitative Insights
- Common misclassifications, ambiguous samples, and label overlap
- Detailed inspection of out-of-distribution performance

## 6. Deployment & Latency Benchmarks
- Inference runtime, memory footprints, and optimization techniques (e.g. quantization/ONNX)
