import {Router} from "express";
import authRoues from "./authRoutes";
import adminRoutes from "./adminRoutes";

const router= Router();

router.use("/auth",authRoues);
router.use("/admin",adminRoutes);

export default router;
