import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";
import { uploadMedia, deleteMediaFromCloudinary } from "../utils/cloudinary.js"; // ✅ missing import

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res
      .status(201)
      .json({ success: true, message: "Account created successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    return generateToken(res, user, `Welcome back ${user.name}!`);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const logout = async (_, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully.",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.id;

    const user = await User.findById(userId)
      .select("-password")
      .populate({
        path: "enrolledCourses",
        select:
          "_id courseTitle courseThumbnail coursePrice courseLevel creator",
        populate: {
          path: "creator",
          select: "name photoUrl",
        },
      });

    if (!user) {
      return res.status(404).json({
        message: "Profile not found",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load user",
    });
  }
};


export const enrollCourse = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.params;

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      return res.status(404).json({ message: "User or Course not found" });
    }

    const alreadyEnrolled = user.enrolledCourses.some(
      (id) => id.toString() === courseId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    user.enrolledCourses.push(course._id);
    course.enrolledStudents.push(user._id);

    await user.save();
    await course.save();

    // ✅ FETCH UPDATED USER WITH POPULATION
    const updatedUser = await User.findById(userId)
      .select("-password")
      .populate({
        path: "enrolledCourses",
        select: "_id courseTitle courseThumbnail coursePrice",
      });

    return res.status(200).json({
      success: true,
      user: updatedUser, // ✅ THIS IS THE KEY
      message: "Course enrolled successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Enrollment failed" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const userId = req.id;
    const { name } = req.body;
    const profilePhoto = req.file;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedData = {};

    if (name) {
      updatedData.name = name;
    }

    if (profilePhoto) {
      if (user.photoUrl) {
        const publicId = user.photoUrl.split("/").pop().split(".")[0];
        await deleteMediaFromCloudinary(publicId);
      }

      const cloudResponse = await uploadMedia(profilePhoto.path);
      updatedData.photoUrl = cloudResponse.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    }).select("-password");

    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.log("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};
