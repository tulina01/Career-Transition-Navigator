const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const mongoose = require("mongoose")
const pdfParse = require("pdf-parse")
const mammoth = require("mammoth")
const axios = require("axios")

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 3000

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname)
  },
})

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|doc|docx/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error("Only PDF and Word documents are allowed"))
  },
})

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/career-navigator", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Define User Schema
const userSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
    unique: true,
  },
  contactInfo: {
    name: String,
    email: String,
    phone: String,
    location: String,
  },
  jobHistory: [
    {
      title: String,
      company: String,
      startDate: Date,
      endDate: Date,
      responsibilities: [String],
      achievements: [String],
    },
  ],
  education: [
    {
      degree: String,
      institution: String,
      year: Number,
      field: String,
    },
  ],
  skills: [String],
  certifications: [String],
  professionalDevelopment: [String],
  volunteerExperience: [String],
  languages: [String],
  geographicalPreferences: [String],
  professionalAffiliations: [String],
  hobbies: [String],
  reasonsForChange: [String],
  recommendedCareers: [
    {
      title: String,
      description: String,
      fitScore: Number,
      transitionPlan: {
        overview: String,
        steps: [
          {
            title: String,
            description: String,
            resources: [
              {
                title: String,
                url: String,
              },
            ],
          },
        ],
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const User = mongoose.model("User", userSchema)

// Configure OpenAI API
const OPENAI_API_KEY =
  "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"
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

// Flag to track if API usage should be disabled due to errors
let apiDisabled = false

// Helper function for OpenAI API calls
async function callOpenAIAPI(messages, temperature = 0.7, model = "gpt-3.5-turbo") {
  // If API is disabled, throw an error immediately
  if (apiDisabled) {
    throw new Error("API usage disabled due to previous errors")
  }

  try {
    console.log(`Calling OpenAI API with model: ${model}`)
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: model,
        messages: messages,
        temperature: temperature,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      },
    )
    return response.data
  } catch (error) {
    console.error("OpenAI API error:", error.response ? error.response.data : error.message)

    // Check for specific error types that should disable the API
    if (error.response) {
      const status = error.response.status
      const errorMessage = error.response.data?.error?.message || ""

      // Disable API for authentication errors, rate limits, or insufficient quota
      if (
        status === 401 ||
        status === 429 ||
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("insufficient_quota")
      ) {
        console.log("Disabling API usage due to critical error:", errorMessage)
        apiDisabled = true
      }
    }

    throw error
  }
}

// Middleware
app.use(express.json())
app.use(express.static("public"))

// Helper function to extract text from PDF
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  } catch (error) {
    console.error("Error extracting text from PDF:", error)
    throw new Error("Failed to extract text from PDF")
  }
}

// Helper function to extract text from DOCX
async function extractTextFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value
  } catch (error) {
    console.error("Error extracting text from DOCX:", error)
    throw new Error("Failed to extract text from DOCX")
  }
}

// Helper function to parse resume text using OpenAI with retry logic
async function parseResumeWithOpenAI(resumeText) {
  const maxRetries = 2
  let retryCount = 0
  let delay = 1000 // Start with 1 second delay

  while (retryCount < maxRetries) {
    try {
      if (apiDisabled) {
        console.log("API usage disabled, using fallback parser directly")
        return fallbackResumeParser(resumeText)
      }

      const prompt = `
        Extract the following information from this resume. Format the response as a JSON object with these keys:
        - contactInfo (object with name, email, phone, location)
        - jobHistory (array of objects with title, company, startDate, endDate, responsibilities array, achievements array)
        - education (array of objects with degree, institution, year, field)
        - skills (array of strings)
        - certifications (array of strings)
        - professionalDevelopment (array of strings)
        - volunteerExperience (array of strings)
        - languages (array of strings)
        - geographicalPreferences (array of strings)
        - professionalAffiliations (array of strings)
        - hobbies (array of strings)

        Resume text:
        ${resumeText.substring(0, 4000)} // Limit text to avoid token limits
      `

      const messages = [
        {
          role: "system",
          content:
            "You are an expert resume parser. Extract structured information from resumes accurately. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ]

      const completion = await callOpenAIAPI(messages, 0.3, "gpt-3.5-turbo")

      const responseText = completion.choices[0].message.content

      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0])

        // Ensure email exists to prevent MongoDB errors
        if (!parsedJson.contactInfo || !parsedJson.contactInfo.email) {
          if (!parsedJson.contactInfo) {
            parsedJson.contactInfo = {}
          }
          parsedJson.contactInfo.email = `user-${Date.now()}@example.com`
        }

        return parsedJson
      } else {
        throw new Error("No valid JSON found in OpenAI response")
      }
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error.message)

      // Check if it's a rate limit error
      if (error.response && (error.response.status === 429 || error.response.status === 500)) {
        retryCount++

        if (retryCount < maxRetries) {
          console.log(`Rate limit or server error. Retrying in ${delay / 1000} seconds...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
        } else {
          console.log("Max retries reached. Using fallback parser.")
          return fallbackResumeParser(resumeText)
        }
      } else {
        // For other errors, use fallback immediately
        console.log("Error occurred. Using fallback parser.")
        return fallbackResumeParser(resumeText)
      }
    }
  }

  // If we've exhausted retries, use fallback
  return fallbackResumeParser(resumeText)
}

// Fallback resume parser that uses basic text analysis
function fallbackResumeParser(resumeText) {
  console.log("Using fallback resume parser")

  // Simple text-based parsing
  const lines = resumeText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // Extract name (usually at the top of the resume)
  const name = lines[0]

  // Extract email using regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const emailMatch = resumeText.match(emailRegex)
  const email = emailMatch ? emailMatch[0] : `user-${Date.now()}@example.com`

  // Extract phone using regex
  const phoneRegex = /(\+\d{1,3}[-\s]?)?(\d{3}[-\s]?\d{3}[-\s]?\d{4}|\d{10})/
  const phoneMatch = resumeText.match(phoneRegex)
  const phone = phoneMatch ? phoneMatch[0] : ""

  // Extract location (common location words)
  const locationKeywords = ["location:", "address:", "city:", "region:"]
  let location = ""
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    if (
      locationKeywords.some((keyword) => lowerLine.includes(keyword)) ||
      (line.length < 30 && !line.includes("@") && !phoneRegex.test(line))
    ) {
      if (!lowerLine.includes("http") && !lowerLine.includes("www.")) {
        location = line.replace(/^(location|address|city|region):\s*/i, "")
        break
      }
    }
  }

  // Extract skills
  const skillsSection = findSection(resumeText, ["skills", "technologies", "technical skills"])
  const skills = skillsSection ? extractListItems(skillsSection) : []

  // Extract education
  const educationSection = findSection(resumeText, ["education", "academic background"])
  const education = []

  if (educationSection) {
    const eduLines = educationSection.split("\n").filter((line) => line.trim().length > 0)
    let currentEdu = {}

    for (const line of eduLines) {
      if (line.includes("University") || line.includes("College") || line.includes("School")) {
        if (Object.keys(currentEdu).length > 0) {
          education.push(currentEdu)
        }
        currentEdu = {
          degree: "",
          institution: line,
          year: null,
          field: "",
        }
      } else if (/\b(20\d{2}|19\d{2})\b/.test(line)) {
        if (currentEdu.institution) {
          const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/)
          if (yearMatch) {
            currentEdu.year = Number.parseInt(yearMatch[0])
          }
        }
      } else if (
        line.includes("Bachelor") ||
        line.includes("Master") ||
        line.includes("PhD") ||
        line.includes("BSc") ||
        line.includes("MSc") ||
        line.includes("BA") ||
        line.includes("BS")
      ) {
        if (currentEdu.institution) {
          currentEdu.degree = line
        }
      }
    }

    if (Object.keys(currentEdu).length > 0) {
      education.push(currentEdu)
    }
  }

  return {
    contactInfo: {
      name,
      email,
      phone,
      location,
    },
    jobHistory: [],
    education,
    skills,
    certifications: [],
    professionalDevelopment: [],
    volunteerExperience: [],
    languages: [],
    geographicalPreferences: [],
    professionalAffiliations: [],
    hobbies: [],
  }
}

// Helper function to find a section in the resume text
function findSection(text, sectionNames) {
  const lines = text.split("\n")
  let sectionStart = -1
  let sectionEnd = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase()

    if (sectionStart === -1) {
      // Look for section header
      if (sectionNames.some((name) => line.includes(name.toLowerCase()))) {
        sectionStart = i
      }
    } else if (line.length > 0 && line.endsWith(":")) {
      // Found the next section header
      sectionEnd = i
      break
    }
  }

  if (sectionStart !== -1) {
    const endIndex = sectionEnd !== -1 ? sectionEnd : lines.length
    return lines.slice(sectionStart + 1, endIndex).join("\n")
  }

  return null
}

// Helper function to extract list items
function extractListItems(text) {
  const items = []
  const lines = text.split("\n")

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.length > 0) {
      // Remove bullet points and other list markers
      const cleanedItem = trimmedLine.replace(/^[\s•\-*>◦⁃⦿⦾⁌⁍⧫⧪⧭⧮⧯]+/, "").trim()
      if (cleanedItem.length > 0) {
        items.push(cleanedItem)
      }
    }
  }

  return items
}

// Routes
app.post("/api/parse-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    console.log("File uploaded:", req.file)
    const filePath = req.file.path
    const fileExtension = path.extname(req.file.originalname).toLowerCase()

    let resumeText

    // Extract text based on file type
    if (fileExtension === ".pdf") {
      resumeText = await extractTextFromPDF(filePath)
    } else if (fileExtension === ".docx" || fileExtension === ".doc") {
      resumeText = await extractTextFromDOCX(filePath)
    } else {
      throw new Error("Unsupported file format")
    }

    console.log("Extracted text length:", resumeText.length)
    console.log("Text sample:", resumeText.substring(0, 500) + "...")

    // Parse resume text using OpenAI with retry logic and fallback
    const extractedInfo = await parseResumeWithOpenAI(resumeText)

    console.log("Parsed resume data:", extractedInfo)

    // Clean up the uploaded file
    fs.unlinkSync(filePath)

    res.json(extractedInfo)
  } catch (error) {
    console.error("Error in parse-resume route:", error)
    res.status(500).json({
      error: "Error parsing resume",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

app.post("/api/career-recommendations", async (req, res) => {
  try {
    const { resumeData, reasons } = req.body

    if (!resumeData || !reasons || !reasons.length) {
      return res.status(400).json({ error: "Missing required data" })
    }

    // Create prompt for OpenAI
    const prompt = `
      Based on the following resume information and reasons for career change, suggest 5 potential new career paths that would be a good fit. For each career path, provide a title, brief description, and a fit score percentage (0-100%).
      
      Resume Information:
      - Current/Previous Job Titles: ${resumeData.jobHistory?.map((job) => job.title).join(", ") || "Not provided"}
      - Skills: ${resumeData.skills?.join(", ") || "Not provided"}
      - Education: ${resumeData.education?.map((edu) => `${edu.degree} in ${edu.field}`).join(", ") || "Not provided"}
      - Certifications: ${resumeData.certifications?.join(", ") || "Not provided"}
      
      Reasons for Career Change:
      ${reasons.map((reason) => `- ${reason}`).join("\n")}
      
      Format the response as a JSON array with objects containing 'title', 'description', and 'fitScore' properties.
    `

    // Try to call OpenAI API with retry logic
    let careerPaths
    let retryCount = 0
    const maxRetries = 2
    let delay = 1000

    while (retryCount < maxRetries) {
      try {
        if (apiDisabled) {
          console.log("API usage disabled, using fallback career paths directly")
          careerPaths = getFallbackCareerPaths(resumeData, reasons)
          break
        }

        // Call OpenAI API
        const messages = [
          {
            role: "system",
            content:
              "You are a career counselor helping users find new career paths based on their experience and goals. Always respond with valid JSON.",
          },
          { role: "user", content: prompt },
        ]

        const completion = await callOpenAIAPI(messages, 0.7, "gpt-3.5-turbo")

        // Parse the response
        const responseText = completion.choices[0].message.content
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          careerPaths = JSON.parse(jsonMatch[0])
          break // Success, exit the retry loop
        } else {
          throw new Error("No JSON found in response")
        }
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error.message)

        // Check if it's a rate limit error
        if (error.response && error.response.status === 429) {
          retryCount++

          if (retryCount < maxRetries) {
            console.log(`Rate limit hit. Retrying in ${delay / 1000} seconds...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2 // Exponential backoff
          } else {
            console.log("Max retries reached. Using fallback career paths.")
            // Use fallback data
            careerPaths = getFallbackCareerPaths(resumeData, reasons)
            break
          }
        } else {
          // For other errors, use fallback immediately
          console.log("Error occurred. Using fallback career paths.")
          careerPaths = getFallbackCareerPaths(resumeData, reasons)
          break
        }
      }
    }

    // If we've exhausted retries without success, use fallback
    if (!careerPaths) {
      careerPaths = getFallbackCareerPaths(resumeData, reasons)
    }

    // Save to database
    try {
      const user = new User({
        ...resumeData,
        reasonsForChange: reasons,
        recommendedCareers: careerPaths.map((path) => ({
          title: path.title,
          description: path.description,
          fitScore: path.fitScore,
        })),
      })

      const savedUser = await user.save()
      console.log(`User saved successfully with ID: ${savedUser._id}`)
    } catch (dbError) {
      console.error("Database error when saving user:", dbError)
      // Continue processing even if database save fails
    }

    res.json({ careerPaths })
  } catch (error) {
    console.error("Error getting career recommendations:", error)
    res.status(500).json({ error: "Error getting career recommendations" })
  }
})

// Fallback function for career paths
function getFallbackCareerPaths(resumeData, reasons) {
  // Check if the resume has software/tech skills
  const hasTechSkills =
    resumeData.skills?.some((skill) =>
      [
        "javascript",
        "python",
        "java",
        "react",
        "node",
        "html",
        "css",
        "programming",
        "software",
        "development",
        "coding",
      ].some((techTerm) => typeof skill === "string" && skill.toLowerCase().includes(techTerm)),
    ) || false

  // Check if the resume has business/management skills
  const hasBusinessSkills =
    resumeData.skills?.some((skill) =>
      ["management", "leadership", "business", "project", "communication", "strategy", "marketing"].some(
        (bizTerm) => typeof skill === "string" && skill.toLowerCase().includes(bizTerm),
      ),
    ) || false

  // Check if the resume has design skills
  const hasDesignSkills =
    resumeData.skills?.some((skill) =>
      ["design", "ui", "ux", "user interface", "user experience", "graphic", "creative"].some(
        (designTerm) => typeof skill === "string" && skill.toLowerCase().includes(designTerm),
      ),
    ) || false

  // Check if the resume has event planning skills
  const hasEventSkills =
    resumeData.skills?.some((skill) =>
      ["event", "planning", "organizer", "coordinator", "logistics", "catering"].some(
        (eventTerm) => typeof skill === "string" && skill.toLowerCase().includes(eventTerm),
      ),
    ) || false

  // Generate career paths based on detected skills
  const careerPaths = []

  if (hasEventSkills) {
    careerPaths.push(
      {
        title: "Event Manager",
        description:
          "Plan and oversee all aspects of events, from conception to execution, ensuring client satisfaction.",
        fitScore: 95,
      },
      {
        title: "Wedding Planner",
        description:
          "Specialize in planning and coordinating weddings, working closely with couples to create memorable experiences.",
        fitScore: 88,
      },
      {
        title: "Corporate Event Coordinator",
        description: "Organize business conferences, product launches, and corporate retreats for companies.",
        fitScore: 90,
      },
    )
  }

  if (hasTechSkills) {
    careerPaths.push(
      {
        title: "Software Developer",
        description: "Build and maintain software applications using programming languages and development tools.",
        fitScore: 90,
      },
      {
        title: "DevOps Engineer",
        description:
          "Bridge the gap between development and operations, automating and optimizing deployment pipelines.",
        fitScore: 85,
      },
      {
        title: "Data Scientist",
        description: "Analyze and interpret complex data to help organizations make better decisions.",
        fitScore: 80,
      },
    )
  }

  if (hasBusinessSkills) {
    careerPaths.push(
      {
        title: "Product Manager",
        description:
          "Lead the development of products from conception to launch, balancing business needs with technical constraints.",
        fitScore: 88,
      },
      {
        title: "Business Analyst",
        description:
          "Bridge the gap between IT and business using data analytics to assess processes and requirements.",
        fitScore: 82,
      },
    )
  }

  if (hasDesignSkills) {
    careerPaths.push(
      {
        title: "UX/UI Designer",
        description: "Create intuitive and engaging user experiences for websites and applications.",
        fitScore: 87,
      },
      {
        title: "Product Designer",
        description:
          "Design products that are both functional and aesthetically pleasing, focusing on the user experience.",
        fitScore: 84,
      },
    )
  }

  // Add some general options if we don't have enough specific ones
  if (careerPaths.length < 5) {
    careerPaths.push(
      {
        title: "Digital Marketing Specialist",
        description:
          "Develop and implement marketing strategies across digital channels to increase brand awareness and drive sales.",
        fitScore: 75,
      },
      {
        title: "Technical Writer",
        description: "Create documentation that helps people understand and use technical products and services.",
        fitScore: 72,
      },
      {
        title: "Project Coordinator",
        description:
          "Support project managers in planning, executing, and closing projects by handling administrative tasks.",
        fitScore: 70,
      },
    )
  }

  // Return only 5 career paths
  return careerPaths.slice(0, 5)
}

app.post("/api/transition-plan", async (req, res) => {
  try {
    const { resumeData, careerTitle } = req.body

    if (!resumeData || !careerTitle) {
      return res.status(400).json({ error: "Missing required data" })
    }

    // Create prompt for OpenAI
    const prompt = `
      Create a detailed step-by-step transition plan for someone moving from their current career to becoming a ${careerTitle}.
      
      Current Information:
      - Current/Previous Job Titles: ${resumeData.jobHistory?.map((job) => job.title).join(", ") || "Not provided"}
      - Skills: ${Array.isArray(resumeData.skills) ? resumeData.skills.join(", ") : "Not provided"}
      - Education: ${resumeData.education?.map((edu) => `${edu.degree} in ${edu.field}`).join(", ") || "Not provided"}
      
      Target Career: ${careerTitle}
      
      Provide a comprehensive transition plan with the following:
      1. An overview paragraph summarizing the transition
      2. 5-7 specific steps to make the transition
      3. For each step, include a title, detailed description, and 1-2 helpful resources (with URLs)
      
      Format the response as a JSON object with 'overview' and 'steps' properties. Each step should have 'title', 'description', and 'resources' properties.
    `

    // Try to call OpenAI API with retry logic
    let transitionPlan
    let retryCount = 0
    const maxRetries = 2
    let delay = 1000

    while (retryCount < maxRetries) {
      try {
        if (apiDisabled) {
          console.log("API usage disabled, using fallback transition plan directly")
          transitionPlan = getFallbackTransitionPlan(careerTitle)
          break
        }

        // Call OpenAI API
        const messages = [
          {
            role: "system",
            content:
              "You are a career counselor helping users transition to new careers with practical, actionable advice. Always respond with valid JSON.",
          },
          { role: "user", content: prompt },
        ]

        const completion = await callOpenAIAPI(messages, 0.7, "gpt-3.5-turbo")

        // Parse the response
        const responseText = completion.choices[0].message.content

        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          transitionPlan = JSON.parse(jsonMatch[0])
          break // Success, exit the retry loop
        } else {
          throw new Error("No JSON found in response")
        }
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error.message)

        // Check if it's a rate limit error
        if (error.response && error.response.status === 429) {
          retryCount++

          if (retryCount < maxRetries) {
            console.log(`Rate limit hit. Retrying in ${delay / 1000} seconds...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2 // Exponential backoff
          } else {
            console.log("Max retries reached. Using fallback transition plan.")
            // Use fallback data
            transitionPlan = getFallbackTransitionPlan(careerTitle)
            break
          }
        } else {
          // For other errors, use fallback immediately
          console.log("Error occurred. Using fallback transition plan.")
          transitionPlan = getFallbackTransitionPlan(careerTitle)
          break
        }
      }
    }

    // If we've exhausted retries without success, use fallback
    if (!transitionPlan) {
      transitionPlan = getFallbackTransitionPlan(careerTitle)
    }

    // Update user in database
    try {
      // Try to find the user by email first
      let updateResult = null
      if (resumeData.contactInfo && resumeData.contactInfo.email) {
        updateResult = await User.findOneAndUpdate(
          { "contactInfo.email": resumeData.contactInfo.email },
          { $set: { [`recommendedCareers.$[career].transitionPlan`]: transitionPlan } },
          {
            arrayFilters: [{ "career.title": careerTitle }],
            new: true,
          },
        )
      }

      // If no user found by email, try to find the most recent user
      if (!updateResult) {
        const recentUser = await User.findOne().sort({ createdAt: -1 })
        if (recentUser) {
          updateResult = await User.findByIdAndUpdate(
            recentUser._id,
            { $set: { [`recommendedCareers.$[career].transitionPlan`]: transitionPlan } },
            {
              arrayFilters: [{ "career.title": careerTitle }],
              new: true,
            },
          )
        }
      }

      console.log("Transition plan saved to database")
    } catch (dbError) {
      console.error("Database error when updating transition plan:", dbError)
      // Continue processing even if database update fails
    }

    res.json({ plan: transitionPlan })
  } catch (error) {
    console.error("Error getting transition plan:", error)
    res.status(500).json({ error: "Error getting transition plan" })
  }
})

// Fallback function for transition plan
function getFallbackTransitionPlan(careerTitle) {
  return {
    overview: `Transitioning to a career as a ${careerTitle} will require a combination of education, skill development, and networking. This plan outlines the key steps to make this transition successfully.`,
    steps: [
      {
        title: "Assess Your Current Skills",
        description:
          "Identify which of your existing skills are transferable to your new career path and which areas need development.",
        resources: [
          {
            title: "Skills Assessment Tool",
            url: "https://www.myskillsfuture.gov.sg/content/portal/en/assessment/skills-assessment.html",
          },
        ],
      },
      {
        title: "Research the Field",
        description:
          "Learn about the day-to-day responsibilities, required qualifications, and industry trends for your target career.",
        resources: [
          {
            title: "O*NET Online",
            url: "https://www.onetonline.org/",
          },
          {
            title: "LinkedIn Learning",
            url: "https://www.linkedin.com/learning/",
          },
        ],
      },
      {
        title: "Acquire Necessary Education",
        description:
          "Research and enroll in relevant courses, certifications, or degree programs that will provide the knowledge base needed for your new career.",
        resources: [
          {
            title: "Coursera",
            url: "https://www.coursera.org/",
          },
          {
            title: "edX",
            url: "https://www.edx.org/",
          },
        ],
      },
      {
        title: "Build a Professional Network",
        description:
          "Connect with professionals already working in your target field through LinkedIn, industry events, and professional associations.",
        resources: [
          {
            title: "LinkedIn",
            url: "https://www.linkedin.com/",
          },
          {
            title: "Meetup",
            url: "https://www.meetup.com/",
          },
        ],
      },
      {
        title: "Gain Practical Experience",
        description:
          "Look for internships, volunteer opportunities, or part-time positions that will allow you to apply your new skills and build your resume.",
        resources: [
          {
            title: "Indeed",
            url: "https://www.indeed.com/",
          },
          {
            title: "Volunteer Match",
            url: "https://www.volunteermatch.org/",
          },
        ],
      },
      {
        title: "Update Your Resume and Online Presence",
        description:
          "Revise your resume to highlight relevant skills and experiences, and update your LinkedIn and other professional profiles.",
        resources: [
          {
            title: "Resume Builder",
            url: "https://resume.io/",
          },
          {
            title: "LinkedIn Profile Tips",
            url: "https://www.linkedin.com/business/talent/blog/product-tips/linkedin-profile-tips-for-job-seekers",
          },
        ],
      },
    ],
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
