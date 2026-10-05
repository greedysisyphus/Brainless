// 立體水彩貓：把一張水彩貓頭變成可以轉、會眨眼、可以摸的立體版。
// 這個檔案不碰 React，也不碰頁面上其他元素：給它一個 canvas 和圖片網址，回傳一組控制用的函式。
import * as THREE from 'three'

const PX = 900, AR = 863 / 900, MAX_PITCH = 35
const clamp = (v, m) => Math.max(-m, Math.min(m, v))

// 可調的參數：[網址參數名, 標籤, 最小, 最大, 間隔, 預設, 是否要重排筆觸]
export const PARAMS = [
  ['density', '筆觸數量', 0.4, 4, 0.05, 1.2, 1], ['len', '筆觸長度', 0.5, 2, 0.05, 1, 1], ['wid', '筆觸寬度', 0.5, 2, 0.05, 1, 1], ['jit', '方向亂度', 0, 2, 0.05, 0.7, 1],
  ['lift', '筆尖翹起', 0, 3, 0.05, 1], ['gap', '層間距', 0, 4, 0.05, 1], ['depth', '頭的厚度', 0, 1.6, 0.05, 1, 1], ['ear', '耳朵前傾', -1, 2, 0.05, 1], ['back', '後腦深度', 0.3, 1.6, 0.05, 1, 1], ['round', '頭的圓度', 0, 1, 0.05, 0.85, 1],
  ['crisp', '筆觸分明', 1, 6, 0.1, 3], ['pool', '邊緣積色', 0, 1.5, 0.05, 0.6], ['dry', '飛白', 0, 1, 0.05, 0.85], ['smin', '縫隙留白', 0.2, 1.5, 0.05, 0.6],
  ['eye', '眼神跟隨', 0, 1, 0.05, 0.5], ['gaze', '瞳孔轉動', 0, 1.6, 0.05, 1], ['calm', '眼神沉穩', 0, 1, 1, 1], ['glint', '眼睛反光', 0, 1, 0.05, 0.7], ['shade', '明暗', 0, 1, 0.05, 0.5], ['follow', '跟隨幅度', 0, 35, 1, 22], ['fur', '毛的慣性', 0, 3, 0.1, 1],
]
// 耳朵：根部中點 M、耳尖 T、半寬 hw（原圖像素，對著原圖手動標的）。0 號留給頭
const EARS = [null, { M: [342, 205], T: [300, 12], hw: 105 }, { M: [800, 365], T: [880, 252], hw: 75 }]
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// 回傳 [沿軸 0 根部→1 耳尖, 橫向 -1..1]
const earAC = (x, y, { M, T, hw }) => { const ax = T[0] - M[0], ay = T[1] - M[1], n = Math.hypot(ax, ay), dx = x - M[0], dy = y - M[1]; return [(dx * ax + dy * ay) / n / n, (dy * ax - dx * ay) / n / hw] }
const g = (v) => (v / PX).toFixed(4)
const pick = (f) => `id < 1.5 ? ${f(EARS[1])} : ${f(EARS[2])}`
const EAR = /* glsl */ `
vec2 earAC(vec2 q, float id) {
  vec2 ax = ${pick((e) => `vec2(${g(e.T[0] - e.M[0])}, ${g(e.T[1] - e.M[1])})`)}, d = q - (${pick((e) => `vec2(${g(e.M[0])}, ${g(e.M[1])})`)});
  float n = length(ax);
  return vec2(dot(d, ax) / n / n, dot(d, vec2(-ax.y, ax.x)) / n / (${pick((e) => g(e.hw))}));
}
// lo 是根部從哪裡開始算。耳朵自己用 -.35（往下多伸一段藏在頭頂的毛後面），頭讓位用 0；兩者重疊，轉動時才不會裂出一條縫
float earMask(vec2 q, float id, float lo) { vec2 e = earAC(q, id); return smoothstep(lo - .1, lo + .1, e.x) * (1. - smoothstep(1.2, 1.5, abs(e.y))); }`
const uname = (k) => 'u' + k[0].toUpperCase() + k.slice(1)

const VERT = /* glsl */ `
attribute vec4 iE; // (取色位移 u, 取色位移 v, 正面 +1 / 背面 -1, 不用)
attribute vec4 iA, iB, iC, iD; // (x, y, 角度, 種子) (長, 寬, 離表面高度, 筆尖翹起) (中心色, 同色遮罩強度) (權重, 形狀 + 10 × 所在的面, 彎度, 層)
uniform float uSpread, uLift, uGap, uDepth, uEye, uFur, uEar, uBack, uRound, uPupil, uTime, uSniff;
uniform vec2 uVel, uLook, uTwitch;
uniform sampler2D uDist;
varying vec2 vL, vUv, vCv; varying vec4 vC, vD; varying float vSeed, vThick, vFront; varying vec3 vE, vPos, vN; varying vec2 vEye;

// 頭的隆起，推測的。q 是原圖座標 / 900。臉的正面偏平、邊緣才收，眼睛轉到側面才不會被壓扁
${EAR}
// 整顆頭是「正面一片 + 背面一片」在輪廓處接起來：兩片都是原圖座標上的高度，所以背面的筆觸也用同一套排法。
// 厚度看離輪廓多遠（uDist），邊緣是斜坡不是垂直的牆；牆面上照原圖座標排的筆觸會被拉成一條線，側面就空了
float head(vec2 q, float side) {
  // 離輪廓幾個原圖像素。往內縮 28：原圖邊緣是參差的（深色斑點、缺口），接縫要落在裡面顏料完整的地方，縮掉的那圈是平的毛邊
  float d = max(texture2D(uDist, vec2(q.x, q.y / ${AR})).r * 400. - 28., 0.);
  // 剖面的形狀：指數 1 是凸透鏡（邊緣尖），.5 是圓弧（邊緣垂直）。越圓，邊緣那一圈原圖被拉得越長
  float e = mix(1., .5, uRound);
  if (side < 0.) { float t = min(d / 400., 1.); return -.7 * pow(t * (2. - t), e) * uDepth * uBack; } // 後腦：比臉深
  float t = min(d / 300., 1.), z = .5 * pow(t * (2. - t), e); // 臉：中間是平的，眼睛轉到側面才不會被壓扁
  vec2 m = q - vec2(.52, .67), e1 = q - vec2(.347, .428), e2 = q - vec2(.741, .506);
  vec2 pl = q - vec2(.445, .70), pr = q - vec2(.585, .72), ch = q - vec2(.5, .80), ns = q - vec2(.528, .609), gr = q - vec2(.51, .70);
  // 口鼻：寬的底座上有左右兩塊鬍鬚墊、下巴、最突出的鼻尖，兩塊墊子中間是人中的溝。JS 的 headH 要跟著改
  // 嗅的時候兩塊鬍鬚墊鼓起來，貼在上面的嘴線和鬍鬚根部會跟著被帶動
  z += (.07 * exp(-dot(m, m) / .034) + .09 * (1. + .45 * uSniff) * (exp(-dot(pl, pl) / .006) + exp(-dot(pr, pr) / .006)) + .05 * exp(-dot(ch, ch) / .006)
      + .11 * exp(-dot(ns, ns) / .004) - .03 * exp(-dot(gr, gr) / .0012)) * smoothstep(0., .5, t);
  z -= .035 * (exp(-dot(e1, e1) / .01) + exp(-dot(e2, e2) / .01)); // 眼窩
  return z * uDepth;
}
float H(vec2 q, float surf, float side) {
  if (surf < .5) return head(q, side);
  // 耳朵自己一片：根部接在頭上那個位置、略低於毛，往前傾、中間凹。根部沒接在頭的高度上的話，轉動時耳朵會飄走
  vec2 e = earAC(q, surf);
  return head(surf < 1.5 ? vec2(${g(EARS[1].M[0])}, ${g(EARS[1].M[1])}) : vec2(${g(EARS[2].M[0])}, ${g(EARS[2].M[1])}), 1.) + (-.05 + .1 * (uEar + (surf < 1.5 ? uTwitch.x : uTwitch.y)) * e.x + .06 * e.y * e.y) * uDepth;
}
vec2 toQ(vec2 xy) { return vec2(xy.x * .5 + .5, ${AR} * .5 - xy.y * .5); }
// +z 那一側的表面法線
vec3 normalAt(vec2 xy, float surf, float side) {
  vec2 e = vec2(.02, 0.);
  return normalize(vec3(H(toQ(xy - e.xy), surf, side) - H(toQ(xy + e.xy), surf, side), H(toQ(xy - e.yx), surf, side) - H(toQ(xy + e.yx), surf, side), .04));
}
// 表面上的點，沿法線往外推 h。+.05 是把轉軸放在頭的中間
vec3 onSurface(vec2 xy, float surf, float side, float h) { return vec3(xy, H(toQ(xy), surf, side) + .05) + side * normalAt(xy, surf, side) * h; }

void main() {
  vec2 l = position.xy;
  float c = cos(iA.z), s = sin(iA.z);
  float surf = floor(iD.y / 10. + .01), shape = iD.y - surf * 10.;
  bool oval = shape > .5 && shape < 1.5;
  vec2 o = vec2(l.x * iB.x * .5, l.y * iB.y * .5 + (oval ? 0. : iD.z * l.x * l.x * iB.x)); // 在筆觸自己平面上的位置
  vec2 xy = iA.xy + mat2(c, s, -s, c) * o;                                                 // 同一個位置放回原圖平面：取色用
  float side = iE.z, tip = l.x * .5 + .5, up = iB.w * tip * tip * uLift, base = iB.z * uGap + iD.w * uSpread;
  if (iC.a < 0.) up *= 1. + .7 * uSniff; // 鬍鬚：嗅的時候往前張開
  vec3 p;
  if (shape < .5) {
    // 筆刷：貼在筆心那一點切面上的一小片，大小是真正的立體尺寸。顏色照原圖平面展開，
    // 所以在平的臉上跟原圖一模一樣，在側面也不會被曲面拉成一條絲
    vec3 n = side * normalAt(iA.xy, surf, side), f = vec3(c, s, 0.), T = normalize(f - n * dot(n, f));
    p = onSurface(iA.xy, surf, side, base) + T * o.x + cross(n, T) * o.y + n * up;
    if (iC.a < 0.) p.y += sin(uTime * 1.3 + iA.w * 6.283) * .018 * tip * tip; // 鬍鬚輕晃
    vN = mat3(modelViewMatrix) * n;
    vThick = surf > .5 ? 1. : side * H(toQ(iA.xy), surf, side);
  } else {
    // 底層淡彩、眼睛、口鼻：每個頂點都貼著表面。彎度欄的負值是特殊的層：-1 虹膜、-2 瞳孔、-3 反光、-4 眼皮、-5 鼻子
    // 瞳孔整片照視線挪動、照 uPupil 放大縮小，但取色的位置不動
    bool pupil = oval && iD.z < -1.5 && iD.z > -2.5;
    vec2 g = pupil ? uLook : vec2(0.), at = pupil ? iA.xy + o * uPupil + g : xy;
    if (oval && iD.z < -4.5) at = iA.xy + o * (1. + .07 * uSniff) + vec2(0., .012 * uSniff); // 嗅一下：鼻子微微撐大、往上提
    // 給眼睛用的座標，除以半徑後 1 = 邊緣。瞳孔與眼皮：離眼眶中心多遠；虹膜：離原本畫瞳孔的地方多遠
    vEye = (at - iA.xy - iC.xy) / max(iC.z, .001);
    p = onSurface(at, surf, side, up + base);
    vN = mat3(modelViewMatrix) * (side * normalAt(at, surf, side));
    vThick = surf > .5 ? 1. : side * H(toQ(xy), surf, side); // 頭在這裡有多厚；靠近輪廓接縫時趨近 0
  }
  vec2 qq = toQ(xy), qc = toQ(p.xy);
  vL = l; vC = iC; vD = iD; vSeed = iA.w; vE = iE.xyz;
  vUv = vec2(qq.x, 1. - qq.y / ${AR});
  vCv = vec2(qc.x, 1. - qc.y / ${AR}); // 從正面看落在原圖的哪裡
  {
    p.xy -= uVel * up * uFur; // 筆尖跟不上轉動，往反方向拖
    #if PASS == 3
      p = onSurface(xy, surf, side, -.07); // 擋住背後筆觸用的實心頭，比表面縮進去一點
    #endif
    vec3 mid = onSurface(iA.xy + (oval && iD.z < -1.5 && iD.z > -2.5 ? uLook : vec2(0.)), surf, side, base), off = p - mid;
    float face = oval && iD.z < -.5 && iD.z > -3.5 ? uEye * smoothstep(.3, .75, modelViewMatrix[2].z) : 0.; // 虹膜與瞳孔：臉朝著鏡頭時部分轉向鏡頭
    vec4 mv = modelViewMatrix * vec4(mid, 1.) + vec4(mix(mat3(modelViewMatrix) * off, off, face), 0.);
    vPos = mv.xyz;
    vFront = smoothstep(.35, .8, abs(modelViewMatrix[2].z)); // 1 = 正對或背對鏡頭
    gl_Position = projectionMatrix * mv;
  }
}`

const FRAG = /* glsl */ `
uniform sampler2D uImg, uCov;
uniform float uPool, uSmin, uDry, uCrisp, uShade, uBlink, uGlint, uCalm;
uniform vec3 uBackCol;
uniform vec2 uRes;
varying vec2 vL, vUv, vCv; varying vec4 vC, vD; varying float vSeed, vThick, vFront; varying vec3 vE, vPos, vN; varying vec2 vEye;

${EAR}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y);
}

void main() {
  float s = vL.x, y = vL.y, edge = 0., A, surf = floor(vD.y / 10. + .01), shape = vD.y - surf * 10.;
  #if PASS != 3
    // 只畫朝外的那一面，鬍鬚兩面都畫。筆刷本身就是朝外擺的；其他的是照原圖座標鋪的，背面那片要反過來看
    if (vC.a >= 0. && (shape < .5 || vE.z > 0.) != gl_FrontFacing) discard;
  #endif
  // 筆刷取色的位置：正對或背對鏡頭時用「從正面看落在哪」，所以正面跟原圖一模一樣；轉到側面時改用筆觸自己展開的位置，才不會被拉長
  vec2 uv = shape < .5 ? mix(vUv, vCv, vFront) : vUv;
  vec4 t = texture2D(uImg, uv), src = texture2D(uImg, uv + vE.xy); // 形狀看原位置的透明度，顏色從取色位置拿
  vec3 col = clamp(src.rgb + 1. - src.a, .02, 1.); // 疊在白紙上的顏色
  if (shape > .5 && shape < 1.5 && vD.z < 0. && vD.z > -1.5) {
    // 虹膜：原本畫著瞳孔的地方，往外抓一圈虹膜的顏色補起來，瞳孔移開時才不會露出第二顆瞳孔
    float r = length(vEye);
    vec4 fill = texture2D(uImg, uv + vEye / max(r, .001) * (1.3 - r) * vC.z * vec2(.5, .5 / ${AR}));
    col = mix(col, clamp(fill.rgb + 1. - fill.a, .02, 1.), 1. - smoothstep(.95, 1.2, r));
  }
  // 接縫附近筆觸是側著的、蓋不滿，改由底層淡彩把顏色補足；背面的淡彩在接縫處也接回原圖的顏色，兩片才連得起來
  float rim = shape > 1.5 ? 1. - smoothstep(0., .3, vThick) : 0.;
  // 原圖的輪廓有很多缺口（毛尖之間）。頭有厚度的地方，底層淡彩不能跟著缺，不然接縫上會破洞；缺的地方用附近的平均色補
  float aImg = t.a;
  if (shape > 1.5 && surf < .5) {
    vec4 near = texture2D(uImg, uv, 5.);
    col = clamp(src.rgb + (1. - src.a) * near.rgb / max(near.a, .05), .02, 1.);
    aImg = max(t.a, smoothstep(0., .06, vThick));
  }
  if (shape > 1.5 && vE.z < 0.) { vec4 soft = texture2D(uImg, uv, 5.); col = mix(uBackCol, clamp(soft.rgb / max(soft.a, .05), .02, 1.), rim); } // 背面的淡彩：平塗，靠近接縫才接回附近的顏色
  if (shape < .5) { // 筆刷：兩頭收尖、邊緣不齊、筆尖飛白
    float w = pow(max(1. - s * s, 0.), .4) * (.72 + .28 * noise(vec2(s * 2.5 + vSeed * 17., vSeed * 5.)));
    edge = abs(y + .14 * (noise(vec2(s * 3. + vSeed * 31., 1.)) - .5)) / max(w, .001);
    A = 1. - smoothstep(.78, 1., edge);
    A *= mix(1., smoothstep(.3, .55, noise(vec2(s * 2. + vSeed * 7., y * 7. + vSeed * 13.))), smoothstep(.15, 1., s) * uDry);
  } else if (shape < 1.5) { // 橢圓：眼睛、口鼻。彎度欄大於 0 時是中空的環（眼眶）
    edge = length(vL) * (.92 + .16 * noise(vL * 3. + vSeed * 9.));
    A = 1. - smoothstep(.72, 1., edge);
    if (vD.z > 0.) A *= smoothstep(vD.z - .12, vD.z + .06, edge);
    if (vD.z < -1.5 && vD.z > -2.5) A *= (1. - smoothstep(.8, 1., length(vEye))) * (1. - smoothstep(.12, .3, col.g - col.b)); // 瞳孔：超出眼眶的被蓋住；只留深色的那塊，不帶著周圍的黃色一起動
    if (vD.z < -2.5 && vD.z > -3.5) { col = vec3(1.); A *= uGlint * (1. - uBlink) * (1. - uCalm); } // 「眼神沉穩」開著就不畫 // 反光：一點留白，固定不跟瞳孔動
    if (vD.z < -3.5 && vD.z > -4.5) {
      // 眼皮：從上往下蓋住眼眶。顏色是額頭的毛（取色位置在建立眼皮時指定），下緣加一道深色當睫毛線
      // 眼皮下緣在哪（1 是眼眶上緣，-1 是下緣）。中間比兩邊低，是一道往下彎的弧
      float line = 1.4 - 2.6 * uBlink - .3 * (1. - vEye.x * vEye.x);
      // 睫毛線跟著眼皮下緣走，完全閉上時停在眼眶下半，留下一道彎彎的線
      col *= mix(.4, 1., smoothstep(.05, .22, abs(vEye.y - max(line, -.35 - .3 * (1. - vEye.x * vEye.x)))));
      A = (1. - smoothstep(1.05, 1.45, length(vEye))) * smoothstep(line - .08, line + .08, vEye.y) * step(.001, uBlink); // 蓋到比眼眶大一圈，連眼眶上的黃邊一起遮掉
    }
  } else A = 1.; // 底層淡彩
  A *= aImg;
  vec2 q = vec2(uv.x, (1. - uv.y) * ${AR});
  float rag = .2 * (noise(q * 40.) - .5); // 頭讓位的那條邊不要是直線
  A *= surf > .5 ? earMask(q, surf, -.35) : 1. - max(earMask(q, 1., rag), earMask(q, 2., rag)); // 頭和耳朵各管各的範圍
  if (vC.a < 0.) A *= 1. - smoothstep(.42, .62, dot(col, vec3(.3, .6, .1))); // 鬍鬚只留深色的線，不帶走旁邊的毛
  else A *= mix(1., max(1. - smoothstep(.1, .32, distance(col, vC.rgb)), vC.a > 1.5 ? 0. : .1), min(vC.a, 1.)); // 一筆只留跟筆心同色的部分；補畫的（2）更嚴格，不能帶到五官
  float pool = smoothstep(.45, .8, edge) * (1. - smoothstep(.8, 1., edge)); // 顏料積在筆觸邊緣；算進權重，正面總量不變
  // 每一筆有自己的先後（越上層、運氣越好的越優先）。uCrisp 越大，重疊處越由優先的那一筆說了算：
  // 1 是大家平均（柔、糊），大一點就看得出一筆壓著一筆
  float first = .6 + .8 * hash(vec2(vSeed, 7.)) + .3 * max(vD.w, 0.);
  // 權重總和存在半精度的貼圖裡，超過約 65000 會變成無限大，那個像素就會整塊變白；所以只有筆刷吃邊緣加權，而且設上限
  float wA = min(vD.x * pow(A * (shape < .5 ? (1. + uPool * pool) * first : 1.), uCrisp) * (1. + 3. * rim), 20000.);
  #if PASS != 3
    // 側著看的面淡掉：不然轉到側面時，輪廓外那圈平的毛邊會被壓成一條線，顏料全疊在一起變成一道黑縫。正面不動，才對得上原圖
    float graze = abs(dot(normalize(cross(dFdx(vPos), dFdy(vPos))), normalize(vPos)));
    wA *= mix(smoothstep(.04, .3, graze), 1., vFront);
    if (surf < .5 && vC.a >= 0.) wA *= mix(smoothstep(0., .004, vThick), 1., vFront); // 同理，輪廓外那圈平的毛邊只在正對或背對時畫
  #endif

  #if PASS == 0
    gl_FragColor = vec4(wA); // 這個像素上，目前看得到的筆觸權重總和
  #elif PASS == 1
    // 把顏料濃度依權重分給這個像素上看得到的每一筆，全部相乘剛好是它們的加權平均色。
    // 每一幀照當下的視角分，所以任何角度都不會疊得太黑或太淡；正面時每筆取的都是原圖同一點，結果就是原圖
    float total = texture2D(uCov, gl_FragCoord.xy / uRes).r, S = max(total, uSmin);
    // 陰影：光從左上前方來，背光的面疊一層偏冷的淡彩
    col *= mix(vec3(1.), vec3(.62, .6, .8), uShade * smoothstep(.5, -.25, dot(normalize(vN), normalize(vec3(-.45, .5, .75)))));
    // 顏料變薄的地方（整顆頭的外緣），筆觸邊緣積得更深，像水彩乾掉的水漬邊
    float share = wA / S * (1. + uPool * pool * (1. - smoothstep(uSmin, 3. * uSmin, total)));
    // alpha 存「還露出多少紙」，一樣用相乘累積
    gl_FragColor = vec4(pow(col, vec3(share)), pow(max(1. - aImg, 1e-4), wA / S));
  #elif PASS == 3
    if (A < .5 || vThick < .1) discard; // 靠近輪廓、頭很薄的地方不擋：那裡正背兩片縮進去後會交叉，反而蓋住自己的筆觸
    gl_FragColor = vec4(1.);
  #else
    if (A < .5) discard;
    vec3 flat_ = shape > 1.5 ? vec3(.88, .86, .82) : (vC.a < .5 ? col : vC.rgb * (.88 + .24 * hash(vec2(vSeed, 3.))));
    gl_FragColor = vec4(mix(flat_ * .45, flat_, smoothstep(.5, .72, A)), 1.);
  #endif
}`

// opts.src：貓頭圖片的網址。opts.saved：之前調過的參數 { 名稱: 值 }。opts.query：網址參數（測試時用來固定姿勢）。
// opts.stay：拖曳放開後停在原地（測試頁）還是彈回去（首頁）。opts.onInfo：筆觸數量或畫質有變時通知。
// opts.onContext(lost)：瀏覽器把繪圖環境收走（true）或還回來（false）時通知。手機切到背景再回來常會這樣
export async function createCat(canvas, { src, saved = {}, query = '', stay = true, onInfo = () => {}, onContext = () => {} } = {}) {
  const q = new URLSearchParams(query)
  const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d)
  // 所有掛出去的事件都帶同一個 signal，dispose 時一次拆掉
  const off = new AbortController()
  const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal: off.signal })
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  // 頁面上的開關：自動旋轉、只看筆觸、拆開（0–1）、待機動作。網址指定了姿勢就是要看靜止的樣子
  const ui = { sway: false, only: q.get('mode') === 'strokes', spread: num('spread', 0), idle: !calm && !['yaw', 'gx', 'blink', 'sniff'].some((k) => q.has(k)) }
  const img = new Image()
  // 不用 img.decode()：分頁在背景時它會一直等
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(new Error('讀不到貓頭圖片')); img.src = src })

  // 縮小一份到 2D canvas，放筆觸時用來查顏色與透明度
  const SC = 0.25, sw = Math.round(PX * SC), sh = Math.round(PX * AR * SC)
  const ctx = Object.assign(document.createElement('canvas'), { width: sw, height: sh }).getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, sw, sh)
  const data = ctx.getImageData(0, 0, sw, sh).data
  const sample = (x, y) => {
    const i = (Math.min(sh - 1, Math.max(0, Math.round(y * SC))) * sw + Math.min(sw - 1, Math.max(0, Math.round(x * SC)))) * 4
    const a = data[i + 3] / 255
    return [0, 1, 2].map((c) => (data[i + c] / 255) * a + 1 - a).concat(a)
  }

  canvas.style.touchAction = 'pan-y' // 上下滑留給頁面捲動
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.autoClear = false
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace // 全程不轉色彩空間，multiply 直接在螢幕色上算
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))

  const tex = new THREE.Texture(img)
  tex.premultiplyAlpha = true
  tex.needsUpdate = true
  // ponytail: 需要 half-float render target，極舊的手機沒有就會算錯；真的遇到再改成 8-bit 分段
  const cov = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter })
  // 正面哪裡是紫色的毛（不透明、不偏黃、離眼睛夠遠，而且四周也是）：補後腦與耳背時從這些地方取色
  const EYES = [[312, 385], [667, 455]], NOSE = [470, 590]
  const furAt = (x, y) => { const c = sample(x, y); return c[3] > 0.9 && c[1] - c[2] < 0.05 && !EYES.some(([ex, ey]) => Math.hypot(x - ex, y - ey) < 110) }
  const isFur = (x, y) => [[0, 0], [30, 30], [-30, 30], [30, -30], [-30, -30]].every(([dx, dy]) => furAt(x + dx, y + dy))
  const furPts = []
  for (let y = 0; y < PX * AR; y += 20) for (let x = 0; x < PX; x += 20) if (isFur(x, y)) furPts.push([x, y])
  const backCol = [0, 1, 2].map((c) => furPts.reduce((a, [x, y]) => a + sample(x, y)[c], 0) / furPts.length)

  // 頭有多厚看「離輪廓多遠」：把輪廓磨平、挖掉耳朵，再算每一點到邊緣的距離（兩趟掃描的近似距離）
  const inHead = (x, y) => {
    if (x < 0 || y < 0 || x >= sw || y >= sh) return false
    let a = 0
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) a += data[(Math.min(sh - 1, Math.max(0, y + j)) * sw + Math.min(sw - 1, Math.max(0, x + i))) * 4 + 3]
    return a / 49 > 128 && ![1, 2].some((e) => { const [u, c] = earAC(x / SC, y / SC, EARS[e]); return u > 0.1 && Math.abs(c) < 1.35 })
  }
  const dist = new Float32Array(sw * sh)
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) dist[y * sw + x] = inHead(x, y) ? 1e9 : 0
  const at = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh ? 0 : dist[y * sw + x])
  for (const dir of [1, -1])
    for (let y = dir > 0 ? 0 : sh - 1; y >= 0 && y < sh; y += dir)
      for (let x = dir > 0 ? 0 : sw - 1; x >= 0 && x < sw; x += dir)
        dist[y * sw + x] = Math.min(dist[y * sw + x], at(x - dir, y) + 1, at(x, y - dir) + 1, at(x - dir, y - dir) + 1.414, at(x + dir, y - dir) + 1.414)
  // 存成 0–255 = 0–400 原圖像素
  const distTex = new THREE.DataTexture(Uint8Array.from({ length: sw * sh * 4 }, (_, i) => Math.min(255, (dist[i >> 2] / SC / 400) * 255)), sw, sh)
  distTex.magFilter = distTex.minFilter = THREE.LinearFilter
  distTex.needsUpdate = true

  const distPx = (x, y) => { // 雙線性取樣，回傳原圖像素
    const fx = Math.min(sw - 1.001, Math.max(0, x * SC)), fy = Math.min(sh - 1.001, Math.max(0, y * SC)), ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, i = iy * sw + ix
    return ((dist[i] * (1 - tx) + dist[i + 1] * tx) * (1 - ty) + (dist[i + sw] * (1 - tx) + dist[i + sw + 1] * tx) * ty) / SC
  }
  const headH = (x, y, side) => { // 要跟 shader 裡的 head() 保持一致
    const d = Math.max(Math.min(distPx(x, y), 400) - 28, 0), e = 1 - 0.5 * val('round'), g = (cx, cy, v) => Math.exp(-((x / PX - cx) ** 2 + (y / PX - cy) ** 2) / v)
    if (side < 0) { const t = Math.min(d / 400, 1); return -0.7 * (t * (2 - t)) ** e * val('depth') * val('back') }
    const t = Math.min(d / 300, 1)
    const muzzle = 0.07 * g(0.52, 0.67, 0.034) + 0.09 * (g(0.445, 0.7, 0.006) + g(0.585, 0.72, 0.006)) + 0.05 * g(0.5, 0.8, 0.006) + 0.11 * g(0.528, 0.609, 0.004) - 0.03 * g(0.51, 0.7, 0.0012)
    return (0.5 * (t * (2 - t)) ** e + muzzle * smooth(0, 0.5, t) - 0.035 * (g(0.347, 0.428, 0.01) + g(0.741, 0.506, 0.01))) * val('depth')
  }
  // 這一點的坡度：[往上坡的方向 x, y, 表面積是原圖上同一塊的幾倍（越陡越大）]
  const slopeAt = (x, y, side) => {
    const gx = (headH(x + 9, y, side) - headH(x - 9, y, side)) / 0.04, gy = (headH(x, y + 9, side) - headH(x, y - 9, side)) / 0.04, g = Math.hypot(gx, gy) || 1
    return [gx / g, gy / g, Math.hypot(1, gx, gy)]
  }

  const uniforms = { uDist: { value: distTex }, uImg: { value: tex }, uCov: { value: cov.texture }, uSpread: { value: 0 }, uVel: { value: new THREE.Vector2() }, uLook: { value: new THREE.Vector2() }, uTwitch: { value: new THREE.Vector2() }, uPupil: { value: num('pupil', 1) }, uSniff: { value: num('sniff', 0) }, uTime: { value: 0 }, uBlink: { value: num('blink', 0) }, uRes: { value: new THREE.Vector2(1, 1) }, uBackCol: { value: new THREE.Vector3(...backCol) } }
  // 參數的來源：網址 > 之前存的 > 預設
  for (const [k, , , , , def] of PARAMS) uniforms[uname(k)] = { value: num(k, saved[k] ?? def) }
  const val = (k) => uniforms[uname(k)].value
  const mat = (PASS, o) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, defines: { PASS }, side: THREE.DoubleSide, ...o })
  const blend = (blendSrc, blendDst, depthTest) => ({ blending: THREE.CustomBlending, blendSrc, blendDst, depthTest, depthWrite: false })
  // 0 算每個像素的權重總和、1 上色、2 只看筆觸、3 只寫深度的實心頭（讓頭擋住它背後的筆觸；顏料全是透明相乘，不擋的話後腦會透到臉上）
  const mats = [mat(0, blend(THREE.OneFactor, THREE.OneFactor, true)), mat(1, blend(THREE.DstColorFactor, THREE.ZeroFactor, true)), mat(2), mat(3, { colorWrite: false })]

  // 固定種子，同一組設定每次長一樣
  let seed
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const w2 = (px) => (px * 2) / PX
  // side: 正面 1、背面 -1。from: 從原圖哪裡取色（預設就是自己的位置）
  const stroke = ({ x, y, ang = 0, L, W, z = 0, lift = 0, bend = 0, w = 1, shape = 0, surf = 0, tier = 0, k = 1, side = 1, from = [x, y], aux }) => [
    [(x / PX - 0.5) * 2, (AR * 0.5 - y / PX) * 2, ang, rnd()], [w2(L), w2(W), z, lift], [...(aux || sample(...from).slice(0, 3)), k], [w, shape + 10 * surf, bend, tier],
    [(from[0] - x) / PX, (y - from[1]) / (PX * AR), side, 0],
  ]

  function strokes() {
    seed = 20261005
    // 毛：三層錯開的格點，從臉中央往外放射，越靠邊筆尖翹越高。眼睛裡面不放，留給眼睛自己的三層
    const out = [], STEP = 66 / Math.sqrt(val('density')), near = (x, y, r) => ([fx, fy]) => Math.hypot(x - fx, y - fy) < r
    for (const side of [1, -1]) for (let tier = 0; tier < 3; tier++)
      for (let gy = -STEP; gy < PX * AR + STEP; gy += STEP)
        for (let gx = -STEP; gx < PX + STEP; gx += STEP) {
          const x = gx + (rnd() - 0.5) * STEP * 0.9 + (tier * STEP) / 3, y = gy + (rnd() - 0.5) * STEP * 0.9 + (tier * STEP) / 3
          if (sample(x, y)[3] < 0.35 || (side > 0 && EYES.some(near(x, y, 55)))) continue
          const surf = [1, 2].find((i) => { const [a, c] = earAC(x, y, EARS[i]); return a > 0 && Math.abs(c) < 1.35 }) || 0
          const E = EARS[surf], dx = E ? E.T[0] - E.M[0] : x - 470, dy = E ? E.T[1] - E.M[1] : y - 520 // 耳朵上的毛順著耳朵往耳尖
          const rim = E ? 0.5 : Math.min(Math.hypot(dx, dy) / 420, 1)
          const f = side > 0 && [...EYES, NOSE].some(near(x, y, 120)) ? 0.7 : 1
          // 背面：正面這裡是毛就原地延續；是臉就從臉中央往外找到第一塊毛，把四周的花紋往中間收；找不到（下巴方向）才隨機搬一塊
          let from = [x, y]
          if (side < 0) { // 背面不要跟正面一模一樣（側面看會像鏡子對折）：取色的位置挪開一點
            const near = [x + (rnd() - 0.5) * 160, y + (rnd() - 0.5) * 160]
            if (isFur(...near)) from = near
          }
          if (side < 0 && !isFur(...from)) {
            const d = Math.hypot(x - 470, y - 560) || 1
            from = furPts[Math.floor(rnd() * furPts.length)]
            for (let r = 15; r < 500; r += 15) { const c = [x + ((x - 470) / d) * r, y + ((y - 560) / d) * r]; if (isFur(...c)) { from = c; break } }
          }
          const paint = side > 0 ? {} : { side, k: 2, from }
          // 斜面上同一格原圖對應的表面比較大，要多放幾筆才一樣密。多出來的幾筆沿著坡的「高度」平均分布
          // （靠近輪廓的牆面，原圖上只差幾個像素，高度就差很多；照原圖位置亂數放的話會全擠在牆腳或牆頂）
          const [ux, uy, area] = surf ? [0, 0, 1] : slopeAt(x, y, side), many = Math.min(area, 16), h = STEP / 2
          for (let i = 0; i < Math.floor(many) + (rnd() < many % 1 ? 1 : 0); i++) {
            let px = x, py = y
            if (i) {
              const z0 = headH(x - ux * h, y - uy * h, side), z1 = headH(x + ux * h, y + uy * h, side), zt = z0 + (z1 - z0) * rnd()
              let lo = -h, hi = h
              for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; (headH(x + ux * m, y + uy * m, side) - zt) * (z1 - z0) < 0 ? (lo = m) : (hi = m) }
              const across = (rnd() - 0.5) * STEP
              px = x + ux * lo - uy * across
              py = y + uy * lo + ux * across
            }
            out.push(stroke({
            ...paint, x: px, y: py, tier, surf, ang: Math.atan2(-dy, dx) + (rnd() - 0.5) * val('jit'), L: (120 + rnd() * 60) * f * val('len'), W: (48 + rnd() * 26) * f * val('wid'),
            z: tier * 0.03 + rnd() * 0.012, lift: 0.03 + 0.09 * rim * rim + rnd() * 0.03, bend: (rnd() - 0.5) * 0.25,
            }))
          }
        }

    // 五官與鬍鬚：位置對著原圖手動標的，整塊保留原圖細節
    const oval = (x, y, L, W, z, w, bend = 0, tier = 3, aux, from = [x, y], k = 0) => stroke({ x, y, L, W, z, w, bend, tier, aux, from, k, shape: 1 })
    // 眼眶是中空的環貼在臉上；虹膜（bend -1）、瞳孔（bend -2）往裡縮並朝向鏡頭。
    // aux 借用顏色欄：虹膜存「原本的瞳孔在哪、多大」，瞳孔存「眼眶中心在哪、開口多大」，都是相對自己中心的立體座標
    // lid：眼皮的顏色從哪裡取，相對眼睛中心（要落在額頭的毛上，避開耳朵內側的黃色和輪廓外）
    const eye = (x, y, L, W, px, py, lid) => [
      oval(x, y, L, W, 0, 4, 0.55),
      oval(x, y, L * 0.74, W * 0.74, -0.02, 8, -1, 3.4, [w2(px - x), w2(y - py), w2(L * 0.21)]),
      oval(px, py, L * 0.42, W * 0.42, -0.045, 400, -2, 3.8, [w2(x - px), w2(py - y), w2(Math.min(L, W) * 0.3)]),
      oval(px - L * 0.08, py - W * 0.1, L * 0.11, W * 0.11, 0, 1500, -3, 3.9),
      oval(x, y, L, W, 0.012, 12000, -4, 4, [0, 0, w2(Math.min(L, W) * 0.3)], [x + lid[0], y + lid[1]]),
    ]
    const whisker = (x0, y0, x1, y1) => stroke({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, ang: Math.atan2(y0 - y1, x1 - x0), L: Math.hypot(x1 - x0, y1 - y0), W: 24, z: 0.05, lift: 0.22, w: 6, k: -1, tier: 3 })
    // 每隻耳朵自己的底層淡彩
    for (const side of [1, -1]) for (const surf of [1, 2]) {
      const { M, T, hw } = EARS[surf]
      out.push(stroke({ side, x: (M[0] + T[0]) / 2, y: (M[1] + T[1]) / 2, ang: Math.atan2(M[1] - T[1], T[0] - M[0]), L: Math.hypot(T[0] - M[0], T[1] - M[1]) * 2, W: hw * 3.2, w: 0.3, shape: 2, surf, k: 0, tier: -1 }))
    }
    return out.concat(
      eye(312, 385, 190, 200, 300, 372, [60, -115]), eye(667, 455, 170, 165, 660, 450, [-80, -115]), [
        oval(468, 610, 200, 250, 0.03, 6), // 口鼻的底：整塊赭黃色的毛
        // 鼻頭自己一片，浮在鼻尖上，只留粉色的部分（k 1）。鼻孔和鼻樑的深色線再一片，壓在鼻頭上（k -1：只留深色的線）
        oval(475, 548, 180, 95, 0.03, 60, -5, 3.5, undefined, undefined, 1), oval(475, 556, 200, 100, 0.04, 150, -5, 3.7, undefined, undefined, -1),
        oval(452, 665, 210, 150, 0.012, 150, 0, 3.6, undefined, undefined, -1), // 人中和嘴巴的線：貼著表面，落在兩塊鬍鬚墊中間的溝裡
      ],
      [whisker(320, 628, 10, 750), whisker(300, 640, 150, 715), whisker(315, 572, 190, 562), whisker(590, 655, 705, 668), whisker(610, 682, 745, 845), whisker(795, 690, 868, 730)],
    )
  }

  const head = new THREE.Group(), scene = new THREE.Scene().add(head)
  const mesh = (list, sx, sy) => {
    const p = new THREE.PlaneGeometry(2, 2, sx, sy), g = new THREE.InstancedBufferGeometry()
    g.index = p.index
    g.setAttribute('position', p.attributes.position)
    g.instanceCount = list.length
    ;['iA', 'iB', 'iC', 'iD', 'iE'].forEach((n, j) => g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(list.flatMap((s) => s[j])), 4)))
    const m = new THREE.Mesh(g, mats[1])
    m.frustumCulled = false
    return m
  }
  const setMat = (m) => head.children.forEach((c) => (c.material = m))
  const camera = new THREE.PerspectiveCamera(26, 1 / AR, 0.1, 50)
  camera.position.z = 5
  seed = 1
  head.add(mesh([1, -1].map((side) => stroke({ side, x: PX / 2, y: (PX * AR) / 2, L: PX, W: PX * AR, z: -0.01, w: 0.3, shape: 2, k: 0, tier: -1 })), 128, 128)) // 正面、背面各一片底層淡彩，也拿來當實心頭

  let count = 0, level = 0
  const note = () => onInfo(`${count} 片獨立筆觸` + (level ? `，畫質已自動調降 ${level} 級` : ''))
  function refresh(rebuild) {
    if (!rebuild) return
    const list = strokes()
    if (head.children[1]) { head.children[1].geometry.dispose(); head.remove(head.children[1]) }
    head.add(mesh(list, 12, 3))
    count = list.length + 2
    note()
  }

  // 顏料是疊在白底上乘出來的；最後把白底扣掉換成透明，貓才能照原色落在任何底色的頁面上
  // （畫面存的是 疊白後的顏色 與 露出的紙 T，這片把它改成 顏色 - T 與 1 - T，也就是預乘透明）
  const lift = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: 'void main() { gl_FragColor = vec4(1.); }',
    blending: THREE.CustomBlending, depthTest: false, depthWrite: false,
    blendEquation: THREE.ReverseSubtractEquation, blendSrc: THREE.DstAlphaFactor, blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.SubtractEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  }))
  lift.frustumCulled = false

  // 轉動：yaw/pitch 用彈簧追目標。目標的來源依序是 自動旋轉 > 拖曳 > 固定角度（含拖完放開的位置）> 手機傾斜 > 游標 > 回正
  let yaw = 0, pitch = 0, vy = 0, vp = 0, last = 0
  let gaze = q.has('gx') ? [num('gx', 0), num('gy', 0)] : [0, 0] // 瞳孔往哪看，-1 到 1
  let pin = q.has('yaw') ? [num('yaw', 0), num('pitch', 0)] : null, drag = null, hover = null, gyro = null

  const render = () => {
    head.rotation.set(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(yaw + shake), 0)
    uniforms.uSpread.value = ui.spread * 0.14
    uniforms.uVel.value.set(clamp(vy, 300), -clamp(vp, 300)).multiplyScalar(0.0018)
    uniforms.uLook.value.set(gaze[0], -gaze[1]).multiplyScalar(0.045 * val('gaze'))
    // 每一趟都先只畫實心頭的深度，再畫筆觸
    const pass = (m) => {
      renderer.clear()
      head.children[1].visible = false
      setMat(mats[3])
      renderer.render(scene, camera)
      head.children[1].visible = true
      setMat(m)
      renderer.render(scene, camera)
    }
    if (!ui.only) { // 先算這個視角下每個像素的權重總和
      renderer.setRenderTarget(cov)
      renderer.setClearColor(0x000000, 0)
      pass(mats[0])
      renderer.setRenderTarget(null)
    }
    renderer.setClearColor(0xffffff, ui.only ? 0 : 1)
    pass(mats[ui.only ? 2 : 1])
    if (!ui.only) renderer.render(lift, camera)
  }
  const unwind = () => { yaw = ((((yaw + 180) % 360) + 360) % 360) - 180 } // 轉了好幾圈之後收回 ±180 內，免得回正時倒轉好幾圈
  const snap = () => { if (pin) [yaw, pitch] = pin; vy = vp = 0; render() } // 分頁在背景時不會有動畫格，固定角度要當下就畫

  // 摸牠的反應。press：這次按下去的起點；沒移動超過 8px 就不算拖曳，而是點一下（放得快）或長按（按住不放）
  let press = null, holdTimer = 0, held = false, taps = [], busyUntil = 0, shake = 0, shakeAt = -1e9, squint = [0, 0, 0], earTap = [-1e9, 0], sniffTap = -1e9
  const tap = (cx, cy) => {
    const now = performance.now(), r = canvas.getBoundingClientRect()
    taps = taps.filter((t) => now - t < 1200).concat(now)
    busyUntil = now + 1500
    if (taps.length >= 3) { taps = []; shakeAt = now; squint = [now, now + 700, 0.6]; return } // 連點三下：被煩到甩頭
    // 點到哪裡：頭大致朝前時，把畫面上的位置換回原圖座標（鏡頭視野的一半寬高是 1.131、1.085）
    const wx = ((cx - r.left) / r.width - 0.5) * 2.262, wy = (0.5 - (cy - r.top) / r.height) * 2.17
    const ix = (wx / 2 + 0.5) * PX, iy = (AR / 2 - wy / 2) * PX, front = Math.abs(yaw) < 40 && Math.abs(pitch) < 25
    const onEar = front && [1, 2].find((i) => { const [a, c] = earAC(ix, iy, EARS[i]); return a > 0 && a < 1.2 && Math.abs(c) < 1.2 })
    if (onEar) earTap = [now, onEar - 1] // 耳朵：那隻耳朵連抖兩下
    else if (front && Math.hypot(ix - 475, iy - 555) < 80) { sniffTap = now; squint = [now, now + 350, 1]; vp -= 120 } // 鼻子：往後縮、眨眼、嗅
    else { sniffTap = now; squint = [now, now + 650, 0.8]; vy += clamp(wx, 1) * 220; vp -= clamp(wy, 1) * 150 } // 其他地方：瞇眼，往手的方向蹭一下
  }
  on(canvas, 'pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId)
    press = { x: e.clientX, y: e.clientY, t: performance.now(), pin, far: false }
    holdTimer = setTimeout(() => { if (press && !press.far) { held = true; busyUntil = Infinity } }, 450) // 長按：瞇眼讓你摸
    unwind(); pin = null; ui.sway = false; drag = [yaw, pitch]
  })
  on(canvas, 'pointermove', (e) => {
    if (!drag) return
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) press.far = true
    drag[0] += e.movementX * 0.35
    if (e.pointerType === 'mouse') drag[1] = clamp(drag[1] + e.movementY * 0.25, MAX_PITCH) // 觸控的上下留給頁面捲動
  })
  for (const ev of ['pointerup', 'pointercancel']) on(canvas, ev, (e) => {
    clearTimeout(holdTimer)
    const p = press, wasHeld = held
    press = null; held = false
    if (wasHeld) busyUntil = performance.now() + 600
    if (!p || p.far) { pin = stay ? drag || pin : p ? p.pin : pin; drag = null; return } // 拖過：停在那裡，或彈回原本的狀態
    pin = p.pin; drag = null // 沒拖：頭的狀態照舊
    if (!wasHeld && e.type === 'pointerup' && performance.now() - p.t < 350) tap(p.x, p.y)
  })
  // 貓該看哪裡：滑鼠的位置，或手指碰到的位置（滑頁面時也算）。touch 用 touch 事件，因為頁面一開始捲動 pointer 事件就停了
  let lastInput = -1e9
  const lookAt = (cx, cy) => {
    lastInput = performance.now()
    const r = canvas.getBoundingClientRect()
    hover = [clamp((cx - r.left - r.width / 2) / (innerWidth / 2), 1), clamp((cy - r.top - r.height / 2) / (innerHeight / 2), 1)]
  }
  on(window, 'pointermove', (e) => e.pointerType === 'mouse' && lookAt(e.clientX, e.clientY))
  for (const ev of ['touchstart', 'touchmove']) on(window, ev, (e) => lookAt(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
  on(document.documentElement, 'pointerleave', () => (hover = null))
  const fit = () => { renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); renderer.getDrawingBufferSize(uniforms.uRes.value); cov.setSize(uniforms.uRes.value.x, uniforms.uRes.value.y); render() }
  const sized = new ResizeObserver(fit)
  sized.observe(canvas)

  // 改一個參數：需要重排筆觸的會重排。回傳實際套用的值
  const set = (k, v) => {
    const p = PARAMS.find((x) => x[0] === k)
    uniforms[uname(k)].value = Math.max(p[2], Math.min(p[3], Number(v)))
    refresh(p[6])
    render()
    return val(k)
  }

  refresh(true)
  fit() // 不等 ResizeObserver：第一幀就要有正確的畫布大小，不然權重貼圖只有 1×1，顏色會分錯
  snap()

  let seen = true // 捲出畫面就不畫，省電
  const watched = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
  watched.observe(canvas)

  // 待機動作各自的下一次時間
  let blinkAt = 1500, earAt = 5000, ear = 0, glanceAt = 6000, glance = [0, 0], sniffAt = 3500
  const pulse = (ms, at, len) => { const t = (ms - at) / len; return t < 0 || t > 1 ? 0 : Math.sin(Math.PI * t) ** 2 } // 0 → 1 → 0

  // 跑不順就自動降畫質：先降解析度三級，還是慢再減筆觸兩次
  let slow = 0, frames = 0
  const cheaper = () => {
    level++
    if (level <= 3) { renderer.setPixelRatio(Math.min(devicePixelRatio, [2, 1.5, 1.2, 1][level])); fit() }
    else { uniforms.uDensity.value = Math.max(0.4, val('density') * 0.7); refresh(true) }
    note()
  }

  const loop = (ms) => {
    const raw = (ms - last) / 1000, dt = Math.max(0, Math.min(raw, 0.05)), f = val('follow') // 時間倒退（測試時手動推進）就當作沒過時間
    last = ms
    const [ty, tp] = ui.sway ? [yaw + 6, 0] // 目標永遠領先一點，彈簧就會等速轉下去
      : drag || pin || (gyro && [clamp(gyro[0], f), clamp(gyro[1], f * 0.45)]) || (hover && [hover[0] * f, hover[1] * f * 0.45]) || [0, 0]
    if (calm) { vy = (ty - yaw) / Math.max(dt, 0.001); vp = (tp - pitch) / Math.max(dt, 0.001); yaw = ty; pitch = tp } // 減少動態：不彈
    else { // 略微欠阻尼的彈簧，放開時會輕輕過頭再回來
      vy += ((ty - yaw) * 90 - vy * 13) * dt; vp += ((tp - pitch) * 90 - vp * 13) * dt
      yaw += vy * dt; pitch = clamp(pitch + vp * dt, MAX_PITCH)
    }

    let look = (gyro && [clamp(gyro[0] / 30, 1), clamp(gyro[1] / 30, 1)]) || hover || [0, 0]
    const alive = ui.idle && seen, now = ms, fixed = q.has('blink') || q.has('sniff') // 網址指定了表情就不動它
    let blink = 0, sniff = 0, tw = [0, 0], breath = held ? 0.014 : 0
    if (alive) {
      // 眨眼：每 2.5–6.5 秒一次，兩成機率連眨兩下
      if (ms > blinkAt + 220) blinkAt = ms + (Math.random() < 0.2 ? 120 : 2500 + Math.random() * 4000)
      blink = pulse(ms, blinkAt, 220)
      // 抖耳朵：每 4–10 秒，隨機一隻
      if (ms > earAt + 320) { earAt = ms + 4000 + Math.random() * 6000; ear = Math.random() < 0.5 ? 0 : 1 }
      tw[ear] = pulse(ms, earAt, 320) * 0.9
      // 超過 4 秒沒人理牠，偶爾自己瞄一下別處再看回來
      if (now - lastInput > 4000) {
        if (ms > glanceAt + 900) { glanceAt = ms + 2500 + Math.random() * 4000; glance = [Math.random() * 1.6 - 0.8, Math.random() - 0.5] }
        look = ms > glanceAt ? glance : [0, 0]
      }
      // 嗅一下：每 5–11 秒，連兩下
      if (ms > sniffAt + 520) sniffAt = ms + 5000 + Math.random() * 6000
      sniff = pulse(ms, sniffAt, 240) + pulse(ms, sniffAt + 280, 240)
      breath = Math.max(breath, 0.006)
      uniforms.uTime.value = ms / 1000
    }
    // 被摸的反應疊在待機動作上（待機動作關掉時也有）
    const [s0, s1, amt] = squint
    blink = Math.max(blink, held ? 0.72 : now < s1 ? amt * Math.min(1, (now - s0) / 90, (s1 - now) / 160) : 0)
    sniff += (pulse(now, sniffTap, 200) + pulse(now, sniffTap + 240, 200)) * 1.5
    tw[earTap[1]] += pulse(now, earTap[0], 220) * 1.6 + pulse(now, earTap[0] + 260, 220) * 1.4
    shake = now - shakeAt < 900 ? Math.sin((now - shakeAt) * 0.038) * 9 * Math.exp(-(now - shakeAt) / 260) : 0
    if (!fixed) { uniforms.uBlink.value = blink; uniforms.uSniff.value = sniff }
    uniforms.uTwitch.value.set(tw[0], tw[1])
    // 呼吸；長按時變深變快，像在呼嚕
    head.scale.setScalar(1 + breath * Math.sin(ms / (held ? 260 : 900)))
    head.position.y = breath * 1.3 * Math.sin(ms / (held ? 260 : 900))

    // 瞳孔比頭快：先瞄過去，頭跟上之後瞳孔再收回一些。頭被固定或拖著時，瞳孔照樣跟。看得越偏瞳孔越小，看著你時放大
    const lead = f ? clamp(yaw / f, 1) : 0, ease = 1 - Math.exp(-dt * 14)
    const gt = q.has('gx') ? gaze : [clamp(look[0] * 1.4 - lead * 0.6, 1), clamp(look[1] * 1.2, 1)]
    const moved = Math.abs(gt[0] - gaze[0]) + Math.abs(gt[1] - gaze[1])
    gaze = [gaze[0] + (gt[0] - gaze[0]) * ease, gaze[1] + (gt[1] - gaze[1]) * ease]
    // 「眼神沉穩」：瞳孔維持原畫的大小、沒有反光。關掉是水汪汪版：瞳孔放大、看著你時更大、有一點反光
    uniforms.uPupil.value += ((val('calm') ? 1 : 1.12 - 0.22 * Math.min(Math.hypot(...gaze), 1)) - uniforms.uPupil.value) * ease

    const still = Math.abs(vy) + Math.abs(vp) + Math.abs(ty - yaw) + Math.abs(tp - pitch) + moved * 10 < 0.02
    if (calm) vy = vp = 0
    if (!seen || (still && !alive && now > busyUntil)) { frames = slow = 0; return } // 靜止就不重畫
    render()

    // 連續畫了 45 幀、平均每幀超過 27ms（不到 37fps）就降一級。剛載入的前 3 秒和切回分頁的那一幀不算
    if (ms < 3000 || raw > 0.25) { frames = slow = 0; return }
    slow += raw
    if (++frames < 45) return
    if (slow / frames > 0.027 && level < 5) cheaper()
    frames = slow = 0
  }
  renderer.setAnimationLoop(loop)
  // 繪圖環境被收走時畫面會是空的，還回來之後 Three.js 會自己重建資源，這裡補畫一幀
  on(canvas, 'webglcontextlost', () => onContext(true))
  on(canvas, 'webglcontextrestored', () => { render(); onContext(false) })

  return {
    params: PARAMS,
    val,
    set,
    // 全部改回預設值
    reset() { for (const [k, , , , , def] of PARAMS) uniforms[uname(k)].value = def; refresh(true); render() },
    // 跟預設不一樣的參數，給外面存起來用
    changed: () => Object.fromEntries(PARAMS.filter(([k, , , , , def]) => val(k) !== def).map(([k]) => [k, val(k)])),
    ui,
    // 改頁面上的開關：{ sway, only, spread, idle }
    setUi(patch) {
      Object.assign(ui, patch)
      if ('sway' in patch) unwind()
      if (patch.idle === false) { uniforms.uBlink.value = uniforms.uSniff.value = 0; uniforms.uTwitch.value.set(0, 0); head.scale.setScalar(1); head.position.y = 0 }
      render()
    },
    // 固定在某個角度；給 null 就回到跟著游標
    pin(deg) { unwind(); pin = deg == null ? null : [deg, 0]; ui.sway = false; snap() },
    // 手機傾斜：iOS 要使用者按了才給權限，所以要從按鈕的點擊裡呼叫。回傳有沒有成功
    canTilt: 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches,
    async tilt() {
      if ((await DeviceOrientationEvent.requestPermission?.().catch(() => 'denied')) === 'denied') return false
      let beta0
      on(window, 'deviceorientation', (e) => { beta0 ??= e.beta; gyro = [e.gamma * 0.9, (e.beta - beta0) * 0.5] })
      pin = null
      return true
    },
    // 測試用：分頁在背景時沒有動畫格，讓外面可以手動推進並讀出狀態
    step: loop,
    state: () => ({ yaw, pitch, shake, held, blink: uniforms.uBlink.value, sniff: uniforms.uSniff.value, twitch: uniforms.uTwitch.value.toArray(), pin, hover, gaze, pupil: uniforms.uPupil.value }),
    // 離開頁面時一定要叫：停掉動畫、拆事件、把顯示卡的資源還回去（瀏覽器的 WebGL 環境數量有上限）
    dispose() {
      off.abort()
      clearTimeout(holdTimer)
      sized.disconnect()
      watched.disconnect()
      renderer.setAnimationLoop(null)
      head.children.forEach((c) => c.geometry.dispose())
      lift.geometry.dispose()
      ;[...mats, lift.material].forEach((m) => m.dispose())
      ;[tex, distTex, cov].forEach((t) => t.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
