#!/usr/bin/env node

var args        = require('optimist').argv,
    forever     = require('forever-monitor'),
    request     = require('request'),
    script      = args._ && args._[0],
    port        = args.p || 8092,
    hcInterval  = (args.i && args.i*1000) || 30000,
    hcTimeout   = (args.t && args.t*1000) || 10000,
    timer;

console.log('Forever args: ', args);

var child = new (forever.Monitor)(script, {
    silent: false,
    args: ['-d', '-p '+port],
    minUptime: 5000, // Minimum time a child process has to be up. Forever will 'exit' otherwise.
    spinSleepTime: 3000 // Interval between restarts if a child is spinning (i.e. alive < minUptime).
});

child.on('start', function () {
    console.log('Forever started the script '+script+'...');
    isAlive();
});

child.on('exit', function () {
    console.log(script + ' has exited .');
    clearInterval(timer);
});

child.on('watch:restart', function(info) {
    console.error('Restarting script '+script+' because ' + info.file + ' changed');
});

child.on('restart', function() {
    console.error('Forever restarted script ' + script); // for ' + child.times + ' time');
    clearInterval(timer);
    isAlive();
});

child.on('exit:code', function(code) {
    console.error('Forever detected script '+script+' exited with code ' + code);
    clearInterval(timer);
});

child.on('message', function(info) {
    console.log('Received a message from child: ', info);
});


child.start();


var isAlive = function(){

    timer = setInterval(function(){

        console.log('Check if process is alive...');

        request({
                url: 'http://0.0.0.0:'+port+'/ping/',
                timeout: hcTimeout
            },
            function (error, response, body) {
                if (error || response.statusCode != 200 || body!='pong') {
                    console.log('No pong, restarting process...');
                    child.restart();
                } else {
                    console.log('Got pong.');
                }
            }
        );

    }, hcInterval);
};
