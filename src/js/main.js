// require("./lib/social");
// require("./lib/ads");
// var track = require("./lib/tracking");

require("component-responsive-frame/child");
var $ = require("./lib/qsa");
var Hammer = require("hammerjs");

var svg = document.querySelector("svg");
var tooltip = document.querySelector(".tooltip");
var caption = document.querySelector(".narrative .caption");

var SVGCamera = require("savage-camera");
var camera = new SVGCamera(svg);
window.camera = camera;

var savage = window.savage = require("savage-query");

var edgeLookup = {};
var nodeLookup = {};
var neighbors = {};

var sequences = {};
window.network.narrative.forEach(function(row) {
  if (!sequences[row.thread]) sequences[row.thread] = [];
  sequences[row.thread].push(row);
  row.focus = row.focus + "";
});
for (var k in sequences) {
  sequences[k].sort((a, b) => a.stage - b.stage);
}

var sequenceState = {
  sequence: "intro",
  stage: 0
};

var goToStage = function() {
  var { sequence, stage } = sequenceState;
  var s = sequences[sequence][stage];
  if (!s) return;
  var selector = s.focus == "*" ? "circle" : s.focus.split("&").map(n => `.node-${n}`).join(",");
  var elements = savage(selector);
  camera.zoomTo(elements, s.focus == "*" ? 40 : 400);
  var text = s.text;
  if (sequences[sequence][stage + 1]) {
    text += `<a class="next">continue &raquo;</a>`
  }
  caption.innerHTML = text;
  var previousHighlight = $(`[highlight]`);
  previousHighlight.forEach(el => el.removeAttribute("highlight"));
  var previousNeighbors = $(`[neighbor]`);
  previousNeighbors.forEach(el => el.removeAttribute("neighbor"));
  var highlight = document.querySelector(`.node-${s.highlight}`);
  if (!highlight) return;
  highlight.setAttribute("highlight", "");
  var connected = neighbors[s.highlight];
  if (connected) connected.forEach(function(id) {
    var n = document.querySelector(`.node-${id}`)
    if (n) n.setAttribute("neighbor", "");
  });
};

var onSequence = function() {
  var current = document.querySelector("[data-sequence].selected");
  if (current) current.classList.remove("selected");
  this.classList.add("selected");
  var s = this.getAttribute("data-sequence");
  sequenceState.sequence = s;
  sequenceState.stage = 0;
  goToStage();
}

$(`[data-sequence]`).forEach(el => el.addEventListener("click", onSequence));
document.querySelector(".narrative .caption").addEventListener("click", function(e) {
  if (e.target.classList.contains("next")) {
    sequenceState.stage++;
    goToStage();
  }
});

goToStage();

var rgb = (r, g, b) => `rgb(${r}, ${g}, ${b})`;

var placeTooltip = function(e) {
  tooltip.classList.add("show");
  var bounds = svg.getBoundingClientRect();
  var x = (e.touches ? e.touches[0].clientX : e.clientX) - bounds.left;
  var y = (e.touches ? e.touches[0].clientY : e.clientY) - bounds.top;
  if (x > bounds.width / 2) x -= tooltip.offsetWidth + 20;
  if (y > bounds.height / 2) y -= tooltip.offsetHeight + 20;
  y += 10;
  x += 10;
  tooltip.style.top = `${y}px`;
  tooltip.style.left = `${x}px`;
};

var removeTooltip = () => tooltip.classList.remove("show");

var onEdge = function(e) {
  savage(e.target).addClass("selected");
  var edge = edgeLookup[e.target.getAttribute("data-edge")];
  var quote = edge.editedQuote.trim();
  var source = edge.a;
  var target = edge.b;
  svg.querySelector(`.node-${edge.source}`).setAttribute("neighbor", true);
  svg.querySelector(`.node-${edge.target}`).setAttribute("neighbor", true);
  tooltip.innerHTML = `
    <div>${source} and ${target}</div>
    <blockquote>"${quote}"</blockquote>
    <cite> &mdash; ${edge.from}</cite>`
  placeTooltip(e);
};

var onNode = function(e) {
  // placeTooltip(e);
  var id = e.target.getAttribute("data-id");
  // tooltip.innerHTML = nodeLookup[id].label;
  var connected = neighbors[id];
  if (connected) connected.forEach(function(n) {
    var node = svg.querySelector(`.node-${n}`);
    if (node) {
      node.setAttribute("neighbor", "true");
    }
  });
};

var offNode = function() {
  savage("path.selected").removeClass("selected");
  var connected = svg.querySelectorAll("[neighbor]");
  for (var i = 0; i < connected.length; i++) {
    connected[i].removeAttribute("neighbor");
  }
  removeTooltip();
};

var namespace = svg.getAttribute("xmlns");

window.network.nodes.forEach(function(row, i) {
  var node = svg.querySelector(`.node-${row.id}`);
  if (node) {
    var label = row.label;
    var t = document.createElementNS(namespace, "text");
    t.innerHTML = label;
    var g = document.createElementNS(namespace, "g");
    node.parentElement.replaceChild(g, node);
    g.appendChild(node);
    g.appendChild(t);
    t.setAttribute("x", node.getAttribute("cx") - t.getBBox().width / 2);
    t.setAttribute("y", node.getAttribute("cy"));
    nodeLookup[row.id] = row;
    node.setAttribute("data-id", row.id);
    node.addEventListener("mousemove", onNode);
    node.addEventListener("mouseleave", offNode);
  }
});

window.network.edges.forEach(function(row) {
  if (!neighbors[row.source]) neighbors[row.source] = [];
  neighbors[row.source].push(row.target);
  if (!neighbors[row.target]) neighbors[row.target] = [];
  neighbors[row.target].push(row.source);
  var edge = svg.querySelectorAll(`.edge-${row.source}.edge-${row.target}`);
  // remove duplicate connections
  if (edge.length > 1) {
    for (var i = 1; i < edge.length; i++) {
      edge[i].parentElement.removeChild(edge[i]);
    }
  }
  edge = edge[0];
  if (edge && row.editedQuote) {
    // savage(edge).addClass("quoted");
    var key = `${row.source}/${row.target}`;
    edge.setAttribute("data-edge", key);
    edgeLookup[key] = row;
    edge.addEventListener("mousemove", onEdge);
    edge.addEventListener("mouseleave", offNode);
    edge.addEventListener("touchstart", onEdge);
  }
});

//multitouch support
var decodeViewbox = function() {
  var [x, y, width, height] = svg.getAttribute("viewBox").split(" ").map(Number);
  return { x, y, width, height };
};

var encodeViewbox = function(v) {
  return `${v.x} ${v.y} ${v.width} ${v.height}`;
};

var memory = null;

var mc = new Hammer(svg, {
  preset: ["tap", "press", "pan", "pinch"]
});
mc.get("pinch").set({ enable: true });
mc.get("pan").set({ direction: Hammer.DIRECTION_ALL });

mc.on("panstart pinchstart", function(e) {
  pinching = false;
  memory = { 
    touch: { x: e.center.x, y: e.center.y },
    viewbox: decodeViewbox(),
    bounds: svg.getBoundingClientRect()
  };
});

var pinching;

mc.on("pan pinch", function(e) {
  if (e.type == "pinch") pinching = true;
  if (e.type == "pan" && pinching) return;
  if (e.deltaTime > 100) {
    removeTooltip();
  }
  var { x, y, width, height } = memory.viewbox;
  var scaledCenter = {
    x: (e.center.x - memory.bounds.left) / memory.bounds.width,
    y: (e.center.y - memory.bounds.top) / memory.bounds.height
  };
  var deltas = {
    x: e.deltaX / memory.bounds.width,
    y: e.deltaY / memory.bounds.height
  };
  var box = {
    width: width / e.scale,
    height: width / e.scale,
    x: x - deltas.x * width,
    y: y - deltas.y * height
  };
  box.x = x - (box.width - width) / 2 * scaledCenter.x;
  box.x -= deltas.x * width;
  box.y = y - (box.height - height) / 2 * scaledCenter.y;
  box.y -= deltas.y * height;

  svg.setAttribute("viewBox", encodeViewbox(box));

});