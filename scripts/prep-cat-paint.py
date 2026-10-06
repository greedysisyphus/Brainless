#!/usr/bin/env python3
"""把照原畫筆法重畫的貓身體（左側、右側、背面，白底，ChatGPT 畫的）整理成可以投影回 3D 模型的圖：
  去掉白底，再縮放、平移到跟模型的正側面算繪圖（參考圖）輪廓疊得最準的位置。
出來的圖跟參考圖同一個框：1024 見方、正交、畫面 2.2 單位寬、中心高度 0.85，walk.js 就照這組數字投影。

用法：python3 scripts/prep-cat-paint.py 重畫的圖資料夾 參考圖資料夾    兩邊都要有 left / right / back。需要 libwebp 的 dwebp、cwebp。
"""
import os, struct, subprocess, sys, tempfile, zlib
import numpy as np

PAINT, REF = sys.argv[1:3]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 1024


def read(path):  # webp 或 PNG（先轉成 webp）→ RGB 陣列，底是白的
    with tempfile.TemporaryDirectory() as d:
        if not path.endswith('.webp'):
            subprocess.run(['cwebp', '-quiet', '-lossless', path, '-o', d + '/a.webp'], check=True); path = d + '/a.webp'
        subprocess.run(['dwebp', '-quiet', path, '-pam', '-o', d + '/a.pam'], check=True)
        f = open(d + '/a.pam', 'rb'); head = b''
        while not head.endswith(b'ENDHDR\n'): head += f.readline()
        w, h = (int(head.split(k)[1].split()[0]) for k in (b'WIDTH ', b'HEIGHT '))
        a = np.frombuffer(f.read(), 'u1').reshape(h, w, 4).astype(np.float64)
        return a[..., :3] * a[..., 3:] / 255 + 255 - a[..., 3:]  # 透明的地方當成白底


def resize(a, size):  # 最近鄰：只用來比輪廓
    h, w = a.shape[:2]
    return a[(np.arange(size) * h / size).astype(int)][:, (np.arange(size) * w / size).astype(int)]


def ink(a): return (255 - a.min(2)) / 255  # 離白色多遠


for name in ('left', 'right', 'back'):
    paint = read(next(p for p in (f'{PAINT}/{name}.webp', f'{PAINT}/{name}.png') if os.path.exists(p)))
    ref = read(f'{REF}/cat-{name}.png')
    # 對位：把兩張輪廓縮成 256 見方，試各種縮放，每種縮放用傅立葉算出疊得最多的平移
    N = 256
    R = (ink(resize(ref, N)) > 0.08).astype(float)
    M0 = (ink(paint) > 0.08).astype(float)
    best = (-1,)
    for s in np.arange(0.8, 1.2001, 0.01):  # s：畫要放大幾倍（相對「整張縮成一樣大」）
        n = int(round(N * s)); m = resize(M0, n)
        pad = np.zeros((2 * N, 2 * N)); pad[:min(n, 2 * N), :min(n, 2 * N)] = m[:2 * N, :2 * N]
        big = np.zeros((2 * N, 2 * N)); big[:N, :N] = R
        cc = np.fft.irfft2(np.fft.rfft2(big) * np.conj(np.fft.rfft2(pad)), (2 * N, 2 * N))
        dy, dx = np.unravel_index(cc.argmax(), cc.shape)
        iou = cc.max() / (R.sum() + m.sum() - cc.max())
        if iou > best[0]: best = (iou, s, dx - 2 * N if dx > N else dx, dy - 2 * N if dy > N else dy)
    iou, s, dx, dy = best
    # 照找到的縮放、平移，把畫重新取樣到參考圖的框裡（雙線性）
    h, w = paint.shape[:2]
    k = s * SIZE / w  # 畫上一個像素在輸出裡佔幾個像素
    oy, ox = np.mgrid[0:SIZE, 0:SIZE]
    px, py = (ox + 0.5 - dx * SIZE / N) / k - 0.5, (oy + 0.5 - dy * SIZE / N) / k - 0.5
    inside = (px >= 0) & (px <= w - 1) & (py >= 0) & (py <= h - 1)
    x0, y0 = np.clip(np.floor(px).astype(int), 0, w - 2), np.clip(np.floor(py).astype(int), 0, h - 2)
    fx, fy = np.clip(px - x0, 0, 1)[..., None], np.clip(py - y0, 0, 1)[..., None]
    out = (paint[y0, x0] * (1 - fx) + paint[y0, x0 + 1] * fx) * (1 - fy) + (paint[y0 + 1, x0] * (1 - fx) + paint[y0 + 1, x0 + 1] * fx) * fy
    out[~inside] = 255
    # 去白底：越白越透明；半透明的邊緣把混進去的白色扣掉，疊到別的顏色上才不會有白邊
    a = np.clip(ink(out) / 0.16, 0, 1)[..., None]
    rgb = np.clip((out - 255 * (1 - a)) / np.maximum(a, 0.05), 0, 255)
    rgba = np.concatenate([rgb, a * 255], 2).astype('u1')
    raw = b''.join(b'\0' + rgba[y].tobytes() for y in range(SIZE))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    dst = os.path.join(ROOT, f'src/assets/cat-paint-{name}.webp')
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')); f.flush()
        subprocess.run(['cwebp', '-quiet', '-q', '82', '-alpha_q', '90', f.name, '-o', dst], check=True)
    print(name, f'輪廓重疊 {iou:.2f}  放大 {s:.2f}  平移 ({dx * SIZE // N}, {dy * SIZE // N})  →', dst, f'{os.path.getsize(dst) / 1e3:.0f}KB')
