document.addEventListener("DOMContentLoaded", () => {
  // Add this near the top of the file, after the document.addEventListener("DOMContentLoaded", () => { line
  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem("user"))
  const isLoggedIn = !!user

  // Form elements
  const resumeForm = document.getElementById("resumeForm")
  const reasonsForm = document.getElementById("reasonsForm")
  const reasonOther = document.getElementById("reasonOther")
  const otherReasonContainer = document.getElementById("otherReasonContainer")
  const backToPathsBtn = document.getElementById("backToPathsBtn")
  const backToStep1 = document.getElementById("backToStep1")
  const backToStep2 = document.getElementById("backToStep2")
  const resumeFileInput = document.getElementById("resumeFile")
  const fileNameDisplay = document.getElementById("fileNameDisplay")

  // Step containers
  const step1 = document.getElementById("step1")
  const step2 = document.getElementById("step2")
  const step3 = document.getElementById("step3")
  const step4 = document.getElementById("step4")

  // Progress tracker
  const progressSteps = document.querySelectorAll(".progress-step")
  const progressBar = document.querySelector(".progress-bar")

  // Progress and loading elements
  const uploadProgress = document.getElementById("uploadProgress")
  const progressBarUpload = uploadProgress.querySelector(".progress-bar")
  const uploadPercentage = document.getElementById("uploadPercentage")
  const loadingRecommendations = document.getElementById("loadingRecommendations")
  const careerPaths = document.getElementById("careerPaths")
  const loadingPlan = document.getElementById("loadingPlan")
  const transitionPlan = document.getElementById("transitionPlan")
  const selectedCareerTitle = document.getElementById("selectedCareerTitle")
  const loadingMessages = document.querySelector(".loading-messages")
  const loadingPlanMessages = document.querySelector(".loading-plan-messages")
  const confettiContainer = document.getElementById("confettiContainer")
  const toastContainer = document.querySelector(".toast-container")

  // Store parsed resume data
  let resumeData = null

  // File upload styling
  if (resumeFileInput) {
    resumeFileInput.addEventListener("change", function () {
      if (this.files.length > 0) {
        fileNameDisplay.textContent = this.files[0].name
        fileNameDisplay.classList.add("text-primary")
        document.querySelector(".file-upload-icon").classList.add("text-primary")
      } else {
        fileNameDisplay.textContent = "Drag & drop your resume or click to browse"
        fileNameDisplay.classList.remove("text-primary")
        document.querySelector(".file-upload-icon").classList.remove("text-primary")
      }
    })
  }

  // Drag and drop functionality
  const fileUploadLabel = document.querySelector(".file-upload-label")

  if (fileUploadLabel) {
    fileUploadLabel.addEventListener("dragover", (e) => {
      e.preventDefault()
      fileUploadLabel.classList.add("dragover")
    })

    fileUploadLabel.addEventListener("dragleave", () => {
      fileUploadLabel.classList.remove("dragover")
    })

    fileUploadLabel.addEventListener("drop", (e) => {
      e.preventDefault()
      fileUploadLabel.classList.remove("dragover")

      if (e.dataTransfer.files.length) {
        resumeFileInput.files = e.dataTransfer.files
        if (resumeFileInput.files.length > 0) {
          fileNameDisplay.textContent = resumeFileInput.files[0].name
          fileNameDisplay.classList.add("text-primary")
          document.querySelector(".file-upload-icon").classList.add("text-primary")
        }
      }
    })
  }

  // Navigation between steps
  function goToStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll(".step-content").forEach((container) => {
      container.classList.remove("active")
      container.classList.add("d-none")
    })

    // Show the target step
    const targetStep = document.getElementById(`step${stepNumber}`)
    targetStep.classList.remove("d-none")

    // Add a small delay before adding the active class for animation
    setTimeout(() => {
      targetStep.classList.add("active")
    }, 50)

    // Update progress tracker
    progressSteps.forEach((step, index) => {
      if (index < stepNumber) {
        step.classList.add("active")
      } else {
        step.classList.remove("active")
      }
    })

    // Update progress bar
    progressBar.style.width = `${stepNumber * 25}%`
    progressBar.setAttribute("aria-valuenow", stepNumber * 25)
  }

  // Back button handlers
  if (backToStep1) {
    backToStep1.addEventListener("click", () => {
      goToStep(1)
    })
  }

  if (backToStep2) {
    backToStep2.addEventListener("click", () => {
      goToStep(2)
    })
  }

  if (backToPathsBtn) {
    backToPathsBtn.addEventListener("click", () => {
      goToStep(3)
    })
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

  // Create confetti effect
  function createConfetti() {
    if (!confettiContainer) return

    confettiContainer.innerHTML = ""
    const colors = ["#4361ee", "#4cc9f0", "#f72585", "#4ade80", "#fbbf24"]

    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement("div")
      confetti.className = "confetti"
      confetti.style.left = `${Math.random() * 100}%`
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.width = `${Math.random() * 10 + 5}px`
      confetti.style.height = `${Math.random() * 10 + 5}px`
      confetti.style.animationDuration = `${Math.random() * 3 + 2}s`
      confetti.style.animationDelay = `${Math.random() * 0.5}s`

      confettiContainer.appendChild(confetti)
    }

    // Remove confetti after animation completes
    setTimeout(() => {
      confettiContainer.innerHTML = ""
    }, 5000)
  }

  // Loading messages animation
  function animateLoadingMessages(container, messages) {
    if (!container) return null

    let index = 0
    container.innerHTML = `<p class="loading-message">${messages[0]}</p>`

    const interval = setInterval(() => {
      index = (index + 1) % messages.length
      const messageElement = document.createElement("p")
      messageElement.className = "loading-message"
      messageElement.textContent = messages[index]

      container.innerHTML = ""
      container.appendChild(messageElement)

      // Fade in animation
      setTimeout(() => {
        messageElement.style.opacity = "1"
      }, 50)
    }, 3000)

    return interval
  }

  // Handle resume upload
  if (resumeForm) {
    resumeForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(resumeForm)
      const fileInput = document.getElementById("resumeFile")

      if (!fileInput.files.length) {
        showToast("error", "Error", "Please select a file to upload")
        return
      }

      // Show progress bar
      uploadProgress.classList.remove("d-none")

      // Loading messages
      const uploadMessages = [
        "Uploading your resume...",
        "Extracting information...",
        "Analyzing your experience...",
        "Identifying key skills...",
        "Almost there...",
      ]

      const messageInterval = animateLoadingMessages(
        document.createElement("div"), // Dummy element since we're using progress bar
        uploadMessages,
      )

      // Simulate upload progress (in a real app, this would be actual upload progress)
      let progress = 0
      const interval = setInterval(() => {
        progress += 5
        progressBarUpload.style.width = `${progress}%`
        uploadPercentage.textContent = `${progress}%`

        if (progress >= 100) {
          clearInterval(interval)
          clearInterval(messageInterval)

          // Send the file to the server
          fetch("/api/parse-resume", {
            method: "POST",
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                return response.json().then((data) => {
                  throw new Error(data.error || data.details || "Network response was not ok")
                })
              }
              return response.json()
            })
            .then((data) => {
              console.log("Parsed resume data:", data)
              resumeData = data

              // Show success toast
              showToast("success", "Success", "Resume uploaded and parsed successfully!")

              // Move to step 2
              goToStep(2)
            })
            .catch((error) => {
              console.error("Error parsing resume:", error)
              showToast("error", "Error", `Error parsing resume: ${error.message}. Please try again.`)
              uploadProgress.classList.add("d-none")
              progressBarUpload.style.width = "0%"
              uploadPercentage.textContent = "0%"
            })
        }
      }, 100)
    })
  }

  // Toggle "Other" reason text field
  if (reasonOther) {
    reasonOther.addEventListener("change", function () {
      if (this.checked) {
        otherReasonContainer.classList.remove("d-none")
      } else {
        otherReasonContainer.classList.add("d-none")
      }
    })
  }

  // Handle reasons form submission
  if (reasonsForm) {
    reasonsForm.addEventListener("submit", (e) => {
      e.preventDefault()

      // Get selected reasons
      const selectedReasons = Array.from(document.querySelectorAll('input[name="reasons"]:checked')).map((checkbox) => {
        if (checkbox.id === "reasonOther") {
          return document.getElementById("otherReason").value
        }
        return checkbox.value
      })

      if (selectedReasons.length === 0) {
        showToast("warning", "Warning", "Please select at least one reason for career change")
        return
      }

      // Move to step 3
      goToStep(3)

      // Show loading messages
      const recommendationMessages = [
        "Evaluating your skills and experience...",
        "Matching with potential career paths...",
        "Calculating compatibility scores...",
        "Finalizing recommendations...",
        "Almost ready...",
      ]

      const messageInterval = animateLoadingMessages(loadingMessages, recommendationMessages)

      // Request career recommendations
      fetch("/api/career-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData,
          reasons: selectedReasons,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok")
          }
          return response.json()
        })
        .then((data) => {
          clearInterval(messageInterval)
          console.log("Career recommendations response:", data)

          // Hide loading, show career paths
          loadingRecommendations.classList.add("d-none")
          careerPaths.classList.remove("d-none")

          // Display career paths
          displayCareerPaths(data)

          // Show success toast
          showToast("success", "Success", "Career recommendations generated successfully!")
        })
        .catch((error) => {
          clearInterval(messageInterval)
          console.error("Error getting career recommendations:", error)
          loadingRecommendations.innerHTML = `
            <div class="alert alert-danger">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Error getting career recommendations. Please try again.
            </div>
            <button class="btn btn-primary mt-3" onclick="location.reload()">
              <i class="bi bi-arrow-clockwise me-2"></i>Start Over
            </button>
          `
        })
    })
  }

  // Display career paths
  function displayCareerPaths(data) {
    console.log("Received career paths data:", data)

    const sameFieldCareers = data.sameFieldCareers || []
    const differentFieldCareers = data.differentFieldCareers || []

    console.log("Same field careers:", sameFieldCareers)
    console.log("Different field careers:", differentFieldCareers)

    const sameFieldContainer = document.querySelector(".same-field-careers")
    const differentFieldContainer = document.querySelector(".different-field-careers")

    if (!sameFieldContainer || !differentFieldContainer) return

    // Clear containers
    sameFieldContainer.innerHTML = ""
    differentFieldContainer.innerHTML = ""

    if (sameFieldCareers.length === 0 && differentFieldCareers.length === 0) {
      careerPaths.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          No career paths found. Please try again with different information.
        </div>
        <button class="btn btn-primary" onclick="location.reload()">
          <i class="bi bi-arrow-clockwise me-2"></i>Start Over
        </button>
      `
      return
    }

    // Display same field careers
    if (sameFieldCareers.length > 0) {
      const pathsHTML = sameFieldCareers
        .map(
          (path) => `
            <div class="card career-path-card" data-career="${encodeURIComponent(path.title || path.Title || "")}">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title">
                    ${path.title || path.Title || "Career Path"}
                    <span class="career-type-badge badge-same-field">Same Field</span>
                  </h5>
                  <span class="badge bg-primary">${path.fitScore || path["Fit Score"] || 0}% Match</span>
                </div>
                <p class="card-text">${path.description || path.Description || "No description available."}</p>
                ${
                  path.transferableSkills || path["Key transferable skills"]
                    ? `
                    <div class="transferable-skills">
                      <h6><i class="bi bi-arrow-right-circle me-1"></i>Transferable Skills</h6>
                      <div>
                        ${(path.transferableSkills || path["Key transferable skills"] || [])
                          .map((skill) => `<span class="skill-tag">${skill}</span>`)
                          .join("")}
                      </div>
                    </div>
                  `
                    : ""
                }
                <div class="d-flex justify-content-end mt-3">
                  <button class="btn btn-primary btn-sm view-plan-btn">
                    <i class="bi bi-signpost-split me-1"></i>View Transition Plan
                  </button>
                </div>
              </div>
              ${
                isLoggedIn
                  ? `<button class="btn btn-sm btn-outline-primary save-btn" title="Save to profile">
                      <i class="bi bi-bookmark"></i>
                    </button>`
                  : ""
              }
            </div>
          `,
        )
        .join("")

      sameFieldContainer.innerHTML = pathsHTML
    } else {
      sameFieldContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          No career paths found in the same field.
        </div>
      `
    }

    // Display different field careers
    if (differentFieldCareers.length > 0) {
      const pathsHTML = differentFieldCareers
        .map(
          (path) => `
            <div class="card career-path-card" data-career="${encodeURIComponent(path.title || path.Title || "")}">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title">
                    ${path.title || path.Title || "Career Path"}
                    <span class="career-type-badge badge-different-field">Different Field</span>
                  </h5>
                  <span class="badge bg-primary">${path.fitScore || path["Fit Score"] || 0}% Match</span>
                </div>
                <p class="card-text">${path.description || path.Description || "No description available."}</p>
                ${
                  path.transferableSkills || path["Key transferable skills"]
                    ? `
                    <div class="transferable-skills">
                      <h6><i class="bi bi-arrow-right-circle me-1"></i>Transferable Skills</h6>
                      <div>
                        ${(path.transferableSkills || path["Key transferable skills"] || [])
                          .map((skill) => `<span class="skill-tag">${skill}</span>`)
                          .join("")}
                      </div>
                    </div>
                  `
                    : ""
                }
                <div class="d-flex justify-content-end mt-3">
                  <button class="btn btn-primary btn-sm view-plan-btn">
                    <i class="bi bi-signpost-split me-1"></i>View Transition Plan
                  </button>
                </div>
              </div>
              ${
                isLoggedIn
                  ? `<button class="btn btn-sm btn-outline-primary save-btn" title="Save to profile">
                      <i class="bi bi-bookmark"></i>
                    </button>`
                  : ""
              }
            </div>
          `,
        )
        .join("")

      differentFieldContainer.innerHTML = pathsHTML
    } else {
      differentFieldContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          No career paths found in different fields.
        </div>
      `
    }

    // Add click event to career path cards
    document.querySelectorAll(".career-path-card").forEach((card) => {
      card.addEventListener("click", function () {
        const careerTitle = decodeURIComponent(this.dataset.career)
        getTransitionPlan(careerTitle)
      })
    })

    // Add specific click event to buttons to prevent event bubbling
    document.querySelectorAll(".view-plan-btn").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation() // Prevent card click
        const careerTitle = decodeURIComponent(this.closest(".career-path-card").dataset.career)
        getTransitionPlan(careerTitle)
      })
    })

    // Add save button functionality
    document.querySelectorAll(".save-btn").forEach((btn) => {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation() // Prevent card click

        try {
          // Show loading state
          this.disabled = true
          this.innerHTML = '<i class="bi bi-hourglass-split"></i>'

          // Get career path data
          const card = this.closest(".career-path-card")
          const careerTitle = decodeURIComponent(card.dataset.career || "")
          const description = card.querySelector(".card-text").textContent || ""

          // Get fit score with fallback
          let fitScore = 0
          const fitScoreElement = card.querySelector(".badge")
          if (fitScoreElement) {
            const fitScoreText = fitScoreElement.textContent || ""
            const match = fitScoreText.match(/(\d+)/)
            fitScore = match ? Number.parseInt(match[1], 10) : 0
          }

          // Get type with fallback
          let type = "same-field"
          const typeElement = card.querySelector(".career-type-badge")
          if (typeElement) {
            type = (typeElement.textContent || "").trim().toLowerCase().includes("same")
              ? "same-field"
              : "different-field"
          }

          // Get skill tags with fallback
          const skillElements = card.querySelectorAll(".skill-tag")
          const skillTags = skillElements ? Array.from(skillElements).map((tag) => tag.textContent || "") : []

          const response = await fetch("/api/profile/career-paths", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              careerPath: {
                title: careerTitle,
                description,
                fitScore,
                type,
                transferableSkills: skillTags,
              },
            }),
            credentials: "include", // Important: include cookies
          })

          if (!response.ok) {
            throw new Error("Failed to save career path")
          }

          // Change button to saved state
          this.disabled = false
          this.innerHTML = '<i class="bi bi-bookmark-check-fill"></i>'
          this.classList.remove("btn-outline-primary")
          this.classList.add("btn-success")
          this.title = "Saved to profile"

          // Show toast notification
          showToast("success", "Success", "Career path saved to your profile!")
        } catch (error) {
          console.error("Error saving career path:", error)

          // Reset button state
          this.disabled = false
          this.innerHTML = '<i class="bi bi-bookmark"></i>'

          // Show error toast
          showToast("error", "Error", "Failed to save career path. Please try again.")
        }
      })
    })
  }

  // Get transition plan for selected career
  function getTransitionPlan(careerTitle) {
    if (!step4 || !loadingPlan || !transitionPlan || !selectedCareerTitle) return

    // Move to step 4
    goToStep(4)

    // Update title
    selectedCareerTitle.textContent = `Transition Plan: ${careerTitle}`

    // Show loading, hide plan
    loadingPlan.classList.remove("d-none")
    transitionPlan.classList.add("d-none")

    // Show loading messages
    const planMessages = [
      "Mapping out your journey...",
      "Identifying key milestones...",
      "Researching learning resources...",
      "Creating your personalized plan...",
      "Almost ready...",
    ]

    const messageInterval = animateLoadingMessages(loadingPlanMessages, planMessages)

    // Request transition plan
    fetch("/api/transition-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeData,
        careerTitle,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        return response.json()
      })
      .then((data) => {
        if (messageInterval) clearInterval(messageInterval)

        // Hide loading, show plan
        loadingPlan.classList.add("d-none")
        transitionPlan.classList.remove("d-none")

        // Display transition plan
        displayTransitionPlan(data.plan, careerTitle)

        // Show success toast and confetti
        showToast("success", "Success", "Your personalized transition plan is ready!")
        createConfetti()
      })
      .catch((error) => {
        if (messageInterval) clearInterval(messageInterval)
        console.error("Error getting transition plan:", error)
        loadingPlan.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Error getting transition plan. Please try again.
          </div>
          <button class="btn btn-primary mt-3" onclick="location.reload()">
            <i class="bi bi-arrow-clockwise me-2"></i>Start Over
          </button>
        `
      })
  }

  // Display transition plan
  function displayTransitionPlan(plan, careerTitle) {
    console.log("Received transition plan:", plan)

    if (!transitionPlan) return

    if (!plan || !plan.steps || plan.steps.length === 0) {
      transitionPlan.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          No transition plan available. Please try a different career path.
        </div>
        <button class="btn btn-primary" id="tryDifferentPath">
          <i class="bi bi-arrow-left me-2"></i>Try Different Path
        </button>
      `

      document.getElementById("tryDifferentPath").addEventListener("click", () => {
        goToStep(3)
      })

      return
    }

    const transitionType = plan.transitionType || "same-field"
    const transitionTypeClass = transitionType === "same-field" ? "badge-same-field" : "badge-different-field"
    const transitionTypeText = transitionType === "same-field" ? "Same Field" : "Different Field"
    const transitionTypeIcon = transitionType === "same-field" ? "arrow-up-right-circle" : "shuffle"

    const stepsHTML = plan.steps
      .map(
        (step, index) => `
          <div class="transition-step">
            <h4>${index + 1}. ${step.title}</h4>
            <p>${step.description}</p>
            ${
              step.resources && Array.isArray(step.resources) && step.resources.length > 0
                ? `
                <div class="resources">
                  <strong><i class="bi bi-link-45deg me-1"></i>Resources:</strong>
                  <ul>
                    ${step.resources
                      .map(
                        (resource) => `
                      <li><a href="${resource.url}" target="_blank">${resource.title || resource.name || "Resource"} <i class="bi bi-box-arrow-up-right ms-1"></i></a></li>
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

    transitionPlan.innerHTML = `
      <div class="plan-overview mb-4 p-3 rounded" style="background-color: rgba(67, 97, 238, 0.05);">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h5><i class="bi bi-info-circle me-2"></i>Overview</h5>
          <span class="career-type-badge ${transitionTypeClass}">
            <i class="bi bi-${transitionTypeIcon} me-1"></i>${transitionTypeText}
          </span>
        </div>
        <p>${plan.overview}</p>
      </div>
      <div class="transition-timeline">
        ${stepsHTML}
      </div>
      <div class="mt-4 d-flex flex-wrap justify-content-center gap-3">
        <button class="btn btn-primary" onclick="window.print()">
          <i class="bi bi-printer me-2"></i>Print Plan
        </button>
        ${
          isLoggedIn
            ? `<button class="btn btn-outline-primary" id="savePlanBtn">
                <i class="bi bi-bookmark me-2"></i>Save Plan
              </button>`
            : `<a href="login.html" class="btn btn-outline-primary">
                <i class="bi bi-person me-2"></i>Login to Save
              </a>`
        }
        <button class="btn btn-outline-secondary" id="shareBtn">
          <i class="bi bi-share me-2"></i>Share
        </button>
      </div>
    `

    // Add event listeners for buttons
    document.getElementById("shareBtn").addEventListener("click", () => {
      showToast("info", "Info", "Share functionality would be implemented here.")
    })

    // Add save plan functionality
    const savePlanBtn = document.getElementById("savePlanBtn")
    if (savePlanBtn) {
      savePlanBtn.addEventListener("click", async () => {
        try {
          // Disable the button to prevent multiple clicks
          savePlanBtn.disabled = true
          savePlanBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...'

          // Extract plan data
          const overview = transitionPlan.querySelector(".plan-overview p").textContent
          const transitionType = transitionPlan
            .querySelector(".career-type-badge")
            .textContent.trim()
            .toLowerCase()
            .includes("same")
            ? "same-field"
            : "different-field"

          const steps = Array.from(transitionPlan.querySelectorAll(".transition-step")).map((step) => {
            const title = step.querySelector("h4").textContent.replace(/^\d+\.\s+/, "")
            const description = step.querySelector("p").textContent

            const resources = []
            const resourceLinks = step.querySelectorAll(".resources a")
            if (resourceLinks.length) {
              resourceLinks.forEach((link) => {
                resources.push({
                  title: link.textContent.trim().replace(" ", ""),
                  url: link.href,
                })
              })
            }

            return { title, description, resources }
          })

          const planData = {
            overview,
            transitionType,
            steps,
          }

          const response = await fetch("/api/profile/transition-plans", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              careerTitle,
              plan: planData,
            }),
            credentials: "include",
          })

          if (!response.ok) {
            throw new Error("Failed to save transition plan")
          }

          // Change button to saved state
          savePlanBtn.innerHTML = '<i class="bi bi-bookmark-check-fill me-2"></i>Saved'
          savePlanBtn.classList.remove("btn-outline-primary")
          savePlanBtn.classList.add("btn-success")
          savePlanBtn.disabled = true // Keep button disabled after saving

          // Show toast notification
          showToast("success", "Success", "Transition plan saved to your profile!")
        } catch (error) {
          console.error("Error saving transition plan:", error)

          // Re-enable the button if there's an error
          savePlanBtn.disabled = false
          savePlanBtn.innerHTML = '<i class="bi bi-bookmark me-2"></i>Save Plan'

          showToast("error", "Error", "Failed to save transition plan. Please try again.")
        }
      })
    }
  }

  // Initialize the file upload styling
  const fileUploadContainer = document.createElement("style")
  fileUploadContainer.textContent = `
    .file-upload-container {
      border: 2px dashed #e2e8f0;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
      margin-bottom: 1rem;
    }
    
    .file-upload-container:hover, .file-upload-label.dragover {
      border-color: var(--primary);
      background-color: rgba(67, 97, 238, 0.05);
    }
    
    .file-upload-icon {
      font-size: 2.5rem;
      color: #64748b;
      margin-bottom: 1rem;
      transition: all 0.3s ease;
    }
    
    .file-upload-text {
      color: #64748b;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .file-upload-label {
      display: block;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }
    
    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;
      flex: 1;
    }
    
    .progress-circle {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: #e2e8f0;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-bottom: 0.5rem;
      transition: all 0.3s ease;
    }
    
    .progress-step.active .progress-circle {
      background-color: var(--primary);
      color: white;
    }
    
    .progress-step span {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .progress-step.active span {
      color: var(--primary);
      font-weight: 600;
    }
    
    .loading-message {
      opacity: 0;
      transition: opacity 0.5s ease;
      animation: fadeIn 0.5s ease forwards;
    }
    
    .custom-checkbox .form-check-input:checked ~ .form-check-label {
      color: var(--primary);
      font-weight: 500;
    }
  `
  document.head.appendChild(fileUploadContainer)
})
