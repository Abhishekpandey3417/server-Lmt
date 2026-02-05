import Stripe from "stripe";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { PurchaseCourse } from "../models/coursePurchase.model.js";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const alreadyPurchased = await PurchaseCourse.findOne({
      userId,
      courseId,
      status: "completed",
    });

    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: "Course already purchased",
      });
    }

    const coursePrice = Number(course.coursePrice) || 100;
    const courseThumbnail =
      course.courseThumbnail || "https://via.placeholder.com/300";

    // Create purchase record
    const purchase = await PurchaseCourse.create({
      userId,
      courseId,
      amount: coursePrice,
      status: "pending",
      paymentId: "temp",
    });

    // Log payload for Stripe debugging
    console.log("Stripe payload:", {
      name: course.courseTitle,
      images: [courseThumbnail],
      amount: coursePrice * 100,
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: course.courseTitle,
                images: [courseThumbnail],
              },
              unit_amount: coursePrice * 100,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL}/course-purchase/success?purchaseId=${purchase._id}`,
        cancel_url: `${process.env.CLIENT_URL}/course-detail/${course._id}`,
        metadata: {
          purchaseId: purchase._id.toString(),
          userId: userId.toString(),
          courseId: courseId.toString(),
        },
      });
    } catch (stripeError) {
      console.error("Stripe checkout session error:", stripeError);
      return res.status(500).json({
        success: false,
        message: stripeError.message || "Stripe session creation failed",
      });
    }

    purchase.paymentId = session.id;
    await purchase.save();

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/* ================================
   STRIPE WEBHOOK
================================ */
export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.WEBHOOK_ENDPOINT_SECRET,
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).send("Invalid signature");
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const purchase = await PurchaseCourse.findOne({
        paymentId: session.id,
      });

      if (!purchase) {
        return res.status(404).send("Purchase not found");
      }

      // Idempotency guard
      if (purchase.status !== "completed") {
        purchase.status = "completed";
        purchase.amount = session.amount_total
          ? session.amount_total / 100
          : purchase.amount;

        await purchase.save();

        const user = await User.findById(purchase.userId);
        const course = await Course.findById(purchase.courseId);

        if (!user || !course) {
          return res.status(404).send("User or Course not found");
        }

        // ❌ Prevent instructor from enrolling in own course
        if (
          user.role === "instructor" &&
          course.creator.toString() === user._id.toString()
        ) {
          console.log("Instructor cannot enroll in own course");
          return res.status(200).send("Skipped self-enrollment");
        }

        // ✅ Allow enrollment (student OR instructor)
        await User.findByIdAndUpdate(user._id, {
          $addToSet: { enrolledCourses: course._id },
        });

        await Course.findByIdAndUpdate(course._id, {
          $addToSet: { enrolledStudents: user._id },
        });
      }
    }

    return res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Server error");
  }
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate("creator")
      .populate("lectures")
      .populate("enrolledStudents", "name email"); // show enrolled students

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const user = await User.findById(userId);

    const purchased =
      user?.enrolledCourses?.some(
        (id) => id.toString() === courseId.toString(),
      ) || false;

    // Include user's enrolledCourses in the response
    const enrolledCourses = user?.enrolledCourses || [];

    return res.status(200).json({
      course,
      purchased,
      enrolledCourses, // user's enrolled courses
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const confirmPurchaseAndEnroll = async (req, res) => {
  try {
    const userId = req.id;
    const { purchaseId } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!purchaseId)
      return res.status(400).json({ message: "Purchase ID required" });

    const purchase = await PurchaseCourse.findById(purchaseId);

    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });
    if (purchase.userId.toString() !== userId.toString())
      return res.status(403).json({ message: "Unauthorized purchase access" });

    // ✅ mark completed if not already
    if (purchase.status !== "completed") {
      purchase.status = "completed";
      await purchase.save();
    }

    const user = await User.findById(userId);
    const course = await Course.findById(purchase.courseId);

    if (!user || !course) {
      return res.status(404).json({ message: "User or Course not found" });
    }

    // ✅ enroll user
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { enrolledCourses: course._id },
    });

    await Course.findByIdAndUpdate(course._id, {
      $addToSet: { enrolledStudents: user._id },
    });

    // ✅ return populated user
    const updatedUser = await User.findById(userId)
      .select("-password")
      .populate({
        path: "enrolledCourses",
        select:
          "_id courseTitle courseThumbnail coursePrice category courseLevel creator",
        populate: {
          path: "creator",
          select: "name photoUrl",
        },
      });

    return res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("confirmPurchaseAndEnroll error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const getAllPurchasedCourse = async (req, res) => {
  try {
    const userId = req.id;

    const purchases = await PurchaseCourse.find({
      userId,
      status: "completed",
    }).populate({
      path: "courseId",
      select:
        "_id courseTitle courseThumbnail coursePrice category courseLevel creator",
      populate: {
        path: "creator",
        select: "name photoUrl",
      },
    });

    return res.status(200).json({
      purchasedCourse: purchases || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

