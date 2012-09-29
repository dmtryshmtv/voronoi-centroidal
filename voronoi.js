// Global Variables
var width = 960,  // width of canvas
    height = 500, // height of canvas
    n = 50;       // number of points

// Global Arrays
var vertices = [],    // contains the initial random set of  vertices
    verticesNew = [], // contains the post-lloyd set of vertices
    voronoi,          // contains the initial random voronoi regions
    voronoiNew = [],  // contains the post-lloyd set of voronoi regions
    svg = d3.select("#chart").append("svg");  // canvas variable

generate();
draw();

function generate() {
  // get an array of randomized coordinates
	vertices = d3.range(n).map(function(d) {
	  return [Math.random() * width, Math.random() * height];
	});
	
	// create a voronoi array
	voronoi = d3.geom.voronoi(vertices);
	
	verticesNew = [];
	voronoiNew = [];
	
	// copy the region array (we want to preserve the old arrays 
	// so that we can use the "UNDO" button
	for (var i = 0; i < voronoi.length; i++) {
		voronoiNew[i] = [];
		for (var j = 0; j < voronoi[i].length; j++) {
			voronoiNew[i][j] = voronoi[i][j].slice(0);
		}
	}
	
	// copy vertices
	for (var i = 0; i < vertices.length; i++) {
		verticesNew[i] = vertices[i].slice(0);
	}
}

function draw() {
	svg.selectAll("circle").remove();	
	svg.selectAll("path").remove();

	svg.attr("width", width)
	   .attr("height", height)
   	 .attr("class", "PiYG")
   	 .on("mouseover", update);

	svg.selectAll("path")
	   .data(voronoiNew)
	   .enter().append("path")
	    .attr("class", function(d, i) { return i ? "q" + (i % 9) + "-9" : null; })
	    .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

	svg.selectAll("circle")
	   .data(verticesNew.slice(1))
	   .enter().append("circle")
	    .attr("transform", function(d) { return "translate(" + d + ")"; })
	    .attr("r", 2);
		
	function update() {
		verticesNew[0] = d3.mouse(this);
		voronoiNew = d3.geom.voronoi(verticesNew);
		svg.selectAll("path")
		   .data(voronoiNew.map(function(d) { return "M" + d.join("L") + "Z"; }))
		    .filter(function(d) { return this.getAttribute("d") != d; })
		    .attr("d", function(d) { return d; });
	}
}
