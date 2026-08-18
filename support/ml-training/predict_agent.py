import argparse
import json
import math
import re
from pathlib import Path


TOKEN_RE = re.compile(r"[a-zA-Z0-9_@.:-]+")


def tokenize(text):
    return [t.lower() for t in TOKEN_RE.findall(text or "")]


def predict_proba(model, text):
    toks = tokenize(text)
    alpha = model["alpha"]
    v = max(1, model["vocab_size"])
    pos_docs = max(1, model["pos_docs"])
    neg_docs = max(1, model["neg_docs"])
    total_docs = pos_docs + neg_docs

    log_pos = math.log(pos_docs / total_docs)
    log_neg = math.log(neg_docs / total_docs)

    pos_total = model["pos_total"]
    neg_total = model["neg_total"]
    pos_counts = model["pos_counts"]
    neg_counts = model["neg_counts"]

    for tok in toks:
        p_pos = (pos_counts.get(tok, 0) + alpha) / (pos_total + alpha * v)
        p_neg = (neg_counts.get(tok, 0) + alpha) / (neg_total + alpha * v)
        log_pos += math.log(p_pos)
        log_neg += math.log(p_neg)

    score = log_pos - log_neg
    return 1.0 / (1.0 + math.exp(-score))


def main():
    parser = argparse.ArgumentParser(
        description="Score output quality for a specific QA agent"
    )
    parser.add_argument("--models", default="models")
    parser.add_argument("--agent", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--threshold", type=float, default=0.65)
    args = parser.parse_args()

    model_path = Path(args.models) / args.agent / "quality_model.json"
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found for agent '{args.agent}': {model_path}"
        )

    model = json.loads(model_path.read_text(encoding="utf-8"))
    text = f"INPUT: {args.input}\nOUTPUT: {args.output}"
    quality = predict_proba(model, text)
    approved = quality >= args.threshold
    suggested_fix = ""
    if not approved and model.get("fixes"):
        suggested_fix = model["fixes"][0]

    print(
        json.dumps(
            {
                "agent": args.agent,
                "quality_probability": quality,
                "approved": approved,
                "threshold": args.threshold,
                "suggested_fix": suggested_fix,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
