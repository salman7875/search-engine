import express from "express";
import { retrieveController } from "./retrieve.controllers.js";

const router = express.Router();

router.get("/fetch", retrieveController.getAllDocs);
router.get("/", retrieveController.fetchDocs);

export default router;
