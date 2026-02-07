/*export const generateToken = (res, user, message) => {
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
};*/

import jwt from "jsonwebtoken";

export const generateToken = (res, user, message) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // convert mongoose doc to plain object
  const userData = user.toObject();
  delete userData.password;

  res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: true,     // REQUIRED on Render (HTTPS)
      sameSite: "none", // REQUIRED for cross-origin cookies
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message,
      user: userData,
    });
};


