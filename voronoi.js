// ----- GLOBAL VARIABLES -----
var width = 960,    // -canvas width
    height = 500,   // -canvas height
    n = 50;         // -number of regions
    
var vertices = [],    // contains the initial random set of  vertices
    verticesNew = [], // contains the post-lloyd set of vertices
    voronoi,          // contains the initial random voronoi regions
    voronoiNew = [],  // contains the post-lloyd set of voronoi regions
    svg = d3.select("#chart").append("svg");  // canvas variable

generateNewVoronoi();
drawVoronoi();

// ----- DRAWING FUNCTIONS -----
function generateNewVoronoi() {
  // get an array of randomized coordinates
	vertices = d3.range(n).map(function(d) {
	  return [Math.random() * width, Math.random() * height];
	});
	
	// compute a voronoi array
	voronoi = d3.geom.voronoi(vertices);
	
	verticesNew = [];
	voronoiNew = [];
	
	// copy the vertices and the array of regions (we want to preserve the old 
	// arrays so that we can undo Lloyd iteration)
	for (var i = 0; i < voronoi.length; i++) {
		voronoiNew[i] = [];
		for (var j = 0; j < voronoi[i].length; j++) {
			voronoiNew[i][j] = voronoi[i][j].slice(0);
		}
    
    verticesNew[i] = vertices[i].slice(0);
	}
}

function drawVoronoi() {
	svg.selectAll("circle").remove();	
	svg.selectAll("path").remove();

	svg.attr("width", width)
	   .attr("height", height)
   	 .attr("class", "Spectral")
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