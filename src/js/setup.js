var edgeLookup = {};
var nodeLookup = {};
var neighbors = {};

var svg = document.querySelector("svg");
var namespace = svg.getAttribute("xmlns");
var savage = require("savage-query");

window.network.nodes.forEach(function(row, i) {
  var node = svg.querySelector(`.node-${row.id}`);
  if (node) {
    var $node = savage(node);
    $node.addClass(row.category);
    //add the label text to the SVG
    var label = row.label;
    var t = document.createElementNS(namespace, "text");
    t.innerHTML = label;
    if (row.photo) {
      t.setAttribute("class", "photo");
    }
    var g = document.createElementNS(namespace, "g");
    node.parentElement.replaceChild(g, node);
    g.appendChild(node);
    g.appendChild(t);
    t.setAttribute("x", node.getAttribute("cx") - t.getBBox().width / 2);
    t.setAttribute("y", node.getAttribute("cy"));
    nodeLookup[row.id] = row;
    node.setAttribute("data-id", row.id);
  }
});

window.network.edges.forEach(function(row) {
  //build a lookup table for node neighbors
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
});

var sequences = {};
window.network.narrative.forEach(function(row) {
  if (!sequences[row.thread]) sequences[row.thread] = [];
  sequences[row.thread].push(row);
  row.focus = row.focus + "";
});
for (var k in sequences) {
  sequences[k].sort((a, b) => a.stage - b.stage);
}

module.exports = { edgeLookup, nodeLookup, neighbors, sequences };