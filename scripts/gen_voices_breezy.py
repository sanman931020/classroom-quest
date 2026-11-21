"""
以 BreezyVoice（聯發創新基地，Apache-2.0，臺灣華語）產生學習小短片的人聲。

需求：BreezyVoice 原始碼（https://github.com/mtkresearch/BreezyVoice）與 Python 3.10 虛擬環境。
Windows 上沒有 ttsfrd／WeTextProcessing（僅 Linux），本腳本以「不做文字正規化」的替身模組取代；
台詞已在 src/shorts/voiceLines.ts 先轉好（數字改國字）。破音字由 g2pw 自動標注音。

用法：
    npx tsx scripts/dump-voice-lines.ts > voice-lines.json
    breezy-venv\\Scripts\\python scripts/gen_voices_breezy.py <BreezyVoice 目錄> voice-lines.json public/voice/shorts

角色聲音：以 BreezyVoice 附的臺灣女聲（data/example.wav）為基準，
林老師維持原聲、旁白略高，兒童角色以不同升調與語速區分（音高位移不改變長度）。
"""
import json
import sys
import types
from pathlib import Path

BREEZY = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(BREEZY))
sys.path.insert(0, str(BREEZY / "third_party" / "Matcha-TTS"))

# --- Windows 替身：文字正規化（Linux 才有）不做任何事 ---
class _Identity:
    def __init__(self, *a, **k):
        pass

    def normalize(self, text):
        return text


for name in ["tn", "tn.chinese", "tn.chinese.normalizer", "tn.english", "tn.english.normalizer"]:
    m = types.ModuleType(name)
    m.Normalizer = _Identity
    sys.modules[name] = m

import numpy as np  # noqa: E402
import librosa  # noqa: E402
import soundfile as sf  # noqa: E402
from g2pw import G2PWConverter  # noqa: E402

import single_inference as si  # noqa: E402

PROMPT_WAV = BREEZY / "data" / "example.wav"
PROMPT_TEXT = "在密碼學中，加密是將明文資訊改變為難以讀取的密文內容，使之不可讀的方法。只有擁有解密方法的對象，經由解密過程，才能將密文還原為正常可讀的內容。"

# 角色：升調（半音）、語速倍率
CAST = {
    "teacher": (0.0, 0.97),
    "narrator": (1.5, 1.04),
    "anan": (5.0, 1.08),
    "mi": (4.0, 0.98),
    "hao": (3.5, 1.14),
    "zhe": (2.5, 1.02),
    "yu": (3.0, 1.08),
    "chorus": (4.5, 1.12),
    "girl": (5.5, 1.05),
    "boy": (3.0, 1.06),
}
SR_OUT = 24000


def tidy(y: np.ndarray) -> np.ndarray:
    thr = 0.01 * np.max(np.abs(y))
    idx = np.where(np.abs(y) > thr)[0]
    if len(idx):
        y = y[max(0, idx[0] - 600): idx[-1] + 2400]
    fade = min(240, len(y) // 4)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(y)) or 1
    return (y / peak * 0.89).astype(np.float32)


def main():
    lines = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    out = Path(sys.argv[3]).resolve()
    out.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
    import os

    os.chdir(BREEZY)
    cosy = si.CustomCosyVoice("MediaTek-Research/BreezyVoice-300M")
    conv = G2PWConverter()
    prompt16k = si.load_wav(str(PROMPT_WAV), 16000)
    prompt_text = si.get_bopomofo_rare(cosy.frontend.text_normalize_new(PROMPT_TEXT, split=False), conv)
    manifest_path = out / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    for ln in lines:
        if only and ln["id"] not in only:
            continue
        semis, rate = CAST[ln["part"]]
        text = si.get_bopomofo_rare(cosy.frontend.text_normalize_new(ln["text"], split=False), conv)
        res = cosy.inference_zero_shot_no_normalize(text, prompt_text, prompt16k)
        y = res["tts_speech"].squeeze(0).numpy().astype(np.float32)
        y = librosa.resample(y, orig_sr=22050, target_sr=SR_OUT)
        if abs(rate - 1) > 1e-3:
            y = librosa.effects.time_stretch(y, rate=rate)
        if abs(semis) > 1e-3:
            y = librosa.effects.pitch_shift(y, sr=SR_OUT, n_steps=semis)
        y = tidy(y)
        sf.write(str(out / f'{ln["id"]}.mp3'), y, SR_OUT, format="MP3")
        manifest[ln["id"]] = round(len(y) / SR_OUT, 2)
        print(ln["id"], ln["part"], manifest[ln["id"]], "s", text, flush=True)
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print("done", len(manifest), "lines,", round(sum(manifest.values()), 1), "s total", flush=True)


if __name__ == "__main__":
    main()
