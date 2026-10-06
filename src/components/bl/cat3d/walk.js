// 會走路的 3D 貓（試作）：站姿的模型加上骨架和動作，四隻腳、尾巴都會動。
// 模型是 Meshy 照正面、側面兩張參考圖生的，骨架和蒙皮是 Meshy 的智慧骨架；動作是 scripts/retarget-cat.py 從 Quaternius 的狐狸（CC0）套過來的。
// 畫風一樣靠最後那道水彩處理（跟 model.js 共用）；臉是原畫的頭從正前方投影上來的，會眨眼、眼睛會跟著游標，其餘用模型自己的貼圖。
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { POST, EYES } from './model.js'

const VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec2 vUv; varying vec3 vP, vN, vLit, vQ;
void main() {
  vUv = uv; vQ = position; vP = (position + vec3(.0014, 0., .0316)) / .5484; vN = normal; // 臉是對著高 3.1 的模型量的，這個檔高 1.7，換算回去。 // 還沒套骨架的位置：臉要貼在頭上跟著走，不能留在原地
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vLit = normalize(normalMatrix * objectNormal); // 套上骨架之後、從鏡頭看的法線：打光用
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
}`
const FRAG = /* glsl */ `
uniform sampler2D uBase, uHead, uLeft, uRight, uBack; uniform float uBlink; uniform vec2 uLook;
varying vec2 vUv; varying vec3 vP, vN, vLit, vQ;
${EYES}
void main() {
  vec3 col = texture2D(uBase, vUv).rgb;
  // 顏色對回原畫：模型的毛偏紅、對比低，黃的地方偏白。分別把紫毛和黃毛的平均色、深淺的幅度拉成跟原畫的頭一樣（數字是兩邊統計出來的）
  vec3 purple = (col - vec3(.558, .335, .336)) * vec3(1.21, 1.25, 1.42) + vec3(.506, .347, .361);
  vec3 yellow = (col - vec3(.776, .584, .381)) * vec3(1.09, 1.07, 1.16) + vec3(.707, .547, .298);
  col = clamp(mix(purple, yellow, smoothstep(1.2, 1.5, col.g / max(col.b, .01))), 0., 1.);
  // 身體：照原畫筆法重畫的左側、右側、背面三張圖，各從那個方向正正地投影回來（scripts/prep-cat-paint.py 已經把圖對到模型的輪廓上：
  // 畫面 2.2 單位寬、中心高度 0.85）。左右以身體中線為界；朝後的面用背面那張；朝正前方的胸口三張都照不到，留模型自己的顏色
  vec3 n = normalize(vN);
  float py = .5 + (vQ.y - .85) / 2.2;
  vec4 side = mix(texture2D(uRight, vec2(.5 + vQ.z / 2.2, py)), texture2D(uLeft, vec2(.5 - vQ.z / 2.2, py)), smoothstep(-.03, .03, vQ.x));
  vec4 back = texture2D(uBack, vec2(.5 - vQ.x / 2.2, py));
  // 朝上的面（頭頂、背上、尾巴上緣）從側面和後面照都是斜斜擦過去，畫會被拉成一條一條的，所以也留模型自己的顏色
  float flat_ = 1. - smoothstep(.45, .75, n.y);
  float sideA = side.a * (1. - smoothstep(.55, .85, n.z)) * flat_, backA = back.a * smoothstep(.45, .8, -n.z) * flat_;
  col = mix(mix(col, side.rgb, sideA), back.rgb, backA);
  // 原畫怎麼對到頭上（對著模型的正面圖量的，換模型要重量）：兩隻眼睛在模型上是 (-0.33, 1.815)、(0.30, 1.82)，
  // 在頭的圖上是 (312, 385)、(667, 455) → 每單位 574px。原畫的頭歪了 11 度、模型的頭是正的，所以要轉回來
  vec2 d = vec2(vP.x + .015, 1.817 - vP.y);
  vec2 hp = vec2(489.5, 420.) + 574. * vec2(.9812 * d.x - .1935 * d.y, .1935 * d.x + .9812 * d.y);
  vec4 h = texture2D(uHead, px2uv(hp));
  h.a = smoothstep(.5, .95, h.a) * step(0., hp.x) * step(hp.x, 900.) * step(0., hp.y) * step(hp.y, 863.);
  eye(h, hp, vec2(312., 385.), vec2(95., 100.), vec2(60., -115.));
  eye(h, hp, vec2(667., 455.), vec2(85., 83.), vec2(-80., -115.));
  // 只有頭上朝前的面吃得到原畫：轉到側面漸漸換回模型的顏色；下巴以下、還有豎在頭後面的尾巴都不算
  float face = smoothstep(.12, .55, n.z) * smoothstep(1.085, 1.205, vP.y) * smoothstep(.79, .99, vP.z);
  col = mix(col, h.rgb, h.a * face);
  // 打一點光：模型的貼圖是平的，不分明暗的話腿和身體糊成一團，動起來像一坨泥。光從左上前方來，
  // 背光的地方（肚子底下、腿的內側、毛的縫）偏暗偏紫，像水彩疊了一層影子。臉是原畫，已經有自己的明暗，少打一點；重畫的身體也少打一些
  float lit = smoothstep(-.55, .65, dot(normalize(vLit), normalize(vec3(-.35, .8, .5))));
  col *= mix(vec3(.74, .71, .82), vec3(1.04, 1.03, 1.), mix(lit, 1., max(.6 * h.a * face, .45 * max(sideA, backA)))); // 影子要淡：每一撮毛都有自己的明暗，壓太深整隻會髒髒的
  gl_FragColor = vec4(col, 1.);
}`

const MAX_PITCH = 35
const clamp = (v, m) => Math.max(-m, Math.min(m, v))

// opts.glb：scripts/prep-cat-rig.py 產生的模型；opts.base：它的貼圖；opts.head：原畫的頭；opts.paint：{ left, right, back } 重畫的身體。回傳 { head, speed, turn, dispose }
export async function createWalkCat(canvas, { glb, base, head, paint, onContext = () => {} }) {
  const off = new AbortController()
  const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal: off.signal })
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches

  const gltf = await new GLTFLoader().loadAsync(glb)
  const tex = (url, flipY) => new Promise((ok, fail) => { // 不用 img.decode()：分頁在背景時它會一直等
    const img = new Image()
    img.onload = () => { const t = new THREE.Texture(img); t.flipY = flipY; t.needsUpdate = true; ok(t) }
    img.onerror = () => fail(new Error('讀不到貓的圖片'))
    img.src = url
  })
  const textures = await Promise.all([tex(base, false), tex(head, true), tex(paint.left, true), tex(paint.right, true), tex(paint.back, true)]) // 模型的貼圖座標是 glTF 的，上下不翻
  const uniforms = { uBase: { value: textures[0] }, uHead: { value: textures[1] }, uLeft: { value: textures[2] }, uRight: { value: textures[3] }, uBack: { value: textures[4] }, uBlink: { value: 0 }, uLook: { value: new THREE.Vector2() } }
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms })
  let skinned
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) { skinned = o; o.material = material; o.frustumCulled = false } })
  if (!skinned) throw new Error('模型裡沒有骨架')

  const mixer = new THREE.AnimationMixer(gltf.scene)
  // 每個動作每秒該往前走多遠（只有走、跑有）：scripts/retarget-cat.py 照腳掌踩地的速度算的，照這個速度移動腳才不會在地上滑
  const stride = Object.fromEntries(gltf.parser.json.animations.map((a) => [a.name, a.extras?.speed ?? 0]))
  const actions = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]))
  let clip = 'Walk'
  actions[clip].play()
  // 貓繞著圈子走：真的往前移動，看起來才像走路，不是原地踏步。cat（拖著轉的）→ path（走到圈上哪裡、面朝哪）→ rig（模型）
  // 模型的原點在四隻腳中間的地上，縮到身長大約 1.2
  const SIZE = 0.8, RADIUS = 0.6
  const rig = new THREE.Group().add(gltf.scene), path = new THREE.Group().add(rig), cat = new THREE.Group().add(path)
  rig.scale.setScalar(SIZE)
  const headBone = skinned.skeleton.bones.find((b) => b.name === 'head')

  canvas.style.touchAction = 'pan-y'
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene().add(cat)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  camera.position.set(0, 1.5, 5)
  camera.lookAt(0, 0.35, 0)
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 }), res = new THREE.Vector2(1, 1)
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: POST,
    uniforms: { uScene: { value: rt.texture }, uRes: { value: res }, uScale: { value: 1 }, uShift: { value: new THREE.Vector2() } }, depthTest: false,
  }))
  const flat = new THREE.Camera(), postScene = new THREE.Scene().add(post)

  let yaw = 35, pitch = 0, vy = 0, drag = null, last = 0, seen = true, speed = calm ? 0 : 1, headYaw = 0, lap = 0 // lap：走到圈上的哪裡（弧度）
  let blinkAt = 1500, look = [0, 0], gaze = [0, 0]
  const force = {} // 測試用：固定眨眼和視線
  const pulse = (ms, at, len) => { const t = (ms - at) / len; return t < 0 || t > 1 ? 0 : Math.sin(Math.PI * t) ** 2 } // 0 → 1 → 0
  const qp = new THREE.Quaternion(), qw = new THREE.Quaternion(), turnQ = new THREE.Quaternion(), animQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0)
  const spot = new THREE.Vector3()
  const pose = () => {
    // 頭：在動作算完之後，再繞著垂直軸多轉 headYaw 度（現在的模型頭是正的，預設 0；之後要讓牠看向游標就是改這個）
    if (!headBone) return
    animQ.copy(headBone.quaternion) // 動作原本給的角度先記著，畫完要還回去：動畫系統以為那個值沒被動過，不還的話每一幀會越轉越多
    headBone.parent.updateWorldMatrix(true, false)
    headBone.parent.getWorldQuaternion(qp)
    qw.copy(qp).multiply(headBone.quaternion)                                   // 頭現在在世界裡的朝向
    turnQ.setFromAxisAngle(UP, THREE.MathUtils.degToRad(headYaw))
    cat.getWorldQuaternion(qp)                                                    // 垂直軸要跟著整隻貓轉
    turnQ.premultiply(qp).multiply(qp.invert())
    headBone.parent.getWorldQuaternion(qp)
    headBone.quaternion.copy(qp.invert()).multiply(turnQ).multiply(qw)
  }
  const render = (ms = performance.now()) => {
    // 眨眼和眼神：跟 model.js 一樣。每 2.5–6.5 秒眨一次，兩成機率連眨兩下；視線慢慢追上游標或手指
    if (ms > blinkAt + 220) blinkAt = ms + (Math.random() < 0.2 ? 120 : 2500 + Math.random() * 4000)
    uniforms.uBlink.value = force.blink ?? (calm ? 0 : pulse(ms, blinkAt, 220))
    const [lx, ly] = force.look ?? look
    gaze = [gaze[0] + (lx - gaze[0]) * 0.15, gaze[1] + (ly - gaze[1]) * 0.15]
    uniforms.uLook.value.set(gaze[0] * 20 * Math.cos(THREE.MathUtils.degToRad(yaw + headYaw) + lap + Math.PI / 2), gaze[1] * 14)
    cat.rotation.set(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(yaw), 0)
    path.position.set(RADIUS * Math.sin(lap), 0, RADIUS * Math.cos(lap))
    path.rotation.y = lap + Math.PI / 2 // 面朝圈子的切線方向
    cat.updateMatrixWorld(true)
    pose()
    spot.setFromMatrixPosition(path.matrixWorld).project(camera) // 貓在畫面上的位置：水彩的紋理跟著牠走
    post.material.uniforms.uShift.value.set((spot.x * 0.5 + 0.5) * res.x, (spot.y * 0.5 + 0.5) * res.y)
    renderer.setRenderTarget(rt)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(scene, camera)
    if (headBone) headBone.quaternion.copy(animQ)
    renderer.setRenderTarget(null)
    renderer.clear()
    renderer.render(postScene, flat)
  }
  const fit = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    renderer.getDrawingBufferSize(res)
    rt.setSize(res.x, res.y)
    post.material.uniforms.uScale.value = (res.x / 420) * 0.55 // 貓只佔畫面一部分，暈開和顆粒照牠的大小縮，不然整隻糊掉
    camera.aspect = res.x / res.y
    camera.updateProjectionMatrix()
    render()
  }
  const sized = new ResizeObserver(fit)
  sized.observe(canvas)
  fit()

  on(canvas, 'pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); drag = true; vy = 0 })
  on(canvas, 'pointermove', (e) => {
    if (!drag) return
    yaw += e.movementX * 0.45
    vy = e.movementX * 0.45 * 60
    if (e.pointerType === 'mouse') pitch = clamp(pitch + e.movementY * 0.25, MAX_PITCH)
  })
  for (const ev of ['pointerup', 'pointercancel']) on(canvas, ev, () => (drag = null))
  // 貓該看哪裡：滑鼠或手指的位置，相對頭的位置。touch 用 touch 事件，因為頁面一開始捲動 pointer 事件就停了
  const lookAt = (cx, cy) => { const r = canvas.getBoundingClientRect(); look = [clamp((cx - r.left - r.width / 2) / (innerWidth / 2), 1), clamp((cy - r.top - r.height * 0.3) / (innerHeight / 2), 1)] }
  on(window, 'pointermove', (e) => e.pointerType === 'mouse' && lookAt(e.clientX, e.clientY))
  for (const ev of ['touchstart', 'touchmove']) on(window, ev, (e) => lookAt(e.touches[0].clientX, e.touches[0].clientY), { passive: true })
  on(document.documentElement, 'pointerleave', () => (look = [0, 0]))
  const watched = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
  watched.observe(canvas)
  renderer.setAnimationLoop((ms) => {
    const dt = Math.min((ms - last) / 1000, 0.05)
    last = ms
    if (!drag && !calm) { yaw += vy * dt; vy *= Math.exp(-dt * 3) }
    mixer.update(dt * speed)
    lap += (stride[clip] * SIZE * dt * speed) / RADIUS
    if (seen) render(ms)
  })
  on(canvas, 'webglcontextlost', () => onContext(true))
  on(canvas, 'webglcontextrestored', () => { fit(); onContext(false) })

  return {
    // 頭往左右多轉幾度（負的是往貓自己的右邊）。不給值就只回傳目前的
    head: (deg) => { if (deg != null) { headYaw = deg; render() } return headYaw },
    // 動作的速度，0 是停住
    speed: (s) => { if (s != null) speed = s; return speed },
    // 換動作（慢慢換過去）。不給名字就只回傳有哪些動作
    play: (name) => {
      if (name && name !== clip && actions[name]) { actions[clip].fadeOut(0.3); actions[name].reset().fadeIn(0.3).play(); clip = name }
      return Object.keys(actions)
    },
    turn: (deg, t, at) => { yaw = deg; vy = 0; if (t != null) mixer.setTime(t); if (at != null) lap = at; render() }, // 測試用：轉到某個角度、動作停在某一刻、走到圈上某處
    pose: (o) => { Object.assign(force, o); if (o.look) gaze = o.look; render() }, // 測試用：{ blink: 0–1, look: [x, y] } 固定表情
    dispose() {
      off.abort()
      sized.disconnect()
      watched.disconnect()
      renderer.setAnimationLoop(null)
      mixer.stopAllAction()
      skinned.geometry.dispose()
      skinned.skeleton.dispose()
      post.geometry.dispose()
      ;[material, post.material, rt, ...textures].forEach((x) => x.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
