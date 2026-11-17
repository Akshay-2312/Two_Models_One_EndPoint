# Gemini Notebook & External Assets Reference

**Gemini Notebook ID**: `905c9e6b-4884-4df3-b78f-93a19dc97a17`  
**Workspace**: `nlp-lab`  
**Google Drive Workspace Root**: `/content/drive/MyDrive/NLP_Lab` (Drive ID: `1qvzdQ4ws5U9i93CIxr6H7ZoVA212uCto`)  
**Linked Google Account**: `akshayyadav23122005@gmail.com`

---

## 1. Connected Google Colab Notebooks

The 4 official project notebooks are synchronized locally into `notebooks/` with their full cell outputs and execution metadata preserved:

| Notebook | File Name | Drive File ID | Web URL |
| :--- | :--- | :--- | :--- |
| **00** | `00_environment_and_dataset_audit.ipynb` | `1eZrjuCdhcJuQopMSiVfRuEje4lH4hgDQ` | [Open in Colab](https://colab.research.google.com/drive/1eZrjuCdhcJuQopMSiVfRuEje4lH4hgDQ) |
| **01** | `01_amazon_word2vec_bilstm.ipynb` | `1-ct_vW-L4MjtdmvZAs9OeX7uwR_GR3lQ` | [Open in Colab](https://colab.research.google.com/drive/1-ct_vW-L4MjtdmvZAs9OeX7uwR_GR3lQ) |
| **02** | `02_goemotions_distilbert.ipynb` | `1kLFn6gqNX26zaf-qBS29Egz0-cYAbVTo` | [Open in Colab](https://colab.research.google.com/drive/1kLFn6gqNX26zaf-qBS29Egz0-cYAbVTo) |
| **03** | `03_export_inference_and_release_checks.ipynb` | `1O0paXk0Gl4BVRmF3Z2ZGiq42pHIHGw_5` | [Open in Colab](https://colab.research.google.com/drive/1O0paXk0Gl4BVRmF3Z2ZGiq42pHIHGw_5) |

To re-sync notebooks at any time:
```bash
python sync_drive.py --notebooks
```

---

## 2. Gemini Notebook Context (`905c9e6b-4884-4df3-b78f-93a19dc97a17`)

- **Role**: High-level execution guide, research prompts, and architecture reference for the Dual-Architecture NLP Classification Platform.
- **Project Contract**: Follows `NLP_Lab_Gemini_Colab_Agent_Execution_Spec.md`.
- **Target Principles**:
  1. **Amazon Review Rating**: Word2Vec Skip-gram + BiLSTM (5-class ordinal review rating).
  2. **GoEmotions**: Fine-tuned DistilBERT (28 multi-label emotion classification, threshold-tuned on validation data).
