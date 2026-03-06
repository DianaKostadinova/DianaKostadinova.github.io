
// ═══════════════════════════════════════════════════════
// RUBIK'S CUBE — THREE.JS
// ═══════════════════════════════════════════════════════
const GAP = 1.06;
const C = {
    R:0xe63946, L:0xf4a261, U:0xf2f2f2,
    D:0xffd60a, F:0x4361ee, B:0x06d6a0,
    X:0x0e0e1a
};

const canvas = document.getElementById('cube-canvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x07070d, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);

// Resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Lighting
const amb = new THREE.AmbientLight(0xfff0ee, 0.55); scene.add(amb);
const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(4, 6, 5); scene.add(key);
const fill = new THREE.DirectionalLight(0x4488ff, 0.5); fill.position.set(-4, -3, 3); scene.add(fill);
const rim = new THREE.DirectionalLight(0xff6633, 0.25); rim.position.set(0, 0, -6); scene.add(rim);

// Cube group (this is what we rotate for mouse/idle)
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

// Build cubies
const cubies = [];

function makeCubie(ix, iy, iz) {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshPhongMaterial({ color: C.X, shininess: 15 })
    );
    group.add(body);

    // Stickers: [show?, color, position, euler rotation]
    const S = 0.79, O = 0.452;
    const stickers = [
        [ix=== 1, C.R, [O, 0, 0],  [0, Math.PI/2, 0]],
        [ix===-1, C.L, [-O, 0, 0], [0,-Math.PI/2, 0]],
        [iy=== 1, C.U, [0, O, 0],  [-Math.PI/2, 0, 0]],
        [iy===-1, C.D, [0,-O, 0],  [ Math.PI/2, 0, 0]],
        [iz=== 1, C.F, [0, 0, O],  [0, 0, 0]],
        [iz===-1, C.B, [0, 0,-O],  [0, Math.PI, 0]],
    ];

    stickers.forEach(([show, color, pos, rot]) => {
        if (!show) return;
        const m = new THREE.Mesh(
            new THREE.PlaneGeometry(S, S),
            new THREE.MeshPhongMaterial({ color, shininess: 80, side: THREE.FrontSide })
        );
        m.position.set(...pos);
        m.rotation.set(...rot);
        group.add(m);
    });

    group.position.set(ix*GAP, iy*GAP, iz*GAP);
    cubeGroup.add(group);
    cubies.push(group);
}

for (let x=-1;x<=1;x++) for (let y=-1;y<=1;y++) for (let z=-1;z<=1;z++) {
    if (x===0 && y===0 && z===0) continue;
    makeCubie(x, y, z);
}

// ═══════════════════════════════════════════════════════
// SOLVE MOVES  (axis, layer {-1|0|1}, angle in radians)
// Convention tested:
//   R  → axis=x, layer=+1, angle=+π/2   (CW from right)
//   U  → axis=y, layer=+1, angle=-π/2   (CW from top)
//   F  → axis=z, layer=+1, angle=-π/2   (CW from front)
//   L  → axis=x, layer=-1, angle=-π/2
//   D  → axis=y, layer=-1, angle=+π/2
//   B  → axis=z, layer=-1, angle=+π/2
// ═══════════════════════════════════════════════════════
const H = Math.PI/2;
const solveMoves = [
    {axis:'y', layer: 1, angle:-H},  // U
    {axis:'x', layer: 1, angle: H},  // R
    {axis:'y', layer: 1, angle: H},  // U'
    {axis:'z', layer: 1, angle:-H},  // F
    {axis:'x', layer: 1, angle:-H},  // R'
    {axis:'y', layer:-1, angle: H},  // D
    {axis:'x', layer:-1, angle:-H},  // L
    {axis:'z', layer: 1, angle: H},  // F'
    {axis:'y', layer: 1, angle:-H},  // U
    {axis:'x', layer: 1, angle: H},  // R
    {axis:'y', layer:-1, angle:-H},  // D'
    {axis:'x', layer:-1, angle: H},  // L'
];
const N_MOVES = solveMoves.length;

// Scramble = inverse of solve (reversed, negated angles)
const scrambleMoves = [...solveMoves].reverse().map(m => ({...m, angle:-m.angle}));

// Apply a move INSTANTLY to current cubie positions/quaternions
function applyInstant({axis, layer, angle}) {
    const mat4 = new THREE.Matrix4();
    if (axis==='x') mat4.makeRotationX(angle);
    else if (axis==='y') mat4.makeRotationY(angle);
    else mat4.makeRotationZ(angle);
    const q = new THREE.Quaternion().setFromRotationMatrix(mat4);

    cubies.forEach(c => {
        const coord = axis==='x'?c.position.x : axis==='y'?c.position.y : c.position.z;
        if (Math.abs(coord - layer*GAP) < 0.35) {
            c.position.applyMatrix4(mat4);
            // Snap to avoid float drift
            c.position.x = Math.round(c.position.x/GAP)*GAP;
            c.position.y = Math.round(c.position.y/GAP)*GAP;
            c.position.z = Math.round(c.position.z/GAP)*GAP;
            c.quaternion.premultiply(q);
        }
    });
}

// Capture current state
function captureState() {
    return cubies.map(c => ({ p: c.position.clone(), q: c.quaternion.clone() }));
}

// Restore a saved state
function restoreState(st) {
    cubies.forEach((c,i) => { c.position.copy(st[i].p); c.quaternion.copy(st[i].q); });
}

// ── PRECOMPUTE all solve-step states ──────────────────
// Apply scramble first (cube starts scrambled)
scrambleMoves.forEach(m => applyInstant(m));

const allStates = [captureState()]; // allStates[0] = fully scrambled
solveMoves.forEach(m => {
    applyInstant(m);
    allStates.push(captureState());
});
// allStates[N_MOVES] = fully solved

// Reset visual to scrambled
restoreState(allStates[0]);

// ── SCROLL-DRIVEN CUBE UPDATE ─────────────────────────
function updateCubeFromScroll(t) {
    // t goes 0 (scrambled) → 1 (solved)
    const raw = t * N_MOVES;
    const step = Math.min(Math.floor(raw), N_MOVES - 1);
    const moveT = raw - step; // 0-1 progress within current move

    // Restore committed state at 'step'
    restoreState(allStates[step]);

    // Apply partial move animation
    if (moveT > 0.001) {
        const {axis, layer, angle} = solveMoves[step];
        const partial = angle * moveT;
        const mat4 = new THREE.Matrix4();
        if (axis==='x') mat4.makeRotationX(partial);
        else if (axis==='y') mat4.makeRotationY(partial);
        else mat4.makeRotationZ(partial);
        const q = new THREE.Quaternion().setFromRotationMatrix(mat4);

        cubies.forEach(c => {
            const coord = axis==='x'?c.position.x : axis==='y'?c.position.y : c.position.z;
            if (Math.abs(coord - layer*GAP) < 0.35) {
                c.position.applyMatrix4(mat4);
                c.quaternion.premultiply(q);
            }
        });
    }

    // Update HUD
    const pct = Math.round(smoothCubeT * 100);
    document.getElementById('hud-fill').style.width = pct + '%';
    const movesComplete = Math.min(Math.ceil(smoothCubeT * N_MOVES), N_MOVES);
    document.getElementById('hud-moves').textContent = movesComplete + ' / ' + N_MOVES;
    document.getElementById('hud-state').textContent =
        smoothCubeT < 0.04 ? 'Scrambled' : smoothCubeT > 0.96 ? '✓ Solved!' : 'Solving…';
}

// ── MOUSE PARALLAX ────────────────────────────────────
let tRotX = 0.42, tRotY = 0.65, cRotX = 0.42, cRotY = 0.65;
const isMobile = window.matchMedia('(max-width:750px)').matches;
let autoY = 0.65;

if (!isMobile) {
    document.addEventListener('mousemove', e => {
        tRotX = 0.42 + (e.clientY/window.innerHeight - 0.5) * 0.45;
        tRotY = 0.65 + (e.clientX/window.innerWidth - 0.5) * 0.7;
    });
}

// Celebration spin vars
let celebrating = false;
let celebStart = 0;

// ── RENDER LOOP ───────────────────────────────────────
let smoothCubeT = 0;  // lerped value fed to cube
let lastCubeT = -1;

function animate(time) {
    requestAnimationFrame(animate);

    // Raw scroll → target t (0 scrambled, 1 solved over first 85% of page)
    const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    const rawT = Math.min(window.scrollY / maxScroll, 1);
    const targetCubeT = Math.min(rawT / 0.85, 1);

    // Lerp cube t so it glides instead of snapping
    smoothCubeT += (targetCubeT - smoothCubeT) * 0.08;

    if (Math.abs(smoothCubeT - lastCubeT) > 0.0002) {
        updateCubeFromScroll(smoothCubeT);
        lastCubeT = smoothCubeT;
    }

    // Rotate cube group (mouse parallax / auto)
    if (isMobile) {
        autoY += 0.007;
        cubeGroup.rotation.x = 0.42;
        cubeGroup.rotation.y = autoY;
    } else {
        cRotX += (tRotX - cRotX) * 0.045;
        cRotY += (tRotY - cRotY) * 0.045;
        cubeGroup.rotation.x = cRotX + Math.sin(time*0.0004)*0.04;
        cubeGroup.rotation.y = cRotY + Math.sin(time*0.0003)*0.03;
    }

    // Celebration spin when solved
    if (smoothCubeT > 0.97 && !celebrating) {
        celebrating = true;
        celebStart = time;
    }
    if (celebrating && !isMobile) {
        const elapsed = (time - celebStart) / 1000;
        if (elapsed < 2) {
            cubeGroup.rotation.y += 0.04 * (1 - elapsed/2);
        } else {
            celebrating = false;
        }
    }

    renderer.render(scene, camera);
}
animate(0);

// ═══════════════════════════════════════════════════════
// SKILLS GRID
// ═══════════════════════════════════════════════════════
const skillList = [
    ['React','https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg'],
    ['TypeScript','https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg'],
    ['Python','https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg'],
    ['JavaScript','https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg'],
    ['Flutter','https://raw.githubusercontent.com/devicons/devicon/master/icons/flutter/flutter-original.svg'],
    ['Kotlin','https://raw.githubusercontent.com/devicons/devicon/master/icons/kotlin/kotlin-original.svg'],
    ['Node.js','https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg'],
    ['Django','https://raw.githubusercontent.com/devicons/devicon/master/icons/django/django-plain.svg'],
    ['Java','https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg'],
    ['C#','https://raw.githubusercontent.com/devicons/devicon/master/icons/csharp/csharp-original.svg'],
    ['C++','https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg'],
    ['Firebase','https://raw.githubusercontent.com/devicons/devicon/master/icons/firebase/firebase-plain.svg'],
    ['TensorFlow','https://raw.githubusercontent.com/devicons/devicon/master/icons/tensorflow/tensorflow-original.svg'],
    ['Figma','https://raw.githubusercontent.com/devicons/devicon/master/icons/figma/figma-original.svg'],
    ['Vue.js','https://raw.githubusercontent.com/devicons/devicon/master/icons/vuejs/vuejs-original.svg'],
    ['CSS3','https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original.svg'],
    ['Unity','https://raw.githubusercontent.com/devicons/devicon/master/icons/unity/unity-original.svg'],
    ['Android','https://raw.githubusercontent.com/devicons/devicon/master/icons/android/android-original.svg'],
    ['Git','https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg'],
    ['Express','https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original.svg'],
];
const sg = document.getElementById('skills-grid');
skillList.forEach(([name,icon]) => {
    const el = document.createElement('div');
    el.className = 'sk';
    el.innerHTML = `<img src="${icon}" alt="${name}" loading="lazy" onerror="this.style.opacity='.15'"><span>${name}</span>`;
    sg.appendChild(el);
});

// ═══════════════════════════════════════════════════════
// NAV, CURSOR, SCROLL REVEALS
// ═══════════════════════════════════════════════════════

// Nav
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50), {passive:true});
document.getElementById('hamburger').addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// Cursor
const cur = document.getElementById('cur'), curR = document.getElementById('cur-ring');
let mx=0, my=0, rx=0, ry=0;
document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; cur.style.left=mx+'px'; cur.style.top=my+'px'; });
(function trail() { rx+=(mx-rx)*.1; ry+=(my-ry)*.1; curR.style.left=rx+'px'; curR.style.top=ry+'px'; requestAnimationFrame(trail); })();
document.querySelectorAll('a,button,.sk,.proj-card,.badge,.stat').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.style.width='20px'; cur.style.height='20px'; cur.style.borderRadius='4px'; cur.style.background='transparent'; cur.style.border='1.5px solid var(--cu)'; curR.style.opacity='.12'; curR.style.width='52px'; curR.style.height='52px'; });
    el.addEventListener('mouseleave', () => { cur.style.width='10px'; cur.style.height='10px'; cur.style.borderRadius='50%'; cur.style.background='var(--cu)'; cur.style.border='none'; curR.style.opacity='.35'; curR.style.width='36px'; curR.style.height='36px'; });
});

// Scroll reveals — IntersectionObserver
const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
}, {threshold: 0.12});
['about-panel','projects-panel','skills-panel','contact-panel'].forEach(id => {
    const el = document.getElementById(id);
    if(el) io.observe(el);
});

// Skill pills stagger
const skObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if(e.isIntersecting) {
            gsap.fromTo(e.target.querySelectorAll('.sk'),
                {opacity:0, y:18, scale:.9},
                {opacity:1, y:0, scale:1, duration:.4, ease:'back.out(1.6)', stagger:.04}
            );
            skObs.unobserve(e.target);
        }
    });
}, {threshold:0.1});
skObs.observe(document.getElementById('skills-panel'));

// Proj cards stagger
const pObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if(e.isIntersecting) {
            gsap.fromTo(e.target.querySelectorAll('.proj-card'),
                {opacity:0, y:30},
                {opacity:1, y:0, duration:.6, ease:'power3.out', stagger:.1}
            );
            pObs.unobserve(e.target);
        }
    });
}, {threshold:0.08});
pObs.observe(document.getElementById('projects-panel'));

// Magnetic buttons
document.querySelectorAll('.btn,.soc-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width/2) * .22;
        const y = (e.clientY - r.top - r.height/2) * .22;
        gsap.to(btn, {x, y, duration:.3, ease:'power2.out'});
    });
    btn.addEventListener('mouseleave', () => gsap.to(btn, {x:0, y:0, duration:.5, ease:'elastic.out(1,.5)'}));
});

// 3D tilt on project cards
document.querySelectorAll('.proj-card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX-r.left)/r.width-.5;
        const y = (e.clientY-r.top)/r.height-.5;
        gsap.to(card, {rotationY:x*12, rotationX:-y*12, transformPerspective:700, duration:.3, ease:'power2.out', translateY:-5});
    });
    card.addEventListener('mouseleave', () => gsap.to(card, {rotationY:0, rotationX:0, translateY:0, duration:.6, ease:'elastic.out(1,.6)'}));
});
