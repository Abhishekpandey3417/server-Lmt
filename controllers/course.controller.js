import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import {
  deleteMediaFromCloudinary,
  deleteVideoFromCloudinary,
  uploadMedia,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";

export const createCourse = async (req, res) => {
  try {
    let { courseTitle, category } = req.body;

    if (!courseTitle || !category) {
      return res.status(400).json({
        message: "Course title and category is required.",
      });
    }

    // ✅ normalize category
    category = category.toLowerCase().trim();

    const course = await Course.create({
      courseTitle,
      category,
      creator: req.id,
    });

    return res.status(201).json({
      course,
      message: "Course created.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to create course",
    });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.id;

    const courses = await Course.find({ creator: userId })
      .populate({ path: "creator", select: "name photoUrl" })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      courses,
      message: "Courses fetched successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to fetch courses",
    });
  }
};

export const searchCourse = async (req, res) => {
  try {
    let { query = "", categories = [], sortByPrice = "" } = req.query;

    if (typeof categories === "string") {
      categories = [categories];
    }

    const searchCriteria = {
      isPublished: true,
    };

    if (query) {
      searchCriteria.$or = [
        { courseTitle: { $regex: query, $options: "i" } },
        { subTitle: { $regex: query, $options: "i" } },
      ];
    }

    // ✅ FIXED: case-insensitive category match
    if (categories.length > 0) {
      searchCriteria.category = {
        $in: categories.map(
          (cat) => new RegExp(`^${cat.trim()}$`, "i")
        ),
      };
    }

    const sortOptions = {};
    if (sortByPrice === "low") sortOptions.coursePrice = 1;
    if (sortByPrice === "high") sortOptions.coursePrice = -1;

    const courses = await Course.find(searchCriteria)
      .populate({ path: "creator", select: "name photoUrl" })
      .sort(sortOptions);

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getCourseCategories = async (req, res) => {
  try {
    const categories = await Course.distinct("category");

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};



export const getPublishedCourse = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate({
        path: "creator",
        select: "name photoUrl",
      })
      .lean();

    return res.status(200).json({
      success: true,
      courses: courses || [],
    });
  } catch (error) {
    console.error("getPublishedCourse error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch published courses",
    });
  }
};


export const editCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const {
      courseTitle,
      subTitle,
      description,
      category,
      courseLevel,
      coursePrice,
    } = req.body;

    const thumbnail = req.file;

    let course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }

    let courseThumbnail;
    if (thumbnail) {
      if (course.courseThumbnail) {
        const publicId = course.courseThumbnail.split("/").pop().split(".")[0];

        await deleteMediaFromCloudinary(publicId);
      }

      courseThumbnail = await uploadMedia(thumbnail.path);
    }

    const updateData = {};

    if (courseTitle !== undefined) updateData.courseTitle = courseTitle;
    if (subTitle !== undefined) updateData.subTitle = subTitle;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) {
      updateData.category = category.toLowerCase().trim();
    }

    if (courseLevel !== undefined) updateData.courseLevel = courseLevel;
    if (coursePrice !== undefined) updateData.coursePrice = coursePrice;
    if (courseThumbnail?.secure_url) {
      updateData.courseThumbnail = courseThumbnail.secure_url;
    }

    course = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
    });

    return res.status(200).json({
      course,
      message: "Course updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to update course",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        message: "Invalid course id",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }

    return res.status(200).json({
      course,
      message: "Course fetched successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get course by id",
    });
  }
};

export const createLecture = async (req, res) => {
  try {
    const { lectureTitle } = req.body;
    const { courseId } = req.params;
    if (!lectureTitle || !courseId) {
      return res.status(400).json({
        message: "Lecture title is required.",
      });
    }

    const lecture = await Lecture.create({ lectureTitle });
    const course = await Course.findById(courseId);
    if (course) {
      course.lectures.push(lecture._id);
      await course.save();
    }
    return res.status(200).json({
      lecture,
      message: "Lecture created successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to create lecture",
    });
  }
};

export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("lectures");
    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }

    return res.status(200).json({
      lectures: course.lectures,
      message: "Lectures fetched successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get lecture",
    });
  }
};

export const editLecture = async (req, res) => {
  try {
    const { lectureTitle, videoInfo, isPreviewFree } = req.body;
    const { courseId, lectureId } = req.params;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found!",
      });
    }

    if (lectureTitle !== undefined) {
      lecture.lectureTitle = lectureTitle;
    }

    // ✅ FIXED: correct key from frontend
    if (videoInfo?.videoUrl) {
      lecture.videoUrl = videoInfo.videoUrl;
    }

    if (videoInfo?.publicId) {
      lecture.publicId = videoInfo.publicId;
    }

    if (isPreviewFree !== undefined) {
      lecture.isPreviewFree = isPreviewFree;
    }

    await lecture.save();

    const course = await Course.findById(courseId);
    if (course && !course.lectures.includes(lecture._id)) {
      course.lectures.push(lecture._id);
      await course.save();
    }

    return res.status(200).json({
      lecture,
      message: "Lecture updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to update lecture",
    });
  }
};

export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await Lecture.findByIdAndDelete(lectureId);
    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found!",
      });
    }

    if (lecture.publicId) {
      await deleteVideoFromCloudinary(lecture.publicId);
    }

    await Course.updateOne(
      { lectures: lectureId },
      { $pull: { lectures: lectureId } },
    );

    return res.status(200).json({
      message: "Lecture removed successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to remove lecture",
    });
  }
};

export const getLectureById = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found!",
      });
    }
    return res.status(200).json({
      lecture,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to get lecture by id",
    });
  }
};

export const togglePublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { publish } = req.query;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }

    course.isPublished = publish === "true";
    await course.save();

    const statusMessage = course.isPublished ? "Published" : "Unpublished";

    return res.status(200).json({
      message: `Course is ${statusMessage}`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to update status",
    });
  }
};



