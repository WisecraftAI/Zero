# Agent ML Training (Python)

Yes - this trains separate ML models for each agent in Python.

Agents supported:

- `ba`
- `manual_qa`
- `automation_qa`
- `manager`

Each agent gets its own binary quality model (approve vs reject) trained from feedback.

## 1) Install

```bash
cd ml-training
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Prepare feedback data

Use JSONL with fields:

- `agent`
- `input_text`
- `output_text`
- `label` (1=good, 0=bad)
- `fix_instruction`

Starter file: `data/sample_feedback.jsonl`

## 3) Train per-agent models

```bash
python train_agents.py --data data/sample_feedback.jsonl --out models
```

Output:

- `models/<agent>/quality_model.joblib`
- `models/<agent>/training_rows.json`
- `models/metrics.json`

## 4) Score a generated output

```bash
python predict_agent.py --models models --agent manual_qa --input "Aha requirement doc" --output "Generated test cases text"
```

Returns quality probability and a fix suggestion if score is below threshold.

## Production integration pattern

1. Run Node pipeline as usual.
2. Call this Python scorer after each agent output.
3. If low score, auto-trigger rewrite prompt using `suggested_fix`.
4. Store feedback (accepted/rejected) and retrain nightly.

This is the first ML layer. Next step is true fine-tuning or LoRA per agent using your accepted artifact history.
