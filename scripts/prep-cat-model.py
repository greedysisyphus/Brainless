#!/usr/bin/env python3
"""把 3D 貓的模型檔（Meshy 匯出的 .glb）壓成網站用的兩個檔：
  src/assets/cat-model.bin   網格。座標壓成 16 位元、法線 8 位元，約 0.75MB（原檔的貼圖有 30MB 以上，網格本身不大）
  src/assets/cat-model.webp  模型自己的貼圖，縮成 1024。只用在原畫投影不到的側面和背面

bin 的格式（小端序）：uint32 頂點數、uint32 索引數、float32×6 外框的最小與最大，
接著依序是 位置 uint16×3（在外框內 0–65535）、法線 int8×3、貼圖座標 uint16×2、索引 uint16。

用法：python3 scripts/prep-cat-model.py 模型.glb    需要 numpy 與 libwebp 的 cwebp。
換模型之後，model.js 裡對齊原畫用的幾個座標（眼睛、腳掌）要重新量。
"""
import json, struct, subprocess, sys, tempfile, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b = open(sys.argv[1], 'rb').read()
jl = struct.unpack_from('<I', b, 12)[0]
j = json.loads(b[20:20 + jl])
bin0 = 20 + jl + 8


def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    assert 'byteStride' not in v or v['byteStride'] == np.dtype(dt).itemsize * n, '交錯排列的資料這支腳本沒處理'
    return np.frombuffer(b, dt, a['count'] * n, bin0 + v.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, n)


assert len(j['meshes']) == 1 and len(j['meshes'][0]['primitives']) == 1, '預期只有一個網格'
assert not any(k in j['nodes'][0] for k in ('matrix', 'rotation', 'scale', 'translation')), '節點上有位移或旋轉，這支腳本沒處理'
p = j['meshes'][0]['primitives'][0]
P, N, UV, I = acc(p['attributes']['POSITION']), acc(p['attributes']['NORMAL']), acc(p['attributes']['TEXCOORD_0']), acc(p['indices']).ravel()
assert len(P) < 65536, '頂點超過 65535 個，索引要改成 32 位元'
lo, hi = P.min(0), P.max(0)
out = os.path.join(ROOT, 'src/assets/cat-model.bin')
with open(out, 'wb') as f:
    f.write(struct.pack('<II6f', len(P), len(I), *lo, *hi))
    f.write(np.round((P - lo) / (hi - lo) * 65535).astype('<u2').tobytes())
    f.write(np.round(np.clip(N, -1, 1) * 127).astype('i1').tobytes())
    f.write(np.round(np.clip(UV, 0, 1) * 65535).astype('<u2').tobytes())
    f.write(I.astype('<u2').tobytes())
print(out, f'{os.path.getsize(out) / 1e6:.2f}MB', f'{len(P)} 頂點 {len(I) // 3} 面', '外框', lo.round(3), hi.round(3))

tex = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
v = j['bufferViews'][j['images'][j['textures'][tex]['source']]['bufferView']]
webp = os.path.join(ROOT, 'src/assets/cat-model.webp')
with tempfile.NamedTemporaryFile(suffix='.png') as f:
    f.write(b[bin0 + v.get('byteOffset', 0):bin0 + v.get('byteOffset', 0) + v['byteLength']]); f.flush()
    subprocess.run(['cwebp', '-quiet', '-q', '80', '-resize', '1024', '1024', f.name, '-o', webp], check=True)
print(webp, f'{os.path.getsize(webp) / 1e6:.2f}MB')
