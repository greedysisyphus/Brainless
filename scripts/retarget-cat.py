#!/usr/bin/env python3
"""把別的四足動物（Quaternius 的 Ultimate Animated Animals，CC0）身上現成的動作，套到 Meshy 智慧骨架綁好的貓身上。
Meshy 的智慧骨架只給骨架、沒有動作庫；走路這種動作手寫不出來，要用真的動作資料。

兩副骨架長得不一樣（骨頭數目、長短、父子關係都不同），所以不是照抄數字，而是照「這根骨頭在世界裡比靜止時多轉了多少」來搬：
來源的大腿比靜止時往前擺 20 度，貓對應的那根骨頭也從自己的靜止姿勢往前擺 20 度。
貓的腿比較短，腳會踩不到地或陷進地裡，所以每一格再把整隻貓上下挪到最低的腳掌剛好著地。

用法：python3 scripts/retarget-cat.py 動作來源.gltf 綁好骨架的貓.glb 輸出.glb    之後再跑 scripts/prep-cat-rig.py 輸出.glb。只需要 numpy。
"""
import base64, json, struct, sys
import numpy as np

SRC, DST, OUT = sys.argv[1:4]
TYPES = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
COMPS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
# 貓的骨頭（Meshy 沒有取名字，照位置認出來的）← 來源的骨頭。沒列到的骨頭跟著父骨頭走。左邊是 +x
MAP = {
    'Bone_001': 'Back', 'Bone_015': 'Torso', 'Bone_014': 'Torso2', 'Bone_012': 'Torso3',
    'Bone_024': 'Neck1', 'Bone_023': 'Neck3', 'Bone_022': 'Head',  # 耳朵不對應：貓耳朵的骨頭管到頭兩側一大片，跟著狐狸的耳朵甩會把頭壓扁
    'Bone_034': 'FrontUpperLeg.L', 'Bone_033': 'FrontLowerLeg.L', 'Bone_032': 'FrontLowerLeg.L', 'Bone_031': 'FF.L',
    'Bone_029': 'FrontUpperLeg.R', 'Bone_028': 'FrontLowerLeg.R', 'Bone_027': 'FrontLowerLeg.R', 'Bone_026': 'FF.R',
    'Bone_011': 'BackLeg.L', 'Bone_010': 'BackUpperLeg.L', 'Bone_009': 'BackLowerLeg.L', 'Bone_008': 'FFB.L',
    'Bone_006': 'BackLeg.R', 'Bone_005': 'BackUpperLeg.R', 'Bone_004': 'BackLowerLeg.R', 'Bone_003': 'FFB.R',
    'Bone_021': 'Tail1', 'Bone_020': 'Tail2', 'Bone_019': 'Tail4', 'Bone_018': 'Tail6', 'Bone_017': 'Tail7',
}
ROOT, SRC_ROOT = 'Bone_001', 'Back'
PAWS = ['Bone_031', 'Bone_026', 'Bone_008', 'Bone_003']
NAMES = {'Bone_022': 'head'}  # 網頁要找得到頭
# 貓幾乎沒有脖子：走、跑的時候狐狸長脖子的點頭照搬過來，頭會像一顆球在毛裡面自己轉。這幾根骨頭只跟一部分
NECK, NECK_FOLLOW, MOVING = ['Bone_024', 'Bone_023', 'Bone_022'], 0.4, ('Walk', 'Gallop', 'Gallop_Jump')
# 腿的骨頭（每條腿由上到下）和身體的骨頭（由後到前，附上它在 z 軸的位置）。重新分配蒙皮用
LEG_BONES = ['Bone_0%02d' % k for k in (34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2)]
TRUNK = [('Bone_001', -0.34), ('Bone_015', -0.18), ('Bone_014', 0.06), ('Bone_013', 0.32), ('Bone_012', 0.43)]
SKIRT = (0.24, 0.5)  # 毛的下緣到肩膀的高度：這段以上的毛不該跟著腿動


def load(path):
    b = open(path, 'rb').read()
    if b[:4] == b'glTF':
        jl = struct.unpack_from('<I', b, 12)[0]
        return json.loads(b[20:20 + jl]), b[20 + jl + 8:]
    j = json.loads(b)
    return j, base64.b64decode(j['buffers'][0]['uri'].split(',', 1)[1])


def acc(g, i):
    j, buf = g
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]
    return np.frombuffer(buf, TYPES[a['componentType']], a['count'] * COMPS[a['type']], v.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(a['count'], -1).astype(np.float64)


def quat_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_quat(m):
    t = np.trace(m)
    if t > 0: s = np.sqrt(t + 1) * 2; q = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, s / 4]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]: s = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; q = [s / 4, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    elif m[1, 1] > m[2, 2]: s = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; q = [(m[0, 1] + m[1, 0]) / s, s / 4, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    else: s = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; q = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, s / 4, (m[1, 0] - m[0, 1]) / s]
    return np.array(q)


class Skeleton:
    """一個檔案裡所有的節點：靜止時的位移和旋轉、誰是誰的父節點，還有照順序（父先子後）算世界位置的方法"""
    def __init__(s, g):
        j = g[0]
        s.name = [n.get('name') for n in j['nodes']]
        s.id = {n: i for i, n in enumerate(s.name)}
        s.parent = {c: i for i, n in enumerate(j['nodes']) for c in n.get('children', [])}
        s.t = [np.array(n.get('translation', [0, 0, 0]), float) for n in j['nodes']]
        s.r = [quat_mat(n.get('rotation', [0, 0, 0, 1])) for n in j['nodes']]
        s.order = []
        def visit(i):
            s.order.append(i)
            for c in j['nodes'][i].get('children', []): visit(c)
        for i in range(len(j['nodes'])):
            if i not in s.parent: visit(i)

    def world(s, t=None, r=None):  # 回傳每個節點在世界裡的旋轉和位置
        t, r = t or s.t, r or s.r
        R, T = [None] * len(s.name), [None] * len(s.name)
        for i in s.order:
            p = s.parent.get(i)
            R[i] = r[i] if p is None else R[p] @ r[i]
            T[i] = t[i] if p is None else T[p] + R[p] @ t[i]
        return R, T


src, dst = load(SRC), load(DST)
A, B = Skeleton(src), Skeleton(dst)
restAR, restAT = A.world()
restBR, restBT = B.world()
scale = restBT[B.id[ROOT]][1] / restAT[A.id[SRC_ROOT]][1]  # 兩隻動物屁股離地的高度比
print('體型比例', round(scale, 3))


def sample(clip, t):  # 來源在某一刻每個節點的位移和旋轉
    tr, ro = list(A.t), list(A.r)
    for node, path, tt, out in clip:
        k = int(np.clip(np.searchsorted(tt, t) - 1, 0, len(tt) - 2)); f = np.clip((t - tt[k]) / max(tt[k + 1] - tt[k], 1e-9), 0, 1)
        a, b = out[k], out[k + 1]
        if path == 'rotation':
            if a @ b < 0: b = -b
            q = a + (b - a) * f; ro[node] = quat_mat(q / np.linalg.norm(q))
        elif path == 'translation': tr[node] = a + (b - a) * f
    return tr, ro


def slerp(m0, m1, k):  # 兩個朝向之間取 k 成
    a, b = mat_quat(m0), mat_quat(m1)
    if a @ b < 0: b = -b
    w = np.arccos(np.clip(a @ b, -1, 1))
    q = a + (b - a) * k if w < 1e-4 else (np.sin((1 - k) * w) * a + np.sin(k * w) * b) / np.sin(w)
    return quat_mat(q / np.linalg.norm(q))


FPS = 30
anims = []
for an in src[0]['animations']:
    clip = [(c['target']['node'], c['target']['path'], acc(src, an['samplers'][c['sampler']]['input']).ravel(), acc(src, an['samplers'][c['sampler']]['output'])) for c in an['channels']]
    dur = max(c[2].max() for c in clip)
    times = np.linspace(0, dur, int(round(dur * FPS)) + 1)
    rot = {n: [] for n in MAP}; rootT = []; paws = []
    for t in times:
        AR, AT = A.world(*sample(clip, t))
        r = list(B.r); BR = [None] * len(B.name)
        for i in B.order:  # 父先子後：有對應的骨頭照來源多轉的量轉，其餘的跟著父骨頭
            p = B.parent.get(i); n = B.name[i]
            if n in MAP:
                a = A.id[MAP[n]]
                BR[i] = AR[a] @ restAR[a].T @ restBR[i]
                if n in NECK and an['name'] in MOVING: BR[i] = slerp(BR[p] @ B.r[i], BR[i], NECK_FOLLOW)
                r[i] = BR[i] if p is None else BR[p].T @ BR[i]
            else: BR[i] = r[i] if p is None else BR[p] @ r[i]
        tr = list(B.t)
        i = B.id[ROOT]; a = A.id[SRC_ROOT]
        move = (AT[a] - restAT[a]) * scale
        move[2] = 0  # 原地做動作，往前走由網頁來移動整隻貓
        tr[i] = B.t[i] + restBR[B.parent[i]].T @ move
        R2, T2 = B.world(tr, r)
        low = min(T2[B.id[p]][1] - restBT[B.id[p]][1] for p in PAWS)  # 最低的腳掌比靜止時高（或低）多少：整隻貓挪回來
        tr[i] = tr[i] - restBR[B.parent[i]].T @ np.array([0, low, 0])
        R2, T2 = B.world(tr, r)
        paws.append([T2[B.id[p]] for p in PAWS])
        rootT.append(tr[i])
        for n in MAP: rot[n].append(mat_quat(r[B.id[n]]))
    for n in MAP:  # 四元數正負號接續，內插才不會繞遠路
        q = np.array(rot[n])
        for k in range(1, len(q)):
            if q[k] @ q[k - 1] < 0: q[k] = -q[k]
        rot[n] = q
    # 走路的速度：腳掌踩在地上（最低）的時候相對身體往後退多快
    paws = np.array(paws); speed = 0
    if an['name'] in ('Walk', 'Gallop'):
        v = []
        for k in range(4):
            y, z = paws[:, k, 1], paws[:, k, 2]
            on = (y[:-1] < y.min() + 0.004) & (y[1:] < y.min() + 0.004)
            v += list(-(np.diff(z) / np.diff(times))[on])
        speed = float(np.median(v)) if v else 0
    anims.append((an['name'], times, rot, np.array(rootT), speed))
    print(an['name'], f'{dur:.2f}s', '速度', round(speed, 3))

# ---- 寫檔：貓的檔案原樣留著（網格、蒙皮、貼圖），只加上動作
j, buf = dst
buf = bytearray(buf)


def add(arr, ctype, kind, minmax=False):
    while len(buf) % 4: buf.append(0)
    raw = np.ascontiguousarray(arr).tobytes()
    j['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)}); buf.extend(raw)
    a = {'bufferView': len(j['bufferViews']) - 1, 'componentType': ctype, 'count': len(arr), 'type': kind}
    if minmax: a['min'], a['max'] = np.asarray(arr).min(0).tolist(), np.asarray(arr).max(0).tolist()
    j['accessors'].append(a)
    return len(j['accessors']) - 1


# ---- 蒙皮重新分配。Meshy 把胸口、脖子、側腹的長毛算給大腿和上臂的骨頭，腿一擺整片毛跟著甩，脖子和頭的交界就被扯開。
# 這尊貓的腿只有腳掌那一截露在毛外面：毛的下緣以上，腿的權重漸漸改交給身體的骨頭（照前後位置分給脊椎的各節）
prim = j['meshes'][0]['primitives'][0]
P = acc(dst, prim['attributes']['POSITION'])
JI, JW = acc(dst, prim['attributes']['JOINTS_0']).astype(int), acc(dst, prim['attributes']['WEIGHTS_0'])
joints = j['skins'][0]['joints']
col = {B.name[n]: k for k, n in enumerate(joints)}
W = np.zeros((len(P), len(joints)))
np.add.at(W, (np.repeat(np.arange(len(P)), 4), JI.ravel()), JW.ravel())
W /= W.sum(1, keepdims=True)
up = np.clip((P[:, 1] - SKIRT[0]) / (SKIRT[1] - SKIRT[0]), 0, 1); up = up * up * (3 - 2 * up)
legs = [col[n] for n in LEG_BONES]
moved = W[:, legs].sum(1) * up
W[:, legs] *= (1 - up)[:, None]
zs = np.array([z for _, z in TRUNK])
for k, (n, z) in enumerate(TRUNK):  # 每個頂點照 z 落在哪兩節脊椎之間，按距離分
    lo, hi = zs[max(k - 1, 0)], zs[min(k + 1, len(zs) - 1)]
    hat = np.where(P[:, 2] <= z, 1 if k == 0 else np.clip((P[:, 2] - lo) / (z - lo), 0, 1), 1 if k == len(zs) - 1 else np.clip((hi - P[:, 2]) / (hi - z), 0, 1))
    W[:, col[n]] += moved * hat
_, weld = np.unique(np.round(P / 3e-4).astype(np.int64), axis=0, return_inverse=True)  # 貼圖接縫拆開的頂點先併回去，再沿表面抹開
weld = weld.ravel(); nw = weld.max() + 1
tri = weld[acc(dst, prim['indices']).ravel().astype(int)].reshape(-1, 3)
e = np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]); e = np.concatenate([e, e[:, ::-1]])
deg = np.bincount(e[:, 0], minlength=nw).astype(float)[:, None]
Ww = np.zeros((nw, len(joints))); np.add.at(Ww, weld, W); Ww /= Ww.sum(1, keepdims=True)
for _ in range(4):
    nb = np.zeros_like(Ww); np.add.at(nb, e[:, 0], Ww[e[:, 1]])
    Ww = 0.5 * Ww + 0.5 * nb / np.maximum(deg, 1)
W = Ww[weld]
top = np.argsort(-W, axis=1)[:, :4]
Wt = np.take_along_axis(W, top, 1); Wt /= Wt.sum(1, keepdims=True)
for key, arr, ctype in (('JOINTS_0', top.astype('u1'), 5121), ('WEIGHTS_0', Wt.astype('<f4'), 5126)):  # 蓋掉原本那一筆；舊資料那一段沒人指著，prep-cat-rig.py 會丟掉
    j['accessors'][prim['attributes'][key]] = j['accessors'].pop(add(arr, ctype, 'VEC4'))

j['animations'] = []
for name, times, rot, rootT, speed in anims:
    tin = add(times.astype('<f4')[:, None], 5126, 'SCALAR', True)
    samplers, channels = [], []
    for n, q in rot.items():
        samplers.append({'input': tin, 'output': add(q.astype('<f4'), 5126, 'VEC4'), 'interpolation': 'LINEAR'})
        channels.append({'sampler': len(samplers) - 1, 'target': {'node': B.id[n], 'path': 'rotation'}})
    samplers.append({'input': tin, 'output': add(rootT.astype('<f4'), 5126, 'VEC3'), 'interpolation': 'LINEAR'})
    channels.append({'sampler': len(samplers) - 1, 'target': {'node': B.id[ROOT], 'path': 'translation'}})
    j['animations'].append({'name': name, 'extras': {'speed': speed}, 'samplers': samplers, 'channels': channels})
for old, new in NAMES.items(): j['nodes'][B.id[old]]['name'] = new
while len(buf) % 4: buf.append(0)
j['buffers'] = [{'byteLength': len(buf)}]
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
with open(OUT, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(buf)))
    f.write(struct.pack('<I4s', len(js), b'JSON') + js)
    f.write(struct.pack('<I4s', len(buf), b'BIN\0') + buf)
print(OUT, f'{(28 + len(js) + len(buf)) / 1e6:.2f}MB')
