document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem("user"))
  const isLoggedIn = !!user

  // Get auth-related elements
  const authRequiredElements = document.querySelectorAll(".auth-required")
  const authNotRequiredElements = document.querySelectorAll(".auth-not-required")
  const logoutBtn = document.getElementById("logoutBtn")

  // Update UI based on auth status
  if (isLoggedIn) {
    // Show elements that require authentication
    authRequiredElements.forEach((el) => el.classList.remove("d-none"))

    // Hide elements that should not be shown when authenticated
    authNotRequiredElements.forEach((el) => el.classList.add("d-none"))

    // Update any user-specific elements
    const userNameElements = document.querySelectorAll(".user-name")
    userNameElements.forEach((el) => {
      el.textContent = user.name || user.email
    })
  } else {
    // Hide elements that require authentication
    authRequiredElements.forEach((el) => el.classList.add("d-none"))

    // Show elements that should be visible when not authenticated
    authNotRequiredElements.forEach((el) => el.classList.remove("d-none"))
  }

  // Add logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault()

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        })
      } catch (error) {
        console.error("Logout API error:", error)
      }

      // Always clear local storage and redirect, even if API call fails
      localStorage.removeItem("user")
      window.location.href = "index.html"
    })
  }

  // Redirect to login if trying to access protected pages
  const isProtectedPage = document.body.classList.contains("protected-page")
  if (isProtectedPage && !isLoggedIn) {
    window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname)
  }

  // Add save buttons to career path cards if user is logged in
  if (isLoggedIn) {
    // Add event listener for when career paths are loaded
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          addSaveButtons()
        }
      })
    })

    // Start observing the career paths container
    const careerPaths = document.getElementById("careerPaths")
    if (careerPaths) {
      observer.observe(careerPaths, { childList: true, subtree: true })
    }
  }

  // Function to add save buttons to career path cards
  function addSaveButtons() {
    document.querySelectorAll(".career-path-card").forEach((card) => {
      // Check if save button already exists
      if (!card.querySelector(".save-btn")) {
        const saveBtn = document.createElement("button")
        saveBtn.className = "btn btn-outline-primary save-btn"
        saveBtn.innerHTML = '<i class="bi bi-bookmark"></i>'
        saveBtn.title = "Save to profile"

        saveBtn.addEventListener("click", async (e) => {
          e.stopPropagation() // Prevent card click

          try {
            // Show loading state
            saveBtn.disabled = true
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>'

            // Get career path data
            const careerTitle = decodeURIComponent(card.dataset.career || "")

            // Get description with fallback
            let description = ""
            const descriptionElement = card.querySelector(".card-text")
            if (descriptionElement) {
              description = descriptionElement.textContent || ""
            }

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

            console.log("Saving career path:", {
              title: careerTitle,
              description: description.substring(0, 50) + "...",
              fitScore,
              type,
              transferableSkills: skillTags.length,
            })

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

            const data = await response.json()

            if (!response.ok) {
              throw new Error(data.error || data.message || "Failed to save career path")
            }

            // Change button to saved state
            saveBtn.disabled = false
            saveBtn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i>'
            saveBtn.classList.remove("btn-outline-primary")
            saveBtn.classList.add("btn-success")
            saveBtn.title = "Saved to profile"

            // Show toast notification
            const toastContainer = document.getElementById("toastContainer")
            if (toastContainer) {
              const toast = document.createElement("div")
              toast.className = "toast toast-success show"
              toast.innerHTML = `
                <div class="toast-header">
                  <strong class="me-auto">Success</strong>
                  <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                  Career path saved to your profile!
                </div>
              `

              toastContainer.appendChild(toast)

              // Auto-remove after 3 seconds
              setTimeout(() => {
                toast.classList.remove("show")
                setTimeout(() => {
                  toastContainer.removeChild(toast)
                }, 300)
              }, 3000)
            }
          } catch (error) {
            console.error("Error saving career path:", error)

            // Reset button state
            saveBtn.disabled = false
            saveBtn.innerHTML = '<i class="bi bi-bookmark"></i>'

            // Show error toast
            const toastContainer = document.getElementById("toastContainer")
            if (toastContainer) {
              const toast = document.createElement("div")
              toast.className = "toast toast-error show"
              toast.innerHTML = `
                <div class="toast-header">
                  <strong class="me-auto">Error</strong>
                  <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                  ${error.message || "Failed to save career path. Please try again."}
                </div>
              `

              toastContainer.appendChild(toast)

              // Auto-remove after 3 seconds
              setTimeout(() => {
                toast.classList.remove("show")
                setTimeout(() => {
                  toastContainer.removeChild(toast)
                }, 300)
              }, 3000)
            }
          }
        })

        card.appendChild(saveBtn)
      }
    })

    // Add save functionality to transition steps
    document.querySelectorAll(".transition-step").forEach((step) => {
      // Check if save button already exists
      if (!step.querySelector(".save-btn") && document.getElementById("selectedCareerTitle")) {
        const saveBtn = document.createElement("button")
        saveBtn.className = "btn btn-sm btn-outline-primary save-btn"
        saveBtn.innerHTML = '<i class="bi bi-bookmark"></i>'
        saveBtn.title = "Save to profile"

        saveBtn.addEventListener("click", async (e) => {
          e.stopPropagation()

          // Disable the button to prevent multiple clicks
          saveBtn.disabled = true
          saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>'

          const careerTitle = document
            .getElementById("selectedCareerTitle")
            .textContent.replace("Transition Plan: ", "")
          const planElement = document.getElementById("transitionPlan")

          // Extract plan data
          const overview = planElement.querySelector(".plan-overview p").textContent
          const transitionType = planElement
            .querySelector(".career-type-badge")
            .textContent.trim()
            .toLowerCase()
            .includes("same")
            ? "same-field"
            : "different-field"

          const steps = Array.from(planElement.querySelectorAll(".transition-step")).map((step) => {
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

          const plan = {
            overview,
            transitionType,
            steps,
          }

          try {
            const response = await fetch("/api/profile/transition-plans", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                careerTitle,
                plan,
              }),
            })

            if (!response.ok) {
              throw new Error("Failed to save transition plan")
            }

            // Change button to saved state
            saveBtn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i>'
            saveBtn.classList.remove("btn-outline-primary")
            saveBtn.classList.add("btn-success")
            saveBtn.title = "Saved to profile"
            saveBtn.disabled = true // Keep button disabled after saving

            // Show toast notification
            const toastContainer = document.getElementById("toastContainer")
            if (toastContainer) {
              const toast = document.createElement("div")
              toast.className = "toast toast-success show"
              toast.innerHTML = `
                <div class="toast-header">
                  <strong class="me-auto">Success</strong>
                  <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                  Transition plan saved to your profile!
                </div>
              `

              toastContainer.appendChild(toast)

              // Auto-remove after 3 seconds
              setTimeout(() => {
                toast.classList.remove("show")
                setTimeout(() => {
                  toastContainer.removeChild(toast)
                }, 300)
              }, 3000)
            }
          } catch (error) {
            console.error("Error saving transition plan:", error)

            // Re-enable the button if there's an error
            saveBtn.disabled = false
            saveBtn.innerHTML = '<i class="bi bi-bookmark"></i>'

            // Show error toast
            const toastContainer = document.getElementById("toastContainer")
            if (toastContainer) {
              const toast = document.createElement("div")
              toast.className = "toast toast-error show"
              toast.innerHTML = `
                <div class="toast-header">
                  <strong class="me-auto">Error</strong>
                  <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                  Failed to save transition plan. Please try again.
                </div>
              `

              toastContainer.appendChild(toast)

              // Auto-remove after 3 seconds
              setTimeout(() => {
                toast.classList.remove("show")
                setTimeout(() => {
                  toastContainer.removeChild(toast)
                }, 300)
              }, 3000)
            }
          }
        })

        step.appendChild(saveBtn)
      }
    })
  }
})
