// 2D 的貓（紙偶）：頭、身體、尾巴、腿各是一片水彩畫，切成細格子的平面綁在骨架上做動作。畫面上只有畫本身在動，
// 沒有 3D 模型、沒有打光、沒有濾鏡。網格、骨架、動作是 scripts/paper-cat.py 做的，這裡只負責播。
// 畫的是貓的左側面（頭朝左）；要朝右就從另一面看這幾片紙，等於左右翻面。
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec4 shade;
varying vec2 vUv; varying float vShade;
void main() {
  vUv = uv; vShade = shade.r;
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
}`
const FRAG = /* glsl */ `
uniform sampler2D uMap; varying vec2 vUv; varying float vShade;
void main() { vec4 c = texture2D(uMap, vUv); gl_FragColor = vec4(c.rgb * vShade * c.a, c.a); }` // 預乘透明

const VIEW = 2.2, MID = 0.85 // 畫框：2.2 單位見方、中心高度 0.85（跟 prep-cat-paint.py 一樣），所以貓的腳底在離畫布下緣 11.4% 的地方

// opts.glb：scripts/paper-cat.py 產生的檔；opts.paint：零件圖（同一支腳本產生的 cat-parts.webp）。回傳 { play, speed, pace, length, face, awake, turn, dispose }
export async function createPaperCat(canvas, { glb, paint }) {
  const gltf = await new GLTFLoader().loadAsync(glb)
  const map = await new Promise((ok, fail) => { // 不用 img.decode()：分頁在背景時它會一直等
    const img = new Image()
    img.onload = () => { const t = new THREE.Texture(img); t.flipY = false; t.needsUpdate = true; ok(t) }
    img.onerror = () => fail(new Error('讀不到貓的圖片'))
    img.src = paint
  })
  // 不比深度：三角形照檔案裡的順序畫（遠的腿 → 尾巴 → 身體 → 近的腿 → 頭），後畫的蓋住先畫的
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uMap: { value: map } }, transparent: true, premultipliedAlpha: true, depthTest: false, side: THREE.DoubleSide })
  let skinned
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) { skinned = o; o.material = material; o.frustumCulled = false; o.geometry.setAttribute('shade', o.geometry.attributes.color) } })
  if (!skinned) throw new Error('模型裡沒有骨架')
  const mixer = new THREE.AnimationMixer(gltf.scene)
  const stride = Object.fromEntries(gltf.parser.json.animations.map((a) => [a.name, a.extras?.speed ?? 0]))
  const actions = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]))
  let clip = 'Walk', speed = 1, last = 0
  actions[clip].play()

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace // 不轉色彩空間，顏色照圖上的數字
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene().add(gltf.scene)
  const camera = new THREE.OrthographicCamera(-VIEW / 2, VIEW / 2, VIEW / 2, -VIEW / 2, 0.1, 50)
  const face = (right) => { camera.position.set(right ? -5 : 5, MID, 0); camera.lookAt(0, MID, 0) }
  face(false)
  const render = () => renderer.render(scene, camera)
  const fit = () => { renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); render() }
  const sized = new ResizeObserver(fit)
  sized.observe(canvas)
  fit()
  const tick = (ms) => { mixer.update(Math.min((ms - last) / 1000, 0.05) * speed); last = ms; render() }
  renderer.setAnimationLoop(tick)

  return {
    // 換動作（慢慢換過去）。不給名字就只回傳有哪些動作
    play: (name) => {
      if (name && name !== clip && actions[name]) { actions[clip].fadeOut(0.3); actions[name].reset().fadeIn(0.3).play(); clip = name }
      return Object.keys(actions)
    },
    speed: (s) => { if (s != null) speed = s; return speed }, // 動作的速度，0 是停住
    pace: (name) => stride[name] / VIEW,                       // 這個動作照原速每秒往前走幾個畫布寬（只有走、跑有）
    length: (name) => actions[name].getClip().duration,        // 這個動作一輪幾秒
    face: (deg) => { face(deg > 0); render() },                // 朝右（正的）或朝左
    awake: (yes) => { last = performance.now(); renderer.setAnimationLoop(yes ? tick : null); if (yes) render() }, // 停下來不畫（省電），或叫醒
    turn: (deg, t) => { face(deg > 0); if (t != null) mixer.setTime(t); render() }, // 測試用：朝哪邊、動作停在某一刻
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
