import { V2, V3 } from "./math";

export interface I3DModel {
  triangles: number[];
  texcoords: number[];
  normals: number[];
}

const getSurfaceNormal = (ab: V3, ac: V3) => {
  return V3.normalize(V3.cross(ab, ac));
};

const generateFlatVertexNormals = (triangles: number[]) => {
  const normals = [];
  for (let i = 0; i < triangles.length; i += 9) {
    const normal = getSurfaceNormal(
      [
        triangles[i+3] - triangles[i],
        triangles[i+4] - triangles[i+1],
        triangles[i+5] - triangles[i+2]
      ], [
        triangles[i+6] - triangles[i],
        triangles[i+7] - triangles[i+1],
        triangles[i+8] - triangles[i+2]
      ]
    );
    normals.push(...normal, ...normal, ...normal);
  }
  return normals;
}

export const parseObj = (obj: string): I3DModel => {
  const vMap: V3[] = [];
  const vtMap: V2[] = [];
  const vnMap: V3[] = [];
  const triangles: number[] = [];
  const texcoords: number[] = [];
  const normals: number[] = [];

  for (const line of obj.split('\n')) {
    const substr = line.split(' ');
    switch (substr[0]) {
      case 'v':
        vMap.push([parseFloat(substr[1]), parseFloat(substr[2]), parseFloat(substr[3])]);
        break;
      case 'vt':
        vtMap.push([parseFloat(substr[1]), Math.abs(parseFloat(substr[2]) - 1)]);
        break;
      case 'vn':
        vnMap.push([parseFloat(substr[1]), parseFloat(substr[2]), parseFloat(substr[3])]);
        break;
      case 'f':
        const v1i = substr[1].split('/').map(s => parseInt(s));
        const v2i = substr[2].split('/').map(s => parseInt(s));
        const v3i = substr[3].split('/').map(s => parseInt(s));

        triangles.push(...vMap[v1i[0] - 1], ...vMap[v2i[0] - 1], ...vMap[v3i[0] - 1]);
        texcoords.push(...vtMap[v1i[1] - 1], ...vtMap[v2i[1] - 1], ...vtMap[v3i[1] - 1]);
        normals.push(...vnMap[v1i[2] - 1], ...vnMap[v2i[2] - 1], ...vnMap[v3i[2] - 1]);
        break;
      default: break;
    }
  }

  return {
    triangles,
    texcoords,
    normals
  }
}
