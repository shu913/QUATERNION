import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

window.addEventListener("DOMContentLoaded", () => {
  const app = new App();

  app.load().then(() => {
    app.setup();
    app.setupObjects();
    app.render();
  });
});

class App {
  static get AIRPLANE_MATERIAL_PARAMS() {
    return {
      color: {
        red: 0xff0000,
        green: 0x00ff00,
        blue: 0x0000ff,
      },
    };
  }

  static get AIRPLANE_NUMS() {
    return {
      red: 3,
      green: 4,
      blue: 5,
    };
  }

  constructor() {
    this.texture;

    this.airplaneTargets; // 飛行機の向き先
    this.airplaneArray; // 飛行機の配列
    this.airplaneDirectionArray; // 飛行機の向きの配列
    this.controls;

    this.clock = new THREE.Clock();

    // window.addEventListener("resize", () => {
    //   this.renderer.setSize(window.innerWidth, window.innerHeight);
    //   this.camera.aspect = window.innerWidth / window.innerHeight;
    //   this.camera.updateProjectionMatrix();
    // });
  }

  load() {
    return new Promise((resolve) => {
      const earthImgUrl = "earth.jpg";
      const loader = new THREE.TextureLoader();
      loader.load(earthImgUrl, (texture) => {
        this.texture = texture;
        resolve();
      });
    });
  }

  setup() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor(new THREE.Color(0xffffff));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.querySelector("#app").appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      30.0
    );
    this.camera.position.set(0.0, 2.0, 10.0);
    this.camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
    this.directionalLight.position.set(1.0, 1.0, 1.0);
    this.scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight(0xaaaaaa, 0.01);
    this.scene.add(this.ambientLight);

    const colors = ["red", "green", "blue"];
    this.pointLights = {
      red: null,
      green: null,
      blue: null,
    };
    for (const color of colors) {
      this.pointLights[color] = new THREE.PointLight(
        App.AIRPLANE_MATERIAL_PARAMS["color"][color],
        2.0,
        50.0,
        1.0
      );
      this.pointLights[color].position.z = 5.0;
      this.scene.add(this.pointLights[color]);
    }

    this.group = new THREE.Group();
    this.group.rotation.z = -(Math.PI / 180) * 23.4; // 自転軸は公転軸より約23.4度傾いているらしい(https://ja.wikipedia.org/wiki/%E5%9C%B0%E8%BB%B8)
    this.scene.add(this.group);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this.axesHelper = new THREE.AxesHelper(100.0);
    // this.scene.add(this.axesHelper);
  }

  setupObjects() {
    const earthGeometry = new THREE.SphereGeometry(3, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    earthMaterial.map = this.texture;
    this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
    this.group.add(this.earth);

    this.airplaneTargets = {
      red: null,
      green: null,
      blue: null,
    };
    const airplaneTargetGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const airplaneTargetMaterial = new THREE.MeshNormalMaterial();
    const colors = ["red", "green", "blue"];
    for (const color of colors) {
      this.airplaneTargets[color] = new THREE.Mesh(
        airplaneTargetGeometry,
        airplaneTargetMaterial
      );
      // this.airplaneTargets[color].visible = false;
      this.scene.add(this.airplaneTargets[color]);
    }

    this.airplaneArray = {
      red: [],
      green: [],
      blue: [],
    };
    this.airplaneDirectionArray = {
      red: [],
      green: [],
      blue: [],
    };
    // 進行方向の初期値
    const direction = new THREE.Vector3(0.0, 1.0, 0.0).normalize();
    for (const color of colors) {
      for (let i = 0; i < App.AIRPLANE_NUMS[color]; i++) {
        const airplaneGeometry = new THREE.ConeGeometry(0.1, 0.25, 32);
        const airplaneMaterial = new THREE.MeshBasicMaterial({
          color: App.AIRPLANE_MATERIAL_PARAMS["color"][color],
        });
        const airplane = new THREE.Mesh(airplaneGeometry, airplaneMaterial);
        this.scene.add(airplane);

        this.airplaneArray[color].push(airplane);

        this.airplaneDirectionArray[color].push(direction);
      }
    }
  }

  getVec3Position = (_time, color) => {
    const time = _time;
    let x, y, z;
    if (color === "red") {
      x = Math.cos(time);
      y = Math.sin(time);
      z = Math.sin(time * 2);
    } else if (color === "green") {
      x = Math.cos(time * 2 + 1);
      y = Math.sin(time + 1);
      z = Math.cos(time + 1);
    } else if (color === "blue") {
      x = Math.cos(time + 1);
      y = Math.sin(time * 2 + 1);
      z = Math.sin(time + 1);
    }
    return new THREE.Vector3(x, y, z).normalize();
  };
  setVec3Position(_mesh, vec3) {
    const mesh = _mesh;
    mesh.position.x = vec3.x;
    mesh.position.y = vec3.y;
    mesh.position.z = vec3.z;
    return mesh;
  }

  calcNextDirection = (toPos, fromPos) => {
    const subVector = new THREE.Vector3().subVectors(toPos, fromPos);
    return subVector.normalize();
  };

  calcQuaternion = (fromDirection, toDirection) => {
    // 外積
    const normalAxis = new THREE.Vector3().crossVectors(
      fromDirection,
      toDirection
    );
    normalAxis.normalize();
    // 内積
    const cos = fromDirection.dot(toDirection);
    const radians = Math.acos(cos);
    // クォータニオン
    return new THREE.Quaternion().setFromAxisAngle(normalAxis, radians);
  };

  render() {
    requestAnimationFrame(this.render.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    const r = 3.05;

    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = 0.1;

    const colors = ["red", "green", "blue"];
    for (const color of colors) {
      // pointLightsのポジション
      const pointVec3Position = this.getVec3Position(elapsedTime, color).multiplyScalar(r);
      this.setVec3Position(this.pointLights[color], pointVec3Position);

      // airplaneTargetsのポジション
      const airplaneTargetVec3Position = this.getVec3Position(elapsedTime, color).multiplyScalar(r + 0.5);
      this.setVec3Position(this.airplaneTargets[color], airplaneTargetVec3Position);

      const airplaneNums = this.airplaneArray[color].length;
      for (let i = 0; i < airplaneNums; i++) {
        const time = elapsedTime - deltaTime * (i + 3);
        const airplaneVec3Position = this.getVec3Position(time, color).multiplyScalar(r + 0.5);
        this.setVec3Position(this.airplaneArray[color][i], airplaneVec3Position);

        // 一つ前のフレームの進行方向ベクトルA
        const previousDirection = this.airplaneDirectionArray[color][i].clone();
        const prevPosition = i - 1 > 0 ? this.airplaneArray[color][i - 1].position : airplaneTargetVec3Position;

        // 現在の進行方向ベクトルB
        this.airplaneDirectionArray[color][i] = this.calcNextDirection(
          prevPosition,
          this.airplaneArray[color][i].position
        );

        const qtn = this.calcQuaternion(
          previousDirection,
          this.airplaneDirectionArray[color][i]
        );
        this.airplaneArray[color][i].quaternion.premultiply(qtn);
      }
    }

    // 地球の自転
    this.earth.rotation.y = -elapsedTime / 10;
  }
}
