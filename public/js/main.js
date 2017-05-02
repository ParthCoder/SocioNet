jQuery(document).ready(function() {
	jQuery("abbr.timeago").timeago();
	$("#newstatus").keydown(function(e){
	    if (e.keyCode == 13) {
	        $('#postNewStatus').submit();
	    }
	}); 
});

// function to send login details
function submit_login(){
	$.post('/login',{username:document.getElementById('login_user').value,password:document.getElementById('login_pass').value},function(data,status){
		location.reload();
	});
}

// function to send search query
function searchQuery(inp){
	$.post("/search",{key:inp},function(data,status){
		// first empty last list
		var x = document.getElementById("search_result");
		while(x.firstChild)
			x.removeChild(x.firstChild);
		x.style.display = "block";
		var res = JSON.parse(data);
		for(var i=0;i<res.length;i++){
			var y = document.createElement("a");
			y.setAttribute("href","/users/"+res[i]);
			y.innerHTML = res[i];
			x.appendChild(y);
			if(i==4)  // showing maximum of 5 results
				break;
		}
	});
}

// function to send friend request
function send_request(from,to){
	$.post("/send_request",{from:from,to:to},function(data,status){
		location.reload();
	});
}

// function to get friend request response
function respond_request(from,to,ans){
	$.post("/respond_request",{from:from,to:to,ans:ans},function(data,status){
		if(ans === "Accept")
			location.reload();
		else
			window.location = "/";
	});
}

// function to mark the notification read
function mark_read(tim,outDir){
	$.post("/mark_read",{time:tim},function(data,status){
		window.location = outDir;
	});
}

//function to validate the username is message box
function check_user(){
	var usrEle = document.forms["msg_form"]["to"];
	var txtEle = document.forms["msg_form"]["msg"];
	var usr = document.forms["msg_form"]["to"].value;
	if(usr===myname){
		document.getElementById("msg_box_error").innerHTML = "*Please choose another user";
		return false;
	}
	$.post('/check_user',{username:usr},function(data,status){
		if(data.msg==="valid")
			return true;
		else{
			//alert("going here");
			document.getElementById("msg_box_error").innerHTML = "*Username not valid";
			return false;
		}
	});
}

// function to play alert sound on notification or message
function playSound(filename){   
	document.getElementById("sound").innerHTML='<audio autoplay="autoplay"><source src="/sound/' + filename + '.mp3" type="audio/mpeg" /><source src="/sound/' + filename + '.mp3" type="audio/mpeg" /><embed hidden="true" autostart="true" loop="false" src="/sound/' + filename +'.mp3" /></audio>';
}

// to hide dropdown when clicked somewhere else
$(document).click(function(){
	var x = document.getElementById("search_result");
	if(x)
		x.style.display = "none";
});


var hostname = window.location.hostname;
var socket = io.connect(hostname);

// socket on new status
socket.on('newStatus', function (res) { 
	//console.log(res.statusData);
	$.post("/check_friend",{check:res.statusData.username},function(data,status){
		if(data.ans === "yes"){
			var time = new Date(res.statusData.time).toISOString();
			var addStatus = '<div class="post"><div class="timestamp"><i><abbr class="timeago" title="'+time+
				'"></abbr></i></div><a class="colorize" href="/users/'+res.statusData.username+
				'"><div class="smallpic"><img class="smallpic_img" src="'+res.statusData.image+
				'"/></div>	<div class="smallname">@'+res.statusData.username+
				'</div></a><br><div class="statusbody">'+res.statusData.body+'</div></div><script>$("abbr.timeago").timeago();</script>';
    		$('#socket').prepend(addStatus);
		}
	});
});

// socket on new notification
socket.on('notification', function (res) { 
	if(res.notifData.to === myname && res.notifData.type === "req"){
		if(res.notifData.status === "not_read"){
			var addNotif = '<div class="notif"><a onClick="mark_read('+res.notifData.time+',\'/users/'+res.notifData.from+'\')"style="text-decoration:none;color:red;"><b>'+res.notifData.body+'</b></a></div><hr>';
		}
		else{
			var addNotif = '<div class="notif"><a style="text-decoration:none;color:black;">'+res.notifData.body+'</a></div><hr>';
		}
		$('#notification').prepend(addNotif);
		playSound("alert");
	}
	else if(res.notifData.from === myname && res.notifData.type === "res"){
		if(res.notifData.status === "not_read"){
			var addNotif = '<div class="notif"><a onClick="mark_read('+res.notifData.time+',\'/users/'+res.notifData.to+'\')"style="text-decoration:none;color:red;"><b>'+res.notifData.body+'</b></a></div><hr>';
		}
		else{
			var addNotif = '<div class="notif"><a style="text-decoration:none;color:black;">'+res.notifData.body+'</a></div><hr>';
		}
		$('#notification').prepend(addNotif);
		playSound("alert");
	}
});

// socket on new message
socket.on('new_message', function (res) { 
	//alert(res.msgData.to);
	if(res.msgData.to === myname){
		var addMsg = '<div class="notif"><a style="text-decoration:none;color:#4286f4"><b>@'+res.msgData.from+':</b></a><br><a style="text-decoration:none;color:black">'+res.msgData.body+'</a></div><hr>';
		$('#message').prepend(addMsg);
		playSound("alert");
	}
});