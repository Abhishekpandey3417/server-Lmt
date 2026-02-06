/*import jwt from "jsonwebtoken";

export const generateToken = (res, user, message) => {
  const token = jwt.sign(
    { id: user._id }, // ← change this line
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      sameSite: "lax", // ✅ for localhost
      secure: false, // ✅ for http
      maxAge: 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message,
      user,
    });
};

/*import jwt from "jsonwebtoken";

export const generateToken = (res, user, message) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // ✅ convert mongoose doc → plain object
  const userData = user.toObject();

  // ✅ never expose password
  delete userData.password;

  // ✅ ensure enrolledCourses is always an array
  userData.enrolledCourses = userData.enrolledCourses ?? [];

  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message,
      user: userData,
    });
};*/


export const generateToken = (res, user, message) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: true,          // REQUIRED on Render
      sameSite: "none",      // REQUIRED for cross-origin
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message,
      user,
    });
};

