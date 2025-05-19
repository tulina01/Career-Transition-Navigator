document.addEventListener("DOMContentLoaded", () => {
  // Profile elements
  const profileName = document.getElementById("profileName")
  const profileEmail = document.getElementById("profileEmail")
  const userInitials = document.getElementById("userInitials")
  const logoutBtn = document.getElementById("logoutBtn")
  const toastContainer = document.querySelector(".toast-container")

  // Career paths elements
  const careerPathsList = document.getElementById("careerPathsList")
  const careerPathsLoading = document.getElementById("careerPathsLoading")
  const noCareerPaths = document.getElementById("noCareerPaths")

  // Transition plans elements
  const transitionPlansList = document.getElementById("transitionPlansList")
  const transitionPlansLoading = document.getElementById("transitionPlansLoading")
  const noTransitionPlans = document.getElementById("noTransitionPlans")

  // Settings form
  const profileSettingsForm = document.getElementById("profileSettingsForm")
  const settingsName = document.getElementById("settingsName")
  const settingsEmail = document.getElementById("settingsEmail")

  // Password change form
  const passwordChangeForm = document.getElementById("passwordChangeForm")
  const currentPassword = document.getElementById("currentPassword")
  const newPassword = document.getElementById("newPassword")
  const confirmNewPassword = document.getElementById("confirmNewPassword")
  const passwordFeedback = document.getElementById("passwordFeedback")

  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem("user"))

  if (!user) {
    // Redirect to login page if not logged in
    window.location.href = "login.html?redirect=profile.html"
    return
  }

  // Set user info
  if (profileName) profileName.textContent = user.name || "User"
  if (profileEmail) profileEmail.textContent = user.email
  if (settingsName) settingsName.value = user.name || ""
  if (settingsEmail) settingsEmail.value = user.email || ""

  // Set user initials
  if (userInitials) {
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
  }

  // Add logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
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
  }

  // Handle profile settings form submission
  if (profileSettingsForm) {
    profileSettingsForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const nameValue = settingsName.value.trim()

      try {
        const response = await fetch("/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: nameValue,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to update profile")
        }

        const updatedUser = await response.json()

        // Update user in localStorage
        localStorage.setItem("user", JSON.stringify(updatedUser))

        // Update displayed name
        if (profileName) profileName.textContent = updatedUser.name || "User"

        // Update initials
        if (userInitials) {
          if (updatedUser.name) {
            const nameParts = updatedUser.name.split(" ")
            if (nameParts.length > 1) {
              userInitials.textContent = `${nameParts[0][0]}${nameParts[1][0]}`
            } else {
              userInitials.textContent = nameParts[0][0]
            }
          } else {
            userInitials.textContent = updatedUser.email[0].toUpperCase()
          }
        }

        showToast("success", "Success", "Profile updated successfully")
      } catch (error) {
        console.error("Update profile error:", error)
        showToast("error", "Error", error.message || "Failed to update profile")
      }
    })
  }

  // Handle password change form submission
  if (passwordChangeForm) {
    passwordChangeForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      // Reset feedback
      passwordFeedback.innerHTML = ""
      passwordFeedback.classList.add("d-none")

      const currentPasswordValue = currentPassword.value
      const newPasswordValue = newPassword.value
      const confirmNewPasswordValue = confirmNewPassword.value

      // Client-side validation
      if (!currentPasswordValue || !newPasswordValue || !confirmNewPasswordValue) {
        showPasswordFeedback("error", "All password fields are required")
        return
      }

      if (newPasswordValue.length < 6) {
        showPasswordFeedback("error", "New password must be at least 6 characters long")
        return
      }

      if (newPasswordValue !== confirmNewPasswordValue) {
        showPasswordFeedback("error", "New passwords do not match")
        return
      }

      // Clear any previous error messages before submitting
      passwordFeedback.classList.add("d-none")

      try {
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword: currentPasswordValue,
            newPassword: newPasswordValue,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to change password")
        }

        // Clear form
        currentPassword.value = ""
        newPassword.value = ""
        confirmNewPassword.value = ""

        showPasswordFeedback("success", "Password changed successfully")
        showToast("success", "Success", "Password changed successfully")
      } catch (error) {
        console.error("Change password error:", error)
        showPasswordFeedback("error", error.message || "Failed to change password")
      }
    })
  }

  // Add a function to clear the password feedback when typing in the password fields
  // Add this after the password change form submission handler:
  if (newPassword) {
    newPassword.addEventListener("input", () => {
      // Clear error message when user starts typing a new password
      passwordFeedback.classList.add("d-none")
    })
  }

  if (confirmNewPassword) {
    confirmNewPassword.addEventListener("input", () => {
      // Clear error message when user starts typing in confirm password field
      passwordFeedback.classList.add("d-none")
    })
  }

  if (currentPassword) {
    currentPassword.addEventListener("input", () => {
      // Clear error message when user starts typing current password
      passwordFeedback.classList.add("d-none")
    })
  }

  // Add password toggle functionality
  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", function () {
      const input = this.previousElementSibling
      const icon = this.querySelector("i")

      if (input.type === "password") {
        input.type = "text"
        icon.classList.remove("bi-eye")
        icon.classList.add("bi-eye-slash")
      } else {
        input.type = "password"
        icon.classList.remove("bi-eye-slash")
        icon.classList.add("bi-eye")
      }
    })
  })

  // Show password feedback
  function showPasswordFeedback(type, message) {
    passwordFeedback.innerHTML = `
      <div class="alert alert-${type === "error" ? "danger" : "success"} mb-0">
        <i class="bi bi-${type === "error" ? "exclamation-triangle" : "check-circle"} me-2"></i>
        ${message}
      </div>
    `
    passwordFeedback.classList.remove("d-none")
  }

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

      // Display career paths
      if (careerPathsList) displayCareerPaths(data.careerPaths)

      // Display transition plans
      if (transitionPlansList) displayTransitionPlans(data.transitionPlans)
    } catch (error) {
      console.error("Error loading profile data:", error)
      showToast("error", "Error", "Failed to load profile data. Please try again.")
    }
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

        // Find the career path data
        const pathTitle = pathItem.querySelector("h5").textContent
        const pathType = pathItem.querySelector(".badge").textContent.trim()
        const pathDescription = pathItem.querySelector("p.mb-2").textContent
        const pathFitScore = pathItem.querySelector(".badge.bg-primary").textContent
        const skillTags = Array.from(pathItem.querySelectorAll(".skill-tag")).map((tag) => tag.textContent)

        // Populate the modal
        const modal = document.getElementById("careerPathModal")
        const modalTitle = document.getElementById("careerPathModalLabel")
        const modalBody = document.getElementById("careerPathModalBody")

        modalTitle.textContent = pathTitle

        modalBody.innerHTML = `
          <div class="career-path-details">
            <div class="mb-3">
              <span class="badge ${pathType.includes("Same") ? "badge-same-field" : "badge-different-field"} mb-2">
                ${pathType}
              </span>
              <span class="badge bg-primary">${pathFitScore}</span>
            </div>
            
            <h6 class="fw-bold">Description</h6>
            <p>${pathDescription}</p>
            
            <h6 class="fw-bold mt-4">Transferable Skills</h6>
            <div class="transferable-skills mb-3">
              ${skillTags.map((skill) => `<span class="skill-tag">${skill}</span>`).join("")}
            </div>
            
            <div class="alert alert-info mt-4">
              <i class="bi bi-info-circle me-2"></i>
              To create a detailed transition plan for this career path, go to the home page and select this career path from the recommendations.
            </div>
          </div>
        `

        // Show the modal
        const bsModal = new bootstrap.Modal(modal)
        bsModal.show()
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
      .map((plan) => {
        // Make sure plan.plan exists and has the expected structure
        const planData = plan.plan || {}
        const overview = planData.overview || "No overview available"
        const transitionType = planData.transitionType || "different-field"
        const steps = planData.steps || []

        return `
            <div class="transition-plan-item" data-id="${plan._id}">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="d-flex align-items-center mb-1">
                    <h5 class="mb-0">${plan.careerTitle || "Untitled Plan"}</h5>
                    <span class="badge ${transitionType === "same-field" ? "badge-same-field" : "badge-different-field"} ms-2">
                      ${transitionType === "same-field" ? "Same Field" : "Different Field"}
                    </span>
                  </div>
                  <p class="plan-date mb-2"><i class="bi bi-calendar3 me-1"></i>${formatDate(plan.savedAt)}</p>
                  <p class="mb-2">${overview.substring(0, 120)}${overview.length > 120 ? "..." : ""}</p>
                  <div>
                    <span class="badge bg-light text-dark">
                      <i class="bi bi-list-check me-1"></i>${steps.length} Steps
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
          `
      })
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

        // Get the transition plan data from the server
        fetch(`/api/profile/transition-plans/${planId}`, {
          credentials: "include",
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to load transition plan")
            }
            return response.json()
          })
          .then((data) => {
            const plan = data.plan || {}

            // Populate the modal
            const modal = document.getElementById("transitionPlanModal")
            const modalTitle = document.getElementById("transitionPlanModalLabel")
            const modalBody = document.getElementById("transitionPlanModalBody")

            modalTitle.textContent = `Transition Plan: ${data.careerTitle || "Untitled Plan"}`

            // Create the HTML for the plan
            const transitionType = plan.transitionType || "different-field"
            const transitionTypeClass = transitionType === "same-field" ? "badge-same-field" : "badge-different-field"
            const transitionTypeText = transitionType === "same-field" ? "Same Field" : "Different Field"
            const transitionTypeIcon = transitionType === "same-field" ? "arrow-up-right-circle" : "shuffle"
            const overview = plan.overview || "No overview available"
            const steps = plan.steps || []

            const stepsHTML = steps
              .map(
                (step, index) => `
                <div class="transition-step">
                  <h4>${index + 1}. ${step.title || "Untitled Step"}</h4>
                  <p>${step.description || "No description available"}</p>
                  ${
                    step.resources && step.resources.length > 0
                      ? `
                    <div class="resources">
                      <strong><i class="bi bi-link-45deg me-1"></i>Resources:</strong>
                      <ul>
                        ${step.resources
                          .map(
                            (resource) => `
                          <li><a href="${resource.url || "#"}" target="_blank">${resource.title || resource.name || "Resource"} <i class="bi bi-box-arrow-up-right ms-1"></i></a></li>
                        `,
                          )
                          .join("")}
                      </ul>
                    </div>
                  `
                      : ""
                  }
                </div>
              `,
              )
              .join("")

            modalBody.innerHTML = `
              <div class="plan-overview mb-4 p-3 rounded" style="background-color: rgba(67, 97, 238, 0.05);">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5><i class="bi bi-info-circle me-2"></i>Overview</h5>
                  <span class="career-type-badge ${transitionTypeClass}">
                    <i class="bi bi-${transitionTypeIcon} me-1"></i>${transitionTypeText}
                  </span>
                </div>
                <p>${overview}</p>
              </div>
              <div class="transition-timeline">
                ${stepsHTML}
              </div>
            `

            // Show the modal
            const bsModal = new bootstrap.Modal(modal)
            bsModal.show()

            // Add print functionality
            document.getElementById("printTransitionPlan").onclick = () => {
              const printWindow = window.open("", "_blank")
              printWindow.document.write(`
              <html>
                <head>
                  <title>Transition Plan: ${data.careerTitle || "Untitled Plan"}</title>
                  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
                  <style>
                    body { padding: 20px; font-family: Arial, sans-serif; }
                    .transition-step { margin-bottom: 20px; padding-left: 20px; border-left: 3px solid #4361ee; }
                    .resources { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px; }
                    h1 { color: #4361ee; }
                    h4 { color: #4361ee; }
                    @media print {
                      a { text-decoration: none; color: #000; }
                      .resources { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact; }
                    }
                  </style>
                </head>
                <body>
                  <h1>Transition Plan: ${data.careerTitle || "Untitled Plan"}</h1>
                  <div class="plan-overview mb-4 p-3">
                    <h5>Overview</h5>
                    <p>${overview}</p>
                  </div>
                  <div class="transition-timeline">
                    ${stepsHTML}
                  </div>
                  <div class="mt-4 text-center text-muted">
                    <p>Generated by Career Transition Navigator</p>
                  </div>
                </body>
              </html>
            `)
              printWindow.document.close()
              printWindow.focus()
              setTimeout(() => {
                printWindow.print()
              }, 500)
            }
          })
          .catch((error) => {
            console.error("Error loading transition plan:", error)
            showToast("error", "Error", "Failed to load transition plan details. Please try again.")
          })
      })
    })
  }

  // Load profile data when page loads
  loadProfileData()

  // Bootstrap variable declaration
  const bootstrap = window.bootstrap
})
