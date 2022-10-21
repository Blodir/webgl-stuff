import { M4, M4Mutable, V3, V3Mutable, V4, V4Mutable } from "./math";
import { createShader, createProgram } from "./webgl-utils";
import { parseObj } from "./obj-parser";

interface ICamera {
  transform: M4;
  projection: M4;
}

interface ILightSource {
  direction: V3;
  color: V4;
}

interface IDrawable {
  verts: number[];
  texCoords: number[];
  texture: any;
  normals: number[];
  transform: M4;
}

const bufferPositions = (gl: WebGL2RenderingContext, positionLocation: number, positions: number[]) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(
    positionLocation,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );
};

const bufferNormals = (gl: WebGL2RenderingContext, normalLocation: number, normals: number[]) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(normalLocation);
  gl.vertexAttribPointer(
    normalLocation,
    3,
    gl.FLOAT,
    false,
    0,
    0
  );
};

const bufferTexCoords = (gl: WebGL2RenderingContext, texCoordLocation: number, texCoords: number[]) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(
    texCoordLocation,
    2,
    gl.FLOAT,
    true,
    0,
    0
  );
};

const setTexture = (gl: WebGL2RenderingContext, textureLocation: WebGLUniformLocation, image: any) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
}

type Immutable<T> = {
  readonly [K in keyof T]: Immutable<T[K]>;
}

class Renderer {
  private _camera: Immutable<ICamera> = {projection: undefined, transform: undefined};
  get camera() {
    return this._camera;
  }
  set camera(c: Immutable<ICamera>) {
    this._camera = c;
    this.dirty['camera'] = true;
  }
  private _lightSources: Immutable<ILightSource[]> = [];
  get lightSources() {
    return this._lightSources;
  }
  set lightSources(l: Immutable<ILightSource[]>) {
    this._lightSources = l;
    this.dirty['lightSources'] = true;
  }
  private _drawables: Immutable<IDrawable[]> = [];
  get drawables() {
    return this._drawables;
  }
  set drawables(d: Immutable<IDrawable[]>) {
    this._drawables = d;
    this.dirty['drawables'] = true;
  }
  
  private dirty = {
    camera: true,
    lightSources: true,
    drawables: true
  };

  private positionLocation: number;
  private texCoordLocation: number;
  private normalLocation: number;
  private worldViewProjectionLocation: WebGLUniformLocation;
  private worldInverseTransposeLocation: WebGLUniformLocation;
  private lightCountLocation: WebGLUniformLocation;
  private textureLocation: WebGLUniformLocation;

  private projectionMatrix = M4.unit();

  constructor(private gl: WebGL2RenderingContext, private program: WebGLProgram) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(.2, .2, .2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(program);

    this.positionLocation = gl.getAttribLocation(program, 'a_position');
    this.texCoordLocation = gl.getAttribLocation(program, 'a_texcoord');
    this.normalLocation = gl.getAttribLocation(program, 'a_normal');
    this.worldViewProjectionLocation = gl.getUniformLocation(program, 'u_worldViewProjection');
    this.worldInverseTransposeLocation = gl.getUniformLocation(program, 'u_worldInverseTranspose');
    this.lightCountLocation = gl.getUniformLocation(program, 'u_lightCount');
    this.textureLocation = gl.getUniformLocation(program, 'u_texture');
  }

  render() {
    if (this.dirty['camera']) {
      this.projectionMatrix = M4.mult(this.camera.projection, M4.inverse(this.camera.transform));
      this.dirty['camera'] = false;
    }

    if (this.dirty['lightSources']) {
      this.gl.uniform1i(this.lightCountLocation, this.lightSources.length);
      this.lightSources.forEach((lightSource, idx) => {
        this.gl.uniform3fv(
          this.gl.getUniformLocation(this.program, `u_lightSources[${idx}].reverseDirection`),
          <V3Mutable>V3.normalize(V3.scale(lightSource.direction, -1))
        );
        this.gl.uniform4fv(
          this.gl.getUniformLocation(this.program, `u_lightSources[${idx}].color`),
          <V4Mutable>lightSource.color
        );
      });
      this.dirty['lightSources'] = false;
    }

    if (this.dirty['drawables']) {
      const vertexArr = this.gl.createVertexArray();
      this.gl.bindVertexArray(vertexArr);
      bufferPositions(this.gl, this.positionLocation, this.drawables.reduce((acc, curr) => acc.concat(curr.verts), []));
      bufferNormals(this.gl, this.normalLocation, this.drawables.reduce((acc, curr) => acc.concat(curr.normals), []));
      bufferTexCoords(this.gl, this.texCoordLocation, this.drawables.reduce((acc, curr) => acc.concat(curr.texCoords), []));
      this.dirty['drawables'] = false;
    }

    let offset = 0;
    this.drawables.forEach(drawable => {
      this.gl.uniformMatrix4fv(this.worldViewProjectionLocation, false, <M4Mutable>M4.mult(this.projectionMatrix, drawable.transform));
      this.gl.uniformMatrix4fv(this.worldInverseTransposeLocation, false, <M4Mutable>M4.transpose(M4.inverse(drawable.transform)));
      setTexture(this.gl, this.textureLocation, drawable.texture);
      this.gl.drawArrays(this.gl.TRIANGLES, offset / 3, drawable.verts.length);
      offset += drawable.verts.length;
    });
  }
}

const canvas = document.createElement("canvas")
canvas.style.backgroundColor = "#333333"
canvas.width = 800;
canvas.height = 600;
canvas.style.width = "800px"
canvas.style.height = "600px"
document.body.appendChild(canvas)
const glDebug = require('webgl-debug');
const gl = glDebug.makeDebugContext(canvas.getContext("webgl2"));

const vertexShader = createShader(gl, require('./vertex.glsl'), gl.VERTEX_SHADER);
const fragmentShader = createShader(gl, require('./fragment.glsl'), gl.FRAGMENT_SHADER);
const program = createProgram(gl, vertexShader, fragmentShader);

const obj = require('./potato/potato_triangles.obj').default;
const model = parseObj(obj);

const img = new Image();
img.src = require('./potato/potato_tex.png').default;

const renderer = new Renderer(gl, program);
renderer.camera = {
  transform: M4.unit(),
  projection: M4.perspective(
    Math.PI / 2,
    gl.canvas.width / gl.canvas.height,
    1,
    2000
  )
}
renderer.lightSources = [
  {
    direction: [-0.5, -0.7, -1],
    color: [0.2, 1, 0.2, 1]
  }
];

let transform = M4.translation(0, -200, -1500);
transform = M4.mult(transform, M4.xRotation(0));
transform = M4.mult(transform, M4.yRotation(-Math.PI / 4));
transform = M4.mult(transform, M4.zRotation(0));
const scalar = 200;
transform = M4.mult(transform, M4.scaling(scalar, scalar, scalar));
renderer.drawables = [
  {
    verts: model.triangles,
    texCoords: model.texcoords,
    texture: <any>img,
    normals: model.normals,
    transform
  }
];

img.addEventListener('load', () => {
  loop(renderer)();
});

function loop(renderer: Renderer) {
  return () => {
    renderer.drawables = [
      ...renderer.drawables.map(drawable => ({...drawable, transform: M4.mult(drawable.transform, M4.yRotation(0.01))}))
    ];
    renderer.render();
    window.requestAnimationFrame(loop(renderer));
  }
}
