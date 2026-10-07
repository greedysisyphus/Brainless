#!/usr/bin/env python3
"""把一張白底（或透明底）的水彩圖去背、裁到剛好包住顏料、縮小，存成 webp。量尺上的樹和睡覺的貓用。

用法：python3 scripts/prep-cutout.py 圖 輸出的名字 長邊幾px    → src/assets/<名字>.webp，並印出寬高。需要 libwebp 的 dwebp、cwebp。
"""
import os, struct, subprocess, sys, tempfile, zlib
import numpy as np

SRC, NAME, LONG = sys.argv[1], sys.argv[2], int(sys.argv[3])
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with tempfile.TemporaryDirectory() as d:
    if not SRC.endswith('.webp'):
        subprocess.run(['cwebp', '-quiet', '-lossless', SRC, '-o', d + '/a.webp'], check=True); SRC = d + '/a.webp'
    subprocess.run(['dwebp', '-quiet', SRC, '-pam', '-o', d + '/a.pam'], check=True)
    f = open(d + '/a.pam', 'rb'); head = b''
    while not head.endswith(b'ENDHDR\n'): head += f.readline()
    w, h = (int(head.split(k)[1].split()[0]) for k in (b'WIDTH ', b'HEIGHT '))
    a = np.frombuffer(f.read(), 'u1').reshape(h, w, 4).astype(np.float64)
    img = a[..., :3] * a[..., 3:] / 255 + 255 - a[..., 3:]              # 透明的地方當成白底
    ink = (255 - img.min(2)) / 255                                      # 離白色多遠
    alpha = np.clip((ink - 0.045) / 0.13, 0, 1)[..., None]                # 紙的底不是純白，很淡的地方直接當透明，不然圖後面會有一塊淡淡的方框
    rgb = np.clip((img - 255 * (1 - alpha)) / np.maximum(alpha, 0.05), 0, 255)  # 半透明的邊緣把混進去的白色扣掉
    ys, xs = np.nonzero(ink > 0.06)
    y0, y1, x0, x1 = max(ys.min() - 4, 0), ys.max() + 5, max(xs.min() - 4, 0), xs.max() + 5
    rgba = np.concatenate([rgb, alpha * 255], 2)[y0:y1, x0:x1].astype('u1')
    hh, ww = rgba.shape[:2]
    raw = b''.join(b'\0' + rgba[y].tobytes() for y in range(hh))
    chunk = lambda t, data: struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data))
    open(d + '/b.png', 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', ww, hh, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))
    k = LONG / max(ww, hh)
    dst = os.path.join(ROOT, f'src/assets/{NAME}.webp')
    subprocess.run(['cwebp', '-quiet', '-q', '84', '-alpha_q', '90', '-resize', str(round(ww * k)), str(round(hh * k)), d + '/b.png', '-o', dst], check=True)
    print(dst, f'{round(ww * k)}×{round(hh * k)}', f'{os.path.getsize(dst) / 1e3:.0f}KB')
