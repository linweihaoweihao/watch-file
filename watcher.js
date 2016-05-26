#! /usr/local/bin/node
//created by wudan
// Modify by WH
// watch xx/ wh@127.0.0.1:xx/  ~/.ssh/id_rsa
process.umask(0);
'use strict';

var fs 		= require('fs');
var exec 	= require('child_process').exec;
var P  		= require('bluebird');
var describe = require('object-describe');
var assert	= require('assert');
var Path 	= require('path');
// 忽略文件夹 上传
var ignoreDir = ['git','config','APIExamples','log','.idea']

function qoute(s) {
	return "'" + s + "'";
}

function object_assign(tar, src) {
	for (var key in src) {
		tar[key] = src[key];
	}
	return tar;
}

function totalCheck(){
	//TODO: Iterate over entire directory, upload any file
	//which the time period between current and last modified exceeds specific interval.
}

function insertPK(path) {
	if (path) {
		return ['-i', path].join(' ');
	}
	return '';
}

var scp = {
	init: function(cnf){
		describe(cnf, {
			username: 'string',
			host: 'string',
			'privateKey?':'string'
		});
		object_assign(this, cnf);
	},
	upload: function(srcPath, destPath, cb){
		var cmd = ['scp', (insertPK(this.privateKey)) ,'-r', srcPath, [this.username, '@', this.host, ':', destPath].join('')].join(' ');
		console.log(cmd);
		exec(cmd, function(err, stdout, stderr) {
			if (cb) {
				cb(err, stdout, stderr);
			} else {
				if (err) throw new Error(err);
			}
		});
	},
	remove: function(path, cb){
		var cmd = ['ssh',(insertPK(this.privateKey)), [this.username, '@', this.host].join(''), qoute(['rm', path].join(' '))].join(' ');
		console.log(cmd);
		exec(cmd, function(err, stdout, stderr){
			if (cb) {
				cb(err, stdout, stderr);
			} else {
				if (err) throw new Error(err);
			}
		});
	}
}

/*
	rename:
		create
		delete
	change:
		modify
*/
function watch(path, remotePath, fm, cb) {
	fs.watch(path, {recursive: true}, function(event, filename) {
		if (!filename) {
			// fallback logic, filename could be absence.
			totalCheck();
		} else {
			if (ignore(filename)) return;
			var origin_path = Path.join(path, filename);
			var remote_path = Path.join(remotePath, filename);
			if (event === 'rename') {
				//check whether there is a file been created or removed.
				fileExist(origin_path, function(exist) {
					if (exist) {
						console.log('upload new file:', origin_path);
						fm.upload(origin_path, remote_path, cb);
					}
					else {
						console.log('remove file:', origin_path);
						fm.remove(remote_path, cb);
					}
				});
			}
			else if (event === 'change') {
				// file been modified.
				console.log('upload file:', origin_path);
				fm.upload(origin_path, remote_path, cb);
			}
		}
	});
}

function fileExist(path, cb) {
	fs.stat(path, function(err, stat) {
		cb(!err);
	});
}

function ignore(filename) {
	var dir = filename.split('/')[0]
		, isExit = false
	ignoreDir.forEach(function(idir){
		 if(idir == dir){
			 isExit = true
		 }
	})
	if (filename.indexOf('.git') !== -1 || isExit) return true;
	return false;
}

var args = Array.prototype.slice.call(process.argv, 2);
if (args.length < 2) {
	console.log("Usage: watch <watched file> <remote file> [privatekey]");
	process.exit(1);
}

var watched_path 	= args[0];
var remote 			= args[1];
var privateKey 		= args[2];



if (!watched_path || !remote) {
	console.log("Invalid watch directory or remote");
	process.exit(1);
}

var username 			= null;
var host				= null;
var remote_base_path	= null;
//parse
var comp = remote.split('@');
assert(comp.length === 2);
username = comp[0];

var comp2 = comp[1].split(':');
assert(comp2.length == 2);
host = comp2[0];
remote_base_path = comp2[1];



var fileManager = Object.create(scp);
fileManager.init({
	username: username,
	host: host,
	privateKey: privateKey
});

console.log("Watching:", watched_path);
console.log("Sync to:", remote);

watch(watched_path, remote_base_path, fileManager, function(err, stdout, stderr) {
	if (err) {
		console.error(err);
	} else {
		console.log('ok', stdout, stderr)
	}
});
