import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  getCourseLearn,
  updateLectureLearn,
  markAsCompleted,
  markAsInCompleted,
} from "../controllers/courseLearn.controller.js";

const router = express.Router();

router
  .route("/course-learn/:courseId")
  .get(isAuthenticated, getCourseLearn);

router
  .route("/course-learn/:courseId/lecture/:lectureId")
  .put(isAuthenticated, updateLectureLearn);

router
  .route("/course-learn/:courseId/completed")
  .put(isAuthenticated, markAsCompleted);

router
  .route("/course-learn/:courseId/incompleted")
  .put(isAuthenticated, markAsInCompleted);

export default router;
