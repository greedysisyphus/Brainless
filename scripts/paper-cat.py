#!/usr/bin/env python3
"""把貓做成 2D 的「紙偶」：頭、身體、尾巴、前腳、後腳各是一片水彩畫（ChatGPT 照側面那張圖拆開重畫的，一個零件一張圖），
每一片切成細格子的平面，綁在跟 3D 貓同一副骨架上。走路、吃東西這些動作直接沿用，但畫面上只有畫在動，沒有 3D 模型。

做四件事：
  1. 每一片對回側面原圖的位置和大小（比對花紋；腿只比腳掌，因為腿的上半截在原圖裡被毛蓋住）。
  2. 每一片切格子、分配骨頭：頭整片跟頭骨；身體照前後位置分給脊椎；尾巴、腿沿著自己那串骨頭分。
  3. 疊的順序（先畫的在後面）：遠側的腿（同一塊圖調暗）→ 尾巴 → 身體 → 近側的腿 → 頭 → 閉眼。
     閉眼那張只取跟睜眼不一樣的地方（眼睛那一小塊），平常不畫，眨眼時蓋上去。
  4. 所有零件排進同一張貼圖。

用法：python3 scripts/paper-cat.py 帶動作的貓.glb（retarget-cat.py 的輸出） 零件圖的資料夾
資料夾裡要有 head、head-closed、body、tail、front、rear（.webp 或 .png，白底或透明底，一張一個零件，都朝左）。
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
STEP = 5                      # 格子多細（原圖框的 px；每一片照自己的縮放換算）
DENSITY = 1.45                 # 貼圖的細緻度：原圖框的 1 px 在貼圖上佔幾 px
ATLAS = 2048
GAP = 40                      # 貼圖上零件之間留多寬：貓縮很小時顯示卡會取很糊的版本，隔太近會沾到隔壁零件的顏色
FAR_SHADE = 0.74              # 另一側的腿調多暗
TAIL_SIZE = 0.85              # 尾巴相對原圖的大小（根的位置不動）
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
orig = read(os.path.join(ROOT, 'src/assets/cat-paint-left.webp'))
names = ['head', 'head-closed', 'body', 'tail', 'front', 'rear']
art, mask, box = {}, {}, {}
for name in names:
    path = next(p for p in (os.path.join(sys.argv[2], name + ext) for ext in ('.webp', '.png')) if os.path.exists(p))
    art[name] = read(path); mask[name] = ink(art[name]) > 0.06
    ys, xs = np.nonzero(mask[name]); box[name] = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

# ---- 1. 對位：每一塊在原圖上找花紋最像的位置和大小（正規化的相關係數，用傅立葉算），在一半解析度上找
O = gray(orig).reshape(512, 2, 512, 2).mean((1, 3)); Om = (ink(orig) > .06).reshape(512, 2, 512, 2).mean((1, 3))
pick = lambda a, nh, nw: a[(np.arange(nh) * a.shape[0] / nh).astype(int)][:, (np.arange(nw) * a.shape[1] / nw).astype(int)]
fit = {}  # 名字 → (縮放, 這一塊左上角在原圖框裡的 x, y)：零件圖上的 (X, Y) 對到原圖框的 ((X - x0) * s + dx, (Y - y0) * s + dy)
for name, crop in (('head', 1), ('body', 1), ('front', .3), ('rear', .3)):
    scales = np.arange(.2, .9001, .01)
    x0, y0, x1, y1 = box[name]
    yc = int(y1 - (y1 - y0) * crop)  # 腿只拿最下面三成（腳掌）去比
    mk0 = mask[name][yc:y1, x0:x1].astype(float); T = gray(art[name][yc:y1, x0:x1]); best = (-9,)
    for s in scales:
        nh, nw = int((y1 - yc) * s / 2), int((x1 - x0) * s / 2)
        if nh > 500 or nw > 500 or nh < 8 or nw < 8: continue
        t, mk = pick(T, nh, nw), pick(mk0, nh, nw); n = mk.sum(); tz = (t - (t * mk).sum() / n) * mk
        F = lambda a: np.fft.rfft2(a, (1024, 1024))
        c = lambda A, B_: np.fft.irfft2(F(A) * np.conj(F(B_)), (1024, 1024))[:512 - nh + 1, :512 - nw + 1]
        s1 = c(O, mk)
        z = c(O, tz) / np.sqrt(np.maximum(c(O * O, mk) - s1 * s1 / n, 1e-6) * (tz * tz).sum()) * (c(Om, mk) / n > .85)
        dy, dx = np.unravel_index(z.argmax(), z.shape)
        if z.max() > best[0]: best = (z.max(), s, dx * 2, dy * 2 - (yc - y0) * s)
    fit[name] = best[1:]
    if name == 'head': fit['head-closed'] = best[1:]  # 閉眼那張跟睜眼的是同一張圖改的，位置一樣
    print(name, f'像的程度 {best[0]:.2f}  縮放 {best[1]:.2f}  位置 ({best[2]:.0f}, {best[3]:.0f})')

# 尾巴不比花紋（單獨重畫的尾巴彎的角度跟原圖不同，比不準），改用釘的：尾巴根釘在屁股上原圖尾巴長出來的地方，
# 大小以「尾巴尖跟原圖一樣高」為準，再乘上 TAIL_SIZE
tail_px = ink(orig)[:, int(SIZE * 0.72):] > 0.06                       # 原圖右邊那一段
rows = np.nonzero(tail_px.any(1))[0]; top = rows.min()                  # 尾巴尖的高度
ROOT_AT = (SIZE / 2 + 0.60 * K, SIZE / 2 - (0.80 - CY) * K)             # 尾巴根在原圖框的位置（尾巴第一節骨頭附近）
x0, y0, x1, y1 = box['tail']
low_rows = mask['tail'][int(y1 - (y1 - y0) * 0.08):y1]
root_x, root_y = np.nonzero(low_rows.any(0))[0].mean(), y1 - (y1 - y0) * 0.06
s_ = (ROOT_AT[1] - top) / (root_y - y0) * TAIL_SIZE
fit['tail'] = (s_, ROOT_AT[0] - (root_x - x0) * s_, ROOT_AT[1] - (root_y - y0) * s_)
print('tail', f'縮放 {s_:.2f}  位置 ({fit["tail"][1]:.0f}, {fit["tail"][2]:.0f})')

# 零件圖上的身體，肚子的毛畫得比原圖長，腿只剩腳掌露出來。把身體上下壓扁一點（背的位置不動），
# 讓兩腿之間肚子的毛尖落在跟原圖一樣的高度，腿露出來的長度才會跟原圖一樣
mid = slice(int(SIZE * 0.42), int(SIZE * 0.58))                       # 兩腿之間那一段（原圖框的 x）
belly = np.nonzero((ink(orig)[:, mid] > 0.06).any(1))[0].max()        # 原圖肚子最低的毛尖
x0, y0, x1, y1 = box['body']; s_, dx_, dy_ = fit['body']
cols = slice(int((mid.start - dx_) / s_ + x0), int((mid.stop - dx_) / s_ + x0))
low = np.nonzero(mask['body'][:, cols].any(1))[0].max()
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


# 純色模式裡，淺色（肚子、腳、臉的黃）只准出現在：整顆頭、身體下面那一段、腿下面那一段。其他地方零星的黃斑一律畫成深色，輪廓才乾淨
LIGHT_BELOW = {'body': 0.45, 'front': 0.5, 'rear': 0.5, 'tail': 0.0}  # 每一片由下往上算，這個比例以下可以有淺色
# 純色模式裡每一片的深淺（0 最深、1 最淺）：頭和近側的腿比身體亮一階，疊在身體上才分得出來，不會整隻糊成一團
TONE = {'head': 1.0, 'head-closed': 1.0, 'front': 1.0, 'rear': 1.0, 'body': 0.35, 'tail': 0.6}


def piece(name, weights_of, shade=1.0, remap=None, only=None, layer=255):
    x0, y0, x1, y1 = box[name]; s, dx, dy = fit[name]
    step = max(2, int(round(STEP / s)))
    Hn, Wn = mask[name].shape
    gx, gy = np.meshgrid(np.arange(x0 - step, x1 + step + 1, step), np.arange(y0 - step, y1 + step + 1, step))
    src = mask[name] if only is None else only
    mine = np.zeros(gx.shape, bool)
    for oy in (-step // 2, 0, step // 2):
        for ox in (-step // 2, 0, step // 2):
            mine |= src[np.clip(gy + oy, 0, Hn - 1), np.clip(gx + ox, 0, Wn - 1)]
    Y = CY - ((gy - y0) * s * SQUASH.get(name, 1) + dy - SIZE / 2) / K + (0 if name in ('front', 'rear') else LIFT)
    Z = -((gx - x0) * s + dx - SIZE / 2) / K
    frac = LIGHT_BELOW.get(name, 1.0)  # 頭沒列：整片都可以
    light = np.clip(((gy - (y1 - (y1 - y0) * frac)) / max((y1 - y0) * 0.08, 1)) + 0.5, 0, 1) if frac < 1 else np.ones(gy.shape)
    W = weights_of(Y, Z)
    for _ in range(3):  # 權重抹開一點，關節才不會折出一條線
        acc_ = W.copy()
        for sy, sx in ((0, 1), (0, -1), (1, 0), (-1, 0)): acc_ += np.roll(W, (sy, sx), (0, 1))
        W = acc_ / 5
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
                index[vy, vx] = len(verts); verts.append((Y[vy, vx], Z[vy, vx], name, gx[vy, vx], gy[vy, vx], W[vy, vx], shade, layer, light[vy, vx]))
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
# 閉眼：只取跟睜眼那張差很多的地方（往外放寬一圈），其餘的沿用睜眼的頭，兩張有一點點沒對齊也不會整顆頭跳一下
diff = np.abs(art['head'] - art['head-closed']).max(2) > 40
ys, xs = np.nonzero(diff)
core = np.zeros_like(diff); pad = 28
cy_, cx_ = np.median(ys), np.median(xs); near_ = (np.abs(ys - cy_) < 160) & (np.abs(xs - cx_) < 160)  # 眼睛那一團；別處零星的差異不算
core[max(ys[near_].min() - pad, 0):ys[near_].max() + pad, max(xs[near_].min() - pad, 0):xs[near_].max() + pad] = True
print('閉眼的範圍', xs[near_].min(), ys[near_].min(), xs[near_].max(), ys[near_].max())
piece('head-closed', rigid(22), only=core & mask['head-closed'], layer=0)

# ---- 4. 貼圖：每一片去白底、縮到一樣的細緻度，一排一排放進同一張圖
def shrink(img, f):  # 雙線性縮放
    h, w = img.shape[:2]; nh, nw = max(1, int(h * f)), max(1, int(w * f))
    py, px = (np.arange(nh) + .5) / f - .5, (np.arange(nw) + .5) / f - .5
    y0_, x0_ = np.clip(np.floor(py).astype(int), 0, h - 2), np.clip(np.floor(px).astype(int), 0, w - 2)
    fy, fx = np.clip(py - y0_, 0, 1)[:, None, None], np.clip(px - x0_, 0, 1)[None, :, None]
    return (img[y0_][:, x0_] * (1 - fx) + img[y0_][:, x0_ + 1] * fx) * (1 - fy) + (img[y0_ + 1][:, x0_] * (1 - fx) + img[y0_ + 1][:, x0_ + 1] * fx) * fy


atlas = np.zeros((ATLAS + ATLAS // 2, ATLAS, 4)); slot = {}  # 名字 → (貼圖上的 x, y, 縮放)：零件圖上的 (X, Y) 在貼圖的 ((X - x0) * f + ax, (Y - y0) * f + ay)
ax, ay, row = 4, 4, 0
for name in sorted(names, key=lambda n: -(box[n][3] - box[n][1]) * fit[n][0]):
    x0, y0, x1, y1 = box[name]; f = min(1, DENSITY * fit[name][0]); m = 3 * STEP
    crop = art[name][max(y0 - m, 0):y1 + m, max(x0 - m, 0):x1 + m]
    a = np.clip(ink(crop) / 0.16, 0, 1)[..., None]
    tile = shrink(np.concatenate([np.clip((crop - 255 * (1 - a)) / np.maximum(a, 0.05), 0, 255), a * 255], 2), f)
    th, tw = tile.shape[:2]
    if ax + tw + 4 > ATLAS: ax, ay, row = 4, ay + row + GAP, 0
    assert ay + th + 4 <= atlas.shape[0], '貼圖放不下，調小 DENSITY'
    atlas[ay:ay + th, ax:ax + tw] = tile
    slot[name] = (ax - (max(x0 - m, 0) - x0) * f, ay - (max(y0 - m, 0) - y0) * f, f)
    ax, row = ax + tw + GAP, max(row, th)
used_h = int(np.nonzero(atlas[..., 3].any(1))[0].max()) + 5
rgba = atlas[:used_h].astype('u1')
raw = b''.join(b'\0' + rgba[y].tobytes() for y in range(used_h))
chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
webp = os.path.join(ROOT, 'src/assets/cat-parts.webp')
with tempfile.NamedTemporaryFile(suffix='.png') as f_:
    f_.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', ATLAS, used_h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')); f_.flush()
    subprocess.run(['cwebp', '-quiet', '-q', '84', '-alpha_q', '90', f_.name, '-o', webp], check=True)

n = len(verts)
pos, uv, shade, top4, w4 = np.zeros((n, 3), '<f4'), np.zeros((n, 2), '<f4'), np.zeros((n, 4), 'u1'), np.zeros((n, 4), 'u1'), np.zeros((n, 4), 'u1')
for i, (Y, Z, name, X, Yp, w, s, layer, light) in enumerate(verts):
    sx_, sy_, f = slot[name]; x0, y0 = box[name][:2]
    pos[i] = (0, Y, Z); uv[i] = (((X - x0) * f + sx_) / ATLAS, ((Yp - y0) * f + sy_) / used_h)
    shade[i] = (round(255 * s), round(255 * light), round(255 * (TONE[name] if s == 1 else 0)), layer)  # 明暗、純色模式可不可以是淺色、純色模式的深淺、255 平常就畫／0 眨眼時才畫
    order = np.argsort(-w)[:4]; ww = w[order]
    w8 = np.round(ww / max(ww.sum(), 1e-9) * 255).astype(int); w8[0] += 255 - w8.sum()  # 權重存成一個位元組，四個加起來剛好 255
    top4[i] = order; w4[i] = w8
assert n < 65536
tris = np.array([[q[0], q[1], q[2], q[0], q[2], q[3]] for q in quads], '<u2').ravel()

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
    'COLOR_0': new(shade, 5121, 'VEC4', normalized=True), 'JOINTS_0': new(top4, 5121, 'VEC4'), 'WEIGHTS_0': new(w4, 5121, 'VEC4', normalized=True)},
    'indices': new(tris, 5123, 'SCALAR'), 'material': 0}]}]
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
