
var svg, xAxis, taskcontainer, zoom, width, height;

function scanData(data){
    data.sort(function(a,b){return a.start - b.start;});
    var ends = {};
    var procs = [];
    var maxes = {};
    for(var i = 0; i < data.length; ++i){
        var proc = data[i].proc_id;
        if(ends[proc] == undefined){
            ends[proc] = [];
            procs.push(proc);
            maxes[proc] = 0;
        }
        var maxval = 0;
        for(var j = 0; j < ends[proc].length; ++j){
            if(ends[proc][j].stop < data[i].start){
                ends[proc].splice(j--,1);
                continue;
            }
            maxval = Math.max(maxval,ends[proc][j].stack);
        }
        data[i].stack = ++maxval;
        maxes[proc] = Math.max(maxes[proc],maxval);
        ends[proc].push({"stop":data[i].stop,"stack":maxval});
    }
    procs.sort();
    var output = [];
    for(var i = 0; i < procs.length; ++i){
        output.push(maxes[procs]);
    }
    return maxes;
};


function Init(){
    d3.json("tasks.json",function(timedata){
        var maxStacks = scanData(timedata);
        var margin = {top: 20, right: 20, bottom: 30, left: 120};
        width = 1200 - margin.left - margin.right;
        height = 800 - margin.top - margin.bottom;

        var x = d3.scale.linear().domain([0,d3.max(timedata,function(d){return d.stop;})]).range([0,width]);
        var y0 = d3.scale.ordinal().rangeRoundBands([0,height],0.1);
        //var y1 = d3.scale.ordinal();

        zoom = d3.behavior.zoom()
            .scaleExtent([1,10])
            .x(x)
            .on("zoom", zoomed);

        svg = d3.select("#timeline")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")").call(zoom);

        svg.append("rect")
            .attr("width",width)
            .attr("height",height)
            .style("fill","none")
            .style("pointer-events","all");

        var funcs = d3.set(timedata.map(function(d){return d.func_id;})).values();
        var stacks = d3.set(timedata.map(function(d){return d.stack;})).values();
        var procs = d3.set(timedata.map(function(d){return d.proc_id;})).values();

        var color = d3.scale.ordinal().domain(funcs)
            .range(['#a6cee3','#b2df8a','#fb9a99','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928']);

        xAxis = d3.svg.axis().scale(x).orient("bottom");

        y0.domain(timedata.map(function(d){return d.proc_id;}));
        y1s = {};
        for(var i = 0; i < procs.length; ++i){
            y1s[procs[i]] = d3.scale.ordinal();
            y1s[procs[i]].domain(stacks.slice(0,maxStacks[procs[i]])).rangeRoundBands([y0.rangeBand(),0]);
        }
        //y1.domain(maxStacks).rangeRoundBands([y0.rangeBand(),0]);

        svg.append("g")
            .attr("class","x axis")
            .attr("transform","translate(0,"+height+")")
            .call(xAxis);


        taskcontainer = svg.append("g");

        var clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("id", "clip-rect")
            .attr("x", "0")
            .attr("y", "0")
            .attr("width", width)
            .attr("height", height);

        var tasks = taskcontainer.selectAll(".task")
            .data(procs)
            .enter().append("g")
            .attr("class","g")
            .attr("transform",function(d){return "translate(0,"+y0(d)+")";});




        tasks.append("rect")
            .attr("class","processor")
            .attr("x",-1)
            .attr("y",-1)
            .attr("width",width+2)
            .attr("height",y0.rangeBand()+2);


        tasks.append("text")
            .attr("class","proc-label")
            .style("text-anchor", "end")
            .attr("x",-10)
            .attr("y",y0.rangeBand()/2)
            .text(function(d){return "Processor #"+ d;});

        var clipg = tasks.append("g")
            .attr("clip-path","url(#clip)");

        var subtasks = clipg.append("g").attr("class","subtasks");

        /*D3 tip code from http://bl.ocks.org/Caged/6476579 .
         Feel free to fiddle with this.*/
        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>Func_ID:</strong> <span style='color:red'>" + d.func_id + "</span>";
            });
        svg.call(tip);



        subtasks.selectAll(".task")
            .data(function(d){return timedata.filter(function(e){return d== e.proc_id;})})
            .enter().append("rect").attr("class","task")
            .attr("height",function(d){return y1s[d.proc_id].rangeBand();})
            .attr("y",function(d){return y1s[d.proc_id](d.stack);})
            .attr("x",function(d){return x(d.start);})
            .attr("width",function(d){return x(d.stop) - x(d.start);})
            .style("fill",function(d){return color(d.func_id);})
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

        var svglegend = d3.select("#legend")
            .attr("width",150)
            .attr("height",20*funcs.length+30);

        svglegend.append("text").attr("y",20).attr("x",50).text("Function ID");

        var legend = svglegend.selectAll(".legend")
            .data(funcs.slice().reverse())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { return "translate(50," + ((i+1) * 20 + 10) + ")"; });

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", color);

        legend.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(function(d) { return d; });



    });
}


function zoomed() {
    xmov = Math.max(Math.min(d3.event.translate[0],0),-width*d3.event.scale + width);
    zoom.translate([xmov,0]);
    svg.select(".x.axis").call(xAxis);
    taskcontainer.selectAll(".subtasks").attr("transform", "translate(" + xmov + ",0)scale(" + d3.event.scale + ",1)");
}


Init();
