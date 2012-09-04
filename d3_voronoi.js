
	var width = 960,
    height = 500,
	n = 50;

	var vertices = [], verticesNew = [];
	var voronoi, voronoiNew=[];
	var svg= d3.select("#chart").append("svg");

	generate();
	draw();

	function generate() {
		vertices = d3.range(n).map(function(d) {
		  return [Math.random() * width, Math.random() * height];
		});
		
		voronoi = d3.geom.voronoi(vertices);
		
		for (var i = 0; i < voronoi.length; i++) {
			voronoiNew[i] = [];
			for (var j = 0; j < voronoi[i].length; j++) {
				voronoiNew[i][j] = voronoi[i][j].slice(0);
			}
		}
		
		for (var i = 0; i < vertices.length; i++) {
			verticesNew[i] = vertices[i].slice(0);
		}
	}
	
	function toodles(a,b,c) {
		return a
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
		//	if (is_run) {
		//		is_run = false;
		//		clearInterval(animation);
		//	}
		
			verticesNew[0] = d3.mouse(this);
			voronoiNew = d3.geom.voronoi(verticesNew);
			svg.selectAll("path")
				.data(voronoiNew
				.map(function(d) { return "M" + d.join("L") + "Z"; }))
				.filter(function(d) { return this.getAttribute("d") != d; })
				.attr("d", function(d) { return d; });
		}
	}
