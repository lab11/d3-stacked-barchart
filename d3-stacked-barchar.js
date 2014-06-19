(function() {

d3.stacked_bar_chart = function () {

  var y_axis_label = "Value";

  // Set values for now
  var margin_top = 30;
  var margin_left = 60;
  var margin_bottom = 100;
  var margin_right = 10;

/*
 * data:
 * {
 *   "data":   [
 *               {
 *                 unique_id: <unique id to identify this bar>
 *                 label:     <string to show on the x-axis>,
 *                 boxes:     [
 *                              <height of the box in the stack>
 *                            ]
 *               }
 *             ],
 *   "legend": [
 *               <text label to be shown in legend>
 *             ],
 *
 *   "colors": [
 *               <hex code>
 *             ]
 * }
 */

  function stacked_bar_chart (svg) {

    // Run 
    svg.each(function (d, i) {

      // Default config structure
      var config = {"start_index": 0   // which element of the boxes array to
                                       // put on bottom
                   };

      // Break the data block into its required components
      var data   = d.data;
      var legend = d.legend;
      var colors = d.colors;

      // Update the config options with what the client specified
      if ("config" in d) {
        for (k in d.config) {
          config[k] = d.config[k];
        }
      }

      // Calculate a total for each bar
      for (i=0; i<data.length; i++) {
        data[i].total = data[i].boxes.reduce(function (a, b) { return a+b;});
      }

      var outer_svg = d3.select(this);

      // Get parameters of the canvas
      var svg_width = outer_svg.attr("width");
      var svg_height = outer_svg.attr("height");

      // Set the width first.
      // This is fixed given the SVG canvas size
      var width = svg_width - margin_left - margin_right;

      // Setup all of the scales and axes
      var xScale = d3.scale.ordinal()
        .rangeRoundBands([3, width], .1)
        .domain(data.map(function (d) { return d.unique_id; }));

      // Now that we have the xscale, compute the bottom margin with room
      // for the images
      margin_bottom = 30 + xScale.rangeBand();

      // Now we can calculate the height
      var height = svg_height - margin_top - margin_bottom;

      // Now we can finish up the scales

      var yScale = d3.scale.linear()
        .rangeRound([height, 24])
        .domain([0, d3.max(data, function (d) { return d.total; } )]);

      var cScale = d3.scale.ordinal()
        .domain(legend)
        .range(colors);

      var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom");

      // Configure x axis to display labels instead of unique ids
      xAxis.tickFormat(function (d) { return label_mapping[d]; });

      var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");     

      // Create the element to put the actual plot in
      svg = outer_svg.selectAll(".main_chart")
        .data([0])

      svg.enter()
        .append("g")
          .attr("class", "main_chart")
          .attr("transform", "translate(" + margin_left + "," + margin_top + ")");


      // Calculate the coordinate bounds of each box in each column in the graph
      var boxes     = [];
      var label_mapping = {};
      data.forEach(function (bar) {
        var y0        = 0;
        for (i=0; i<bar.boxes.length; i++) {
          var box    = {};
          var index  = (i+config.start_index)%bar.boxes.length;
          var value  = bar.boxes[index];
          box.y0     = y0;
          box.y1     = y0 + value;
          box.height = value;
          box.x      = xScale(bar.unique_id);
          box.label  = legend[index];
          box.id     = bar.unique_id + ":" + index;
          y0         = box.y1;
          boxes.push(box);
        }
        label_mapping[bar.unique_id] = bar.label;
      });


      // Obey the config.start_index setting for the legend
      var legend_values = [];
      for (i=0; i<legend.length; i++) {
        var index = (i+config.start_index)%legend.length;
        legend_values.push({"label": legend[index], "index": index});
      }
      

      //////////////////////////////////////////////////////////////////////////////
      // Code for animations and actually drawing the graph
      //////////////////////////////////////////////////////////////////////////////

      /////////////////////// Legend
      
      // Create the legend based on the legend argument
      legend_rects = svg.selectAll(".legend-rect")
        .data(legend_values, function (d, i) { return d.index; });
      legend_text = svg.selectAll(".legend-text")
        .data(legend_values, function (d, i) { return d.index; });

      legend_rects.enter()
        .append("rect")
          .attr("class", "legend-rect")
          .attr("x", width - 18)
          .attr("y", function (d, i) {return (((legend.length - i - 1) * 20) + 24); })
          .attr("width", 18)
          .attr("height", 18)
          .attr("vertical-align", "top")
          .style("fill", function (d) { return cScale(d.label); });

      legend_text.enter()
        .append("text")
          .attr("class", "legend-text")
          .attr("x", width - 24)
          .attr("y", function(d, i) { return (((legend.length - i - 1) * 20) + 39); })
          .style("text-anchor", "end")
          .style("vertical-align", "middle")
          .style("font-size", 12)
          .text(function (d) { return d.label; });

      legend_rects.transition()
        .attr("x", width - 18)
        .attr("y", function (d, i) {return (((legend.length - i - 1) * 20) + 24); })
        .style("fill", function (d) { return cScale(d.label); })

      legend_text.transition()
        .attr("x", width - 24)
        .attr("y", function(d, i) { return (((legend.length - i - 1) * 20) + 39); })
        .text(function (d) { return d.label; });

      /////////////////////// Axes

      // Set up x axis labels positioning in svg
      xaxis_item = svg.selectAll('.x-axis')
        .data([0])

      xaxis_item.enter()
        .append("g")
          .attr("class", "x-axis")
          .attr("transform", "translate(0," + (height) + ")")
          .call(xAxis);

      // Set up y axis positioning and label
      yaxis_item = svg.selectAll('.y-axis')
        .data([0])

      yaxis_item.enter()
        .append("g")
          .attr("class", "y-axis")
          .call(yAxis)
          .append("text")
            .attr("y", 3)
            .attr("x", -24)
            .attr("transform", "rotate(-90)")
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(y_axis_label);

      // Animate the X axis if it changes
      svg.select(".x-axis")
        .transition()
          .duration(500)
          .call(xAxis);

      // Animate the Y axis if it changes
      svg.select(".y-axis")
        .transition()
          .duration(500)
          .call(yAxis);

      /////////////////////// Configure the individual boxes that make the stack

      // Bind each data element to the correct svg object to make each box in the
      // stack. If an svg object does not already exist that matches a new one will
      // be created.
      bar_boxes = svg.selectAll(".bar-box")
        .data(boxes, function (d, i) { return d.id });

      // Define a transition for once the boxes are already present but are
      // changing size or position
      bar_boxes.transition()
        .duration(750)
        .attr("x", function (d) { return d.x; })
        .attr("y", function (d) { return yScale(d.y1); })
        .attr("height", function (d) { return yScale(d.y0) - yScale(d.y1); })
        .attr("width", xScale.rangeBand())
        .style("fill-opacity", 1.0);

      // Setup a newly created box in the stack and animate to show it
      bar_boxes.enter()
        .append("rect")
          .attr("class", "bar-box")
          .attr("data-value", function (d) { return d.height; })
          .attr("x", function (d) { return d.x; })
          .attr("y", function (d) { return yScale(d.y1); })
          .attr("width", xScale.rangeBand())
          .attr("height", function (d) { return yScale(d.y0) - yScale(d.y1); })
          .style("fill", function (d) { return cScale(d.label); })
          .style("fill-opacity", 0.0)
        .transition()
          .duration(750)
          .style("fill-opacity", 1.0);

      // Show value of box on hover
      // TODO: remove the flickering effect when you mouseover the number itself
      bar_boxes.on("mouseover", function (d) {
          d3.select(this.parentNode).append("text")
            .text(d3.select(this).attr("data-value"))
            .attr("id", "box_value_text")
            .attr("x", d.x+(xScale.rangeBand()/2))
            .attr("y", yScale(d.y1-(d.height/2)))
            .style("text-anchor", "middle")
            .style("dominant-baseline", "central")
            .style("fill-opacity", 1);
        })
        .on("mouseout", function (d) {
          d3.select("#box_value_text").remove();
        });

      // If the box ever gets removed first make it invisible before removing it
      bar_boxes.exit()
       .transition()
        .duration(750)
        .style("fill-opacity", 0)
        .remove();


      /////////////////////// Stack/bar labels on top

      // Setup the labels on top of the bars. Also map each label to the correct bar
      bar_labels = svg.selectAll(".bar-label")
        .data(data, function (d, i) { return i });

      // Animate the bar labels that are already present
      bar_labels.transition()
        .duration(750)
        .attr("x", function (d, i) { return xScale(d.unique_id) + xScale.rangeBand()/2; })
        .attr("y", function (d, i) { return yScale(d.total) - 4; })
        .text(function (d, i) { return d.total; });

      // Animate and configure tha bar labels on first appearance
      bar_labels.enter()
        .append("text")
          .attr("class", "bar-label")
          .attr("text-anchor", "middle")
          .attr()
          .text(function (d) { return d.total; })
        .transition()
          .duration(750)
          .attr("x", function (d, i) { return xScale(d.unique_id) + xScale.rangeBand()/2; })
          .attr("y", function (d, i) { return yScale(d.total) - 4});

      // Make the labels disappear if the bar does
      bar_labels.exit()
        .transition()
          .duration(750)
          .style("opacity", 0)
          .remove();

      /////////////////////// Pictures below the X-axis for each column

      // Map the pics to an element
      bar_pics = svg.selectAll(".bar-pic")
        .data(data, function (d, i) { return i });

      bar_pics.transition()
        .duration(750)
        .attr("x", function (d, i) { return xScale(d.unique_id); })
        .attr("y", function (d, i) { return yScale(0) + 30; })
        .attr('width', xScale.rangeBand())  // Make the pic square
        .attr('height', xScale.rangeBand())
        .attr("xlink:href", function (d, i) { return "" + d.image + ""; });

      bar_pics.enter()
        .append("svg:image")
          .attr("class", "bar-pic")
          .attr("xlink:href", function(d){ return "" + d.image + "" })
          .attr('width', xScale.rangeBand())
          .attr('height', xScale.rangeBand())
        .transition()
          .duration(750)
          .attr("x", function(d){ return xScale(d.unique_id) })
          .attr("y", function(d){ return yScale(0) + 30});

      bar_pics.exit()
        .transition()
          .duration(750)
          .style("opacity", 0)
          .remove();


    });

  }

  stacked_bar_chart.y_axis_label = function(x) {
    if (!arguments.length) return y_axis_label;
    y_axis_label = x;
    return stacked_bar_chart;
  };

  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return stacked_bar_chart;

}

})();
