<<<<<<< HEAD
// Global Variables
var width = 960,  // width of canvas
    height = 500, // height of canvas
    n = 50;       // number of points

// Global Arrays
=======
// ----- GLOBAL VARIABLES -----
var width = 960,    // -canvas width
    height = 500,   // -canvas height
    n = 50;         // -number of regions
    
>>>>>>> origin/gh-pages
var vertices = [],    // contains the initial random set of  vertices
    verticesNew = [], // contains the post-lloyd set of vertices
    voronoi,          // contains the initial random voronoi regions
    voronoiNew = [],  // contains the post-lloyd set of voronoi regions
    svg = d3.select("#chart").append("svg");  // canvas variable

<<<<<<< HEAD
generate();
draw();

function generate() {
=======
generateNewVoronoi();
drawVoronoi();

// ----- DRAWING FUNCTIONS -----
function generateNewVoronoi() {
>>>>>>> origin/gh-pages
  // get an array of randomized coordinates
	vertices = d3.range(n).map(function(d) {
	  return [Math.random() * width, Math.random() * height];
	});
	
<<<<<<< HEAD
	// create a voronoi array
=======
	// compute a voronoi array
>>>>>>> origin/gh-pages
	voronoi = d3.geom.voronoi(vertices);
	
	verticesNew = [];
	voronoiNew = [];
	
<<<<<<< HEAD
	// copy the region array (we want to preserve the old arrays 
	// so that we can use the "UNDO" button
=======
	// copy the vertices and the array of regions (we want to preserve the old 
	// arrays so that we can undo Lloyd iteration)
>>>>>>> origin/gh-pages
	for (var i = 0; i < voronoi.length; i++) {
		voronoiNew[i] = [];
		for (var j = 0; j < voronoi[i].length; j++) {
			voronoiNew[i][j] = voronoi[i][j].slice(0);
		}
<<<<<<< HEAD
	}
	
	// copy vertices
	for (var i = 0; i < vertices.length; i++) {
		verticesNew[i] = vertices[i].slice(0);
	}
}

function draw() {
	svg.selectAll("circle").remove();
=======
    
    verticesNew[i] = vertices[i].slice(0);
	}
}

function drawVoronoi() {
	svg.selectAll("circle").remove();	
>>>>>>> origin/gh-pages
	svg.selectAll("path").remove();

	svg.attr("width", width)
	   .attr("height", height)
<<<<<<< HEAD
   	 .attr("class", "PiYG")
=======
   	 .attr("class", "Spectral")
>>>>>>> origin/gh-pages
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
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/gh-pages
