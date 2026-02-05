import express from "express";
import {
  createCourse,
  searchCourse,
  getCreatorCourses,
  editCourse,
  getCourseById,
  createLecture,
  getCourseLecture,
  editLecture,
  removeLecture,
  getLectureById,
  togglePublishCourse,
  getPublishedCourse,
  getCourseCategories
} from "../controllers/course.controller.js";

import { enrollCourse } from "../controllers/user.controller.js";

import upload from "../utils/multer.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

// COURSE ROUTES
router.route("/create").post(isAuthenticated, createCourse);
router.route("/search").get(isAuthenticated,searchCourse);
router.post("/courses/:courseId/enroll", isAuthenticated, enrollCourse);
router.route("/categories").get(isAuthenticated,getCourseCategories)
router.route("/published-courses").get( getPublishedCourse);
router.route("/get").get(isAuthenticated, getCreatorCourses);

router
  .route("/edit/:courseId")
  .put(isAuthenticated, upload.single("courseThumbnail"), editCourse);

//router.route("/get/:courseId").get(isAuthenticated, getCourseById);
// public course detail route
//router.route("/:courseId").get(getCourseById);
router.route("/get/:courseId").get(isAuthenticated, getCourseById);



// LECTURE ROUTES
router.route("/lecture/create/:courseId").post(isAuthenticated, createLecture);

// get all lectures of a course
router.route("/lecture/get/:courseId").get(isAuthenticated, getCourseLecture);

// edit lecture
router
  .route("/lecture/edit/:courseId/:lectureId")
  .put(isAuthenticated, editLecture);

// remove lecture
router
  .route("/lecture/remove/:lectureId")
  .delete(isAuthenticated, removeLecture);

// ✅ FIX: unique path for lecture by id
router
  .route("/lecture/single/:lectureId")
  .get(isAuthenticated, getLectureById);

router
  .route("/publish/:courseId")
  .patch(isAuthenticated, togglePublishCourse);




export default router;

