// ----- GLOBAL VARS -----
var isPinned = 0,        // tracks if pushed centroids to the boundary
  borderType = "norm",   // tracks border behavior
  boundaryPolygons = [], // contains regions intersecting with boundary to save
  densityType = "constant";  // tracks density type


// ----- BUTTON FUNCTIONS ----- START
// generates new random points
d3.select("#generate").on("click", function () { 
  isPinned = 0;
	generateNewVoronoi();
	drawVoronoi();
});


// performs one Lloyd iteration
d3.select("#centroid_step").on("click", function () {
  if (borderType == "norm") {
    isPinned = 0;
	  clipVoronoi();
	  lloyd();
  	voronoiNew = d3.geom.voronoi(verticesNew);
  	drawVoronoi();
	}
	else if (borderType == "push") {
	  isPinned = 0;
	  clipVoronoi();
	  lloyd();
   	voronoiNew = d3.geom.voronoi(verticesNew);
 	  pushToBoundary();
   	voronoiNew = d3.geom.voronoi(verticesNew);
  	drawVoronoi();
	}
  else {
    if (!isPinned) {
      boundaryPolygons = pushToBoundary();
      isPinned = 1;
    }
    clipVoronoi();
    lloyd();
    voronoiNew = d3.geom.voronoi(verticesNew);
    drawVoronoi();
  }
  
  if (isDelaunayVisible) {
	  delaunayMakeDraw();
	}
});


// ----- GLOBAL VARS -----
var animationLloyd,    // tracks lloyd iteration
  isLloydRun = false; // tracks if animation running
  
// continually iterates Lloyd (calls one step above over and over)
d3.select("#centroid_anim").on("click", function () {
	if (!isLloydRun){
		isLloydRun = true;
		animationLloyd = window.setInterval(function () {
		  document.getElementById('centroid_step').click();
	  },25);
	}
	else {
		isLloydRun = false;
		clearInterval(animationLloyd);
  }
});


// resets canvas to the original random set of points
d3.select("#reset").on("click",function () {
	for (var i = 0; i < voronoi.length; i++) {
		voronoiNew[i] = [];
		for (var j = 0; j < voronoi[i].length; j++) {
			voronoiNew[i][j] = voronoi[i][j].slice(0);
		}
    
		verticesNew[i] = vertices[i].slice(0);
	}
	
  boundaryPolygons = [];
  drawVoronoi();
  isPinned = 0;
	
	if (isDelaunayVisible) {
	  delaunayMakeDraw();
	}
});

// ----- GLOBAL VARS -----
var delaunayTriangles = [], // stores Delaunay triangles
    isDelaunayVisible = 0;   // tracks if Delaunay is shown

// computes and draws a Delaunay triangulation
d3.select("#delaunay").on("click",function () {
  if (isDelaunayVisible) {
    isDelaunayVisible = 0;
    d3.selectAll(".delaunay_path").remove();  
  }
  else {
    delaunayMakeDraw();
  }  
});
// ----- BUTTON BEHAVIOR ----- END

// ----- COMPUTATION FUNCTIONS ----- START
// computes and draws Delaunay triangulation
function delaunayMakeDraw() {
  isDelaunayVisible = 1;
  var delaunayTriangles = d3.geom.delaunay(verticesNew);
  svg.selectAll(".delaunay_path")
    .data(delaunayTriangles)
    .enter().append("path")
    .attr("class", "delaunay_path")
    .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
}

// inBoundary check
function inBoundary(x,y) {
	if (x < 0 || y < 0 || y > height || x > width)
		return false;
	return true;
}

// checks if line n0 -> n1 intersects with line n2 -> n3
// if it does, returns the intersection point, else returns false
function doesIntersect(n0, n1, n2, n3) {
  // Dot product of line vectors: n0->n1 * n2->n3
  // Or actually, this looks like determinant of [n0->n1; n2->n3] matrix
	var denom = (n3.y - n2.y) * (n1.x - n0.x) - 
            	(n3.x - n2.x) * (n1.y - n0.y);

	// Dot product = 0 <=> parallel
	// Det = 0 <=> linearly dependent <=> parallel
	if (denom === 0) {
		return false;
	}

  // Not entirely sure; ua appears to be a parametrization of the line 
  // n0 to n1 from 0 to 1. ub is similar. If either of them is out of bounds
  // of the parametrization, then we know the intersection is does not lie
  // in between the two points
	var ua = ((n3.x - n2.x) * (n0.y - n2.y) - 
			     (n3.y - n2.y) * (n0.x - n2.x)) / denom,
		ub = ((n1.x - n0.x) * (n0.y - n2.y) - 
 				 (n1.y - n0.y) * (n0.x - n2.x)) / denom,
		x = Math.round(n0.x + ua * (n1.x - n0.x)),
		y = Math.round(n0.y + ua * (n1.y - n0.y));
		result = new PolygonNode(x, y, "y");

	if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
		// Collision detected
		return result;
	}
	else {
		// No collision
		return false;
	}
}


// computes euclidean distance
function distance(n0,n1) {
	return Math.sqrt((n0.x - n1.x) * (n0.x - n1.x) + 
      						 (n0.y - n1.y) * (n0.y - n1.y));
}


// this structure that contains: 
// -a polygon point, 
// -bool if it's a boundary intersection
// -bool if it's an entrance point (CCW polygon)
// -bool if it's an exit point (CCW polygon)
function PolygonNode(x,y,intersection,entry,exit) {
	this.x = x;
	this.y = y;
	this.intersection = intersection ? intersection : false;
	this.entry = entry ? entry : false;
	this.exit = exit ? exit : false;
	
	this.updateEntry = function() {
		this.entry = true;
	}
	
	this.updateExit = function() {
		this.exit = true;
	}
	
	this.updateIntersection = function(side) {
	  this.intersection = side;
	}
}

// converts an array of points into an array of PolygonNodes
function toPolygonNodes(array) {
	var PolygonNodeArray = [];
  
	for (var i=0; i < array.length; i++) {
    PolygonNodeArray.push(
      new PolygonNode(array[i][0], array[i][1], false, false, false));
	}
	
	return PolygonNodeArray;
}


// Polygon clipping
function clipVoronoi () {
	var rectangle =  [[0,0],[0,height],[width,height],[width,0]],
      j;
	
	
	// loop through each region and clip each polygon
	// to the rectangle; first check if the region is all inBoundary, though
	for (var i = 0; i < voronoiNew.length; i++) {
		j = 0;
		while (j < voronoiNew[i].length && inBoundary(voronoiNew[i][j][0],voronoiNew[i][j][1])) {
			j++;
		}
		if (j < voronoiNew[i].length && !inBoundary(voronoiNew[i][j][0],voronoiNew[i][j][1])) {
			voronoiNew[i] = polyclip(voronoiNew[i],rectangle);
		}
	}
}


// intersects the subject and clip polygons
// not a generalized function, just works for arbitrary counter-clockwise 
// oriented polygons and a rectangle
function polyclip (subject,clip) {
	var nodesPolygon = toPolygonNodes(subject),
	    nodesRectangle = toPolygonNodes(clip),
  	  arrayPolygon = [],
	    clipped = [],
      j;

	for (var i = 0; i < nodesPolygon.length; i++)
	{
		// if the point is in boundary, keep it
		if (inBoundary(nodesPolygon[i].x, nodesPolygon[i].y)) {
			arrayPolygon.push(nodesPolygon[i]);
		
			// if the next point is out, then we're exiting
			if (!inBoundary(nodesPolygon[(i+1) % nodesPolygon.length].x, 
							nodesPolygon[(i+1) % nodesPolygon.length].y)) {
							
							
				// which of the four rectangle sides do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPolygon[i], 
										   nodesPolygon[(i+1) % nodesPolygon.length],
										   nodesRectangle[j], 
										   nodesRectangle[(j+1) % nodesRectangle.length]);
					j++;
				}
				while (j < nodesRectangle.length && !result);
				
				result.updateExit();
				if (result.x == 0) {
					result.updateIntersection("left");
				}
				else if (result.x == width) {
					result.updateIntersection("right");
				}
				else if (result.y == 0) {
					result.updateIntersection("top");
				}
				else {
					result.updateIntersection("bottom");
				}
				arrayPolygon.push(result);
			}
		}
		// otherwise, we are out of the boundary, so don't add the point
		else {
			// still, check if the next point is in; then we're entering
			if (inBoundary(nodesPolygon[(i+1) % nodesPolygon.length].x, 
						   nodesPolygon[(i+1) % nodesPolygon.length].y)) {
							
				// which rectangle side do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPolygon[i], 
										   nodesPolygon[(i+1) % nodesPolygon.length],
										   nodesRectangle[j], 
										   nodesRectangle[(j+1) % nodesRectangle.length]);
					j++;
				}
				while (j < nodesRectangle.length && !result);
				
				result.updateEntry();
				if (result.x == 0) {
					result.updateIntersection("left");
				}
				else if (result.x == width) {
					result.updateIntersection("right");
				}
				else if (result.y == 0) {
					result.updateIntersection("top");
				}
				else {
					result.updateIntersection("bottom");
				}
				arrayPolygon.push(result);
			}
			// degenerate case - we're out of boundary and the next point is out of
			// boundary, but we might still intersect the corner bit without having 
			// an interior point
			else {
				var a = [], k = 0;
				
				// check if we intersect any rectangle sides
				for (var j = 0; j < nodesRectangle.length; j++) {
					result = doesIntersect(nodesPolygon[i], 
										   nodesPolygon[(i+1) % nodesPolygon.length],
										   nodesRectangle[j], 
										   nodesRectangle[(j+1) % nodesRectangle.length]);
										   
					if (result) {
						if (result.x == 0) {
							result.updateIntersection("left");
						}
						else if (result.x == width) {
							result.updateIntersection("right");
						}
						else if (result.y == 0) {
							result.updateIntersection("top");
						}
						else {
							result.updateIntersection("bottom");
						}
						a[k] = result;
						k++;
					}
				}
				
				// if we did intersect sides (and it's gonna be max 2 sides), check 
				// which side is intersected first
				if (a.length > 0) {
					if (distance(nodesPolygon[i],a[0]) < distance(nodesPolygon[i],a[1])) {
						a[0].updateEntry();
						arrayPolygon.push(a[0]);
						a[1].updateExit();
						arrayPolygon.push(a[1]);
					}
					else {
						a[1].updateEntry();
						arrayPolygon.push(a[1]);
						a[0].updateExit();
						arrayPolygon.push(a[0]);
					}
				}
			}
		}
	}
	
	// index
	// j exists to loop the index around to the end of the array
	var i = 0,
	    j = 0;
	
	// now we need to add rectangle corners, clipped will be the final array
	// and arrayPolygon contains all the fixed points without corners
	while (i < arrayPolygon.length) {
	  // so if a point is an entry, we need to add corners before we enter
		if (arrayPolygon[i].entry) {
			if (i - 1 < 0) {
				j = arrayPolygon.length - 1;
			}
			else {
				j = i - 1;
			}
		
		  // since we're entering, the point before must've exited; did they come
		  // from the same side of the rectangle? if not, determine which and 
		  // determine, case by case, which corners are needed
			if (arrayPolygon[i].intersection != arrayPolygon[j].intersection) {
				if (arrayPolygon[i].intersection == "top") {
					if (arrayPolygon[j].intersection == "left") {
						clipped.push([0,height]);
						clipped.push([width,height]);
						clipped.push([width,0]);
					}
					else if (arrayPolygon[j].intersection == "bottom") {
						clipped.push([width,height]);
						clipped.push([width,0]);
					}
					else if (arrayPolygon[j].intersection == "right") {
						clipped.push([width,0]);
					}
				}
				else if (arrayPolygon[i].intersection == "left") {
					if (arrayPolygon[j].intersection == "top") {
						clipped.push([0,0]);
					}
					else if (arrayPolygon[j].intersection == "bottom") {
						clipped.push([width,height]);
						clipped.push([width,0]);
						clipped.push([0,0]);
					}
					else if (arrayPolygon[j].intersection == "right") {
						clipped.push([width,0]);
						clipped.push([0,0]);
					}
				}
				else if (arrayPolygon[i].intersection == "bottom") {
					if (arrayPolygon[j].intersection == "top") {
						clipped.push([0,0]);
						clipped.push([0,height]);
					}
					else if (arrayPolygon[j].intersection == "left") {
						clipped.push([0,height]);
					}
					else if (arrayPolygon[j].intersection == "right") {
						clipped.push([width,0]);
						clipped.push([0,0]);
						clipped.push([0,height]);
					}
				}
				else if (arrayPolygon[i].intersection == "right") {
					if (arrayPolygon[j].intersection == "top") {
						clipped.push([0,0]);
						clipped.push([0,height]);
						clipped.push([width,height]);
					}
					else if (arrayPolygon[j].intersection == "left") {
						clipped.push([0,height]);
						clipped.push([width,height]);
					}
					else if (arrayPolygon[j].intersection == "bottom") {
						clipped.push([width,height]);
					}
				}
			}
			
			clipped.push([arrayPolygon[i].x,arrayPolygon[i].y]);
		}
		// otherwise, the point is just an interior point or an exit point
		// so add it
		else {
			clipped.push([arrayPolygon[i].x,arrayPolygon[i].y])
		}
		i++;
	}
	
	return clipped;
}


// This function takes the regions that intersect the boundary and projects 
// their vertices to the boundary. If there is a corner involved, then the 
// point moves to the corner.
function pushToBoundary() {
  var rectangle = [[0,0],[0,height],[width,height],[width,0]],
      temp,
      j,
      boundaryPolygons = [];
	
	// loop through each region and move vertices of regions that intersect
	// the boundaries
	for (var i = 0; i < voronoiNew.length; i++) {
		j = 0;
		while (j < voronoiNew[i].length && inBoundary(voronoiNew[i][j][0],voronoiNew[i][j][1])) {
			j++;
		}
		if (j < voronoiNew[i].length && !inBoundary(voronoiNew[i][j][0],voronoiNew[i][j][1])) {
			verticesNew[i] = projectToBoundary(verticesNew[i][0],verticesNew[i][1],voronoiNew[i],rectangle);
			boundaryPolygons.push(i);
		}
	}
	
	return boundaryPolygons;
}


// takes a region and decides what borders does it intersect
// if the region intersects on the corner, the function returns that corner 
// point; otherwise, it projects to the closest boundary point
function projectToBoundary (x,y,subject,clip) {
	var nodesPolygon = toPolygonNodes(subject),
	    nodesRectangle = toPolygonNodes(clip),
  	  arrayPolygon = [],
      j;

	for (var i = 0; i < nodesPolygon.length; i++)
	{
		// if the point is in boundary, keep it
		if (inBoundary(nodesPolygon[i].x, nodesPolygon[i].y)) {
			arrayPolygon.push(nodesPolygon[i]);
		
			// if the next point is out, then we're exiting
			if (!inBoundary(nodesPolygon[(i+1) % nodesPolygon.length].x, 
							nodesPolygon[(i+1) % nodesPolygon.length].y)) {
							
							
				// which of the four rectangle sides do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPolygon[i], 
										   nodesPolygon[(i+1) % nodesPolygon.length],
										   nodesRectangle[j], 
										   nodesRectangle[(j+1) % nodesRectangle.length]);
					j++;
				}
				while (j < nodesRectangle.length && !result);
				
				result.updateExit();
				if (result.x == 0) {
					result.updateIntersection("left");
				}
				else if (result.x == width) {
					result.updateIntersection("right");
				}
				else if (result.y == 0) {
					result.updateIntersection("top");
				}
				else {
					result.updateIntersection("bottom");
				}
				arrayPolygon.push(result);
			}
		}
		// otherwise, we are out of the boundary, so don't add the point
		else {
			// still, check if the next point is in; then we're entering
			if (inBoundary(nodesPolygon[(i+1) % nodesPolygon.length].x, 
						   nodesPolygon[(i+1) % nodesPolygon.length].y)) {
							
				// which rectangle side do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPolygon[i], 
										   nodesPolygon[(i+1) % nodesPolygon.length],
										   nodesRectangle[j], 
										   nodesRectangle[(j+1) % nodesRectangle.length]);
					j++;
				}
				while (j < nodesRectangle.length && !result);
				
				result.updateEntry();
				if (result.x == 0) {
					result.updateIntersection("left");
				}
				else if (result.x == width) {
					result.updateIntersection("right");
				}
				else if (result.y == 0) {
					result.updateIntersection("top");
				}
				else {
					result.updateIntersection("bottom");
				}
				arrayPolygon.push(result);
			}
			// degenerate case - we're out of boundary and the next point is out of
			// boundary, but we might still intersect the corner bit without having 
			// an interior point
			else {
				var a = [], k = 0;
				
				// check if we intersect any rectangle sides
				for (var j = 0; j < nodesRectangle.length; j++) {
					result = doesIntersect(nodesPolygon[i], 
										   nodesPolygon[(i+1) % nodesPolygon.length],
										   nodesRectangle[j], 
										   nodesRectangle[(j+1) % nodesRectangle.length]);
										   
					if (result) {
						if (result.x == 0) {
							result.updateIntersection("left");
						}
						else if (result.x == width) {
							result.updateIntersection("right");
						}
						else if (result.y == 0) {
							result.updateIntersection("top");
						}
						else {
							result.updateIntersection("bottom");
						}
						a[k] = result;
						k++;
					}
				}
				
				// if we did intersect sides (and it's gonna be max 2 sides), check 
				// which side is intersected first
				if (a.length > 0) {
					if (distance(nodesPolygon[i],a[0]) < distance(nodesPolygon[i],a[1])) {
						a[0].updateEntry();
						arrayPolygon.push(a[0]);
						a[1].updateExit();
						arrayPolygon.push(a[1]);
					}
					else {
						a[1].updateEntry();
						arrayPolygon.push(a[1]);
						a[0].updateExit();
						arrayPolygon.push(a[0]);
					}
				}
			}
		}
	}
	
	// index
	// j exists to loop the index around to the end of the array
	var i = 0,
	    j = 0;
	
	// now we need find which boundaries we actually intersected
	while (i < arrayPolygon.length) {
	  // so if a point is an entry, we need to add corners before we enter
		if (arrayPolygon[i].entry) {
			if (i - 1 < 0) {
				j = arrayPolygon.length - 1;
			}
			else {
				j = i - 1;
			}
		
		  // bunch of cases to determine which side to push the vertex to
			if (arrayPolygon[i].intersection == "top") {
				if (arrayPolygon[j].intersection == "left") {
				  return [width,height];
				}
				else if (arrayPolygon[j].intersection == "bottom") {
					return [width,0];
				}
				else if (arrayPolygon[j].intersection == "right") {
					return [width,0];
				}
				else {
				  if (arrayPolygon[i].x <= x && x <= arrayPolygon[j].x) {
  				  return [x,0];
				  }
				  else if (arrayPolygon[i].x > x) {
				    return [arrayPolygon[i].x,0];
				  }
				  else if (arrayPolygon[j].x < x) {
				    return [arrayPolygon[j].x,0];
				  }
				}
			}
			else if (arrayPolygon[i].intersection == "left") {
				if (arrayPolygon[j].intersection == "top") {
					return [0,0];
				}
				else if (arrayPolygon[j].intersection == "bottom") {
          return [width,0];
				}
				else if (arrayPolygon[j].intersection == "right") {
          return [width,0];
				}
				else {
				  if (arrayPolygon[i].y >= y && y >= arrayPolygon[j].y) {
  				  return [0,y];
				  }
				  else if (arrayPolygon[i].y < y) {
				    return [0,arrayPolygon[i].y];
				  }
				  else if (arrayPolygon[j].y > y) {
				    return [0,arrayPolygon[j].y];
				  }
				}
			}
			else if (arrayPolygon[i].intersection == "bottom") {
				if (arrayPolygon[j].intersection == "top") {
					return [0,0];
				}
				else if (arrayPolygon[j].intersection == "left") {
					return [0,height];
				}
				else if (arrayPolygon[j].intersection == "right") {
					return [0,0];
				}
				else {
 				  if (arrayPolygon[i].x >= x && x >= arrayPolygon[j].x) {
  				  return [x,height];
				  }
				  else if (arrayPolygon[i].x < x) {
				    return [arrayPolygon[i].x,height];
				  }
				  else if (arrayPolygon[j].x > x) {
				    return [arrayPolygon[j].x,height];
				  }
				}
			}
			else if (arrayPolygon[i].intersection == "right") {
				if (arrayPolygon[j].intersection == "top") {
					return [0,height];
				}
				else if (arrayPolygon[j].intersection == "left") {
					return [0,height];
				}
				else if (arrayPolygon[j].intersection == "bottom") {
					return [width,height];
				}
				else {
				  if (arrayPolygon[i].y <= y && y <= arrayPolygon[j].y) {
  				  return [width,y];
				  }
				  else if (arrayPolygon[i].y > y) {
				    return [width,arrayPolygon[i].y];
				  }
				  else if (arrayPolygon[j].y < y) {
				    return [width,arrayPolygon[j].y];
				  }
				}
			}
		}
		i++;
	}
}



// Lloyd's algorithm - http://en.wikipedia.org/Lloyd/wiki's_algorithm
function lloyd() {
  var centroid,
      r = 1,
	    motion = 0,
	    change;

  if (borderType == "pin") {
    for (var i = 0; i < verticesNew.length; i++) {
      flag = true;
      
      for (var j = 0; j < boundaryPolygons.length; j++) {
        if (boundaryPolygons[j] == i) {
          flag = false;
      	}
      }
      
      if (flag) {
        centroid = computePolygonCentroid(voronoiNew[i]);
        change = Math.sqrt( (centroid[0] - verticesNew[i][0]) * 
			                    	(centroid[0] - verticesNew[i][0]) + 
				                    (centroid[1] - verticesNew[i][1]) * 
				                    (centroid[1] - verticesNew[i][1]) );
				                          
    		motion += change;
    		
    	  if (change > .001) {
		      verticesNew[i] = [centroid[0] * r + (1 - r) * verticesNew[i][0], 
		                        centroid[1] * r + (1 - r) * verticesNew[i][1]];
        }
      }
    }
  }
  else { 
	  for (var i = 0; i < voronoiNew.length; i++) {	 
      centroid = computePolygonCentroid(voronoiNew[i]);
      change = Math.sqrt( (centroid[0] - verticesNew[i][0]) * 
					              	(centroid[0] - verticesNew[i][0]) + 
						              (centroid[1] - verticesNew[i][1]) * 
						              (centroid[1] - verticesNew[i][1]) );
						                    
  		motion += change;
  	  if (change > .001) {
			  verticesNew[i] = [centroid[0] * r + (1 - r) * verticesNew[i][0], 
			                    centroid[1] * r + (1 - r) * verticesNew[i][1]];
  		}
    }
  }
	
	return motion;
}


// computePolygonCentroid
// Method 1 - Centroid of a polygon, formula
//
// centroidPoint[0] = (1/area)*integral of x*p(x,y)
// centroidPoint[1] = (1/area)*integral of y*p(x,y)
function computePolygonCentroid (array) {
	var x = 0,
      y = 0,
	    area = 0,
	    len = array.length;
	    
  // density p(x,y) = 1
  // using Paul Bourke's formula 
  // http://paulbourke.net/geometry/polyarea/
  if (densityType == "constant") {
	  for (var j = 0; j < len; j++) {
      region = array[j][0] * 
		           array[(j+1) % len][1] - 
		           array[(j+1) % len][0] * 
		           array[j][1];

	    x += (array[j][0] + 
			        array[(j+1) % len][0]) * 
			        region;
	    y += (array[j][1] + 
			        array[(j+1) % len][1]) * 
			        region;

	    area += region;
	  }
    
	  return [x/3/area, y/3/area];
	}
	// density p(x,y) = x
	// using Paul Bourke's second moment formula
	// area is now like C_x above
	// C_x = (1/area)*integral of x^2 (in Paul's notes this is I_y)
	// C_y = (1/area)*integral of xy (this is I_xy)
  else if (densityType == "x") {
  	for (var j = 0; j < len; j++) {
      region = array[j][0] *
	             array[(j+1) % len][1] -
	             array[(j+1) % len][0] *
	             array[j][1];

      area += (array[j][0] +
		           array[(j+1) % len][0]) *
		           region;
		            
      x += (array[j][0] *
              array[j][0] +
              array[j][0] *
              array[(j+1) % len][0] +
              array[(j+1) % len][0] *
              array[(j+1) % len][0]) *
              region;
              
      y += (array[j][0] *
              array[(j+1) % len][1] +
              2 *
              (array[j][0] *
               array[j][1] +
               array[(j+1) % len][0] *
               array[(j+1) % len][1]) +
               array[(j+1) % len][0] *
               array[j][1]) *
              region;
      
    }
    return [x/2/area, y/4/area];
  }
  else if (densityType == "y") {
    var d;
    for (var j = 0; j < len; j++) {
      d = array[j][1];
      area += d;
      x += array[j][0]*d;
      y += array[j][1]*d;
    
    
    /*
      region = array[j][0] *
	             array[(j+1) % len][1] -
	             array[(j+1) % len][0] *
	             array[j][1];

      area += (array[j][1] +
		           array[(j+1) % len][1]) *
		           region;
		            
      y += (array[j][1] *
              array[j][1] +
              array[j][1] *
              array[(j+1) % len][1] +
              array[(j+1) % len][1] *
              array[(j+1) % len][1]) *
              region;
              
      x += (array[j][0] *
              array[(j+1) % len][1] +
              2 *
              (array[j][0] *
               array[j][1] +
               array[(j+1) % len][0] *
               array[(j+1) % len][1]) +
               array[(j+1) % len][0] *
               array[j][1]) *
              region;
      
    }
    return [x/4/area, y/2/area];*/
    }
    return [x/area, y/area];
    
  }
  else if (densityType == "sincos") {
    1;
  }
  else if (densityType == "jiggle") {
    var d;
  
    for (var j = 0; j < array.length; j++) {
    
      d = Math.abs(Math.sin(array[j][0])) + 1;
      area += d;
      x += array[j][0]*d;
      y += array[j][1]*d;
    }
    
    return [x/area, y/area];
  }
  else if (densityType == "flower") {
    var d1;
    var d2;
    
    for (var j = 0; j < array.length; j++) {
    
      d1 = Math.abs(50*Math.sin(Math.PI/width*2*array[j][0])) + 1;
      d2 = Math.abs(50*Math.sin(Math.PI/width*2*array[j][1])) + 1;
      area += d1*d2;
      x += array[j][0]*d1*d2;
      y += array[j][1]*d1*d2;
    } 
  
    return [x/area, y/area];
  }
}

// Method 2 - Integration
