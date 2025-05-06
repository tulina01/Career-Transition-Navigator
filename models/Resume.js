const mongoose = require("mongoose")

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  fileName: String,
  originalName: String,
  fileSize: Number,
  fileType: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  parsedData: {
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
  },
})

const Resume = mongoose.model("Resume", resumeSchema)

module.exports = Resume
