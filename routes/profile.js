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

// Get a specific resume
router.get("/resumes/:resumeId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { resumeId } = req.params

    // Find the resume in the user's array
    const resume = req.user.resumes.find((resume) => resume._id.toString() === resumeId)

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" })
    }

    res.json({
      fileName: resume.fileName,
      uploadDate: resume.uploadDate,
      parsedData: resume.parsedData,
    })
  } catch (error) {
    console.error("Get resume error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Save a career path
router.post("/career-paths", async (req, res, next) => {
  try {
    console.log("Received request to save career path")

    if (!req.user) {
      console.log("User not authenticated")
      return res.status(401).json({ error: "Not authenticated" })
    }

    console.log(`Authenticated user: ${req.user.email}`)

    const { careerPath } = req.body
    console.log("Career path data received:", JSON.stringify(careerPath))

    if (!careerPath) {
      return res.status(400).json({ error: "Career path data is required" })
    }

    // Ensure all required fields are present with default values if missing
    const sanitizedCareerPath = {
      title: careerPath.title || "Untitled Career",
      description: careerPath.description || "",
      fitScore: typeof careerPath.fitScore === "number" ? careerPath.fitScore : 0,
      type: careerPath.type || "same-field",
      transferableSkills: Array.isArray(careerPath.transferableSkills) ? careerPath.transferableSkills : [],
      savedAt: new Date(),
    }

    console.log("Sanitized career path:", JSON.stringify(sanitizedCareerPath))

    // Add to user's career paths
    req.user.careerPaths.push(sanitizedCareerPath)

    console.log("Saving user with new career path")
    await req.user.save()
    console.log("User saved successfully")

    res.status(201).json({ message: "Career path saved successfully" })
  } catch (error) {
    console.error("Save career path error:", error)
    // Pass to global error handler
    next(error)
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

// Get a specific transition plan
router.get("/transition-plans/:planId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    const { planId } = req.params

    // Find the transition plan in the user's array
    const transitionPlan = req.user.transitionPlans.find((plan) => plan._id.toString() === planId)

    if (!transitionPlan) {
      return res.status(404).json({ error: "Transition plan not found" })
    }

    res.json({
      careerTitle: transitionPlan.careerTitle,
      plan: transitionPlan.plan,
      savedAt: transitionPlan.savedAt,
    })
  } catch (error) {
    console.error("Get transition plan error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
