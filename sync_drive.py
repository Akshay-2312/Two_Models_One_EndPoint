import argparse
import subprocess
import sys
import os

DRIVE_FOLDER_ID = "1qvzdQ4ws5U9i93CIxr6H7ZoVA212uCto"

# Remote path/folder ID mapping in Google Drive
REMOTE_DIRS = {
    "artifacts/model-manifests": "1moUgJyEvRVYvM1Sqb9yD3do0oyhXw-FZ",
    "checkpoints/distilbert_goemotions": "1VX0O6rFLOjGHeC4Kqe8InW7A4NC485ay",
    "checkpoints/word2vec_bilstm": "1sVrjaLGQgh4miFjIFJKtYKyd4RyQLbcd",
    "reports": "1TcvVHpztpc7BUASSMV2KS6IhWc56t_ww",
    "reports/figures": "13mitO1cJtbKFuNssljM8sWpROQ4V_Kf7",
    "processed_data/amazon_reviews": "1PUlgtsbRQct7A5dmGfRgN_AcQUghwhuw",
    "processed_data/go_emotions": "1TAfAFJ-Sr33gQV2Go809PYR_3bwDdIpX",
}

COLAB_NOTEBOOKS = [
    ("1eZrjuCdhcJuQopMSiVfRuEje4lH4hgDQ", "notebooks/00_environment_and_dataset_audit.ipynb"),
    ("1-ct_vW-L4MjtdmvZAs9OeX7uwR_GR3lQ", "notebooks/01_amazon_word2vec_bilstm.ipynb"),
    ("1kLFn6gqNX26zaf-qBS29Egz0-cYAbVTo", "notebooks/02_goemotions_distilbert.ipynb"),
    ("1O0paXk0Gl4BVRmF3Z2ZGiq42pHIHGw_5", "notebooks/03_export_inference_and_release_checks.ipynb"),
]

def run_gdrive(cmd_args):
    res = subprocess.run(["gdrive"] + cmd_args, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error executing gdrive {' '.join(cmd_args)}:\n{res.stderr}", file=sys.stderr)
    return res

def sync_notebooks():
    print("[*] Synchronizing 4 Google Colab notebooks from Google Drive...")
    for file_id, dest_path in COLAB_NOTEBOOKS:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        print(f"Downloading {dest_path}...")
        run_gdrive(["readonly", "download", file_id, "--out", dest_path])
    print("[+] All Colab notebooks synced successfully with execution outputs preserved.")

def sync_metadata():
    print(f"[*] Connected to Google Drive NLP_Lab ({DRIVE_FOLDER_ID})")
    print("[*] Downloading latest schemas, manifests, and metrics into local repository...")
    
    files_to_sync = [
        # Manifests
        ("1VGENVULFC751dDjyN2gZ9A7glC5XXqLk", "artifacts/unified_model_manifest.json"),
        ("163udOxyG2MWk8eL9blKdVhB8AvIaa820", "artifacts/goemotions_thresholds.json"),
        ("1qtPF8RnforXovhg92wgul-nw3ewfesT3", "artifacts/goemotions_config.json"),
        # Data specs & quality reports
        ("1waavOV5Bx68l4DQorqr5f0qZu5kQauvn", "data/goemotions_data_quality.json"),
        ("1WbSqlBLXPFT-OucX4aSl1xt3p9uQURt7", "data/goemotions_label_mapping.json"),
        ("12VduE-rCw-ybLqRtgolbYPq9tBxW1d2s", "data/goemotions_schema.json"),
        ("1nUxco-Av9_F2cGwTwq4eASjmb6SuLCgN", "data/amazon_data_quality.json"),
        ("1DRAAjdPiX12XGDh_sIjJwcAJMiWYIB6x", "data/amazon_schema.json"),
        # Reports & metrics
        ("1yl99pErc40PV2KdRKZ-15sODyVtgpuUM", "reports/environment.json"),
        ("1TByJWFKEYipx_g2v2qM2va-4s1GNJvXq", "reports/environment_requirements.txt"),
        ("1eF60M3S9QVxx_mOcSCNSSuuSSxJF6hNk", "reports/metrics/distilbert_goemotions_test_metrics.json"),
        ("10HA2hnnX2bVd5nZkZDFmICsrnTl5ZWVX", "reports/metrics/word2vec_bilstm_test_metrics.json"),
        ("12hcWYD4vZXAM-VIKtV_LMKI2enKh-3kS", "reports/metrics/word2vec_classification_report.json"),
        ("1XMZznc08P5rPAcc0pHmrLZQvQu5kKSE2", "reports/metrics/baseline_bilstm_history.json"),
        ("1bZpirJT4vlLz9qDvUDr_dSBKuSEoarW6", "reports/metrics/w2v_bilstm_history.json"),
        # Figures
        ("1SEKub8N-_lFYhvPOT0egUbme_oYSpKVt", "reports/figures/amazon_confusion_matrix.png"),
        ("1qZ5EPL8tWV2PLEMizPKnhlaoqVI6AdE6", "reports/figures/amazon_text_length_dist.png"),
        ("1oWn5b2bU5qQx4dQu6PCnHITnCrbZr6Ax", "reports/figures/goemotions_token_length_dist.png"),
    ]

    for file_id, dest_rel_path in files_to_sync:
        os.makedirs(os.path.dirname(dest_rel_path), exist_ok=True)
        print(f"Downloading {dest_rel_path}...")
        run_gdrive(["readonly", "download", file_id, "--out", dest_rel_path])

    print("[+] Metadata and metrics synchronization complete.")

def download_weights(target_model="all"):
    weights = []
    if target_model in ("all", "go_emotions"):
        weights.append(("11Tsb_WONwC86yD3wNhaLvmQXYU2fVSCW", "artifacts/weights/distilbert_goemotions/model.safetensors"))
        weights.append(("1Jl74UtF_ay9eu2GVazG8JwFdlGGf4Jac", "artifacts/weights/distilbert_goemotions/tokenizer.json"))
        weights.append(("12EhVM2K9KkRYEwYWrMTkIdIWVR_Qzsda", "artifacts/weights/distilbert_goemotions/tokenizer_config.json"))
    if target_model in ("all", "amazon_rating"):
        weights.append(("1Yib0CiJNxhKf9aqEXthPKOqDRFcMLH_v", "artifacts/weights/word2vec_bilstm/w2v_bilstm_best.pt"))
        weights.append(("19YMWqsSCg1NJN32xR40xhnBdM6kemu7b", "artifacts/weights/word2vec_bilstm/embedding_matrix.npy"))

    for file_id, dest_path in weights:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        print(f"Downloading model weight file {dest_path}...")
        run_gdrive(["readonly", "download", file_id, "--out", dest_path])
    print("[+] Weights download complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync files from NLP_Lab Google Drive")
    parser.add_argument("--weights", action="store_true", help="Download large model checkpoint weights")
    parser.add_argument("--notebooks", action="store_true", help="Download 4 active Google Colab notebooks")
    parser.add_argument("--model", type=str, default="all", choices=["all", "go_emotions", "amazon_rating"])
    args = parser.parse_args()

    if args.notebooks:
        sync_notebooks()
    elif args.weights:
        download_weights(args.model)
    else:
        sync_metadata()
