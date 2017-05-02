# SocioNet
Social Networking website with real-time global feed, instant messaging, friend request-respond system.

Implemented using Node.js, mongodb as database, socket.io for real-time notifications.

Requires - Mongodb, node.js installed.

Installing :-
1. Start Mongodb (by $ mongod command in parallel terminal/bash)
2. $ npm install

To run application :-
1. $ node server.js
2. Open localhost:3000 to access application.

> As of now, only 2 pages are availabe -> homepage and profile page.
> On the top, search bar is provided which matches the query and gives matched usernames list. 
  Also send message button given. Used to send message to any valid user on the database. 
> On the right, sidebar is provided which gives real-time notifications(of friend-request or friend-request response) 
  and new messages sent to user.
> Global feed on homepage shows status of logged in user and his/her friends.
> To send a friend request, search for the user in search bar and click on user. Click on send friend request
> As new notification comes, alert sound is triggered and new notifications comes on the sidebar. Click on it to respond to friend request.
> Profile page shows options to upload profile pic and update bio information. Profile pic stored in public/data folder.

Many more features can be added to this basic system.
