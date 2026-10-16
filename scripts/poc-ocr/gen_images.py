"""Membuat gambar contoh soal matematika untuk POC OCR multimodal.

Menjalankan:  python scripts/poc-ocr/gen_images.py
Menghasilkan: scripts/poc-ocr/img/*.png
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUT = Path(__file__).parent / "img"
OUT.mkdir(parents=True, exist_ok=True)

# (nama_file, teks mathtext, judul untuk catatan)
CASES = [
    ("polinom", r"$f(x) = 3x^2 + 2x - 5$", "Polinomial"),
    ("turunan", r"$\frac{d}{dx}\left(x^3 - 4x + 7\right)$", "Turunan"),
    ("integral", r"$\int_{0}^{1} x^2 \, dx$", "Integral"),
]


def render(name: str, tex: str, note: str) -> None:
    fig = plt.figure(figsize=(6, 2.2), dpi=200)
    fig.patch.set_facecolor("white")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.axis("off")
    # sedikit "noise" ringan agar menyerupai foto papan tulis
    ax.text(
        0.5,
        0.5,
        tex,
        fontsize=34,
        ha="center",
        va="center",
        color="#1a1a2e",
        rotation=-1.5,
    )
    fig.savefig(OUT / f"{name}.png", facecolor="white", bbox_inches="tight", pad_inches=0.3)
    plt.close(fig)
    print(f"  {name}.png  <- {note}  ({tex})")


if __name__ == "__main__":
    print("Membuat gambar POC OCR:")
    for name, tex, note in CASES:
        render(name, tex, note)
    print(f"Selesai. Gambar di {OUT}")
