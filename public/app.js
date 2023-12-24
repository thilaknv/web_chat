// const socket = io('ws://localhost:3500');
const socket = io('https://web-chat-app-socket-io.vercel.app/');

const msgInput = document.querySelector("#msgInput");
const username = document.querySelector("#username");
const chatRoom = document.querySelector("#chatRoom");
const activity = document.querySelector(".activity");
const userList = document.querySelector(".user-list");
const roomList = document.querySelector(".room-list");
const chatDisplay = document.querySelector(".chat-display");

let activity_status = true;

const sendMessage = (e) => {
    e.preventDefault();
    if (msgInput.value) {
        socket.emit('message', {
            name: username.value,
            text: msgInput.value
        });
        msgInput.value = "";
    }
    msgInput.focus();
}
const enterRoom = e => {
    e.preventDefault();
    if (username.value && chatRoom.value) {
        socket.emit('enterRoom', {
            name: username.value,
            room: chatRoom.value
        });
    }
}

function activityfunc(name, count) {
    activity_status = false;
    if (count > 2) {
        activity.textContent = '';
        activity_status = true;
        return;
    }
    let str = '';
    if (count > 0) str += '.';
    if (count > 1) str += '.';
    activity.textContent = `${name} is typing.${str}`;
    setTimeout(() => {
        activityfunc(name, count + 1);
    }, 1500);
}

document.querySelector('.join-form').addEventListener('submit', enterRoom);

document.querySelector('.msg-form').addEventListener('submit', sendMessage);

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', username.value);
});


//listen for message
socket.on('message', ({ name, text, time }) => {
    const li = document.createElement('li');

    // li.textContent = `${name}: ${text}`;
    li.className = "post";

    if (name === username.value) li.className = "post post--right";
    else if (name != 'Admin') li.className = "post post--left";
    if (name != 'Admin') {
        li.innerHTML = `<div class="post__header ${name === username.value
            ? 'post__header--user'
            : 'post__header--reply'
            }">
        <span class="post__header--name">${name === username.value ? 'You' : name}</span>
        <span class="post__header--time">${time}</span>
        </div>
        <div class="post__text">${text}</div>
        `
    } else {
        li.innerHTML = `<div class="post__text post__admin">${text}</div>`
    }

    document.querySelector('.chat-display').appendChild(li);

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

//listen for activity
socket.on('activity', (name) => activity_status && activityfunc(name, 0));

socket.on('userList', ({ users }) => showUsers(users));

socket.on('roomList', ({ rooms }) => showRooms(rooms));


function showUsers(users) {
    userList.textContent = '';
    if (users) {
        userList.innerHTML = `<em>Users in ${chatRoom.value}: </em>`;
        users.forEach((user, i) => {
            userList.textContent += ` ${user.name}`;
            if (users.length > 1 && i !== users.length - 1) {
                userList.textContent += ',';
            }
        });
    }
}

function showRooms(rooms) {
    roomList.textContent = '';
    if (rooms) {
        roomList.innerHTML = `<em>Active Rooms:</em>`;
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`;
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomList.textContent += ',';
            }
        });
    }
}
