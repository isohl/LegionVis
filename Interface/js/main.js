
var histview, mainview, graphview;


function Concurrency(data){
    this.rawData = data;
    this.parsedData = {};
    this.maxStacks = {};
    this.rawData.sort(function(a,b){return a.start - b.start;});
    // Initial Parse
    var started = [];
    for(var i = 0; i < this.rawData.length; ++i){
        var cur = this.rawData[i];
        cur.duration = Math.round(cur.stop - cur.start);
        var proc = cur.proc_id;
        if(this.maxStacks[proc] == undefined) this.maxStacks[proc] = 1;
        var count = 1;
        for(var j = 0; j < started.length; ++j){
            if(started[j].stop < cur.start){
                started.splice(j--,1);
            }
            else if(started[j].proc_id == proc) count++;
        }
        cur.stack = count;
        this.maxStacks[proc] = Math.max(this.maxStacks[proc],count);
        this.parsedData[cur.task_id] = started.slice(0);
        started = started.slice(0);
        started.push(cur);
    }


    this.atTime = function(t){
        var high = this.rawData.length - 1;
        var low = 0;
        while(high - low > 1){
            var mid = Math.floor((high + low) / 2);
            if(this.rawData[mid].start < t) low = mid;
            else high = mid;
        }
        var closest = this.rawData[high];
        var i = high;
        if(t - this.rawData[low].start <= this.rawData[high].start - t){
            closest = this.rawData[low];
            i = low;
        }
        if(closest.start > t){
            if(i == 0) return [];
            closest = this.rawData[--i];
        }
        if(closest.start > t || closest.stop < t) closest = this.broadSearch(t);
        if(closest == null) return [];
        var concurrent = this.parsedData[closest.task_id];
        var output = [closest];
        for(var j = 0; j < concurrent.length; ++j){
            if(concurrent[j].start <= t && concurrent[j].stop >= t) output.push(concurrent[j])
        }
        return output;
    };

    this.broadSearch = function(t){
        for(var i = 0; i < this.rawData.length; ++i){
            if(this.rawData[i].start <= t && this.rawData[i].stop >= t) return this.rawData[i];
        }
        return null;
    };
    return this;
}

/**
 * Loads data, prepares and populates all D3 components. Only run once
 */
function Init(){
    d3.json("tasks.json",function(data){ // Load all task information from the server
        timedata = data[0]; // An array of task objects
        names = data[1]; // A map of function IDs to task names
        var concurrent = new Concurrency(timedata);
        var w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            x = w.innerWidth || e.clientWidth || g.clientWidth,
            y = (w.innerHeight|| e.clientHeight|| g.clientHeight) - 50;
        var mainheight = 0.6 * y;
        var mainwidth = 0.7 * x;
        mainview = new MainView(timedata, names, concurrent,mainwidth,mainheight);
        mainview.update();

        var summaryheight = 0.2 * y;
        var summarywidth = 0.7 * x;
        summaryview = new SummaryView(timedata,names, concurrent,summarywidth,summaryheight);
        histview = new HistogramView(timedata);
        d3.select("#histcount").on("change",function(){
            histview.update("Count");
        });
        d3.select("#histtime").on("change",function(){
            histview.update("Time");
        });
        d3.select("#histcursor").on("change",function(){
            histview.histCursorSelect = true;
        });

        histview.update("Count"); // Set up the histogram

        //Prepare the Graph view
        graphview = GraphView(timedata,0.7*x,0.8*y);

    });
}

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

function switchViews(viewname){
    var time = d3.select("#timelinecontainer");
    var summ = d3.select("#summarycontainer");
    var grap = d3.select("#graphcontainer");
    time.style("display","none");
    summ.style("display","none");
    grap.style("display","none");
    if(viewname == "timeline"){
        time.style("display","block");
        summ.style("display","block");
    }
    if(viewname == "graph"){
        grap.style("display","block");
    }
}

Init(); // Set up the page
