import { useEffect, useRef } from 'react';

type Props = {
  text: string;
  /** When true the particles burst apart; when false they reassemble into the text. */
  dispersed?: boolean;
};

type Particle = {
  x: number;
  y: number;
  seed: number;
};

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function sampleText(text: string, width: number, height: number): Particle[] {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);

  const context = canvas.getContext('2d');
  if (!context) return [];

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${Math.max(30, Math.min(64, width / 12)) * scale}px "JetBrains Mono", monospace`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const particles: Particle[] = [];
  const step = Math.max(2, Math.floor(width / 260));

  for (let y = 0; y < canvas.height; y += step * scale) {
    for (let x = 0; x < canvas.width; x += step * scale) {
      const alpha = image.data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 80) {
        particles.push({
          x: (x / canvas.width) * 2 - 1,
          y: -((y / canvas.height) * 2 - 1),
          seed: Math.random(),
        });
      }
    }
  }

  return particles.slice(0, 22000);
}

export default function ParticleText({ text, dispersed = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dispersedRef = useRef(dispersed);

  // Keep the latest target without tearing down the WebGL context.
  useEffect(() => {
    dispersedRef.current = dispersed;
  }, [dispersed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return;

    const vertexSource = `
      precision highp float;

      attribute vec2 a_position;
      attribute float a_seed;

      uniform float u_time;
      uniform float u_pixelRatio;
      uniform float u_disperse;

      varying float v_seed;
      varying float v_alpha;
      varying float v_disperse;

      float hash(float n) {
        return fract(sin(n) * 43758.5453123);
      }

      void main() {
        float wave = sin(u_time * 1.35 + a_seed * 18.0 + a_position.x * 8.0);
        float drift = cos(u_time * 0.9 + a_seed * 22.0 + a_position.y * 7.0);
        float pulse = 0.5 + 0.5 * sin(u_time * 2.2 + a_seed * 15.0);

        vec2 scatter = vec2(hash(a_seed * 71.0) - 0.5, hash(a_seed * 139.0) - 0.5);
        vec2 position = a_position;
        position += scatter * 0.018 * (0.35 + pulse);
        position += vec2(wave, drift) * 0.006;

        // Burst outward along a seeded direction, curling as the particles travel.
        float ease = u_disperse * u_disperse * (3.0 - 2.0 * u_disperse);
        float angle = hash(a_seed * 12.9898) * 6.28318 + ease * 2.4;
        float radius = 0.75 + hash(a_seed * 78.233) * 1.5;
        vec2 burst = vec2(cos(angle), sin(angle)) * radius;
        position += burst * ease;
        position += scatter * ease * 0.4;

        gl_Position = vec4(position, 0.0, 1.0);
        gl_PointSize = (2.35 + pulse * 2.75) * u_pixelRatio;
        v_seed = a_seed;
        v_disperse = u_disperse;
        v_alpha = 0.58 + pulse * 0.55;
      }
    `;

    const fragmentSource = `
      precision highp float;

      varying float v_seed;
      varying float v_alpha;
      varying float v_disperse;

      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        float dist = length(point);
        float glow = smoothstep(0.5, 0.0, dist);
        float core = smoothstep(0.18, 0.0, dist);
        vec3 cyan = vec3(0.08, 0.95, 1.0);
        vec3 blue = vec3(0.08, 0.34, 1.0);
        vec3 color = mix(blue, cyan, 0.72 + 0.28 * v_seed);
        float alpha = (glow * 0.5 + core * 0.95) * v_alpha * (1.0 - 0.45 * v_disperse);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const program = createProgram(gl, vertexSource, fragmentSource);
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const seedLocation = gl.getAttribLocation(program, 'a_seed');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const pixelRatioLocation = gl.getUniformLocation(program, 'u_pixelRatio');
    const disperseLocation = gl.getUniformLocation(program, 'u_disperse');
    const buffer = gl.createBuffer();

    let animationFrame = 0;
    let particleCount = 0;
    let currentDisperse = dispersedRef.current ? 1 : 0;

    function resize() {
      if (!canvas || !gl) return;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
      gl.viewport(0, 0, canvas.width, canvas.height);

      const particles = sampleText(text, rect.width, rect.height);
      const data = new Float32Array(particles.length * 3);
      particles.forEach((particle, index) => {
        data[index * 3] = particle.x;
        data[index * 3 + 1] = particle.y;
        data[index * 3 + 2] = particle.seed;
      });

      particleCount = particles.length;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    }

    function render(time: number) {
      if (!gl) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(seedLocation);
      gl.vertexAttribPointer(seedLocation, 1, gl.FLOAT, false, 12, 8);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform1f(pixelRatioLocation, Math.min(window.devicePixelRatio || 1, 2));
      const target = dispersedRef.current ? 1 : 0;
      currentDisperse += (target - currentDisperse) * 0.03;
      gl.uniform1f(disperseLocation, currentDisperse);
      gl.drawArrays(gl.POINTS, 0, particleCount);

      animationFrame = window.requestAnimationFrame(render);
    }

    resize();
    window.addEventListener('resize', resize);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [text]);

  return (
    <div className="pointer-events-none relative h-36 w-full max-w-4xl sm:h-44">
      <canvas ref={canvasRef} className="h-full w-full" aria-label={text} />
      <div className="pointer-events-none absolute inset-x-1/2 bottom-4 h-px w-64 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent shadow-[0_0_24px_rgba(34,211,238,0.7)]" />
    </div>
  );
}
