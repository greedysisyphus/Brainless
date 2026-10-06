#!/usr/bin/env python3
"""把白底的貓身體圖（手繪或 AI 畫的）處理成立體貓用的 src/assets/cat-body.webp：去掉白底、裁到剛好、縮成 900 寬。
只去掉跟畫面邊緣連通的白，身體裡面的淺色（胸口、腳掌的亮點）不會被挖洞。

用法：python3 scripts/prep-cat-body.py 來源圖（webp、png、jpg 都可以）
跑完會印出圖的高度；engine.js 的 BAR 要等於 高度 / 900。需要 numpy 與 libwebp 的 dwebp / cwebp。
"""
import subprocess, sys, tempfile, os
import numpy as np

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src/assets/cat-body.webp')

with tempfile.NamedTemporaryFile(suffix='.pam') as f, tempfile.NamedTemporaryFile(suffix='.webp') as w:
    if not SRC.lower().endswith('.webp'):  # PNG、JPEG 先轉一手，dwebp 只讀 webp
        subprocess.run(['cwebp', '-lossless', SRC, '-o', w.name], check=True, capture_output=True)
        SRC = w.name
    subprocess.run(['dwebp', SRC, '-pam', '-o', f.name], check=True, capture_output=True)
    raw = open(f.name, 'rb').read()
head, _, data = raw.partition(b'ENDHDR\n')
kv = dict(l.split(None, 1) for l in head.decode().splitlines()[1:] if ' ' in l)
H, W = int(kv['HEIGHT']), int(kv['WIDTH'])
img = np.frombuffer(data, np.uint8).reshape(H, W, 4)[..., :3].astype(np.float32) / 255

ink = 1 - img.min(axis=2)                 # 離白色多遠
pale = ink < 0.14                          # 可能是紙
bg = np.zeros((H, W), bool)
bg[0], bg[-1], bg[:, 0], bg[:, -1] = pale[0], pale[-1], pale[:, 0], pale[:, -1]
while True:                                # 從邊緣往內淹：只有連得到邊緣的白才是背景
    grow = bg.copy()
    grow[1:] |= bg[:-1]; grow[:-1] |= bg[1:]; grow[:, 1:] |= bg[:, :-1]; grow[:, :-1] |= bg[:, 1:]
    grow &= pale
    if (grow == bg).all(): break
    bg = grow
alpha = np.where(bg, np.clip((ink - 0.02) / 0.1, 0, 1), 1).astype(np.float32)
col = np.clip((img - (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3), 0, 1)  # 把混進去的白扣掉

ys, xs = np.nonzero(alpha > 0.3)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
w, h = x1 - x0, y1 - y0
oh = round(900 * h / w)
with tempfile.NamedTemporaryFile(suffix='.pam') as f:
    f.write(f'P7\nWIDTH {W}\nHEIGHT {H}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n'.encode())
    f.write((np.dstack([col, alpha]) * 255 + 0.5).astype(np.uint8).tobytes())
    f.flush()
    subprocess.run(['cwebp', '-q', '88', '-alpha_q', '100', '-crop', str(x0), str(y0), str(w), str(h), '-resize', '900', str(oh), f.name, '-o', OUT], check=True, capture_output=True)
print(OUT, f'900x{oh}', f'BAR = {oh} / 900')
