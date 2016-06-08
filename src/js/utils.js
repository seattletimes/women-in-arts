var decodeViewbox = function(svg) {
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

module.exports = { decodeViewbox, clientToLocal, localToUV };