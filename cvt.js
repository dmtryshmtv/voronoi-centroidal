var pinned = 0,            // remembers whether we've already pushed to boundary
    border_type = "norm",  // method of computing borderz
    bound = [];            // a list of the indices of the boundary regions

// Button behavior
// BUTTON - Generate New Points
d3.select("#generate").on("click", function () { 
  pinned = 0;
	generate();
	draw();
});


// BUTTON - Take One Lloyd Algorithm Step
d3.select("#centroid_step").on("click", function () {
  if (border_type == "norm") {
    pinned = 0;
	  clipVoronoi();
	  lloyd();
  	draw();
	}
	else if (border_type == "push") {
	  pinned = 0;
	  clipVoronoi();
	  lloyd();
 	  push_to_boundary();
  	draw();
	}
  else {
    if (!pinned) {
      bound = push_to_boundary();
      pinned = 1;
    }
    lloyd();
  	draw();
  }
});


var animation,        // intervalic playing of Lloyd
    is_run = false;   // remembers whether animation is running or not


// BUTTON - Start/stop a sequence of Lloyd Algorithm iterations
d3.select("#centroid_anim").on("click", function () {		
	if (!is_run){
		is_run = true;
		animation = window.setInterval(function () { 
      if (border_type == "norm") {
        pinned = 0;
	      clipVoronoi();
	      lloyd();
      	draw();
	    }
	    else if (border_type == "push") {
	      pinned = 0;
 	      clipVoronoi();
	      lloyd();
     	  push_to_boundary();
      	draw();
	    }
      else {
        if (!pinned) {
          push_to_boundary();
          pinned = 1;
        }
        lloyd();
      	draw();
      }
	  },25);
	}
	else {
		is_run = false;
		clearInterval(animation);
  }
});


// BUTTON - Resets the canvas to the originally generated random points
d3.select("#reset").on("click",function () {
	for (var i = 0; i < voronoi.length; i++) {
		voronoiNew[i] = [];
		for (var j = 0; j < voronoi[i].length; j++) {
			voronoiNew[i][j] = voronoi[i][j].slice(0);
		}
	}
	
	for (var i = 0; i < vertices.length; i++) {
		verticesNew[i] = vertices[i].slice(0);
	}
	draw();
});


//
// Utility functions
//
function inBoundary(x,y) {
	if (x < 0 || y < 0 || y > height || x > width)
		return false;
	return true;
}


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
		result = new Node(x, y, "y");

	if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
		// Collision detected
		return result;
	}
	else {
		// No collision
		return false;
	}
}


// This structure keeps the nodes, it helps keep track of which points were added
// and where and whether they were an entry point or an exit point (for the CCW
// polygon)
function Node(x,y,intersection,entry,exit) {
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


function toNodes(array) {
	var nodeArray = [];
	for (var i=0; i < array.length; i++) {
    nodeArray.push(new Node(array[i][0], array[i][1], false, false,	false));
	}
	
	return nodeArray;
}


// computes euclidean distance
function distance(n0,n1) {
	return Math.sqrt((n0.x - n1.x) * (n0.x - n1.x) + 
      						 (n0.y - n1.y) * (n0.y - n1.y));
}


// Polygon clipping
function clipVoronoi () {
	var rectangle =  [[0,0],[0,height],[width,height],[width,0]];
	var j;
	
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
	var nodesPoly = toNodes(subject),
	    nodesRect = toNodes(clip),
  	  newPoly = [],
	    clipped = [],
      j;

	for (var i = 0; i < nodesPoly.length; i++)
	{
		// if the point is in boundary, keep it
		if (inBoundary(nodesPoly[i].x, nodesPoly[i].y)) {
			newPoly.push(nodesPoly[i]);
		
			// if the next point is out, then we're exiting
			if (!inBoundary(nodesPoly[(i+1) % nodesPoly.length].x, 
							nodesPoly[(i+1) % nodesPoly.length].y)) {
							
							
				// which of the four rectangle sides do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPoly[i], 
										   nodesPoly[(i+1) % nodesPoly.length],
										   nodesRect[j], 
										   nodesRect[(j+1) % nodesRect.length]);
					j++;
				}
				while (j < nodesRect.length && !result);
				
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
				newPoly.push(result);
			}
		}
		// otherwise, we are out of the boundary, so don't add the point
		else {
			// still, check if the next point is in; then we're entering
			if (inBoundary(nodesPoly[(i+1) % nodesPoly.length].x, 
						   nodesPoly[(i+1) % nodesPoly.length].y)) {
							
				// which rectangle side do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPoly[i], 
										   nodesPoly[(i+1) % nodesPoly.length],
										   nodesRect[j], 
										   nodesRect[(j+1) % nodesRect.length]);
					j++;
				}
				while (j < nodesRect.length && !result);
				
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
				newPoly.push(result);
			}
			// degenerate case - we're out of boundary and the next point is out of
			// boundary, but we might still intersect the corner bit without having 
			// an interior point
			else {
				var a = [], k = 0;
				
				// check if we intersect any rectangle sides
				for (var j = 0; j < nodesRect.length; j++) {
					result = doesIntersect(nodesPoly[i], 
										   nodesPoly[(i+1) % nodesPoly.length],
										   nodesRect[j], 
										   nodesRect[(j+1) % nodesRect.length]);
										   
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
					if (distance(nodesPoly[i],a[0]) < distance(nodesPoly[i],a[1])) {
						a[0].updateEntry();
						newPoly.push(a[0]);
						a[1].updateExit();
						newPoly.push(a[1]);
					}
					else {
						a[1].updateEntry();
						newPoly.push(a[1]);
						a[0].updateExit();
						newPoly.push(a[0]);
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
	// and newPoly contains all the fixed points without corners
	while (i < newPoly.length) {
	  // so if a point is an entry, we need to add corners before we enter
		if (newPoly[i].entry) {
			if (i - 1 < 0) {
				j = newPoly.length - 1;
			}
			else {
				j = i - 1;
			}
		
		  // since we're entering, the point before must've exited; did they come
		  // from the same side of the rectangle? if not, determine which and 
		  // determine, case by case, which corners are needed
			if (newPoly[i].intersection != newPoly[j].intersection) {
				if (newPoly[i].intersection == "top") {
					if (newPoly[j].intersection == "left") {
						clipped.push([0,height]);
						clipped.push([width,height]);
						clipped.push([width,0]);
					}
					else if (newPoly[j].intersection == "bottom") {
						clipped.push([width,height]);
						clipped.push([width,0]);
					}
					else if (newPoly[j].intersection == "right") {
						clipped.push([width,0]);
					}
				}
				else if (newPoly[i].intersection == "left") {
					if (newPoly[j].intersection == "top") {
						clipped.push([0,0]);
					}
					else if (newPoly[j].intersection == "bottom") {
						clipped.push([width,height]);
						clipped.push([width,0]);
						clipped.push([0,0]);
					}
					else if (newPoly[j].intersection == "right") {
						clipped.push([width,0]);
						clipped.push([0,0]);
					}
				}
				else if (newPoly[i].intersection == "bottom") {
					if (newPoly[j].intersection == "top") {
						clipped.push([0,0]);
						clipped.push([0,height]);
					}
					else if (newPoly[j].intersection == "left") {
						clipped.push([0,height]);
					}
					else if (newPoly[j].intersection == "right") {
						clipped.push([width,0]);
						clipped.push([0,0]);
						clipped.push([0,height]);
					}
				}
				else if (newPoly[i].intersection == "right") {
					if (newPoly[j].intersection == "top") {
						clipped.push([0,0]);
						clipped.push([0,height]);
						clipped.push([width,height]);
					}
					else if (newPoly[j].intersection == "left") {
						clipped.push([0,height]);
						clipped.push([width,height]);
					}
					else if (newPoly[j].intersection == "bottom") {
						clipped.push([width,height]);
					}
				}
			}
			
			clipped.push([newPoly[i].x,newPoly[i].y]);
		}
		// otherwise, the point is just an interior point or an exit point
		// so add it
		else {
			clipped.push([newPoly[i].x,newPoly[i].y])
		}
		i++;
	}
	
	return clipped;
}


// This function takes the regions that intersect the boundary and projects 
// their vertices to the boundary. If there is a corner involved, then the 
// point moves to the corner.
function push_to_boundary() {
  var rectangle = [[0,0],[0,height],[width,height],[width,0]],
      temp,
      j,
      bound = [];
	
	// loop through each region and move vertices of regions that intersect
	// the boundaries
	for (var i = 0; i < voronoiNew.length; i++) {
		j = 0;
		while (j < voronoiNew[i].length && inBoundary(voronoiNew[i][j][0],voronoiNew[i][j][1])) {
			j++;
		}
		if (j < voronoiNew[i].length && !inBoundary(voronoiNew[i][j][0],voronoiNew[i][j][1])) {
			verticesNew[i] = project_boundary(verticesNew[i][0],verticesNew[i][1],voronoiNew[i],rectangle);
			bound.push(i);
		}
	}
	
	return bound;
}


// takes a region and decides what borders does it intersect
// if the region intersects on the corner, the function returns that corner 
// point; otherwise, it projects to the closest boundary point
function project_boundary (x,y,subject,clip) {
	var nodesPoly = toNodes(subject),
	    nodesRect = toNodes(clip),
  	  newPoly = [],
      j;

	for (var i = 0; i < nodesPoly.length; i++)
	{
		// if the point is in boundary, keep it
		if (inBoundary(nodesPoly[i].x, nodesPoly[i].y)) {
			newPoly.push(nodesPoly[i]);
		
			// if the next point is out, then we're exiting
			if (!inBoundary(nodesPoly[(i+1) % nodesPoly.length].x, 
							nodesPoly[(i+1) % nodesPoly.length].y)) {
							
							
				// which of the four rectangle sides do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPoly[i], 
										   nodesPoly[(i+1) % nodesPoly.length],
										   nodesRect[j], 
										   nodesRect[(j+1) % nodesRect.length]);
					j++;
				}
				while (j < nodesRect.length && !result);
				
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
				newPoly.push(result);
			}
		}
		// otherwise, we are out of the boundary, so don't add the point
		else {
			// still, check if the next point is in; then we're entering
			if (inBoundary(nodesPoly[(i+1) % nodesPoly.length].x, 
						   nodesPoly[(i+1) % nodesPoly.length].y)) {
							
				// which rectangle side do we intersect?
				j = 0;
				do {
					result = doesIntersect(nodesPoly[i], 
										   nodesPoly[(i+1) % nodesPoly.length],
										   nodesRect[j], 
										   nodesRect[(j+1) % nodesRect.length]);
					j++;
				}
				while (j < nodesRect.length && !result);
				
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
				newPoly.push(result);
			}
			// degenerate case - we're out of boundary and the next point is out of
			// boundary, but we might still intersect the corner bit without having 
			// an interior point
			else {
				var a = [], k = 0;
				
				// check if we intersect any rectangle sides
				for (var j = 0; j < nodesRect.length; j++) {
					result = doesIntersect(nodesPoly[i], 
										   nodesPoly[(i+1) % nodesPoly.length],
										   nodesRect[j], 
										   nodesRect[(j+1) % nodesRect.length]);
										   
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
					if (distance(nodesPoly[i],a[0]) < distance(nodesPoly[i],a[1])) {
						a[0].updateEntry();
						newPoly.push(a[0]);
						a[1].updateExit();
						newPoly.push(a[1]);
					}
					else {
						a[1].updateEntry();
						newPoly.push(a[1]);
						a[0].updateExit();
						newPoly.push(a[0]);
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
	while (i < newPoly.length) {
	  // so if a point is an entry, we need to add corners before we enter
		if (newPoly[i].entry) {
			if (i - 1 < 0) {
				j = newPoly.length - 1;
			}
			else {
				j = i - 1;
			}
		
		  // bunch of cases to determine which side to push the vertex to
			if (newPoly[i].intersection == "top") {
				if (newPoly[j].intersection == "left") {
				  return [width,height];
				}
				else if (newPoly[j].intersection == "bottom") {
					return [width,0];
				}
				else if (newPoly[j].intersection == "right") {
					return [width,0];
				}
				else {
				  return [x,0];
				}
			}
			else if (newPoly[i].intersection == "left") {
				if (newPoly[j].intersection == "top") {
					return [0,0];
				}
				else if (newPoly[j].intersection == "bottom") {
          return [width,0];
				}
				else if (newPoly[j].intersection == "right") {
          return [width,0];
				}
				else {
				  return [0,y];
				}
			}
			else if (newPoly[i].intersection == "bottom") {
				if (newPoly[j].intersection == "top") {
					return [0,0];
				}
				else if (newPoly[j].intersection == "left") {
					return [0,height];
				}
				else if (newPoly[j].intersection == "right") {
					return [0,0];
				}
				else {
				  return [x,height];
				}
			}
			else if (newPoly[i].intersection == "right") {
				if (newPoly[j].intersection == "top") {
					return [0,height];
				}
				else if (newPoly[j].intersection == "left") {
					return [0,height];
				}
				else if (newPoly[j].intersection == "bottom") {
					return [width,height];
				}
				else {
				  return [width,y];
				}
			}
		}
		i++;
	}
}


//
// Lloyd's algorithm - http://en.wikipedia.org/wiki/Lloyd's_algorithm
function lloyd() {
  var c,
      r = 1,
	    motion = 0,
	    change,
	    flag;

  if (border_type == "pin") {
    for (var i = 0; i < verticesNew.length; i++) {
      flag = true;
      for (var j = 0; j < bound.length; j++) {
        if (bound[j] == i) {
          flag = false;
        }
      }
        
      if (flag) {
        c = centroid(voronoiNew[i]);
        change = Math.sqrt( (c[0] - verticesNew[i][0]) * 
				                  	(c[0] - verticesNew[i][0]) + 
					                  (c[1] - verticesNew[i][1]) * 
					                  (c[1] - verticesNew[i][1]) );
					                        
    		motion += change;
    	  if (change > .001) {
  			  verticesNew[i] = [c[0] * r + (1 - r) * verticesNew[i][0], 
  			                    c[1] * r + (1 - r) * verticesNew[i][1]];
    	  }
  	  }   
    }
  }
  else { 
	  for (var i = 0; i < voronoiNew.length; i++) {	 
      c = centroid(voronoiNew[i]);
      change = Math.sqrt( (c[0] - verticesNew[i][0]) * 
					              	(c[0] - verticesNew[i][0]) + 
						              (c[1] - verticesNew[i][1]) * 
						              (c[1] - verticesNew[i][1]) );
						                    
  		motion += change;
  	  if (change > .001) {
			  verticesNew[i] = [c[0] * r + (1 - r) * verticesNew[i][0], 
			                    c[1] * r + (1 - r) * verticesNew[i][1]];
  		}
    }
  }
	
	voronoiNew = d3.geom.voronoi(verticesNew);
	
	return motion;
}


// Centroid
// Method 1 - Centroid of a polygon, formula
function centroid (array) {
	var sum_x = 0,
	    sum_y = 0,
	    sum_area = 0;

	for (var j = 0; j < array.length; j++) {
		region = array[j][0] * 
				     array[(j+1) % array.length][1] - 
				     array[(j+1) % array.length][0] * 
				     array[j][1];

		sum_x += (array[j][0] + 
				      array[(j+1) % array.length][0]) * 
				      region;
		sum_y += (array[j][1] + 
				      array[(j+1) % array.length][1]) * 
				      region;
		sum_area += region;
	}

	return [sum_x/(3*sum_area), sum_y/(3*sum_area)];
}

// Method 2 - Integration
