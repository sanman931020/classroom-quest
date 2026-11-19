"""
產生學習小短片的人聲音檔（Kokoro-82M，本機、免費、Apache-2.0）。

使用方式（需要另建虛擬環境，不放進專案）：
    python -m venv kokoro-venv
    kokoro-venv\\Scripts\\pip install torch --index-url https://download.pytorch.org/whl/cpu
    kokoro-venv\\Scripts\\pip install "kokoro>=0.9.4" "misaki[zh]>=0.9.4" soundfile
    npx tsx scripts/dump-voice-lines.ts > voice-lines.json
    kokoro-venv\\Scripts\\python scripts/gen_voices.py voice-lines.json public/voice/shorts

每個角色使用不同聲音；兒童角色以「放慢生成＋升調重取樣」讓聲音更像小朋友、語速維持自然。
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR = 24000
# 角色：Kokoro 聲音、最終語速、升調倍率（1＝不變）
CAST = {
    "teacher": ("zf_xiaoxiao", 0.95, 1.00),
    "narrator": ("zf_xiaoni", 1.02, 1.04),
    "anan": ("zf_xiaoyi", 1.06, 1.12),
    "mi": ("zf_xiaobei", 1.00, 1.12),
    "hao": ("zm_yunxia", 1.10, 1.22),
    "zhe": ("zm_yunxi", 1.02, 1.20),
    "yu": ("zm_yunjian", 1.05, 1.24),
    "chorus": ("zm_yunyang", 1.10, 1.16),
    "girl": ("zf_xiaobei", 1.05, 1.20),
    "boy": ("zm_yunxi", 1.05, 1.26),
}


def pitch_up(y: np.ndarray, factor: float) -> np.ndarray:
    if abs(factor - 1) < 1e-3:
        return y
    n = int(len(y) / factor)
    pos = np.arange(n) * factor
    return np.interp(pos, np.arange(len(y)), y).astype(np.float32)


def tidy(y: np.ndarray) -> np.ndarray:
    # 去頭尾靜音、淡入淡出、音量正規化
    thr = 0.01 * np.max(np.abs(y))
    idx = np.where(np.abs(y) > thr)[0]
    if len(idx):
        y = y[max(0, idx[0] - 600) : idx[-1] + 2400]
    fade = min(240, len(y) // 4)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(y)) or 1
    return (y / peak * 0.89).astype(np.float32)


def main():
    lines = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    pipe = KPipeline(lang_code="z", repo_id="hexgrad/Kokoro-82M")
    manifest = {}
    for ln in lines:
        voice, speed, factor = CAST[ln["part"]]
        chunks = [a.cpu().numpy() if hasattr(a, "cpu") else np.asarray(a) for _, _, a in pipe(ln["text"], voice=voice, speed=speed / factor)]
        y = np.concatenate(chunks) if chunks else np.zeros(SR // 2, dtype=np.float32)
        y = tidy(pitch_up(y, factor))
        path = out / f'{ln["id"]}.mp3'
        sf.write(str(path), y, SR, format="MP3")
        manifest[ln["id"]] = round(len(y) / SR, 2)
        print(ln["id"], ln["part"], manifest[ln["id"]], "s", ln["text"])
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print("done", len(manifest), "lines,", round(sum(manifest.values()), 1), "s total")


if __name__ == "__main__":
    main()
