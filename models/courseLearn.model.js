import mongoose from "mongoose";

const lectureLearnSchema = new mongoose.Schema(
  {
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    viewed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const courseLearnSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lectureLearn: [lectureLearnSchema],
  },
  { timestamps: true }
);

export const CourseLearn = mongoose.model("CourseLearn", courseLearnSchema);
