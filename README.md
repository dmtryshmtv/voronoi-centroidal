D3:
www.d3js.org

Voronoi Example:
http://mbostock.github.com/d3/ex/voronoi.html

Updating on the example above, this library uses d3 to animate and draw successive 
iterations of Lloyd's algorithm. This produces a nice visualization of a random
Voronoi tesselation becoming a centroidal Voronoi tessalation.

Features:
-Vary number of regions
-Lloyd's method iteration animation
-3 boundary region behaviors - repel (normal), attract (push), and hold fixed (pin).
-Delaunay triangulation (d3 handles this now)
-Non-constant density (using various methods for integral approximation)

Future:
-Mouse selecting points to hold fixed
-Mouse splitting of regions into more voronoi regions
