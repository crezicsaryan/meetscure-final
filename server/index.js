const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

let waitingUsers = [];
let partners = new Map();

io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    // 1. MATCHING SYSTEM
    socket.on("find-stranger", () => {
        if (partners.has(socket.id)) return;

        // CLEANUP: Filter out disconnected users
        waitingUsers = waitingUsers.filter(id => {
            const isConnected = io.sockets.sockets.get(id);
            const isNotMe = id !== socket.id;
            return isConnected && isNotMe;
        });

        if (waitingUsers.length > 0) {
            const partnerId = waitingUsers.shift();

            partners.set(socket.id, partnerId);
            partners.set(partnerId, socket.id);

            socket.emit("stranger-found", { id: partnerId, initiator: true });
            io.to(partnerId).emit("stranger-found", { id: socket.id, initiator: false });

            console.log(`🤝 Match: ${socket.id} <--> ${partnerId}`);
        } else {
            waitingUsers.push(socket.id);
            socket.emit("waiting");
            console.log(`⏳ User ${socket.id} added to queue.`);
        }
    });

    // 2. SIGNALING (WebRTC Handshake)
    socket.on("signal", (data) => {
        if (!data?.to) return;
        io.to(data.to).emit("signal", { from: socket.id, signal: data.signal || data });
    });

    // 3. CHAT MESSAGES
    socket.on("send-message", (msg) => {
        const partner = partners.get(socket.id);
        if (partner) {
            io.to(partner).emit("receive-message", { sender: "stranger", text: msg });
        }
    });

    // 4. SKIP PARTNER
    socket.on("skip", () => {
        const partner = partners.get(socket.id);
        if (partner) {
            io.to(partner).emit("partner-left");
            partners.delete(partner);
            partners.delete(socket.id);
        }
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
        waitingUsers.push(socket.id);
        socket.emit("waiting");
    });

    // 5. DISCONNECT
    socket.on("disconnect", () => {
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
        const partner = partners.get(socket.id);
        if (partner) {
            io.to(partner).emit("partner-left");
            partners.delete(partner);
            partners.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));