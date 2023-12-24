import express from "express";
import { Server } from "socket.io";

const port = process.env.PORT || 3500
// const port = 3500;
const ADMIN = "Admin";

const app = express();
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"));


app.get('/', (req, res) => {
    res.send('index.html');
})

const expressServer = app.listen(port, () => {
    console.log(`listening on port : ${port}`);
});

//state
const UserState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray;
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false :
            ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
});

io.on('connection', socket => {
    // upon connection - only to user
    socket.emit('message', buildMsg(ADMIN, 'Welcome to Chat app'));

    // enterRoom
    socket.on('enterRoom', ({ name, room }) => {
        // leave previous room
        const prevRoom = getUser(socket.id)?.room;
        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
        }

        const user = activateUser(socket.id, name, room);

        // cannot update previous room users list until after the state update in activate user
        if (prevRoom) {
            io.to(prevRoom).emit('userList', { users: getUsersInRoom(prevRoom) });
        }

        // join room
        socket.join(user.room);

        // to user who joined
        socket.emit('message', buildMsg(ADMIN, `You have joined the room ${user.room}`))

        // to everone else
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`))

        //update user list for room
        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });

        // update roomList
        io.emit('roomList', { rooms: getAllActiveRooms() });
    })

    // when user disconnects
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
            io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });
            io.emit('roomList', { rooms: getAllActiveRooms() });
        }
    });

    // listen to message
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
        }
    });

    // activity
    socket.on('activity', name => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    })


});

function buildMsg(name, text) {
    return {
        name, text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

function activateUser(id, name, room) {
    const user = { id, name, room };
    UserState.setUsers([
        ...UserState.users.filter(user => user.id != id), user
    ]);
    return user;
}

function userLeavesApp(id) {
    UserState.setUsers([
        ...UserState.users.filter(user => user.id != id)
    ]);
}

function getUser(id) {
    return UserState.users.find(user => user.id === id);
}

function getUsersInRoom(room) {
    return UserState.users.filter(user => user.room === room);
}

function getAllActiveRooms() {
    return Array.from(new Set(UserState.users.map(user => user.room)));
}
