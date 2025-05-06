document.addEventListener("DOMContentLoaded", () => {
    const profileName = document.getElementById("profileName")
    const profileEmail = document.getElementById("profileEmail")
    const userInitials = document.getElementById("userInitials")
    const logoutBtn = document.getElementById("logoutBtn")
    const toastContainer = document.getElementById("toastContainer")
  
    // Resume list elements
    const resumesList = document.getElementById("resumesList")
    const resumesLoading = document.getElementById("resumesLoading")
    const noResumes = document.getElementById("noResumes")
  
    // Career paths elements
    const careerPathsList = document.getElementById("careerPathsList")
    const careerPathsLoading = document.getElementById("careerPathsLoading")
    const noCareerPaths = document.getElementById("noCareerPaths")
  
    // Transition plans elements
    const transitionPlansList = document.getElementById("transitionPlansList")
    const transitionPlansLoading = document.getElementById("transitionPlansLoading")
    const noTransitionPlans = document.getElementById("noTransitionPlans")
  
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem("user"))
  
    if (!user) {
      // Redirect to login page if not logged in
      window.location.href = "login.html"
      return
    }
  
    // Set user info
    profileName.textContent = user.name || "User"
    profileEmail.textContent = user.email
  
    // Set user initials
    if (user.name) {
      const nameParts = user.name.split(" ")
      if (nameParts.length > 1) {
        userInitials.textContent = `${nameParts[0][0]}${nameParts[1][0]}`
      } else {
        userInitials.textContent = nameParts[0][0]
      }
    } else {
      userInitials.textContent = user.email[0].toUpperCase()
    }
  
    // Add logout functionality
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
        })
  
        // Clear user from localStorage
        localStorage.removeItem("user")
  
        // Redirect to home page
        window.location.href = "index.html"
      } catch (error) {
        console.error("Logout error:", error)
  
        // If API call fails, still clear localStorage and redirect
        localStorage.removeItem("user")
        window.location.href = "index.html"
      }
    })
  
    // Show toast notification
    function showToast(type, title, message) {
      const toast = document.createElement("div")
      toast.className = `toast toast-${type} show`
      toast.innerHTML = `
        <div class="toast-header">
          <strong class="me-auto">${title}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      `
  
      toastContainer.appendChild(toast)
  
      // Auto-remove after 5 seconds
      setTimeout(() => {
        toast.classList.remove("show")
        setTimeout(() => {
          toastContainer.removeChild(toast)
        }, 300)
      }, 5000)
  
      // Close button functionality
      toast.querySelector(".btn-close").addEventListener("click", () => {
        toast.classList.remove("show")
        setTimeout(() => {
          toastContainer.removeChild(toast)
        }, 300)
      })
    }
  
    // Format date
    function formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  
    // Load user profile data
    async function loadProfileData() {
      try {
        const response = await fetch("/api/profile", {
          credentials: "include", // Important: include cookies with the request
        })
  
        if (!response.ok) {
          throw new Error("Failed to load profile data")
        }
  
        const data = await response.json()
  
        // Display resumes
        displayResumes(data.resumes)
  
        // Display career paths
        displayCareerPaths(data.careerPaths)
  
        // Display transition plans
        displayTransitionPlans(data.transitionPlans)
      } catch (error) {
        console.error("Error loading profile data:", error)
        showToast("error", "Error", "Failed to load profile data. Please try again.")
      }
    }
  
    // Display resumes
    function displayResumes(resumes) {
      resumesLoading.classList.add("d-none")
  
      if (!resumes || resumes.length === 0) {
        noResumes.classList.remove("d-none")
        return
      }
  
      // Sort resumes by upload date (newest first)
      resumes.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
  
      const resumesHTML = resumes
        .map(
          (resume) => `
        <div class="resume-item" data-id="${resume._id}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="mb-1">${resume.fileName}</h5>
              <p class="resume-date mb-2"><i class="bi bi-calendar3 me-1"></i>${formatDate(resume.uploadDate)}</p>
              <div>
                <span class="badge bg-light text-dark me-1">
                  <i class="bi bi-briefcase me-1"></i>${resume.parsedData.jobHistory?.length || 0} Jobs
                </span>
                <span class="badge bg-light text-dark me-1">
                  <i class="bi bi-mortarboard me-1"></i>${resume.parsedData.education?.length || 0} Education
                </span>
                <span class="badge bg-light text-dark">
                  <i class="bi bi-tools me-1"></i>${resume.parsedData.skills?.length || 0} Skills
                </span>
              </div>
            </div>
            <div class="resume-actions">
              <button class="btn btn-icon view-resume-btn" title="View Resume">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-icon delete-resume-btn" title="Delete Resume">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
  
      resumesList.innerHTML = resumesHTML
  
      // Add event listeners for resume actions
      document.querySelectorAll(".delete-resume-btn").forEach((btn) => {
        btn.addEventListener("click", async function () {
          const resumeItem = this.closest(".resume-item")
          const resumeId = resumeItem.dataset.id
  
          if (confirm("Are you sure you want to delete this resume?")) {
            try {
              const response = await fetch(`/api/profile/resumes/${resumeId}`, {
                method: "DELETE",
                credentials: "include", // Include cookies
              })
  
              if (!response.ok) {
                throw new Error("Failed to delete resume")
              }
  
              // Remove resume item from DOM
              resumeItem.remove()
  
              // Show success toast
              showToast("success", "Success", "Resume deleted successfully")
  
              // Check if there are any resumes left
              if (document.querySelectorAll(".resume-item").length === 0) {
                noResumes.classList.remove("d-none")
              }
            } catch (error) {
              console.error("Error deleting resume:", error)
              showToast("error", "Error", "Failed to delete resume. Please try again.")
            }
          }
        })
      })
  
      document.querySelectorAll(".view-resume-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const resumeItem = this.closest(".resume-item")
          const resumeId = resumeItem.dataset.id
  
          // Redirect to resume viewer (this would be implemented in a real app)
          showToast("info", "Info", "Resume viewer would open here")
        })
      })
    }
  
    // Display career paths
    function displayCareerPaths(careerPaths) {
      careerPathsLoading.classList.add("d-none")
  
      if (!careerPaths || careerPaths.length === 0) {
        noCareerPaths.classList.remove("d-none")
        return
      }
  
      // Sort career paths by saved date (newest first)
      careerPaths.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
  
      const careerPathsHTML = careerPaths
        .map(
          (path) => `
        <div class="career-path-item" data-id="${path._id}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="d-flex align-items-center mb-1">
                <h5 class="mb-0">${path.title}</h5>
                <span class="badge ${path.type === "same-field" ? "badge-same-field" : "badge-different-field"} ms-2">
                  ${path.type === "same-field" ? "Same Field" : "Different Field"}
                </span>
              </div>
              <p class="path-date mb-2"><i class="bi bi-calendar3 me-1"></i>${formatDate(path.savedAt)}</p>
              <p class="mb-2">${path.description}</p>
              <div class="d-flex align-items-center">
                <span class="badge bg-primary me-2">${path.fitScore}% Match</span>
                <div class="transferable-skills-mini">
                  ${path.transferableSkills.map((skill) => `<span class="skill-tag">${skill}</span>`).join("")}
                </div>
              </div>
            </div>
            <div class="path-actions">
              <button class="btn btn-icon view-path-btn" title="View Career Path">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-icon delete-path-btn" title="Delete Career Path">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
  
      careerPathsList.innerHTML = careerPathsHTML
  
      // Add event listeners for career path actions
      document.querySelectorAll(".delete-path-btn").forEach((btn) => {
        btn.addEventListener("click", async function () {
          const pathItem = this.closest(".career-path-item")
          const pathId = pathItem.dataset.id
  
          if (confirm("Are you sure you want to delete this career path?")) {
            try {
              const response = await fetch(`/api/profile/career-paths/${pathId}`, {
                method: "DELETE",
                credentials: "include", // Include cookies
              })
  
              if (!response.ok) {
                throw new Error("Failed to delete career path")
              }
  
              // Remove career path item from DOM
              pathItem.remove()
  
              // Show success toast
              showToast("success", "Success", "Career path deleted successfully")
  
              // Check if there are any career paths left
              if (document.querySelectorAll(".career-path-item").length === 0) {
                noCareerPaths.classList.remove("d-none")
              }
            } catch (error) {
              console.error("Error deleting career path:", error)
              showToast("error", "Error", "Failed to delete career path. Please try again.")
            }
          }
        })
      })
  
      document.querySelectorAll(".view-path-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const pathItem = this.closest(".career-path-item")
          const pathId = pathItem.dataset.id
  
          // Redirect to career path viewer (this would be implemented in a real app)
          showToast("info", "Info", "Career path details would open here")
        })
      })
    }
  
    // Display transition plans
    function displayTransitionPlans(transitionPlans) {
      transitionPlansLoading.classList.add("d-none")
  
      if (!transitionPlans || transitionPlans.length === 0) {
        noTransitionPlans.classList.remove("d-none")
        return
      }
  
      // Sort transition plans by saved date (newest first)
      transitionPlans.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
  
      const transitionPlansHTML = transitionPlans
        .map(
          (plan) => `
        <div class="transition-plan-item" data-id="${plan._id}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="d-flex align-items-center mb-1">
                <h5 class="mb-0">${plan.careerTitle}</h5>
                <span class="badge ${plan.plan.transitionType === "same-field" ? "badge-same-field" : "badge-different-field"} ms-2">
                  ${plan.plan.transitionType === "same-field" ? "Same Field" : "Different Field"}
                </span>
              </div>
              <p class="plan-date mb-2"><i class="bi bi-calendar3 me-1"></i>${formatDate(plan.savedAt)}</p>
              <p class="mb-2">${plan.plan.overview.substring(0, 120)}${plan.plan.overview.length > 120 ? "..." : ""}</p>
              <div>
                <span class="badge bg-light text-dark">
                  <i class="bi bi-list-check me-1"></i>${plan.plan.steps.length} Steps
                </span>
              </div>
            </div>
            <div class="plan-actions">
              <button class="btn btn-icon view-plan-btn" title="View Transition Plan">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-icon delete-plan-btn" title="Delete Transition Plan">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
  
      transitionPlansList.innerHTML = transitionPlansHTML
  
      // Add event listeners for transition plan actions
      document.querySelectorAll(".delete-plan-btn").forEach((btn) => {
        btn.addEventListener("click", async function () {
          const planItem = this.closest(".transition-plan-item")
          const planId = planItem.dataset.id
  
          if (confirm("Are you sure you want to delete this transition plan?")) {
            try {
              const response = await fetch(`/api/profile/transition-plans/${planId}`, {
                method: "DELETE",
                credentials: "include", // Include cookies
              })
  
              if (!response.ok) {
                throw new Error("Failed to delete transition plan")
              }
  
              // Remove transition plan item from DOM
              planItem.remove()
  
              // Show success toast
              showToast("success", "Success", "Transition plan deleted successfully")
  
              // Check if there are any transition plans left
              if (document.querySelectorAll(".transition-plan-item").length === 0) {
                noTransitionPlans.classList.remove("d-none")
              }
            } catch (error) {
              console.error("Error deleting transition plan:", error)
              showToast("error", "Error", "Failed to delete transition plan. Please try again.")
            }
          }
        })
      })
  
      document.querySelectorAll(".view-plan-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const planItem = this.closest(".transition-plan-item")
          const planId = planItem.dataset.id
  
          // Redirect to transition plan viewer (this would be implemented in a real app)
          showToast("info", "Info", "Transition plan details would open here")
        })
      })
    }
  
    // Load profile data when page loads
    loadProfileData()
  })
  