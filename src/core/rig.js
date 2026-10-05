import { PerspectiveCamera, Vector3, Box3 } from 'three';

const FOCUS_X = 0.59; // the text panel sits on the left, so the focus object sits right of centre
const _target = new Vector3();
const _follow = new Vector3();
const _v = new Vector3();
const _box = new Box3();

// Camera on a sphere around a target. `state` is a plain object that timelines tween:
//   target = mix(fixed(fx,fy,fz), followTarget world position, follow) + offset(ox,oy,oz)
//   camera = target + dist * direction(yaw, pitch)
export function createRig() {
  const camera = new PerspectiveCamera(30, 1, 0.1, 200);
  const state = { follow: 1, fx: 0, fy: 0, fz: 0, ox: 0, oy: 0, oz: 0, dist: 13, yaw: 0, pitch: 0 };
  const rig = { camera, state, followTarget: null, focusX: FOCUS_X };

  let size = { w: 1, h: 1 };
  let prev = '';

  function applyView() {
    const { w, h } = size;
    camera.aspect = w / h;
    // A negative x offset slides the frustum left, so the screen centre shows up at focusX.
    camera.setViewOffset(w, h, w * (0.5 - rig.focusX), 0, w, h);
    camera.updateProjectionMatrix();
  }

  rig.resize = (w, h) => {
    size = { w, h };
    applyView();
    prev = '';
  };

  rig.setFocusX = (x) => {
    rig.focusX = x;
    applyView();
    prev = '';
  };

  // Returns true when the camera moved (the loop then re-renders).
  rig.update = () => {
    const s = state;
    _target.set(s.fx, s.fy, s.fz);
    if (rig.followTarget && s.follow > 0) {
      rig.followTarget.getWorldPosition(_follow);
      _target.lerp(_follow, s.follow);
    }
    _target.x += s.ox;
    _target.y += s.oy;
    _target.z += s.oz;

    const key = [_target.x, _target.y, _target.z, s.dist, s.yaw, s.pitch].map((n) => n.toFixed(5)).join();
    if (key === prev) return false;
    prev = key;

    const cp = Math.cos(s.pitch);
    camera.position.set(
      _target.x + s.dist * Math.sin(s.yaw) * cp,
      _target.y + s.dist * Math.sin(s.pitch),
      _target.z + s.dist * Math.cos(s.yaw) * cp,
    );
    camera.lookAt(_target);
    camera.updateMatrixWorld();
    return true;
  };

  // Screen position of an object (bounding box centre) as fractions of the viewport,
  // x/y from the top-left; h is the box height as a fraction of the viewport height.
  // The projection matrix already contains the view offset.
  rig.project = (obj) => {
    camera.updateMatrixWorld();
    obj.updateWorldMatrix(true, false);
    _box.setFromObject(obj);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      _v.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z);
      _v.project(camera);
      minY = Math.min(minY, _v.y);
      maxY = Math.max(maxY, _v.y);
    }
    _box.getCenter(_v).project(camera);
    return { x: (_v.x + 1) / 2, y: (1 - _v.y) / 2, h: (maxY - minY) / 2 };
  };

  rig.update();
  return rig;
}
