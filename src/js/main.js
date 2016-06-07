// require("./lib/social");
// require("./lib/ads");
// var track = require("./lib/tracking");

require("component-responsive-frame/child");
var $ = require("./lib/qsa");
var dot = require("./lib/dot");
var Hammer = require("hammerjs");

var { edgeLookup, nodeLookup, neighbors, sequences } = require("./setup");

var caption = document.querySelector(".narrative .caption");
var container = document.querySelector(".graph-view");
var svg = document.querySelector("svg");
var details = document.querySelector(".detail-panel .content");

var detailTemplate = dot.compile(require("./_details.html"));

var savage = window.savage = require("savage-query");
var SVGCamera = require("savage-camera");
var camera = window.camera = new SVGCamera(svg);

camera.zoomTo(savage("circle"), 100);

var state = {
  selected: null,
  viewbox: null,
  bounds: null
};

// Network manipulation functions

var clearHighlights = function() {
  savage("circle.highlight").removeClass("highlight");
  savage("circle.neighbor").removeClass("neighbor");
  savage("path.highlight").removeClass("highlight");
}

var highlightNode = function(id) {
  savage(`circle.highlight`).removeClass("highlight");
  var node = document.querySelector(`.node-${id}`);
  savage(node).addClass("highlight");
};

var highlightNeighbors = function(id) {
  savage(`path.highlight`).removeClass("highlight");
  savage(`path.edge-${id}`).addClass("highlight");
  var nodes = neighbors[id] || [];
  savage("circle.neighbor").removeClass("neighbor");
  nodes.forEach(function(n) {
    savage(`.node-${n}`).addClass("neighbor");
  });
};

var zoomToNetwork = function(ids) {
  if (!(ids instanceof Array)) ids = [ids];
  var selector = ids.map(id => `.node-${id}`).join(", ");
  var nodes = savage(selector);
  camera.zoomTo(nodes, 100);
};

// open the details panel

var showDetails = function(id) {
  state.selected = id;
  var node = nodeLookup[id];
  var edges = window.network.edges.filter(e => e.from != node.label && (e.source == id || e.target == id));
  var html = detailTemplate({ node, edges });
  details.innerHTML = html;
  container.classList.add("open-details");
};

var closeButton = document.querySelector(".detail-panel .close");
closeButton.addEventListener("click", () => {
  state.selected = null;
  container.classList.remove("open-details");
  camera.zoomTo(savage("circle"), 100);
});

// placeholder UI hookup code

var circles = $("circle");

circles.forEach(el => el.addEventListener("mouseover", function(e) {
  if (state.selected) return;
  var id = this.getAttribute("data-id");
  highlightNode(id);
  highlightNeighbors(id);
}));

circles.forEach(el => el.addEventListener("mouseout", function(e) {
  if (state.selected) return;
  clearHighlights();
}));

circles.forEach(el => el.addEventListener("click", function(e) {
  var id = this.getAttribute("data-id");
  showDetails(id);
  highlightNode(id);
  highlightNeighbors(id);
  var connected = neighbors[id].concat(id);
  zoomToNetwork(connected);
}));


// multitouch support
var decodeViewbox = function() {
  var [x, y, width, height] = svg.getAttribute("viewBox").split(" ").map(Number);
  return { x, y, width, height };
};

var clientToLocal = function(coords, bounds) {
  return {
    x: coords.x - bounds.left,
    y: coords.y - bounds.top
  }
};

var localToUV = function(coords, bounds) {
  return {
    x: coords.x / bounds.width,
    y: coords.y / bounds.height
  }
};

var mc = new Hammer(svg, {
  pinch: { enable: true }
});

mc.get("pan").set({ direction: Hammer.DIRECTION_ALL });
mc.get("pinch").set({ enable: true });

var initState = function(e) {
  state.viewbox = decodeViewbox();
  state.bounds = svg.getBoundingClientRect();
  state.start = clientToLocal({ x: e.center.x, y: e.center.y }, state.bounds);
};

mc.on("panstart pinchstart pinchend", initState);

var onTouch = function(e) {
  var center = clientToLocal(e.center, state.bounds);
  var scaled = {
    width: state.viewbox.width / e.scale,
    height: state.viewbox.height / e.scale
  };
  var delta = {
    x: center.x - state.start.x,
    y: center.y - state.start.y,
    width: state.viewbox.width - scaled.width,
    height: state.viewbox.height - scaled.height
  };
  var uv = localToUV(delta, state.bounds);
  var shift = {
    x: uv.x * state.viewbox.width - delta.width / 2,
    y: uv.y * state.viewbox.height - delta.height / 2,
  };
  var box = {
    width: scaled.width,
    height: scaled.height,
    x: state.viewbox.x - shift.x,
    y: state.viewbox.y - shift.y
  };
  var boxString = [box.x, box.y, box.width, box.height].join(" ");
  svg.setAttribute("viewBox", boxString);
};

mc.on("pinch pan", onTouch);

svg.addEventListener("wheel", function(e) {
  var event = {
    center: {
      x: e.clientX,
      y: e.clientY
    },
    scale: e.deltaY < 0 ? 1.2 : .8
  };
  initState(event);
  onTouch(event);
});