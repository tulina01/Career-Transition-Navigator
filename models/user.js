const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resumes: [
    {
      fileName: String,
      uploadDate: {
        type: Date,
        default: Date.now,
      },
      parsedData: Object,
      careerRecommendations: {
        reasons: [String],
        sameFieldCareers: [Object],
        differentFieldCareers: [Object],
      },
    },
  ],
  careerPaths: [
    {
      title: {
        type: String,
        default: "Untitled Career Path",
      },
      description: {
        type: String,
        default: "",
      },
      fitScore: {
        type: Number,
        default: 0,
      },
      type: {
        type: String,
        enum: ["same-field", "different-field"],
        default: "same-field",
      },
      transferableSkills: {
        type: [String],
        default: [],
      },
      savedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  transitionPlans: [
    {
      careerTitle: String,
      plan: Object,
      savedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
})

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model("User", userSchema)

module.exports = User
