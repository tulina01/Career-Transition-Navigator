const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const mongoose = require("mongoose")
const pdfParse = require("pdf-parse")
const mammoth = require("mammoth")
const axios = require("axios")
require("dotenv").config()

// Add these imports at the top of the file, after the existing imports
const cookieParser = require("cookie-parser")
const User = require("./models/user")
const { isAuthenticated } = require("./middleware/auth")
const authRoutes = require("./routes/auth")
const profileRoutes = require("./routes/profile")

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

// Middleware
app.use(express.json())
app.use(express.static("public"))
app.use(cookieParser())

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Debug middleware to log auth status
app.use((req, res, next) => {
  console.log(`Auth status for ${req.method} ${req.url}: ${req.cookies.token ? "Has token" : "No token"}`)
  next()
})

// Add authentication middleware
app.use(isAuthenticated)

// Add routes
app.use("/api/auth", authRoutes)
app.use("/api/profile", profileRoutes)

// Test route to check authentication
app.get("/api/auth-test", isAuthenticated, (req, res) => {
  if (req.user) {
    return res.json({
      authenticated: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
      },
    })
  } else {
    return res.json({
      authenticated: false,
    })
  }
})

// Configure OpenAI API
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
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

// Define User Schema
let userModel
try {
  // Try to get the model if it already exists
  userModel = mongoose.model("User")
} catch (e) {
  // Define the model if it doesn't exist
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

  userModel = mongoose.model("User", userSchema)
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

    // If user is logged in, save the resume to their profile
    if (req.user) {
      try {
        // Create a new resume object without any career paths
        const newResume = {
          fileName: req.file.originalname,
          uploadDate: new Date(),
          parsedData: extractedInfo,
        }

        // Add the resume to the user's resumes array
        req.user.resumes.push(newResume)

        await req.user.save()
        console.log("Resume saved to user profile successfully")
      } catch (saveError) {
        console.error("Error saving resume to user profile:", saveError)
        // Continue with the response even if saving to profile fails
      }
    }

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

  // Generate career paths based on detected skills
  const sameFieldCareers = []
  const differentFieldCareers = []

  // Add same field careers based on detected skills
  if (hasTechSkills) {
    sameFieldCareers.push(
      {
        title: "Senior Software Developer",
        description:
          "Lead development of complex software applications with advanced technical expertise. Mentor junior developers and make architectural decisions.",
        fitScore: 90,
        type: "same-field",
        transferableSkills: ["Programming expertise", "Problem-solving", "Technical knowledge"],
      },
      {
        title: "DevOps Engineer",
        description:
          "Bridge the gap between development and operations, automating and optimizing deployment pipelines.",
        fitScore: 85,
        type: "same-field",
        transferableSkills: ["Technical knowledge", "System administration", "Automation skills"],
      },
      {
        title: "Technical Product Manager",
        description:
          "Guide product development from a technical perspective, working with both engineering and business teams.",
        fitScore: 82,
        type: "same-field",
        transferableSkills: ["Technical knowledge", "Communication", "Project management"],
      },
    )
  }

  if (hasBusinessSkills) {
    sameFieldCareers.push(
      {
        title: "Senior Project Manager",
        description:
          "Lead complex projects with larger teams and budgets. Develop project management strategies and mentor junior managers.",
        fitScore: 88,
        type: "same-field",
        transferableSkills: ["Leadership", "Organization", "Communication"],
      },
      {
        title: "Business Development Director",
        description:
          "Develop business strategies to identify and pursue new growth opportunities. Build partnerships and lead negotiations.",
        fitScore: 85,
        type: "same-field",
        transferableSkills: ["Negotiation", "Strategic thinking", "Relationship building"],
      },
    )
  }

  if (hasDesignSkills) {
    sameFieldCareers.push(
      {
        title: "Senior UX Designer",
        description:
          "Lead user experience design for complex products. Conduct user research and develop design systems.",
        fitScore: 87,
        type: "same-field",
        transferableSkills: ["Design thinking", "User empathy", "Visual communication"],
      },
      {
        title: "Creative Director",
        description:
          "Provide creative vision and direction for design teams. Develop brand strategies and ensure design quality.",
        fitScore: 84,
        type: "same-field",
        transferableSkills: ["Creative vision", "Leadership", "Design expertise"],
      },
    )
  }

  // Add different field careers
  if (hasTechSkills) {
    differentFieldCareers.push(
      {
        title: "Data Scientist",
        description:
          "Apply statistical analysis and machine learning to extract insights from data. Develop models to solve business problems.",
        fitScore: 78,
        type: "different-field",
        transferableSkills: ["Analytical thinking", "Problem-solving", "Technical aptitude"],
      },
      {
        title: "Cybersecurity Specialist",
        description:
          "Protect organizations from digital threats and vulnerabilities. Implement security measures and respond to incidents.",
        fitScore: 75,
        type: "different-field",
        transferableSkills: ["Technical knowledge", "Attention to detail", "Problem-solving"],
      },
      {
        title: "Technical Writer",
        description: "Create documentation that helps people understand and use technical products and services.",
        fitScore: 72,
        type: "different-field",
        transferableSkills: ["Technical knowledge", "Writing skills", "Attention to detail"],
      },
    )
  }

  if (hasBusinessSkills) {
    differentFieldCareers.push(
      {
        title: "Management Consultant",
        description:
          "Help organizations improve performance through analysis of existing problems and development of plans for improvement.",
        fitScore: 76,
        type: "different-field",
        transferableSkills: ["Analytical thinking", "Problem-solving", "Communication"],
      },
      {
        title: "Corporate Trainer",
        description: "Develop and deliver training programs to improve employee skills and performance.",
        fitScore: 74,
        type: "different-field",
        transferableSkills: ["Communication", "Subject expertise", "Presentation skills"],
      },
    )
  }

  if (hasDesignSkills) {
    differentFieldCareers.push(
      {
        title: "E-learning Designer",
        description:
          "Create engaging digital learning experiences. Combine instructional design principles with visual design.",
        fitScore: 77,
        type: "different-field",
        transferableSkills: ["Design skills", "Creativity", "User empathy"],
      },
      {
        title: "User Research Specialist",
        description:
          "Conduct research to understand user needs and behaviors. Translate findings into actionable insights.",
        fitScore: 75,
        type: "different-field",
        transferableSkills: ["Analytical thinking", "Empathy", "Communication"],
      },
    )
  }

  // Add some general options if we don't have enough specific ones
  if (sameFieldCareers.length < 5) {
    sameFieldCareers.push(
      {
        title: "Team Lead",
        description:
          "Guide and manage a team of professionals in your current field. Develop team members and ensure project success.",
        fitScore: 80,
        type: "same-field",
        transferableSkills: ["Leadership", "Communication", "Domain expertise"],
      },
      {
        title: "Consultant",
        description:
          "Provide expert advice in your current field to various clients. Solve complex problems and implement solutions.",
        fitScore: 78,
        type: "same-field",
        transferableSkills: ["Domain expertise", "Problem-solving", "Communication"],
      },
      {
        title: "Industry Specialist",
        description:
          "Become a recognized expert in your field with deep specialized knowledge. Provide guidance on complex industry-specific challenges.",
        fitScore: 76,
        type: "same-field",
        transferableSkills: ["Domain expertise", "Analytical thinking", "Problem-solving"],
      },
    )
  }

  if (differentFieldCareers.length < 5) {
    differentFieldCareers.push(
      {
        title: "Digital Marketing Specialist",
        description:
          "Develop and implement marketing strategies across digital channels to increase brand awareness and drive sales.",
        fitScore: 70,
        type: "different-field",
        transferableSkills: ["Communication", "Creativity", "Analytical thinking"],
      },
      {
        title: "Customer Success Manager",
        description: "Ensure customers achieve their desired outcomes while using your company's products or services.",
        fitScore: 68,
        type: "different-field",
        transferableSkills: ["Communication", "Relationship building", "Problem-solving"],
      },
      {
        title: "Content Creator",
        description:
          "Produce engaging content for various platforms. Develop a content strategy aligned with business goals.",
        fitScore: 65,
        type: "different-field",
        transferableSkills: ["Communication", "Creativity", "Organization"],
      },
    )
  }

  // Ensure we have exactly 5 careers in each category
  return {
    sameFieldCareers: sameFieldCareers.slice(0, 5).map((career) => ({
      title: career.title || "Untitled Career Path",
      description: career.description || "No description available.",
      fitScore: career.fitScore || 0,
      type: career.type || "same-field",
      transferableSkills: career.transferableSkills || [],
    })),
    differentFieldCareers: differentFieldCareers.slice(0, 5).map((career) => ({
      title: career.title || "Untitled Career Path",
      description: career.description || "No description available.",
      fitScore: career.fitScore || 0,
      type: career.type || "different-field",
      transferableSkills: career.transferableSkills || [],
    })),
  }
}

app.post("/api/career-recommendations", async (req, res) => {
  try {
    const { resumeData, reasons } = req.body

    if (!resumeData || !reasons || !reasons.length) {
      return res.status(400).json({ error: "Missing required data" })
    }

    // Create prompt for OpenAI
    const prompt = `
    Based on the following resume information and reasons for career change, suggest career paths in two categories:
    1. Career paths within the same or similar field (lateral moves or advancements)
    2. Career paths in different fields that would leverage the transferable skills

    Resume Information:
    - Current/Previous Job Titles: ${resumeData.jobHistory?.map((job) => job.title).join(", ") || "Not provided"}
    - Skills: ${Array.isArray(resumeData.skills) ? resumeData.skills.join(", ") : "Not provided"}
    - Education: ${resumeData.education?.map((edu) => `${edu.degree} in ${edu.field}`).join(", ") || "Not provided"}
    - Certifications: ${resumeData.certifications?.join(", ") || "Not provided"}
    
    Reasons for Career Change:
    ${reasons.map((reason) => `- ${reason}`).join("\n")}
    
    Analyze the reasons for change to determine if the person is looking to:
    a) Stay in the same field but find a different role (due to burnout, advancement, better work-life balance)
    b) Move to an entirely different field (due to industry becoming obsolete, desire to use different skills, seeking more meaningful work)
    
    For EACH category, provide 5 career paths with the following information:
    1. Title
    2. Description (2-3 sentences explaining the role)
    3. Fit Score (0-100% based on skills match and alignment with reasons for change)
    4. Type (either "same-field" or "different-field")
    5. Key transferable skills from their background that would apply to this role
    
    Format the response as a JSON object with two arrays: "sameFieldCareers" and "differentFieldCareers".
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
        console.log("OpenAI response:", responseText)

        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0])
          careerPaths = {
            sameFieldCareers: parsedResponse.sameFieldCareers || [],
            differentFieldCareers: parsedResponse.differentFieldCareers || [],
          }
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

    console.log("Sending career paths to client:", careerPaths)

    // If user is logged in, store the latest resume data
    if (req.user && req.user.resumes.length > 0) {
      try {
        const latestResume = req.user.resumes[req.user.resumes.length - 1]
        latestResume.careerRecommendations = {
          reasons,
          sameFieldCareers: careerPaths.sameFieldCareers || [],
          differentFieldCareers: careerPaths.differentFieldCareers || [],
        }

        await req.user.save()
        console.log("Career recommendations saved to user profile")
      } catch (saveError) {
        console.error("Error saving career recommendations to user profile:", saveError)
        // Continue with the response even if saving to profile fails
      }
    }

    res.json({
      sameFieldCareers: careerPaths.sameFieldCareers || [],
      differentFieldCareers: careerPaths.differentFieldCareers || [],
    })
  } catch (error) {
    console.error("Error getting career recommendations:", error)
    res.status(500).json({ error: "Error getting career recommendations", details: error.message })
  }
})

// Fallback function for transition plan
function getFallbackTransitionPlan(careerTitle) {
  return {
    overview: `Transitioning to a career as a ${careerTitle} will require a combination of education, skill development, and networking. This plan outlines the key steps to make this transition successfully.`,
    transitionType: "different-field", // Default to different-field for fallback
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

app.post("/api/transition-plan", async (req, res) => {
  try {
    const { resumeData, careerTitle } = req.body

    if (!resumeData || !careerTitle) {
      return res.status(400).json({ error: "Missing required data" })
    }

    // Create prompt for OpenAI
    const prompt = `
      Create a detailed step-by-step transition plan for someone moving to a career as a ${careerTitle}.
      
      Current Information:
      - Current/Previous Job Titles: ${resumeData.jobHistory?.map((job) => job.title).join(", ") || "Not provided"}
      - Skills: ${Array.isArray(resumeData.skills) ? resumeData.skills.join(", ") : "Not provided"}
      - Education: ${resumeData.education?.map((edu) => `${edu.degree} in ${edu.field}`).join(", ") || "Not provided"}
      
      Target Career: ${careerTitle}
      
      Determine if this is a transition within the same field or to a different field.
      If it's within the same field, focus on skill advancement, specialization, and career progression.
      If it's to a different field, focus on transferable skills, education/training needs, and building new networks.
      
      Provide a comprehensive transition plan with the following:
      1. An overview paragraph summarizing the transition and whether it's within the same field or to a different field
      2. 5-7 specific steps to make the transition
      3. For each step, include a title, detailed description, and 1-2 helpful resources (with URLs)
      
      Format the response as a JSON object with 'overview', 'transitionType' (either "same-field" or "different-field"), and 'steps' properties. Each step should have 'title', 'description', and 'resources' properties.
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
        console.log("OpenAI transition plan response:", responseText)

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

    console.log("Sending transition plan to client:", transitionPlan)

    // If user is logged in, save the transition plan
    if (req.user) {
      req.user.transitionPlans.push({
        careerTitle,
        plan: transitionPlan,
        savedAt: new Date(),
      })

      await req.user.save()
    }

    res.json({ plan: transitionPlan })
  } catch (error) {
    console.error("Error getting transition plan:", error)
    res.status(500).json({ error: "Error getting transition plan" })
  }
})

// Function to connect to MongoDB
let isMongoConnected = false
async function connectToMongoDB() {
  try {
    // Skip MongoDB connection in development if needed
    if (process.env.SKIP_MONGODB === "true") {
      console.log("MongoDB connection skipped as per configuration")
      return true
    }

    // Use environment variable for MongoDB URI if available, otherwise use local
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/career-navigator"
    console.log(`Attempting to connect to MongoDB at: ${mongoURI.includes("@") ? mongoURI.split("@")[1] : "localhost"}`)

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("Connected to MongoDB successfully")
    isMongoConnected = true
    return true
  } catch (err) {
    console.error("MongoDB connection error:", err)
    console.log("Server will continue without MongoDB. Data will not be persisted.")
    return false
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler caught:", err)
  res.status(500).json({
    error: "Server error",
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  })
})

// Start server
async function startServer() {
  // Try to connect to MongoDB but don't block server startup
  await connectToMongoDB()

  // Start the server regardless of MongoDB connection status
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`MongoDB connection status: ${isMongoConnected ? "Connected" : "Not connected"}`)
    if (!isMongoConnected) {
      console.log("Note: The application will work without MongoDB, but user data will not be saved.")
    }
  })
}

// Start the server
startServer()
