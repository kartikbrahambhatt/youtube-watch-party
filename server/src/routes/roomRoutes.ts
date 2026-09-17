import { Router } from "express";
import { createRoom, getRoomState } from "../services/roomService";

const router = Router();

router.post("/create", (req, res) => {
  const { userId, username, socketId } = req.body;

  if (!userId || !username || !socketId) {
    return res.status(400).json({
      message: "userId, username and socketId are required",
    });
  }

  const room = createRoom(
    userId,
    username,
    socketId
  );

  return res.status(201).json({
    message: "Room created successfully",
    room: getRoomState(room.roomId),
  });
});

router.get("/:roomId", (req, res) => {
  const room = getRoomState(req.params.roomId);

  if (!room) {
    return res.status(404).json({
      message: "Room not found",
    });
  }

  return res.json({
    room,
  });
});

export default router;