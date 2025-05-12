const express = require("express")
const User = require("../models/user")
const { generateToken } = require("../middleware/auth")
const router = express.Router()

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const userExists = await User.findOne({ email })

    if (userExists) {
      return res.status(400).json({ error: "User already exists" })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
    })

    await user.save()

    // Generate token
    const token = generateToken(user._id)

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    })

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error("Register error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Generate token
    const token = generateToken(user._id)

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    })

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Logout user
router.post("/logout", (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  })

  res.json({ message: "Logged out successfully" })
})

// Get current user
router.get("/me", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Change password
router.post("/change-password", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { currentPassword, newPassword } = req.body

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Validate new password length
    if (newPassword.length < 6) {
      console.log(`Password change request: length=${newPassword.length}, meets requirement=${newPassword.length >= 6}`)
      return res.status(400).json({ error: "New password must be at least 6 characters long" })
    }

    // Get user from database
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)

    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { name } = req.body

    // Get user from database
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Update fields
    if (name) user.name = name

    await user.save()

    // Update user in localStorage
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
