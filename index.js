const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require("path");
var fs = require("fs");

var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();

let rooms = JSON.parse(fs.readFileSync("./rooms.json", "utf-8"));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render(__dirname + "/index.ejs", { rooms: rooms });
});

app.get("/room1", (req, res) => {
  let messages = JSON.parse(fs.readFileSync("./messages.json", "utf-8"));
  res.render(__dirname + "/room.ejs", { room: "room1", color: null, messages });
});

app.get("/room2", (req, res) => {
  let messages = JSON.parse(fs.readFileSync("./messages.json", "utf-8"));
  res.render(__dirname + "/room.ejs", { room: "room2", color: null, messages });
  //res.render(__dirname + "/room.ejs", { room: "room2" });
});

app.post("/newroom", jsonParser, (req, res) => {
  const room = req.body.room;
  app.get("/" + room, (req, res) => {
    res.render(__dirname + "/room.ejs", { room: room });
  });
  if (!rooms.includes(req.body.room)) {
    rooms.push(room);
    if (req.body.save) {
      let rooms = JSON.parse(fs.readFileSync("./rooms.json", "utf-8"));
      const newRooms = rooms.concat([req.body.room]);
      fs.writeFileSync("./rooms.json", JSON.stringify(newRooms));
    }
    res.send({
      room: room,
    });
  } else {
    res.send({
      error: "room already exist",
    });
  }
});

io.on("connection", (socket) => {
  socket.emit("server message", { server: "messages for me?!" });
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});

const admin = io.of("/admin");

admin.on("connection", (socket) => {
  socket.on("join", (data) => {
    socket.join(data.room);
    admin
      .in(data.room)
      .emit("chat message", `New user joined ${data.room} room!`);
  });

  socket.on("chat message", (data) => {
    if (data.room === "room1") {
      let messages = JSON.parse(fs.readFileSync("./messages.json", "utf-8"));
      const newMessages = messages.concat([
        {
          text: data.msg,
        },
      ]);
      fs.writeFileSync("./messages.json", JSON.stringify(newMessages));
    }
    admin.in(data.room).emit("chat message", data.msg);
  });

  socket.on("disconnect", () => {
    admin.emit("chat message", "user disconnected");
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
