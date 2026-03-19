import { clamp } from "../config.js";

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function shieldWidthAt(y) {
  if (y < -0.42) {
    var arcT = (y + 1) / 0.58;
    return 0.28 + Math.sin(arcT * Math.PI) * 0.44;
  }
  if (y < 0.12) {
    return 0.78 - (y + 0.42) * 0.18;
  }
  var taper = clamp((y - 0.12) / 0.88, 0, 1);
  return 0.76 * Math.pow(1 - taper, 0.72);
}

function generateShield(count, options) {
  var positions = new Float32Array(count * 3);
  var orbitVectors = new Float32Array(count * 2);
  var cx = options.centerX;
  var cy = options.centerY;
  var rx = options.radiusX;
  var ry = options.radiusY;

  for (var i = 0; i < count; i += 1) {
    var onShell = Math.random() < 0.75;
    var yNorm = onShell
      ? randomBetween(-1, 1)
      : Math.pow(Math.random(), 0.72) * 2 - 1;
    var widthNorm = shieldWidthAt(yNorm);
    var xNorm = onShell
      ? (Math.random() < 0.5 ? -1 : 1) * widthNorm * randomBetween(0.96, 1.01)
      : randomBetween(-widthNorm, widthNorm);

    var offset = i * 3;
    positions[offset] = cx + xNorm * rx;
    positions[offset + 1] = cy + yNorm * ry;
    positions[offset + 2] = (1 - Math.abs(yNorm)) * 1.5 - Math.abs(xNorm) * 0.5;

    var orbitOffset = i * 2;
    orbitVectors[orbitOffset] = -yNorm;
    orbitVectors[orbitOffset + 1] = xNorm;
  }

  return { positions: positions, orbitVectors: orbitVectors };
}

function generateGrid(count, options) {
  var positions = new Float32Array(count * 3);
  var orbitVectors = new Float32Array(count * 2);
  var cx = options.centerX;
  var cy = options.centerY;
  var rx = options.radiusX;
  var ry = options.radiusY;
  var aspect = rx / (ry || 1);
  var cols = Math.max(Math.ceil(Math.sqrt(count * aspect)), 1);
  var rows = Math.max(Math.ceil(count / cols), 1);

  for (var i = 0; i < count; i += 1) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var u = cols > 1 ? (col / (cols - 1) - 0.5) * 2 : 0;
    var v = rows > 1 ? (row / (rows - 1) - 0.5) * 2 : 0;

    var offset = i * 3;
    positions[offset] = cx + u * rx;
    positions[offset + 1] = cy + v * ry;
    positions[offset + 2] = randomBetween(-0.5, 0.5);

    var orbitOffset = i * 2;
    orbitVectors[orbitOffset] = randomBetween(-0.2, 0.2);
    orbitVectors[orbitOffset + 1] = randomBetween(-0.2, 0.2);
  }

  return { positions: positions, orbitVectors: orbitVectors };
}

function generateNetwork(count, options) {
  var positions = new Float32Array(count * 3);
  var orbitVectors = new Float32Array(count * 2);
  var cx = options.centerX;
  var cy = options.centerY;
  var rx = options.radiusX;
  var ry = options.radiusY;
  var hubCount = Math.max(Math.floor(count * 0.12), 3);
  var k = 3;
  var hubs = [];

  for (var h = 0; h < hubCount; h += 1) {
    hubs.push({
      x: cx + randomBetween(-rx * 0.9, rx * 0.9),
      y: cy + randomBetween(-ry * 0.9, ry * 0.9)
    });
  }

  for (var i = 0; i < hubCount && i < count; i += 1) {
    var offset = i * 3;
    positions[offset] = hubs[i].x;
    positions[offset + 1] = hubs[i].y;
    positions[offset + 2] = 0;

    var orbitOffset = i * 2;
    orbitVectors[orbitOffset] = randomBetween(-0.5, 0.5);
    orbitVectors[orbitOffset + 1] = randomBetween(-0.5, 0.5);
  }

  for (var i = hubCount; i < count; i += 1) {
    var hubIdx = Math.floor(Math.random() * hubCount);
    var hub = hubs[hubIdx];
    var distances = [];

    for (var j = 0; j < hubCount; j += 1) {
      if (j === hubIdx) continue;
      var ddx = hubs[j].x - hub.x;
      var ddy = hubs[j].y - hub.y;
      distances.push({ idx: j, dist: Math.sqrt(ddx * ddx + ddy * ddy) });
    }

    distances.sort(function (a, b) { return a.dist - b.dist; });
    var neighborIdx = distances[Math.floor(Math.random() * Math.min(k, distances.length))].idx;
    var neighbor = hubs[neighborIdx];
    var t = Math.random();
    var dx = neighbor.x - hub.x;
    var dy = neighbor.y - hub.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;

    var offset = i * 3;
    positions[offset] = hub.x + dx * t;
    positions[offset + 1] = hub.y + dy * t;
    positions[offset + 2] = randomBetween(-0.8, 0.8);

    var orbitOffset = i * 2;
    orbitVectors[orbitOffset] = -dy / len;
    orbitVectors[orbitOffset + 1] = dx / len;
  }

  return { positions: positions, orbitVectors: orbitVectors };
}

function generateGlobe(count, options) {
  var positions = new Float32Array(count * 3);
  var orbitVectors = new Float32Array(count * 2);
  var cx = options.centerX;
  var cy = options.centerY;
  var rx = options.radiusX;
  var ry = options.radiusY;
  var rz = Math.min(rx, ry) * 3;
  var goldenAngle = Math.PI * (3 - Math.sqrt(5));
  var surfaceCount = Math.floor(count * 0.7);

  for (var i = 0; i < surfaceCount && i < count; i += 1) {
    var y = 1 - (2 * i) / Math.max(surfaceCount - 1, 1);
    var theta = goldenAngle * i;
    var r = Math.sqrt(Math.max(1 - y * y, 0));

    var offset = i * 3;
    positions[offset] = cx + Math.cos(theta) * r * rx;
    positions[offset + 1] = cy + y * ry;
    positions[offset + 2] = Math.sin(theta) * r * rz;

    var orbitOffset = i * 2;
    orbitVectors[orbitOffset] = -Math.sin(theta);
    orbitVectors[orbitOffset + 1] = Math.cos(theta);
  }

  for (var i = surfaceCount; i < count; i += 1) {
    var latDeg = Math.floor(Math.random() * 12) * 15;
    var lat = (latDeg - 90) * Math.PI / 180;
    var lon = Math.random() * Math.PI * 2;
    var ringR = Math.cos(lat);

    var offset = i * 3;
    positions[offset] = cx + Math.cos(lon) * ringR * rx;
    positions[offset + 1] = cy + Math.sin(lat) * ry;
    positions[offset + 2] = Math.sin(lon) * ringR * rz;

    var orbitOffset = i * 2;
    orbitVectors[orbitOffset] = -Math.sin(lon);
    orbitVectors[orbitOffset + 1] = Math.cos(lon);
  }

  return { positions: positions, orbitVectors: orbitVectors };
}

function generateDisperse(count, options) {
  var positions = new Float32Array(count * 3);
  var orbitVectors = new Float32Array(count * 2);
  var cx = options.centerX;
  var cy = options.centerY;
  var rx = options.radiusX;
  var ry = options.radiusY;

  for (var i = 0; i < count; i += 1) {
    var angle = randomBetween(Math.PI * 0.05, Math.PI * 0.95);
    var radial = randomBetween(0.6, 1.1);

    var offset = i * 3;
    positions[offset] = cx + Math.cos(angle) * rx * radial;
    positions[offset + 1] = cy - Math.sin(angle) * ry * radial;
    positions[offset + 2] = randomBetween(-3, 1.5);

    var orbitOffset = i * 2;
    orbitVectors[orbitOffset] = -Math.sin(angle);
    orbitVectors[orbitOffset + 1] = -Math.cos(angle);
  }

  return { positions: positions, orbitVectors: orbitVectors };
}

export function getTargetPoints(shapeName, count, options) {
  switch (shapeName) {
    case "shield": return generateShield(count, options);
    case "grid": return generateGrid(count, options);
    case "network": return generateNetwork(count, options);
    case "globe": return generateGlobe(count, options);
    case "disperse": return generateDisperse(count, options);
    default: return generateShield(count, options);
  }
}

export function getScatterPositions(sourcePositions, count, centroid, distance) {
  var positions = new Float32Array(count * 3);

  for (var i = 0; i < count; i += 1) {
    var offset = i * 3;
    var sx = sourcePositions[offset];
    var sy = sourcePositions[offset + 1];
    var sz = sourcePositions[offset + 2];
    var dx = sx - centroid.x;
    var dy = sy - centroid.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 0.01;
    var radialX = dx / len;
    var radialY = dy / len;
    var tangentX = -radialY;
    var tangentY = radialX;
    var radialDist = distance * randomBetween(1.0, 1.6);
    var tangentDist = distance * randomBetween(-0.7, 0.7);

    positions[offset] = sx + radialX * radialDist + tangentX * tangentDist;
    positions[offset + 1] = sy + radialY * radialDist * 0.86 + tangentY * tangentDist * 0.78;
    positions[offset + 2] = sz + randomBetween(-5, 8);
  }

  return positions;
}
