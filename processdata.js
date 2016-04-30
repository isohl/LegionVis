/**
 * Created by Phil on 4/28/2016.
 */

(function(){
    var prefix = '\\[([0-9]+) - ([0-9a-f]+)] \\{\\w+}\\{legion_prof}: ';

    var processor_kinds = {
        1: 'GPU',
        2: 'CPU',
        3: 'Utility',
        4: 'I/O'
    };

    var procPretty = function(proc){
        var h = Number(proc).toString(16);
        var node = String(parseInt(h.slice(3,7),16));
        proc = String(parseInt(h.slice(7,-1),16));
        return "Node: " + node + " Processor: " + proc;
    };

    var analyze = function(data){
        var tasks = [];
        var taskmap = {};
        var tidnames = {};
        var names = {};
        var tid2vid = {};
        var procs = {};
        var lines = data.split("\n");
        lines.forEach(function(line){
            var full_regex = new RegExp(prefix + 'Prof Task Info ([0-9]+) ([0-9]+) ([a-f0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+)( ([0-9]+))?');
            var info = full_regex.exec(line);
            if(info != null){
                var task = {
                    "task_id":Number(info[3]),
                    "func_id":Number(info[4]),
                    "proc_id":String(parseInt(info[5],16)),
                    "create":Number(info[6])/1000,
                    "ready":Number(info[7])/1000,
                    "start":Number(info[8])/1000,
                    "stop":Number(info[9])/1000,
                    "spawn":info[10]!= null ? Number(info[10]) : null
                };
                taskmap[task["task_id"]] = task;
                tasks.push(task);
            }
            full_regex = new RegExp(prefix + "Prof Task Kind ([0-9]+) ([a-zA-Z0-9_<>.]+)");
            info = full_regex.exec(line);
            if(info != null){
                tidnames[Number(info[3])] = info[4];
            }
            full_regex = new RegExp(prefix + "Prof Task Variant ([0-9]+) ([0-9]+) ([a-zA-Z0-9_<>.]+)");
            info = full_regex.exec(line);
            if(info != null){
                tidnames[Number(info[3])] = info[4];
            }
            full_regex = new RegExp(prefix + "Prof Proc Desc ([a-f0-9]+) ([0-9]+)");
            info = full_regex.exec(line);
            if(info != null) {
                var kind = Number(info[4]);
                procs[String(parseInt(info[3],16))] = processor_kinds[kind];
            }
        });
        tidnames.forEach(function(n) {
            names[tid2vid[n]] = tidnames[n];
        });
        var proclist = [];
        procs.forEach(function(proc){
            proclist.push({
                'num':Number(proc),
                'id':procPretty(proc),
                'name':procs[proc]
            });
        });
        proclist.sort(function(a,b){
           return a['num'] - b['num'];
        });
        tasks.forEach(function(task){
            task["proc_kind"] = procs[task["proc_id"]];
            task["proc_id"] = procPretty(task["proc_id"])
        });
        return {
            "tasks":tasks,
            "names":names,
            "proclist":proclist
        };
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){
        module.exports = analyze;
    }
    else{
        window.analyze = analyze;
    }
})();
