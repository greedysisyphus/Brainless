#!/usr/bin/env python3
"""把貓做成 2D 的「紙偶」：頭、身體、尾巴、前腳、後腳各是一片水彩畫（ChatGPT 照側面那張圖拆開重畫的零件圖），
每一片切成細格子的平面，綁在跟 3D 貓同一副骨架上。走路、吃東西這些動作直接沿用，但畫面上只有畫在動，沒有 3D 模型。

做四件事：
  1. 把零件圖上的五塊分開（連在一起的顏料算一塊，照位置認出誰是誰）。
  2. 每一塊對回側面原圖的位置和大小（比對花紋；腿只比腳掌，因為腿的上半截在原圖裡被毛蓋住）。
  3. 每一塊切格子、分配骨頭：頭整片跟頭骨；身體照前後位置分給脊椎；尾巴、腿沿著自己那串骨頭分。
  4. 疊的順序（先畫的在後面）：遠側的腿（同一塊圖調暗）→ 尾巴 → 身體 → 近側的腿 → 頭。近側的腿整條蓋在身體外面，看得到大腿在擺。

用法：python3 scripts/paper-cat.py 帶動作的貓.glb（retarget-cat.py 的輸出） 零件圖.png
另外會讀 src/assets/cat-paint-left.webp（prep-cat-paint.py 對好位的側面原圖：1024 見方、2.2 單位寬、中心高度 0.85）。
輸出：src/assets/cat-paper.glb、src/assets/cat-parts.webp。需要 libwebp 的 dwebp、cwebp。
"""
import json, os, struct, subprocess, sys, tempfile, zlib
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TYPES = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
COMPS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
SIZE, SPAN, CY = 1024, 2.2, 0.85
K = SIZE / SPAN
STEP = 7                      # 格子多細（零件圖上的 px）
FAR_SHADE = 0.74              # 另一側的腿調多暗
LIFT = 0.12                   # 身體、頭、尾巴整個往上抬多少（模型單位）：腿露出來長一點，走路才看得清楚腳在動
bone = lambda k: 'head' if k == 22 else 'Bone_%03d' % k
CHAINS = {'tail': [21, 20, 19, 18, 17, 16], 'front': [34, 33, 32, 31, 30], 'rear': [11, 10, 9, 8, 7]}  # 每一串由根到尖；腿是近側（貓的左邊）
FAR = {'front': [29, 28, 27, 26, 25], 'rear': [6, 5, 4, 3, 2]}
TRUNK = [1, 15, 14, 13, 12]   # 脊椎由後到前


def read(path):  # webp 或 PNG → RGB 陣列，底是白的
    with tempfile.TemporaryDirectory() as d:
        if not path.endswith('.webp'):
            subprocess.run(['cwebp', '-quiet', '-lossless', path, '-o', d + '/a.webp'], check=True); path = d + '/a.webp'
        subprocess.run(['dwebp', '-quiet', path, '-pam', '-o', d + '/a.pam'], check=True)
        f = open(d + '/a.pam', 'rb'); head = b''
        while not head.endswith(b'ENDHDR\n'): head += f.readline()
        w, h = (int(head.split(k)[1].split()[0]) for k in (b'WIDTH ', b'HEIGHT '))
        a = np.frombuffer(f.read(), 'u1').reshape(h, w, 4).astype(np.float64)
        return a[..., :3] * a[..., 3:] / 255 + 255 - a[..., 3:]


ink = lambda a: (255 - a.min(2)) / 255  # 離白色多遠
gray = lambda a: a.mean(2) / 255
sheet, orig = read(sys.argv[2]), read(os.path.join(ROOT, 'src/assets/cat-paint-left.webp'))
H, Wd = sheet.shape[:2]

# ---- 1. 分塊：縮成 1/3 來標號（相鄰的顏料一路傳最小的編號），最大的五塊是零件，碎屑（鬍鬚、毛尖）歸給最近的那一塊
Q = 3
h3, w3 = H // Q, Wd // Q
ms = (ink(sheet) > 0.06)[:h3 * Q, :w3 * Q].reshape(h3, Q, w3, Q).any((1, 3))
lab = np.where(ms, np.arange(h3 * w3).reshape(h3, w3) + 1, 0)
while True:
    n = lab.copy()
    for sy, sx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
        r = np.roll(lab, (sy, sx), (0, 1)); n = np.where(ms & (r > 0) & (r < n), r, n)
    if (n == lab).all(): break
    lab = n
ids, cnt = np.unique(lab[lab > 0], return_counts=True)
names, L = [], np.zeros_like(lab)
for b_ in ids[np.argsort(-cnt)[:5]]:
    ys, xs = np.nonzero(lab == b_); cx, cy = xs.mean() * Q, ys.mean() * Q
    name = 'body' if abs(cx - Wd / 2) < Wd * .12 and abs(cy - H * .6) < H * .15 else ('head' if cx < Wd / 2 else 'tail') if cy < H / 2 else 'front' if cx < Wd / 2 else 'rear'
    names.append(name); L[lab == b_] = len(names)
assert sorted(names) == ['body', 'front', 'head', 'rear', 'tail'], names
todo = ms & (L == 0)
for _ in range(40):
    for sy, sx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        r = np.roll(L, (sy, sx), (0, 1)); t = todo & (r > 0); L[t] = r[t]; todo &= ~t
L = np.pad(np.repeat(np.repeat(L, Q, 0), Q, 1), ((0, H - h3 * Q), (0, Wd - w3 * Q)))
box = {}
for i, name in enumerate(names):
    ys, xs = np.nonzero(L == i + 1); box[name] = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

# ---- 2. 對位：每一塊在原圖上找花紋最像的位置和大小（正規化的相關係數，用傅立葉算），在一半解析度上找
O = gray(orig).reshape(512, 2, 512, 2).mean((1, 3)); Om = (ink(orig) > .06).reshape(512, 2, 512, 2).mean((1, 3))
pick = lambda a, nh, nw: a[(np.arange(nh) * a.shape[0] / nh).astype(int)][:, (np.arange(nw) * a.shape[1] / nw).astype(int)]
fit = {}  # 名字 → (縮放, 這一塊左上角在原圖框裡的 x, y)：零件圖上的 (X, Y) 對到原圖框的 ((X - x0) * s + dx, (Y - y0) * s + dy)
for name, scales, crop in (('head', np.arange(.6, 1.001, .01), 1), ('body', np.arange(.7, 1.151, .01), 1), ('tail', np.arange(.7, 1.151, .01), 1),
                           ('front', np.arange(.7, 1.101, .02), .3), ('rear', np.arange(.7, 1.101, .02), .3)):
    x0, y0, x1, y1 = box[name]
    yc = int(y1 - (y1 - y0) * crop)  # 腿只拿最下面三成（腳掌）去比
    mk0 = (L[yc:y1, x0:x1] == names.index(name) + 1).astype(float); T = gray(sheet[yc:y1, x0:x1]); best = (-9,)
    for s in scales:
        nh, nw = int((y1 - yc) * s / 2), int((x1 - x0) * s / 2)
        if nh > 500 or nw > 500: continue
        t, mk = pick(T, nh, nw), pick(mk0, nh, nw); n = mk.sum(); tz = (t - (t * mk).sum() / n) * mk
        F = lambda a: np.fft.rfft2(a, (1024, 1024))
        c = lambda A, B_: np.fft.irfft2(F(A) * np.conj(F(B_)), (1024, 1024))[:512 - nh + 1, :512 - nw + 1]
        s1 = c(O, mk)
        z = c(O, tz) / np.sqrt(np.maximum(c(O * O, mk) - s1 * s1 / n, 1e-6) * (tz * tz).sum()) * (c(Om, mk) / n > .85)
        dy, dx = np.unravel_index(z.argmax(), z.shape)
        if z.max() > best[0]: best = (z.max(), s, dx * 2, dy * 2 - (yc - y0) * s)
    fit[name] = best[1:]
    print(name, f'像的程度 {best[0]:.2f}  縮放 {best[1]:.2f}  位置 ({best[2]:.0f}, {best[3]:.0f})')

# 零件圖上的身體，肚子的毛畫得比原圖長，腿只剩腳掌露出來。把身體上下壓扁一點（背的位置不動），
# 讓兩腿之間肚子的毛尖落在跟原圖一樣的高度，腿露出來的長度才會跟原圖一樣
mid = slice(int(SIZE * 0.42), int(SIZE * 0.58))                       # 兩腿之間那一段（原圖框的 x）
belly = np.nonzero((ink(orig)[:, mid] > 0.06).any(1))[0].max()        # 原圖肚子最低的毛尖
x0, y0, x1, y1 = box['body']; s_, dx_, dy_ = fit['body']
cols = slice(int((mid.start - dx_) / s_ + x0), int((mid.stop - dx_) / s_ + x0))
low = np.nonzero((L[:, cols] == names.index('body') + 1).any(1))[0].max()
SQUASH = {'body': (belly - dy_) / ((low - y0) * s_)}
print('身體上下壓成', round(SQUASH['body'], 2))

# ---- 骨架靜止時每根骨頭在側面看的位置（y 上下、z 前後）
b = open(sys.argv[1], 'rb').read()
jl = struct.unpack_from('<I', b, 12)[0]
j, buf = json.loads(b[20:20 + jl]), b[20 + jl + 8:]


def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    return np.frombuffer(buf, TYPES[a['componentType']], a['count'] * COMPS[a['type']], v.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(a['count'], -1)


joints = j['skins'][0]['joints']
col = {j['nodes'][n]['name']: k for k, n in enumerate(joints)}
at = np.linalg.inv(acc(j['skins'][0]['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1).astype(np.float64))[:, :3, 3]
yz = lambda k: at[col[bone(k)]][[1, 2]]
NJ = len(joints)

# ---- 3、4. 切格子、分配骨頭、照順序疊
verts, quads = [], []  # verts：(模型的 y, z, 零件圖上的 X, Y, 權重, 明暗)


def piece(name, weights_of, shade=1.0, remap=None):
    i = names.index(name) + 1
    x0, y0, x1, y1 = box[name]; s, dx, dy = fit[name]
    gx, gy = np.meshgrid(np.arange(x0 - STEP, x1 + STEP + 1, STEP), np.arange(y0 - STEP, y1 + STEP + 1, STEP))
    cx, cy = np.clip(gx, 0, Wd - 1), np.clip(gy, 0, H - 1)
    mine = np.zeros(gx.shape, bool)
    for oy in (-STEP // 2, 0, STEP // 2):
        for ox in (-STEP // 2, 0, STEP // 2):
            mine |= L[np.clip(cy + oy, 0, H - 1), np.clip(cx + ox, 0, Wd - 1)] == i
    Y = CY - ((gy - y0) * s * SQUASH.get(name, 1) + dy - SIZE / 2) / K + (0 if name in CHAINS and name != 'tail' else LIFT)
    Z = -((gx - x0) * s + dx - SIZE / 2) / K
    W = weights_of(Y, Z)
    for _ in range(3):  # 權重抹開一點，關節才不會折出一條線
        acc_, n = W.copy(), np.ones(gx.shape)
        for sy, sx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            acc_ += np.roll(W, (sy, sx), (0, 1)); n += 1
        W = acc_ / n[..., None]
    if remap:
        W2 = np.zeros_like(W)
        for a, c in remap: W2[..., c] = W[..., a]
        W = W2
    keep = mine[:-1, :-1] | mine[:-1, 1:] | mine[1:, :-1] | mine[1:, 1:]
    index = {}
    for qy, qx in zip(*np.nonzero(keep)):
        ids_ = []
        for vy, vx in ((qy, qx), (qy, qx + 1), (qy + 1, qx + 1), (qy + 1, qx)):
            if (vy, vx) not in index:
                index[vy, vx] = len(verts); verts.append((Y[vy, vx], Z[vy, vx], gx[vy, vx], gy[vy, vx], W[vy, vx], shade, i))
            ids_.append(index[vy, vx])
        quads.append(ids_)


def rigid(k):
    def f(Y, Z):
        W = np.zeros(Y.shape + (NJ,)); W[..., col[bone(k)]] = 1; return W
    return f


def along(chain):  # 沿著一串骨頭：每個點歸給最近的那一節（那一節由它上端的關節帶動）
    def f(Y, Z):
        Pt = np.stack([Y, Z], -1); D = []
        for a, c in zip(chain[:-1], chain[1:]):
            A, Bv = yz(a), yz(c); ab = Bv - A
            t = np.clip(((Pt - A) @ ab) / (ab @ ab), 0, 1)
            D.append(np.linalg.norm(Pt - (A + t[..., None] * ab), axis=-1))
        near = np.argmin(D, 0); W = np.zeros(Y.shape + (NJ,))
        for s_, a in enumerate(chain[:-1]): W[..., col[bone(a)]] = near == s_
        return W
    return f


def trunk(Y, Z):  # 身體：照前後位置落在哪兩節脊椎之間，按距離分
    zs = np.array([yz(k)[1] for k in TRUNK]); W = np.zeros(Y.shape + (NJ,))
    for k, z in enumerate(zs):
        lo, hi = zs[max(k - 1, 0)], zs[min(k + 1, len(zs) - 1)]
        W[..., col[bone(TRUNK[k])]] = np.where(Z <= z, 1 if k == 0 else np.clip((Z - lo) / (z - lo), 0, 1), 1 if k == len(zs) - 1 else np.clip((hi - Z) / (hi - z), 0, 1))
    return W


far = lambda name: [(col[bone(a)], col[bone(c)]) for a, c in zip(CHAINS[name], FAR[name])]
piece('rear', along(CHAINS['rear']), FAR_SHADE, far('rear'))
piece('front', along(CHAINS['front']), FAR_SHADE, far('front'))
piece('tail', along(CHAINS['tail']))
piece('body', trunk)
piece('rear', along(CHAINS['rear']))
piece('front', along(CHAINS['front']))
piece('head', rigid(22))

# ---- 貼圖：零件圖去白底。每一塊只留自己的顏料（頭和身體在圖上靠得很近，格子邊緣才不會沾到隔壁）
a = np.clip(ink(sheet) / 0.16, 0, 1)[..., None] * (L > 0)[..., None]
rgb = np.clip((sheet - 255 * (1 - a)) / np.maximum(a, 0.05), 0, 255)
rgba = np.concatenate([rgb, a * 255], 2).astype('u1')
raw = b''.join(b'\0' + rgba[y].tobytes() for y in range(H))
chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
webp = os.path.join(ROOT, 'src/assets/cat-parts.webp')
with tempfile.NamedTemporaryFile(suffix='.png') as f:
    f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', Wd, H, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')); f.flush()
    subprocess.run(['cwebp', '-quiet', '-q', '84', '-alpha_q', '90', f.name, '-o', webp], check=True)

n = len(verts)
pos, uv, shade, top4, w4 = np.zeros((n, 3), '<f4'), np.zeros((n, 2), '<f4'), np.zeros((n, 4), 'u1'), np.zeros((n, 4), 'u1'), np.zeros((n, 4), '<f4')
for i, (Y, Z, X, Yp, w, s, _) in enumerate(verts):
    pos[i] = (0, Y, Z); uv[i] = (X / Wd, Yp / H); shade[i] = (round(255 * s),) * 3 + (255,)
    order = np.argsort(-w)[:4]; ww = w[order]
    top4[i] = order; w4[i] = ww / max(ww.sum(), 1e-9)
tris = np.array([[q[0], q[1], q[2], q[0], q[2], q[3]] for q in quads], '<u4').ravel()

# ---- 寫檔：骨架和動作照舊，網格換成這幾片紙，貼圖另外放
out = bytearray()
used = {s['inverseBindMatrices'] for s in j['skins']}
for an in j['animations']:
    for s in an['samplers']: used |= {s['input'], s['output']}
remap_, accs, views = {}, [], []


def put(raw_, a_):
    while len(out) % 4: out.append(0)
    views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(raw_)}); out.extend(raw_)
    accs.append(dict(a_, bufferView=len(views) - 1)); accs[-1].pop('byteOffset', None)
    return len(accs) - 1


for i in sorted(used):
    a_ = j['accessors'][i]; v = j['bufferViews'][a_['bufferView']]
    size = a_['count'] * COMPS[a_['type']] * np.dtype(TYPES[a_['componentType']]).itemsize
    o = v.get('byteOffset', 0) + a_.get('byteOffset', 0)
    remap_[i] = put(buf[o:o + size], a_)
for s in j['skins']: s['inverseBindMatrices'] = remap_[s['inverseBindMatrices']]
for an in j['animations']:
    for s in an['samplers']: s['input'], s['output'] = remap_[s['input']], remap_[s['output']]
new = lambda arr, ctype, kind, **extra: put(np.ascontiguousarray(arr).tobytes(), dict({'componentType': ctype, 'count': len(arr), 'type': kind}, **extra))
j['meshes'] = [{'name': 'paper', 'primitives': [{'attributes': {
    'POSITION': new(pos, 5126, 'VEC3', min=pos.min(0).tolist(), max=pos.max(0).tolist()), 'TEXCOORD_0': new(uv, 5126, 'VEC2'),
    'COLOR_0': new(shade, 5121, 'VEC4', normalized=True), 'JOINTS_0': new(top4, 5121, 'VEC4'), 'WEIGHTS_0': new(w4, 5126, 'VEC4')},
    'indices': new(tris, 5125, 'SCALAR'), 'material': 0}]}]
j['materials'] = [{'name': 'paper', 'doubleSided': True}]
for key in ('images', 'textures', 'samplers'): j.pop(key, None)
while len(out) % 4: out.append(0)
j['accessors'], j['bufferViews'], j['buffers'] = accs, views, [{'byteLength': len(out)}]
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
dst = os.path.join(ROOT, 'src/assets/cat-paper.glb')
with open(dst, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)))
    f.write(struct.pack('<I4s', len(js), b'JSON') + js)
    f.write(struct.pack('<I4s', len(out), b'BIN\0') + out)
print('格點', n, '三角形', len(tris) // 3, '→', dst, f'{os.path.getsize(dst) / 1e6:.2f}MB', webp, f'{os.path.getsize(webp) / 1e3:.0f}KB')
