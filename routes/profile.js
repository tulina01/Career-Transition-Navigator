const express = require("express")
const router = express.Router()

// Get user profile with resumes, career paths, and transition plans
router.get("/", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
      resumes: req.user.resumes || [],
      careerPaths: req.user.careerPaths || [],
      transitionPlans: req.user.transitionPlans || [],
    })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Save a career path
router.post("/career-paths", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { careerPath } = req.body

    if (!careerPath) {
      return res.status(400).json({ error: "Career path data is required" })
    }

    req.user.careerPaths.push({
      ...careerPath,
      savedAt: new Date(),
    })

    await req.user.save()

    res.status(201).json({ message: "Career path saved successfully" })
  } catch (error) {
    console.error("Save career path error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Save a transition plan
router.post("/transition-plans", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { careerTitle, plan } = req.body

    if (!careerTitle || !plan) {
      return res.status(400).json({ error: "Career title and plan are required" })
    }

    req.user.transitionPlans.push({
      careerTitle,
      plan,
      savedAt: new Date(),
    })

    await req.user.save()

    res.status(201).json({ message: "Transition plan saved successfully" })
  } catch (error) {
    console.error("Save transition plan error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete a saved resume
router.delete("/resumes/:resumeId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { resumeId } = req.params

    req.user.resumes = req.user.resumes.filter((resume) => resume._id.toString() !== resumeId)

    await req.user.save()

    res.json({ message: "Resume deleted successfully" })
  } catch (error) {
    console.error("Delete resume error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete a saved career path
router.delete("/career-paths/:pathId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { pathId } = req.params

    req.user.careerPaths = req.user.careerPaths.filter((path) => path._id.toString() !== pathId)

    await req.user.save()

    res.json({ message: "Career path deleted successfully" })
  } catch (error) {
    console.error("Delete career path error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete a saved transition plan
router.delete("/transition-plans/:planId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { planId } = req.params

    req.user.transitionPlans = req.user.transitionPlans.filter((plan) => plan._id.toString() !== planId)

    await req.user.save()

    res.json({ message: "Transition plan deleted successfully" })
  } catch (error) {
    console.error("Delete transition plan error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
