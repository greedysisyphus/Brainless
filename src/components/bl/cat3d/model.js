// 整隻貓的 3D 版（試作）：形狀是真的 3D 模型，可以轉一整圈；畫風由這裡補回來。
// 模型是 AI 從原畫生的，它自己的貼圖是卡通風，所以：
//   正面：把原畫的頭和另外畫的身體從正前方投影回模型上，看到的就是原本的顏料；
//   側面和背面（原畫沒有畫）：用模型自己的顏色，
//   最後整個畫面再過一道水彩的處理：輪廓暈開不整齊、邊緣積色、顏料顆粒、水分濃淡不均。
// 跟 engine.js 一樣不碰 React：給它一個 canvas 和幾個檔案的網址，回傳收拾用的函式。
import * as THREE from 'three'

// 原畫怎麼對到模型上。模型座標是從正前方看的 x（右）、y（上）；對著模型和圖手動量的，換模型要重量：
// 頭：兩隻眼睛在模型上是 (-0.25, 0.38)、(0.22, 0.27)，在頭的圖上是 (312, 385)、(667, 455) → 每單位 749.5px
// 身體：兩隻前掌在模型上是 (-0.275, -0.89)、(0.08, -0.89)，尾巴中心 (0.625, -0.625)；圖上是 (300, 791)、(525, 791)、(800, 650)
const FIT = /* glsl */ `
vec2 headUv(vec3 p) { return vec2((312. + (p.x + .25) * 749.5) / 900., 1. - (385. + (.38 - p.y) * 749.5) / 863.); }
vec2 bodyUv(vec3 p) { return vec2((462.7 + 551. * p.x) / 900., 1. - (249.9 - 608. * p.y) / 849.); }`

// 眼睛：眨眼和眼神都是在原畫（頭的圖）上動手腳，walk.js 共用。要有 uHead、uBlink、uLook
export const EYES = /* glsl */ `
vec2 px2uv(vec2 p) { return vec2(p.x / 900., 1. - p.y / 863.); }
// 一隻眼睛。hp：這一點在頭的圖上的像素位置；c、rad：眼眶的中心和半徑；lid：眼皮的顏色從哪裡取（相對眼睛中心，落在額頭的毛上）
void eye(inout vec4 h, vec2 hp, vec2 c, vec2 rad, vec2 lid) {
  vec2 e = (hp - c) / rad; float r = length(e);
  if (r > 1.25) return;
  // 眼神：眼眶裡的畫整塊往視線方向挪，越靠中間挪越多、眼眶邊緣不動，所以瞳孔會轉、眼眶不會破
  float k = max(1. - r * r, 0.);
  if (r < 1.) h.rgb = texture2D(uHead, px2uv(hp - uLook * k * k)).rgb;
  // 眨眼：眼皮從上往下蓋，下緣是一道往下彎的弧，帶一條深色的睫毛線
  float line = mix(-1.6, 1.15, uBlink) + .25 * (1. - e.x * e.x);
  float cover = (1. - smoothstep(line - .08, line + .08, e.y)) * (1. - smoothstep(1.05, 1.25, r)) * step(.001, uBlink);
  vec3 fur = texture2D(uHead, px2uv(c + lid + (hp - c) * .5)).rgb * mix(.45, 1., smoothstep(.04, .2, abs(e.y - line)));
  h.rgb = mix(h.rgb, fur, cover);
}`

const VERT = /* glsl */ `
uniform float uPuff, uTime, uRound, uTail;
varying vec2 vUv; varying vec3 vP, vN;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vUv = uv; vP = position; vN = normal;
  // 炸毛：每個點沿著自己的法線往外推，長短不一，還會抖
  float r = hash(floor(position * 40.));
  // 把頭修圓：模型的頭從側面看是扁的（後腦平、額頭斜）。把頭上比「一顆橢圓球」凹的地方往外推到球面附近，
  // 比球凸的（耳朵、鼻尖、翹起來的毛）不動。只推一部分，毛的起伏才留得住。球心和三個方向的半徑是對著模型量的
  vec3 hc = vec3(-.03, .30, .31), hr = vec3(.60, .47, .52), d = (position - hc) / hr;
  float rr = length(d), inHead = smoothstep(-.22, .05, position.y) * (1. - smoothstep(.95, 1.05, rr));
  vec3 rounded = hc + d / max(rr, .001) * hr * mix(rr, 1., uRound * inHead);
  // 尾巴尖輕輕甩：尾巴貼著身體右側往前繞，越靠前面的尾尖動得越多。範圍是對著模型量的
  float tail = smoothstep(.42, .62, position.x) * smoothstep(-.25, -.45, position.y) * smoothstep(-.1, .6, position.z);
  rounded += vec3(.07 * sin(uTime * 2.1), .035 * (.5 + .5 * sin(uTime * 4.2 + 1.)), 0.) * tail * uTail;
  vec3 p = rounded + normal * uPuff * (.03 + .07 * r) * (1. + .15 * sin(uTime * 40. + r * 30.));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}`

const FRAG = /* glsl */ `
uniform sampler2D uBase, uHead, uBody; uniform float uBlink; uniform vec2 uLook;
varying vec2 vUv; varying vec3 vP, vN;
${FIT}
${EYES}
void main() {
  vec3 col = texture2D(uBase, vUv).rgb;
  vec2 hu = headUv(vP), bu = bodyUv(vP);
  vec4 h = texture2D(uHead, hu), b = texture2D(uBody, bu);
  h.a *= step(0., hu.x) * step(hu.x, 1.) * step(0., hu.y) * step(hu.y, 1.);
  vec2 hp = vec2(hu.x * 900., (1. - hu.y) * 863.);
  eye(h, hp, vec2(312., 385.), vec2(95., 100.), vec2(60., -115.));
  eye(h, hp, vec2(667., 455.), vec2(85., 83.), vec2(-80., -115.));
  b.a *= step(0., bu.x) * step(bu.x, 1.) * step(0., bu.y) * step(bu.y, 1.);
  float front = smoothstep(.12, .55, normalize(vN).z);       // 只有朝前的面吃得到原畫，轉到側面漸漸換回模型自己的顏色
  col = mix(col, b.rgb, b.a * front);
  col = mix(col, h.rgb, h.a * front * smoothstep(-.22, -.1, vP.y)); // 下巴以上是頭的畫
  gl_FragColor = vec4(col, 1.);
}`

// 水彩處理：整張畫面（已經畫好的貓，底是透明的）再過一次
export const POST = /* glsl */ `
uniform sampler2D uScene; uniform vec2 uRes, uShift; uniform float uScale;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
void main() {
  // q：不管畫布多大、螢幕多細，紋理的粗細看起來都一樣。uShift 是貓在畫面上的位置：紙紋和暈開要跟著貓走，
  // 不然貓一移動，毛就像隔著一層水在晃
  vec2 px = gl_FragCoord.xy, q = (px - uShift) / uScale;
  // 離輪廓多近：四周遠一點的地方還有沒有顏料。裡面是 1，越靠邊越小
  float far = 0.;
  for (int i = 0; i < 8; i++) { float t = float(i) * .785; far += texture2D(uScene, (px + vec2(cos(t), sin(t)) * 14. * uScale) / uRes).a; }
  far /= 8.;
  // 輪廓跟著雜訊晃：邊緣不整齊，像顏料暈開。裡面只晃一點點，五官和毛的筆觸才不會糊掉
  vec2 wob = ((vec2(n(q / 7.), n(q / 7. + 37.)) - .5) * 4. + (vec2(n(q / 40.), n(q / 40. + 11.)) - .5) * 6.) * uScale * (1. - .85 * smoothstep(.75, 1., far));
  vec4 c = texture2D(uScene, (px + wob) / uRes);
  float a = smoothstep(.3, .7, c.a + (n(q / 3.) - .5) * .35 * (1. - c.a * far));
  vec3 col = c.rgb / max(c.a, .001);
  col *= 1. - .38 * smoothstep(.1, .5, a * (1. - far));      // 邊緣積色
  col *= .88 + .22 * (n(q / 1.7) * .6 + n(q / 4.5) * .4);    // 顏料顆粒
  col = pow(col, vec3(.88 + .24 * n(q / 130.)));             // 水分不均
  gl_FragColor = vec4(col * a, a);                            // 預乘透明，貓才能落在任何底色的頁面上
}`

const MAX_PITCH = 35
const clamp = (v, m) => Math.max(-m, Math.min(m, v))

// opts.mesh：scripts/prep-cat-model.py 產生的 .bin；opts.base：模型自己的貼圖；opts.head、opts.body：原畫的頭和身體。
// opts.onContext(lost)：瀏覽器把繪圖環境收走或還回來時通知。回傳 { puff, round, turn, dispose }
export async function createModelCat(canvas, { mesh, base, head, body, onContext = () => {} }) {
  const off = new AbortController()
  const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal: off.signal })
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches

  const buf = await fetch(mesh).then((r) => { if (!r.ok) throw new Error('讀不到貓的模型'); return r.arrayBuffer() })
  const [nv, ni] = new Uint32Array(buf.slice(0, 8)), box = new Float32Array(buf.slice(8, 32))
  let at = 32
  const take = (Type, count) => { const a = new Type(buf.slice(at, at + count * Type.BYTES_PER_ELEMENT)); at += a.byteLength; return a }
  const pos = Float32Array.from(take(Uint16Array, nv * 3), (v, i) => box[i % 3] + (v / 65535) * (box[3 + (i % 3)] - box[i % 3]))
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(take(Int8Array, nv * 3), 3, true))
  geo.setAttribute('uv', new THREE.BufferAttribute(take(Uint16Array, nv * 2), 2, true))
  geo.setIndex(new THREE.BufferAttribute(take(Uint16Array, ni), 1))

  // 不用 img.decode()：分頁在背景時它會一直等
  const tex = (url, flipY) => new Promise((ok, fail) => {
    const img = new Image()
    img.onload = () => { const t = new THREE.Texture(img); t.flipY = flipY; t.needsUpdate = true; ok(t) }
    img.onerror = () => fail(new Error('讀不到貓的圖片'))
    img.src = url
  })
  const textures = await Promise.all([tex(base, false), tex(head, true), tex(body, true)]) // 模型的貼圖座標是 glTF 的，上下不翻

  canvas.style.touchAction = 'pan-y' // 上下滑留給頁面捲動
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace // 全程不轉色彩空間，顏色照圖上的數字算
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const uniforms = { uBase: { value: textures[0] }, uHead: { value: textures[1] }, uBody: { value: textures[2] }, uPuff: { value: 0 }, uTime: { value: 0 }, uRound: { value: 0.25 }, uTail: { value: calm ? 0 : 1 }, uBlink: { value: 0 }, uLook: { value: new THREE.Vector2() } }
  const cat = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms }))
  const scene = new THREE.Scene().add(cat)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  camera.position.set(0, 0.2, 4.5)
  camera.lookAt(0, 0, 0)
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 })
  const res = new THREE.Vector2(1, 1)
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: POST,
    uniforms: { uScene: { value: rt.texture }, uRes: { value: res }, uScale: { value: 1 }, uShift: { value: new THREE.Vector2() } }, depthTest: false,
  }))
  const flat = new THREE.Camera(), postScene = new THREE.Scene().add(post)

  let yaw = 0, pitch = 0, vy = 0, drag = null, puffAt = -1e9, taps = [], last = 0, seen = true
  let blinkAt = 1500, look = [0, 0], gaze = [0, 0]
  const force = {} // 測試用：固定眨眼和視線
  const pulse = (ms, at, len) => { const t = (ms - at) / len; return t < 0 || t > 1 ? 0 : Math.sin(Math.PI * t) ** 2 } // 0 → 1 → 0
  const render = (ms = performance.now()) => {
    const breath = calm ? 0 : Math.sin(ms / 900) * 0.008, pt = ms - puffAt
    const puff = pt < 0 || pt > 2600 ? 0 : Math.min(pt / 150, 1, ((2600 - pt) / 900) ** 2)
    uniforms.uPuff.value = puff
    // 眨眼：每 2.5–6.5 秒一次，兩成機率連眨兩下；炸毛時瞪著不眨
    if (ms > blinkAt + 220) blinkAt = ms + (Math.random() < 0.2 ? 120 : 2500 + Math.random() * 4000)
    uniforms.uBlink.value = force.blink ?? (calm ? 0 : pulse(ms, blinkAt, 220) * (1 - puff))
    // 視線慢慢追上游標或手指。貓轉開時眼睛跟著轉走，所以乘上朝向；單位是頭的圖上的像素
    const [lx, ly] = force.look ?? look, ease = 0.15
    gaze = [gaze[0] + (lx - gaze[0]) * ease, gaze[1] + (ly - gaze[1]) * ease]
    uniforms.uLook.value.set(gaze[0] * 20 * Math.cos(THREE.MathUtils.degToRad(yaw)), gaze[1] * 14)
    uniforms.uTime.value = ms / 1000
    cat.rotation.set(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(yaw + (calm ? 0 : Math.sin(ms * 0.11) * 1.3 * puff)), 0)
    cat.scale.set(1 + breath + 0.04 * puff, 1 + breath * 1.6 + 0.04 * puff, 1 + breath + 0.04 * puff)
    renderer.setRenderTarget(rt)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.clear()
    renderer.render(postScene, flat)
  }
  const fit = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    renderer.getDrawingBufferSize(res)
    rt.setSize(res.x, res.y)
    post.material.uniforms.uScale.value = res.x / 420 // 紋理的粗細跟著畫布走：手機上的小貓和桌機上的大貓看起來一樣
    camera.aspect = res.x / res.y
    camera.updateProjectionMatrix()
    render()
  }
  const sized = new ResizeObserver(fit)
  sized.observe(canvas)
  fit()

  // 拖著轉：左右不限圈數，放開會帶著慣性慢慢停。上下只給滑鼠（觸控的上下留給頁面捲動）
  on(canvas, 'pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, far: false }; vy = 0 })
  on(canvas, 'pointermove', (e) => {
    if (!drag) return
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.far = true
    yaw += e.movementX * 0.45
    vy = e.movementX * 0.45 * 60
    if (e.pointerType === 'mouse') pitch = clamp(pitch + e.movementY * 0.25, MAX_PITCH)
  })
  for (const ev of ['pointerup', 'pointercancel']) on(canvas, ev, (e) => {
    const d = drag
    drag = null
    if (!d || d.far || e.type !== 'pointerup') return
    const now = performance.now() // 沒拖：算點一下。連點三下就炸毛
    taps = taps.filter((t) => now - t < 1200).concat(now)
    if (taps.length >= 3) { taps = []; puffAt = now }
  })
  // 貓該看哪裡：滑鼠或手指的位置，相對貓的中心。touch 用 touch 事件，因為頁面一開始捲動 pointer 事件就停了
  const lookAt = (cx, cy) => { const r = canvas.getBoundingClientRect(); look = [clamp((cx - r.left - r.width / 2) / (innerWidth / 2), 1), clamp((cy - r.top - r.height * 0.3) / (innerHeight / 2), 1)] }
  on(window, 'pointermove', (e) => e.pointerType === 'mouse' && lookAt(e.clientX, e.clientY))
  for (const ev of ['touchstart', 'touchmove']) on(window, ev, (e) => lookAt(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
  on(document.documentElement, 'pointerleave', () => (look = [0, 0]))
  const watched = new IntersectionObserver(([e]) => (seen = e.isIntersecting)) // 捲出畫面就不畫，省電
  watched.observe(canvas)
  renderer.setAnimationLoop((ms) => {
    const dt = Math.min((ms - last) / 1000, 0.05)
    last = ms
    if (!drag && !calm) { yaw += vy * dt; vy *= Math.exp(-dt * 3) }
    if (seen) render(ms)
  })
  on(canvas, 'webglcontextlost', () => onContext(true))
  on(canvas, 'webglcontextrestored', () => { fit(); onContext(false) })

  return {
    puff: () => (puffAt = performance.now()),
    // 頭的圓度，0（模型原樣）到 1（整顆貼到球面上）。不給值就只回傳目前的
    round: (v) => { if (v != null) { uniforms.uRound.value = v; render() } return uniforms.uRound.value },
    turn: (deg) => { yaw = deg; vy = 0; render() }, // 測試用：直接轉到某個角度
    pose: (o) => { Object.assign(force, o); if (o.look) gaze = o.look; render() }, // 測試用：{ blink: 0–1, look: [x, y] } 固定表情
    // 離開頁面時一定要叫：停掉動畫、拆事件、把顯示卡的資源還回去
    dispose() {
      off.abort()
      sized.disconnect()
      watched.disconnect()
      renderer.setAnimationLoop(null)
      geo.dispose()
      post.geometry.dispose()
      ;[cat.material, post.material, rt, ...textures].forEach((x) => x.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
