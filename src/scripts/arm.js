// The 3D robot arm of the homepage hero (from the downloaded design; was inline + a 1.5 MB inlined three.js bundle).
// Loaded by index.astro after first paint. Uses the same `THREE.*` names as before, now from the npm package.
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const THREE = { ...T, RoundedBoxGeometry, RoomEnvironment };
(function () {
        "use strict";

        /* ---------- LeRobot-style robot arm, in 3D (three.js) ----------
           An SO-101-flavoured desktop arm — pedestal base, rotating
           turntable, exposed joint discs, cyan accents — built from
           three.js geometry, lit with a key / fill / rim rig and an
           environment map so the body reads as real hardware.
           The pointer is unprojected onto a camera-facing plane through
           the shoulder, so the gripper tracks it in screen space while
           the base yaws in 3D toward it. Shoulder and elbow are solved
           with two-bone IK in the arm's vertical plane; the target is
           exponentially damped, so the arm trails with weight instead
           of snapping. With no pointer it idles on a slow sway, and the
           gripper slowly breathes open and shut. */
        var canvas = document.getElementById("field");

        function fail(msg) {
          var d = document.createElement("div");
          d.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:9;font:12px ui-monospace,Menlo,monospace;color:#3fd9f2;background:rgba(7,9,13,.88);border:1px solid rgba(63,217,242,.35);padding:8px 10px;border-radius:6px;max-width:80vw";
          d.textContent = "3D arm unavailable: " + msg;
          document.body.appendChild(d);
        }
        if (!canvas) return;
        
        try { init(); } catch (err) { fail(err && err.message ? err.message : "WebGL error"); }

        function init() {
          var CYAN = 0x3fd9f2;
          var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

          var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
          renderer.setClearColor(0x000000, 0);
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFShadowMap;
          if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.12;

          /* Software renderers (SwiftShader / llvmpipe) draw every pixel
             on the CPU: run them at device pixel ratio 1, and let the
             frame loop step resolution down further if frames stay slow.
             Real GPUs keep full retina quality. */
          var isSoftware = false;
          try {
            var gl = renderer.getContext();
            var dbg = gl.getExtension("WEBGL_debug_renderer_info");
            var gpuName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "") : "";
            isSoftware = /swiftshader|llvmpipe|software/i.test(gpuName);
          } catch (e) { /* keep hardware defaults */ }
          var renderScale = 1;

          var scene = new THREE.Scene();
          var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

          /* Environment reflections are generated after the first frame:
             PMREM compilation is expensive under software WebGL and must
             not block the page's first paint. */
          var pmremPending = true;
          function applyEnvironment() {
            if (!pmremPending) return;
            pmremPending = false;
            try {
              var pmrem = new THREE.PMREMGenerator(renderer);
              scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
            } catch (e) { /* materials still read fine without an env map */ }
          }

          /* ---------- Lights: key, fill, cyan rim ---------- */
          scene.add(new THREE.HemisphereLight(0xbfd6e4, 0x0a0d12, 0.5));
          var key = new THREE.DirectionalLight(0xffffff, 1.7);
          key.position.set(2.6, 4.6, 3.4);
          key.castShadow = true;
          key.shadow.mapSize.set(1024, 1024);
          key.shadow.camera.left = -3.4; key.shadow.camera.right = 3.4;
          key.shadow.camera.top = 3.4; key.shadow.camera.bottom = -3.4;
          key.shadow.camera.near = 0.5; key.shadow.camera.far = 14;
          key.shadow.bias = -0.0004;
          scene.add(key);
          var fill = new THREE.DirectionalLight(0x88a6c0, 0.45);
          fill.position.set(-3, 1.6, 2.2);
          scene.add(fill);
          var rim = new THREE.DirectionalLight(CYAN, 0.9);
          rim.position.set(-1.6, 2.6, -3.2);
          scene.add(rim);

          /* ---------- Materials ---------- */
          var bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3745, roughness: 0.38, metalness: 0.8, envMapIntensity: 0.65 });
          var darkMat = new THREE.MeshStandardMaterial({ color: 0x161d25, roughness: 0.3, metalness: 0.9, envMapIntensity: 0.7 });
          var steelMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.28, metalness: 0.95, envMapIntensity: 0.8 });
          var accentMat = new THREE.MeshStandardMaterial({ color: 0x0d2b33, roughness: 0.35, metalness: 0.4, emissive: CYAN, emissiveIntensity: 0.85 });

          function rbox(w, h, d, r, mat) {
            var g = THREE.RoundedBoxGeometry ? new THREE.RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
            var m = new THREE.Mesh(g, mat);
            m.castShadow = true; m.receiveShadow = true;
            return m;
          }
          function disc(r, w) {
            var g = new THREE.Group();
            var d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 36), darkMat);
            d.rotation.z = Math.PI / 2; d.castShadow = true;
            g.add(d);
            var hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.36, r * 0.36, w + 0.02, 24), accentMat);
            hub.rotation.z = Math.PI / 2;
            g.add(hub);
            var ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, 0.013, 10, 44), accentMat);
            ring.rotation.y = Math.PI / 2; ring.position.x = w / 2 + 0.004;
            g.add(ring);
            return g;
          }

          /* ---------- Ground: soft radial pool + contact shadow ---------- */
          var gc = document.createElement("canvas"); gc.width = gc.height = 256;
          var g2 = gc.getContext("2d");
          var grad = g2.createRadialGradient(128, 128, 8, 128, 128, 128);
          grad.addColorStop(0, "rgba(43,56,70,0.95)");
          grad.addColorStop(0.55, "rgba(24,32,42,0.55)");
          grad.addColorStop(1, "rgba(7,9,13,0)");
          g2.fillStyle = grad; g2.fillRect(0, 0, 256, 256);
          var groundDisc = new THREE.Mesh(
            new THREE.CircleGeometry(3.4, 48),
            new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false })
          );
          groundDisc.rotation.x = -Math.PI / 2;
          scene.add(groundDisc);
          var shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(24, 24),
            new THREE.ShadowMaterial({ opacity: 0.42 })
          );
          shadowPlane.rotation.x = -Math.PI / 2;
          shadowPlane.position.y = 0.002;
          shadowPlane.receiveShadow = true;
          scene.add(shadowPlane);

          /* ---------- Arm build ----------
             Links run along local +Z; pitch is rotation about X
             (rotation.x = -pitch). Yaw group turns local +Z toward the
             target's horizontal direction. */
          var L1 = 1.05, L2 = 0.85, L3 = 0.48, REACH = L1 + L2 + L3;
          var SHOULDER_H = 0.78;

          var baseGroup = new THREE.Group();
          scene.add(baseGroup);

          var plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.07, 44), darkMat);
          plinth.position.y = 0.035; plinth.castShadow = true; plinth.receiveShadow = true;
          baseGroup.add(plinth);
          var column = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.42, 0.43, 44), bodyMat);
          column.position.y = 0.285; column.castShadow = true; column.receiveShadow = true;
          baseGroup.add(column);
          var collar = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.018, 10, 44), accentMat);
          collar.rotation.x = Math.PI / 2; collar.position.y = 0.47;
          baseGroup.add(collar);

          var yawGroup = new THREE.Group();
          yawGroup.position.y = 0.5;
          baseGroup.add(yawGroup);

          var turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.09, 44), steelMat);
          turntable.position.y = 0.045; turntable.castShadow = true; turntable.receiveShadow = true;
          yawGroup.add(turntable);
          var housing = rbox(0.34, 0.44, 0.32, 0.05, bodyMat);
          housing.position.set(0, 0.28, -0.10);
          yawGroup.add(housing);

          var shoulderGroup = new THREE.Group();
          shoulderGroup.position.y = 0.28; /* world shoulder height: 0.5 + 0.28 = SHOULDER_H */
          yawGroup.add(shoulderGroup);
          shoulderGroup.add(disc(0.145, 0.20));
          var upper = rbox(0.16, 0.20, L1, 0.05, bodyMat);
          upper.position.z = L1 / 2 - 0.03;
          shoulderGroup.add(upper);
          var strip = rbox(0.014, 0.05, L1 * 0.66, 0.006, accentMat);
          strip.position.set(0.088, 0.02, L1 / 2);
          shoulderGroup.add(strip);

          var elbowGroup = new THREE.Group();
          elbowGroup.position.z = L1;
          shoulderGroup.add(elbowGroup);
          elbowGroup.add(disc(0.115, 0.16));
          var fore = rbox(0.13, 0.16, L2, 0.045, bodyMat);
          fore.position.z = L2 / 2 - 0.02;
          elbowGroup.add(fore);

          var wristGroup = new THREE.Group();
          wristGroup.position.z = L2;
          elbowGroup.add(wristGroup);
          wristGroup.add(disc(0.085, 0.12));
          var palm = rbox(0.15, 0.12, 0.24, 0.04, darkMat);
          palm.position.z = 0.10;
          wristGroup.add(palm);

          function finger(side) {
            var g = new THREE.Group();
            g.position.set(0.052 * side, 0, 0.18);
            var seg = rbox(0.045, 0.05, 0.20, 0.018, steelMat);
            seg.position.z = 0.10;
            g.add(seg);
            var tipG = new THREE.Group();
            tipG.position.z = 0.20;
            tipG.rotation.y = -0.38 * side;
            var tip = rbox(0.04, 0.045, 0.13, 0.016, steelMat);
            tip.position.z = 0.055;
            tipG.add(tip);
            var dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), accentMat);
            dot.position.z = 0.12;
            tipG.add(dot);
            g.add(tipG);
            wristGroup.add(g);
            return g;
          }
          var fingerL = finger(-1), fingerR = finger(1);

          /* Pointer target marker */
          var marker = new THREE.Group();
          var mRing = new THREE.Mesh(
            new THREE.RingGeometry(0.045, 0.057, 32),
            new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
          );
          var mDot = new THREE.Mesh(
            new THREE.CircleGeometry(0.014, 16),
            new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.85, depthWrite: false })
          );
          marker.add(mRing); marker.add(mDot);
          marker.visible = false;
          scene.add(marker);

          /* ---------- Layout ---------- */
          var W = 0, H = 0;
          function applySize() {
            var baseDpr = isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2);
            renderer.setPixelRatio(baseDpr * renderScale);
            renderer.setSize(W, H, false);
          }
          function layout() {
            W = window.innerWidth; H = window.innerHeight;
            applySize();
            camera.aspect = W / H;
            if (W > 760) {
              baseGroup.position.set(1.3, 0, 0.1);
              camera.position.set(-0.35, 2.15, 5.0);
              camera.fov = 38;
            } else {
              baseGroup.position.set(0.72, 0, 0);
              camera.position.set(0, 2.3, 6.6);
              camera.fov = 47;
            }
            camera.updateProjectionMatrix();
            camera.lookAt(0.3, 0.8, 0);
            groundDisc.position.set(baseGroup.position.x, 0, baseGroup.position.z);
          }

          /* ---------- Pointer → world target ---------- */
          var pointer = { x: 0, y: 0, active: false };
          var raycaster = new THREE.Raycaster();
          var plane = new THREE.Plane();
          var ndc = new THREE.Vector2();
          var camDir = new THREE.Vector3();
          var shoulderPos = new THREE.Vector3();
          var hit = new THREE.Vector3();

          function pointerToTarget(px, py, out) {
            ndc.set((px / W) * 2 - 1, -(py / H) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            camera.getWorldDirection(camDir);
            shoulderPos.set(baseGroup.position.x, SHOULDER_H, baseGroup.position.z);
            plane.setFromNormalAndCoplanarPoint(camDir, shoulderPos);
            if (!raycaster.ray.intersectPlane(plane, hit)) return null;
            out.copy(hit);
            /* Clamp into reach, off the floor */
            out.sub(shoulderPos);
            var d = out.length();
            var maxD = REACH * 0.985, minD = REACH * 0.22;
            if (d > maxD) out.multiplyScalar(maxD / d);
            else if (d < 0.001) out.set(0, minD, 0);
            else if (d < minD) out.multiplyScalar(minD / d);
            out.add(shoulderPos);
            if (out.y < 0.15) out.y = 0.15;
            return out;
          }

          function idleScreenPoint(t) {
            return {
              x: W * (0.60 + 0.16 * Math.sin(t * 0.00035)),
              y: H * (0.42 + 0.13 * Math.sin(t * 0.00053 + 1.2))
            };
          }

          /* ---------- IK: yaw + two-bone pitch in the arm plane ---------- */
          var smoothed = new THREE.Vector3();
          var desired = new THREE.Vector3();
          var started = false;
          var gripCur = 0.45;

          function solveAndPose(target, grip) {
            var dx = target.x - baseGroup.position.x;
            var dy = target.y - SHOULDER_H;
            var dz = target.z - baseGroup.position.z;
            yawGroup.rotation.y = Math.atan2(dx, dz);
            var r = Math.sqrt(dx * dx + dz * dz);
            var gp = Math.atan2(dy, r); /* gripper direction, absolute pitch */
            var wr = r - Math.cos(gp) * L3;
            var wv = dy - Math.sin(gp) * L3;
            var dw = Math.sqrt(wr * wr + wv * wv);
            var maxW = (L1 + L2) * 0.999;
            if (dw > maxW) { wr *= maxW / dw; wv *= maxW / dw; dw = maxW; }
            var cosA = (L1 * L1 + dw * dw - L2 * L2) / (2 * L1 * dw);
            cosA = Math.max(-1, Math.min(1, cosA));
            var pitch1 = Math.atan2(wv, wr) + Math.acos(cosA); /* elbow rides high */
            var pitch2 = Math.atan2(wv - Math.sin(pitch1) * L1, wr - Math.cos(pitch1) * L1);
            shoulderGroup.rotation.x = -pitch1;
            elbowGroup.rotation.x = -(pitch2 - pitch1);
            wristGroup.rotation.x = -(gp - pitch2);
            var spread = 0.08 + grip * 0.30;
            fingerL.rotation.y = -spread;
            fingerR.rotation.y = spread;
          }

          function renderFrame(now) {
            var px, py;
            if (pointer.active) { px = pointer.x; py = pointer.y; }
            else { var ip = idleScreenPoint(now); px = ip.x; py = ip.y; }
            if (pointerToTarget(px, py, desired)) {
              if (!started) { smoothed.copy(desired); started = true; }
            }
            solveAndPose(smoothed, gripCur);
            marker.visible = pointer.active && started;
            if (marker.visible) {
              marker.position.copy(desired);
              marker.lookAt(camera.position);
            }
            renderer.render(scene, camera);
          }

          var lastNow = performance.now(), raf = null;
          var slowFrames = 0, slowTime = 0;
          function frame(now) {
            var rawDt = (now - lastNow) / 1000;
            var dt = Math.min(0.05, Math.max(0.001, rawDt));
            lastNow = now;
            /* Adaptive resolution: if frames stay slow (software GL, weak
               GPU), step the render scale down so the page stays fluid. */
            if (rawDt > 0 && rawDt < 1) {
              slowFrames++; slowTime += rawDt;
              if (slowFrames >= 45) {
                if (slowTime / slowFrames > 0.045 && renderScale > 0.55) {
                  renderScale *= 0.8;
                  applySize();
                }
                slowFrames = 0; slowTime = 0;
              }
            }
            var px, py;
            if (pointer.active) { px = pointer.x; py = pointer.y; }
            else { var ip = idleScreenPoint(now); px = ip.x; py = ip.y; }
            if (pointerToTarget(px, py, desired)) {
              if (!started) { smoothed.copy(desired); started = true; }
              var f = 1 - Math.pow(0.0035, dt); /* damped ease: weight, not snapping */
              smoothed.lerp(desired, f);
            }
            var gripTarget = 0.5 + 0.5 * Math.sin(now * 0.0011);
            gripCur += (gripTarget - gripCur) * Math.min(1, 0.08 + dt * 2.2);
            solveAndPose(smoothed, gripCur);
            marker.visible = pointer.active;
            if (marker.visible) {
              marker.position.copy(desired);
              marker.lookAt(camera.position);
            }
            renderer.render(scene, camera);
            if (pmremPending) setTimeout(applyEnvironment, 60);
            raf = requestAnimationFrame(frame);
          }

          layout();
          if (reduceMotion) {
            renderFrame(1400); /* one static frame, arm raised — no loop */
            applyEnvironment();
            renderFrame(1400); /* re-render the still frame with reflections */
          } else {
            raf = requestAnimationFrame(frame);
            document.addEventListener("visibilitychange", function () {
              if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
              else if (!raf) { lastNow = performance.now(); raf = requestAnimationFrame(frame); }
            });
          }

          var resizeTimer = null;
          window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
              layout();
              if (reduceMotion) renderFrame(1400);
            }, 160);
          });

          window.addEventListener("pointermove", function (e) {
            pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
          }, { passive: true });
          window.addEventListener("pointerdown", function (e) {
            pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
          }, { passive: true });
          window.addEventListener("pointerup", function (e) {
            if (e.pointerType === "touch") pointer.active = false;
          }, { passive: true });
          window.addEventListener("pointercancel", function () { pointer.active = false; }, { passive: true });
          document.addEventListener("mouseleave", function () { pointer.active = false; });
        }
      })();
