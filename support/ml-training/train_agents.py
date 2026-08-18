import argparse
import json
import math
import random
import re
from collections import Counter
from pathlib import Path


TOKEN_RE = re.compile(r"[a-zA-Z0-9_@.:-]+")


def tokenize(text):
    return [t.lower() for t in TOKEN_RE.findall(text or "")]


def read_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def split_train_test(rows, test_ratio=0.25):
    rows = list(rows)
    random.seed(42)
    random.shuffle(rows)
    n_test = max(1, int(len(rows) * test_ratio))
    return rows[n_test:], rows[:n_test]


def train_naive_bayes(rows):
    pos_counts = Counter()
    neg_counts = Counter()
    pos_docs = 0
    neg_docs = 0
    fixes = []

    for r in rows:
        text = f"INPUT: {r['input_text']} OUTPUT: {r['output_text']}"
        toks = tokenize(text)
        if int(r["label"]) == 1:
            pos_docs += 1
            pos_counts.update(toks)
        else:
            neg_docs += 1
            neg_counts.update(toks)
            fix = (r.get("fix_instruction") or "").strip()
            if fix:
                fixes.append(fix)

    vocab = set(pos_counts.keys()) | set(neg_counts.keys())
    alpha = 1.0
    pos_total = sum(pos_counts.values())
    neg_total = sum(neg_counts.values())

    model = {
        "type": "naive_bayes",
        "vocab_size": len(vocab),
        "alpha": alpha,
        "pos_docs": pos_docs,
        "neg_docs": neg_docs,
        "pos_total": pos_total,
        "neg_total": neg_total,
        "pos_counts": dict(pos_counts),
        "neg_counts": dict(neg_counts),
        "fixes": fixes,
    }
    return model


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


def evaluate(model, rows):
    if not rows:
        return {"accuracy": None, "count": 0}
    good = 0
    for r in rows:
        text = f"INPUT: {r['input_text']} OUTPUT: {r['output_text']}"
        prob = predict_proba(model, text)
        pred = 1 if prob >= 0.5 else 0
        if pred == int(r["label"]):
            good += 1
    return {"accuracy": good / len(rows), "count": len(rows)}


def main():
    parser = argparse.ArgumentParser(
        description="Train separate QA agent ML models (standard library)"
    )
    parser.add_argument("--data", required=True)
    parser.add_argument("--out", default="models")
    args = parser.parse_args()

    rows = read_jsonl(args.data)
    required = {"agent", "input_text", "output_text", "label", "fix_instruction"}
    for i, r in enumerate(rows):
        missing = required - set(r.keys())
        if missing:
            raise ValueError(f"Row {i} missing fields: {sorted(missing)}")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    metrics = {}
    agents = sorted({r["agent"] for r in rows})
    for agent in agents:
        subset = [r for r in rows if r["agent"] == agent]
        labels = {int(r["label"]) for r in subset}
        if len(subset) < 2 or labels != {0, 1}:
            metrics[agent] = {
                "status": "skipped",
                "reason": "need >=2 rows and both labels",
            }
            continue

        train_rows, test_rows = split_train_test(subset)
        model = train_naive_bayes(train_rows)
        eval_metrics = evaluate(model, test_rows)

        agent_dir = out_dir / agent
        agent_dir.mkdir(parents=True, exist_ok=True)

        with open(agent_dir / "quality_model.json", "w", encoding="utf-8") as f:
            json.dump(model, f)

        with open(agent_dir / "training_rows.json", "w", encoding="utf-8") as f:
            json.dump(subset, f, indent=2)

        metrics[agent] = {
            "status": "trained",
            "samples": len(subset),
            "accuracy": eval_metrics["accuracy"],
            "test_count": eval_metrics["count"],
        }

    with open(out_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("Training complete")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
