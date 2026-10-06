#!/usr/bin/env python3
"""把綁好骨架、帶動作的 3D 貓（Meshy 的 Animate 匯出的 .glb）整理成網站用的兩個檔：
  src/assets/cat-walk.glb   網格、骨架、動作，拿掉內嵌的貼圖（原檔大半是一張 PNG）
  src/assets/cat-walk.webp  貼圖，縮成 1024

用法：python3 scripts/prep-cat-rig.py 模型.glb    需要 libwebp 的 cwebp。
"""
import json, struct, subprocess, sys, tempfile, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b = open(sys.argv[1], 'rb').read()
jl = struct.unpack_from('<I', b, 12)[0]
j = json.loads(b[20:20 + jl])
bin0 = 20 + jl + 8
view = lambda v: b[bin0 + v.get('byteOffset', 0):bin0 + v.get('byteOffset', 0) + v['byteLength']]

tex = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
img = j['images'][j['textures'][tex]['source']]
webp = os.path.join(ROOT, 'src/assets/cat-walk.webp')
with tempfile.NamedTemporaryFile(suffix='.png') as f:
    f.write(view(j['bufferViews'][img['bufferView']])); f.flush()
    subprocess.run(['cwebp', '-quiet', '-q', '80', '-resize', '1024', '1024', f.name, '-o', webp], check=True)

# 丟掉圖片佔的、還有沒人用的那幾段資料，其餘的重新接起來，編號跟著改
drop = {i['bufferView'] for i in j.get('images', [])} | (set(range(len(j['bufferViews']))) - {a['bufferView'] for a in j['accessors'] if 'bufferView' in a})  # 圖片，還有沒人用的資料
remap, out = {}, bytearray()
for i, v in enumerate(j['bufferViews']):
    if i in drop: continue
    while len(out) % 4: out.append(0)
    remap[i] = len(remap)
    nv = dict(v, byteOffset=len(out)); nv['buffer'] = 0
    out += view(v)
    j['bufferViews'][i] = nv
j['bufferViews'] = [v for i, v in enumerate(j['bufferViews']) if i not in drop]
for a in j['accessors']:
    if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
for k in ('images', 'textures', 'samplers'): j.pop(k, None)
j['materials'] = [{'name': 'cat'}]
while len(out) % 4: out.append(0)
j['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(j, separators=(',', ':')).encode()
js += b' ' * (-len(js) % 4)
glb = os.path.join(ROOT, 'src/assets/cat-walk.glb')
with open(glb, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)))
    f.write(struct.pack('<I4s', len(js), b'JSON') + js)
    f.write(struct.pack('<I4s', len(out), b'BIN\0') + out)
print(glb, f'{os.path.getsize(glb) / 1e6:.2f}MB', '動作', [a.get('name') for a in j.get('animations', [])])
print(webp, f'{os.path.getsize(webp) / 1e6:.2f}MB')
