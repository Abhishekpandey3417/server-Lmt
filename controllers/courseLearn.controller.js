import mongoose from "mongoose";
import { CourseLearn } from "../models/courseLearn.model.js";
import { Course } from "../models/course.model.js";

export const getCourseLearn = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    //const courseDetails = await Course.findById(courseId);
    const courseDetails = await Course.findById(courseId).populate("lectures");

    if (!courseDetails) {
      return res.status(404).json({ message: "Course not found" });
    }

    const courseLearn = await CourseLearn.findOne({ courseId, userId });

    if (!courseLearn) {
      return res.status(200).json({
        data: {
          courseDetails,
          courseLearn: [],
          completed: false,
        },
      });
    }

    return res.status(200).json({
      data: {
        courseDetails,
        courseLearn: courseLearn.lectureLearn,
        completed: courseLearn.completed,
      },
    });
  } catch (error) {
    console.error("getCourseLearn error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



export const updateLectureLearn = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.id;

    const lectureObjectId = new mongoose.Types.ObjectId(lectureId);

    let courseLearn = await CourseLearn.findOne({ courseId, userId });

    if (!courseLearn) {
      courseLearn = new CourseLearn({
        courseId,
        userId,
        completed: false,
        lectureLearn: [
          {
            lectureId: lectureObjectId,
            viewed: true,
          },
        ],
      });
    } else {
      const lectureIndex = courseLearn.lectureLearn.findIndex((l) =>
        l.lectureId.equals(lectureObjectId)
      );

      if (lectureIndex !== -1) {
        courseLearn.lectureLearn[lectureIndex].viewed = true;
      } else {
        courseLearn.lectureLearn.push({
          lectureId: lectureObjectId,
          viewed: true,
        });
      }
    }

    const viewedCount = courseLearn.lectureLearn.filter(
      (l) => l.viewed === true
    ).length;

    const course = await Course.findById(courseId);

    if (course && viewedCount === course.lectures.length) {
      courseLearn.completed = true;
    }

    await courseLearn.save();

    return res.status(200).json({
      success: true,
      message: "Lecture progress updated",
    });
  } catch (error) {
    console.error("updateLectureLearn error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const markAsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    let courseLearn = await CourseLearn.findOne({ courseId, userId });
    if (!courseLearn) {
      return res.status(404).json({ message: "Course Learn not found" });
    }
    courseLearn.lectureLearn.map(
      (lectureLearn) => (lectureLearn.viewed = true),
    );

    courseLearn.completed = true;
    await courseLearn.save();

    return res.status(200).json({ message: "Course marked as completed" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markAsInCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    let courseLearn = await CourseLearn.findOne({ courseId, userId });
    if (!courseLearn) {
      return res.status(404).json({ message: "Course Learn not found" });
    }
    courseLearn.lectureLearn.map(
      (lectureLearn) => (lectureLearn.viewed = false),
    );

    courseLearn.completed = false;
    await courseLearn.save();

    return res.status(200).json({ message: "Course marked as incompleted." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
