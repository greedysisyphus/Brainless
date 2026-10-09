// 2D 的貓（紙偶）：頭、身體、尾巴、腿各是一片水彩畫，切成細格子的平面綁在骨架上做動作。畫面上只有畫本身在動，
// 沒有 3D 模型、沒有打光、沒有濾鏡。網格、骨架、動作是 scripts/paper-cat.py 做的，這裡只負責播。
// 畫的是貓的左側面（頭朝左）；要朝右就從另一面看這幾片紙，等於左右翻面。
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec4 shade;
uniform float uBlink; uniform vec2 uShift;
varying vec2 vUv; varying float vShade, vShow, vLight, vTone, vPatch, vGoogly;
void main() {
  vUv = uv; vShade = shade.r; vLight = shade.g; vTone = shade.b;
  // 第四格是記號：1 是平常就畫的；0 是閉眼那一小塊（眨眼時才蓋上去）；中間（0.55）是活動眼那一片
  vShow = shade.a > .75 ? 1. : (shade.a < .25 ? uBlink : 1.);
  vPatch = shade.a < .25 ? 1. : 0.;
  vGoogly = shade.a > .25 && shade.a < .75 ? 1. : 0.;
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  gl_Position.xy += uShift; // 描邊框的時候整隻往旁邊挪一點再畫（鏡頭沒有透視，直接加就行）
}`
const FRAG = /* glsl */ `
uniform sampler2D uMap; uniform vec3 uDark, uLight, uEdge; uniform float uInk, uEdging, uSolid, uBlink; uniform vec2 uPunch; uniform vec3 uFill, uEyeColor; uniform vec4 uEye; uniform float uGoogly; uniform vec2 uPupil; varying vec2 vUv; varying float vShade, vShow, vLight, vTone, vPatch, vGoogly;
void main() {
  if (vGoogly > .5) { // 塑膠活動眼：白色的圓盤、深色的外圈，裡面一顆黑眼珠會晃（uPupil 是眼珠偏離中心多少）。沒開就不畫
    if (uGoogly < .5 || uEdging > .5) discard;
    vec2 e = vUv * 2. - 1.; float r = length(e), a = 1. - smoothstep(.92, 1., r);
    vec3 col = mix(vec3(1.), vec3(.12, .09, .1), smoothstep(.76, .84, r));
    col = mix(col, vec3(.08), 1. - smoothstep(.42, .5, length(e - uPupil)));
    gl_FragColor = vec4(col * a, a); return;
  }
  vec4 c = texture2D(uMap, vUv);
  { float g = dot(c.rgb, vec3(.3, .59, .11)); c.rgb = clamp(mix(vec3(g), c.rgb, uPunch.x) * uPunch.y, 0., 1.); } // 顏色加濃、壓深（預設不動）
  // 剪影：整隻塗成一個顏色，只留輪廓；遠側的腿暗一階，走路時才分得出四條腿
  if (uEdging > .5) { float a = smoothstep(.3, .6, c.a) * (1. - vPatch); gl_FragColor = vec4(uEdge * a, a); return; } // 邊框：整隻畫成一個顏色的剪影
  if (uSolid > .5) {
    // 眼睛：在眼睛那一小塊的中間點一個亮點（uEye 是它在貼圖上的中心和半徑），眨眼的時候不畫。沒有眼睛的話剪影認不出臉朝哪邊
    if (vPatch > .5) {
      float r = length((vUv - uEye.xy) / uEye.zw), open = (1. - uBlink) * (1. - uGoogly); // 開了活動眼就不點這個小亮點
      float a = (1. - smoothstep(.75, 1., r)) * open; gl_FragColor = vec4(uEyeColor * a, a); return;
    }
    float a = smoothstep(.35, .65, c.a); gl_FragColor = vec4(uFill * mix(.7, 1., step(.99, vShade)) * a, a); return;
  }
  // 純色模式：不用水彩的顏色，只分兩塊。紫色的毛 → 深色，黃色的肚子、腳、臉 → 淺色（vLight：這裡准不准有淺色，身上零星的黃斑不算）；
  // 邊緣切乾淨。貓很小的時候比水彩清楚
  // 深色分三階（vTone）：遠側的腿最深、身體和尾巴中間、頭和近側的腿最亮。疊在一起的零件靠這個分開，貓才不會糊成一團黑
  vec3 dark = uDark * mix(.62, 1.5, vTone);
  vec4 flat_ = vec4(mix(dark, uLight, smoothstep(1.2, 1.5, c.g / max(c.b, .01)) * step(.5, vLight)), smoothstep(.35, .65, c.a));
  c = mix(c, flat_, uInk);
  c.a *= vShow;
  gl_FragColor = vec4(c.rgb * mix(vShade, 1., uInk) * c.a, c.a); // 預乘透明
}`

const VIEW = 2.2, MID = 0.85 // 畫框：2.2 單位見方、中心高度 0.85（跟 prep-cat-paint.py 一樣），所以貓的腳底在離畫布下緣 11.4% 的地方

// opts.glb：scripts/paper-cat.py 產生的檔；opts.paint：零件圖（同一支腳本產生的 cat-parts.webp）；
// opts.ink：[深色, 淺色]，給了就改用純色畫（不給就是水彩原圖）。回傳 { play, speed, pace, length, face, awake, outline, turn, pose, dispose }
export async function createPaperCat(canvas, { glb, paint, ink }) {
  const gltf = await new GLTFLoader().loadAsync(glb)
  const map = await new Promise((ok, fail) => { // 不用 img.decode()：分頁在背景時它會一直等
    const img = new Image()
    img.onload = () => { const t = new THREE.Texture(img); t.flipY = false; t.needsUpdate = true; ok(t) }
    img.onerror = () => fail(new Error('讀不到貓的圖片'))
    img.src = paint
  })
  const hue = (css) => new THREE.Color(css).convertLinearToSRGB() // 這裡全程不轉色彩空間，顏色要照 CSS 寫的數字原樣送進去
  // 不比深度：三角形照檔案裡的順序畫（遠的腿 → 尾巴 → 身體 → 近的腿 → 頭 → 閉眼），後畫的蓋住先畫的
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uMap: { value: map }, uBlink: { value: 0 }, uShift: { value: new THREE.Vector2() }, uEdge: { value: new THREE.Color() }, uEdging: { value: 0 }, uPunch: { value: new THREE.Vector2(1, 1) }, uSolid: { value: 0 }, uFill: { value: new THREE.Color() }, uEyeColor: { value: new THREE.Color() }, uEye: { value: new THREE.Vector4(0, 0, 1, 1) }, uGoogly: { value: 0 }, uPupil: { value: new THREE.Vector2(0, 0.4) }, uInk: { value: ink ? 1 : 0 }, uDark: { value: hue(ink?.[0] ?? '#000') }, uLight: { value: hue(ink?.[1] ?? '#fff') } }, transparent: true, premultipliedAlpha: true, depthTest: false, side: THREE.DoubleSide })
  let skinned
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) { skinned = o; o.material = material; o.frustumCulled = false; o.geometry.setAttribute('shade', o.geometry.attributes.color) } })
  if (!skinned) throw new Error('模型裡沒有骨架')
  { // 眼睛那一小塊（閉眼用的那片）在貼圖上的範圍：剪影模式要在它中間點眼睛
    const { color, uv } = skinned.geometry.attributes
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0
    for (let i = 0; i < color.count; i += 1) {
      if (color.getW(i) > 0.25) continue
      x0 = Math.min(x0, uv.getX(i)); x1 = Math.max(x1, uv.getX(i)); y0 = Math.min(y0, uv.getY(i)); y1 = Math.max(y1, uv.getY(i))
    }
    if (x1 > x0) material.uniforms.uEye.value.set((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.33, (y1 - y0) * 0.36)
  }
  const mixer = new THREE.AnimationMixer(gltf.scene)
  const stride = Object.fromEntries(gltf.parser.json.animations.map((a) => [a.name, a.extras?.speed ?? 0]))
  const actions = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]))
  let clip = 'Walk', speed = 1, last = 0, blinkAt = 1500, held = null
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  actions[clip].play()

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace // 不轉色彩空間，顏色照圖上的數字
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * (canvas.clientWidth && canvas.clientWidth < 120 ? 3 : 1)) // 很小的貓多畫三倍再縮：輪廓利，貼圖也不會取到太糊的版本
  const scene = new THREE.Scene().add(gltf.scene)
  const camera = new THREE.OrthographicCamera(-VIEW / 2, VIEW / 2, VIEW / 2, -VIEW / 2, 0.1, 50)
  const face = (right) => { camera.position.set(right ? -5 : 5, MID, 0); camera.lookAt(0, MID, 0) }
  face(false)
  // 邊框是在畫布裡面自己畫的：先把整隻貓的剪影往八個方向各挪一點畫一次，最後才畫貓本身蓋在上面。
  // （用 CSS 的 filter 加在畫布上，iPhone 的 Safari 不會畫出來）
  let edge = 0
  renderer.autoClear = false
  const render = () => {
    const u = material.uniforms
    renderer.clear()
    if (edge > 0 && canvas.clientWidth) {
      const r = (2 * edge) / canvas.clientWidth // 畫面上的 px 換成畫布的座標
      u.uEdging.value = 1
      for (let i = 0; i < 8; i += 1) { u.uShift.value.set(Math.cos(i * Math.PI / 4) * r, Math.sin(i * Math.PI / 4) * r); renderer.render(scene, camera) }
      u.uEdging.value = 0
      u.uShift.value.set(0, 0)
    }
    renderer.render(scene, camera)
  }
  const fit = () => { renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); render() }
  const sized = new ResizeObserver(fit)
  sized.observe(canvas)
  fit()
  // 活動眼的眼珠：一顆掛在彈簧上的小球，平常被重力拉在下面，頭一動（走路的起伏、跳、被甩）就跟著晃
  const headBone = skinned.skeleton.bones.find((b) => b.name === 'head')
  const eyeP = new THREE.Vector2(0, 0.4), eyeV = new THREE.Vector2(), headAt = new THREE.Vector3(), headWas = new THREE.Vector3(), headV = new THREE.Vector2(), headVWas = new THREE.Vector2()
  const wobble = (dt) => {
    if (!material.uniforms.uGoogly.value || dt <= 0) return
    if (headBone) {
      headBone.getWorldPosition(headAt)
      headV.set(headAt.z - headWas.z, headWas.y - headAt.y).divideScalar(dt) // 畫面上的左右、上下（貼圖的 y 往下）
      headWas.copy(headAt)
      eyeV.addScaledVector(headV.clone().sub(headVWas), -1.6)                // 頭加速，眼珠往反方向甩
      headVWas.copy(headV)
    }
    eyeV.x += -eyeP.x * 90 * dt
    eyeV.y += (0.4 - eyeP.y) * 90 * dt
    eyeV.multiplyScalar(Math.exp(-dt * 5))
    eyeP.addScaledVector(eyeV, dt)
    if (eyeP.length() > 0.46) { eyeP.setLength(0.46); eyeV.multiplyScalar(-0.45) } // 撞到眼眶彈回來
    material.uniforms.uPupil.value.copy(eyeP)
  }
  const tick = (ms) => {
    const dt = Math.min((ms - last) / 1000, 0.05)
    mixer.update(dt * speed)
    last = ms
    wobble(dt)
    // 眨眼：每 2.5–6.5 秒閉 0.13 秒，兩成機率連眨兩下
    if (ms > blinkAt + 130) blinkAt = ms + (Math.random() < 0.2 ? 150 : 2500 + Math.random() * 4000)
    material.uniforms.uBlink.value = held ?? (!calm && ms >= blinkAt ? 1 : 0)
    render()
  }
  renderer.setAnimationLoop(tick)

  return {
    // 換動作（慢慢換過去）。不給名字就只回傳有哪些動作
    // once：只播一輪、停在最後一格（預設是一直重複）
    play: (name, once) => {
      if (name && actions[name] && (name !== clip || once)) {
        if (name !== clip) actions[clip].fadeOut(0.3)
        actions[name].setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity).reset().fadeIn(0.3).play()
        actions[name].clampWhenFinished = true
        clip = name
      }
      return Object.keys(actions)
    },
    speed: (s) => { if (s != null) speed = s; return speed }, // 動作的速度，0 是停住
    pace: (name) => stride[name] / VIEW,                       // 這個動作照原速每秒往前走幾個畫布寬（只有走、跑有）
    length: (name) => actions[name].getClip().duration,        // 這個動作一輪幾秒
    face: (deg) => { face(deg > 0); render() },                // 朝右（正的）或朝左
    awake: (yes) => { last = performance.now(); renderer.setAnimationLoop(yes ? tick : null); if (yes) render() }, // 停下來不畫（省電），或叫醒
    turn: (deg, t) => { face(deg > 0); if (t != null) mixer.setTime(t); render() }, // 測試用：朝哪邊、動作停在某一刻
    outline: (px, css) => { edge = px; if (css) material.uniforms.uEdge.value.copy(hue(css)); render() }, // 邊框多粗（畫面上的 px，0 是沒有）、什麼顏色
    // 剪影的顏色；給 null 就回到水彩。eye 是眼睛的顏色（不給就沒有眼睛），給 'googly' 是會晃的塑膠活動眼
    jolt: (x, y) => { eyeV.x += x; eyeV.y += y }, // 推眼珠一把（貓被甩、跳起來的時候）
    solid: (css, eye) => {
      const u = material.uniforms
      u.uGoogly.value = eye === 'googly' ? 1 : 0
      if (eye === 'googly') eye = '#fff'
      u.uSolid.value = css ? 1 : 0
      if (css) u.uFill.value.copy(hue(css))
      u.uEyeColor.value.copy(hue(eye || css || '#000')) // 沒給眼睛的顏色就跟身體同色，等於看不到
      render()
    },
    punch: (sat, gain) => { material.uniforms.uPunch.value.set(sat, gain); render() }, // 顏色的濃度、明暗（1、1 是原樣）
    pose: (o) => { held = o.blink ?? null; material.uniforms.uBlink.value = held ?? 0; render() }, // 測試用：{ blink: 0 或 1 } 固定眼睛
    dispose() {
      sized.disconnect()
      renderer.setAnimationLoop(null)
      mixer.stopAllAction()
      skinned.geometry.dispose()
      skinned.skeleton.dispose()
      material.dispose()
      map.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
